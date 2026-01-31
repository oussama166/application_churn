"""Churn score and health endpoints."""

import sys
from pathlib import Path

import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import ChurnScoreLog, check_db, check_tables_exist, get_db, try_log_score
from app.models.schemas import (
    ChurnScoreInput,
    ChurnScoreResponse,
    HealthResponse,
    ModelInfoResponse,
    ScoreLogEntry,
)

# Project root for index
sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
from index import _risk_segment, feature_engineering, load_churn_artifacts, transform

router = APIRouter()


def _get_model(request: Request):
    """Get model from app.state or load on demand."""
    if getattr(request.app.state, "churn_loaded", False):
        return (
            request.app.state.churn_model,
            request.app.state.churn_preprocessor,
        )
    model, preprocessor, _ = load_churn_artifacts(str(settings.artifacts_dir))
    return model, preprocessor


def _score_one(payload: ChurnScoreInput, model, preprocessor) -> tuple[float, str]:
    """Run model on a single validated input. Returns (churn_score, risk_segment)."""
    d = payload.model_dump(exclude={"customer_ref"})
    X = pd.DataFrame([d])
    X_fe = feature_engineering(X)
    X_arr = transform(X_fe, preprocessor)
    proba = float(model.predict_proba(X_arr)[0, 1])
    seg = _risk_segment(np.array([proba]))
    return proba, str(seg[0])


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Health check; verifies Postgres connectivity."""
    ok = await check_db()
    if ok:
        # Verify tables exist
        tables = await check_tables_exist()
        missing_tables = [name for name, exists in tables.items() if not exists]
        if missing_tables:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Database connected but missing tables: {missing_tables}")
    return HealthResponse(
        status="ok" if ok else "degraded",
        database="connected" if ok else "disconnected",
    )


@router.get("/logs", response_model=list[ScoreLogEntry])
async def logs(
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
) -> list[ScoreLogEntry]:
    """Return recent churn score log entries from Postgres."""
    limit = min(max(1, limit), 1000)
    try:
        r = await db.execute(
            select(ChurnScoreLog).order_by(ChurnScoreLog.created_at.desc()).limit(limit)
        )
        rows = r.scalars().all()
        return [ScoreLogEntry.model_validate(x) for x in rows]
    except Exception:
        return []


@router.get("/model-info", response_model=ModelInfoResponse)
async def model_info(request: Request) -> ModelInfoResponse:
    """Return loaded model metadata (features, status)."""
    loaded = getattr(request.app.state, "churn_loaded", False)
    feature_names = getattr(request.app.state, "churn_feature_names", []) if loaded else []
    return ModelInfoResponse(
        loaded=loaded,
        features_count=len(feature_names),
        features=feature_names[:20] if feature_names else [],  # first 20 for brevity
    )


@router.post("/score", response_model=ChurnScoreResponse)
async def score(payload: ChurnScoreInput, request: Request) -> ChurnScoreResponse:
    """Score a single customer; validate with Pydantic, log to Postgres when available."""
    model, preprocessor = _get_model(request)
    try:
        churn_score, risk_segment = _score_one(payload, model, preprocessor)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scoring failed: {e!s}") from e

    await try_log_score(churn_score, risk_segment, payload.customer_ref)
    return ChurnScoreResponse(churn_score=churn_score, risk_segment=risk_segment)


@router.post("/score/batch")
async def score_batch_endpoint(
    payload: list[ChurnScoreInput],
    request: Request,
) -> list[ChurnScoreResponse]:
    """Score multiple customers in one request (batch scoring)."""
    if len(payload) > 1000:
        raise HTTPException(status_code=400, detail="Max 1000 records per batch")
    model, preprocessor = _get_model(request)
    results = []
    for p in payload:
        try:
            proba, seg = _score_one(p, model, preprocessor)
            results.append(ChurnScoreResponse(churn_score=proba, risk_segment=seg))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Scoring failed: {e!s}") from e
    return results
