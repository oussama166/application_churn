"""Batch file upload, scoring, stats and KPIs."""

import io
import logging
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from scipy.stats import percentileofscore

logger = logging.getLogger(__name__)

from app.core.config import settings
from app.core.database import BatchRecord, BatchUpload, db_session, get_db, check_db
from app.models.schemas import (
    BatchRecordKpis,
    BatchRecordResult,
    BatchUploadResponse,
    BatchUploadStats,
    BatchUploadSummary,
)

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
from index import feature_engineering, load_churn_artifacts, prepare_upload_for_scoring, transform

router = APIRouter()

REQUIRED_COLS = [
    "age", "gender", "region", "tenure_months", "offer_type", "contract_type",
    "commitment_duration_months", "months_to_contract_end", "renewal_last_12m",
    "music_pack", "intl_calls", "extra_data", "monthly_fee", "last_bill_amount",
    "payment_history_score", "late_payments_6m", "unpaid_invoices", "bill_variation_3m",
    "voice_minutes", "data_gb", "sms_count", "usage_trend_3m", "roaming_days_3m",
    "out_of_bundle_charges", "network_incidents_3m", "avg_download_mbps", "drop_call_rate",
    "tech_complaints_3m", "support_calls_3m", "billing_contacts", "tech_contacts",
    "commercial_contacts", "tickets_opened_3m", "tickets_closed_3m", "avg_resolution_time_hours",
]

MAX_UPLOAD_ROWS = 50_000
MAX_UPLOAD_ROWS_LARGE = 100_000  # For new large upload endpoint
MAX_RETURN_ROWS = 1000
BATCH_INSERT_SIZE = 1000  # Insert records in batches for better performance


def _parse_file(content: bytes, filename: str) -> pd.DataFrame:
    """Parse CSV or Excel file."""
    ext = Path(filename).suffix.lower()
    if ext == ".csv":
        return pd.read_csv(io.BytesIO(content))
    if ext in (".xlsx", ".xls"):
        return pd.read_excel(io.BytesIO(content), engine="openpyxl" if ext == ".xlsx" else None)
    raise HTTPException(status_code=400, detail=f"Unsupported format: {ext}. Use .csv or .xlsx")


def _compute_stats(
    scores: np.ndarray,
    segments: np.ndarray,
    monthly_fees: np.ndarray | None,
    high_risk_mask: np.ndarray,
) -> BatchUploadStats:
    uniq, cnts = np.unique(segments, return_counts=True)
    seg_counts = {str(k): int(v) for k, v in zip(uniq, cnts)}
    high_pct = 100.0 * high_risk_mask.sum() / len(scores) if len(scores) else 0.0
    avg_fee = float(np.nanmean(monthly_fees)) if monthly_fees is not None and len(monthly_fees) else None
    high_fee = float(np.nanmean(monthly_fees[high_risk_mask])) if monthly_fees is not None and high_risk_mask.any() else None
    return BatchUploadStats(
        total_rows=len(scores),
        risk_segment_counts=seg_counts,
        churn_score_mean=float(np.mean(scores)),
        churn_score_median=float(np.median(scores)),
        churn_score_std=float(np.std(scores)) if len(scores) > 1 else 0.0,
        churn_score_min=float(np.min(scores)),
        churn_score_max=float(np.max(scores)),
        high_risk_pct=round(high_pct, 2),
        avg_monthly_fee=round(avg_fee, 2) if avg_fee is not None else None,
        high_risk_avg_fee=round(high_fee, 2) if high_fee is not None else None,
    )


def _compute_percentile(scores: np.ndarray, score: float) -> float:
    return float(percentileofscore(scores, score, kind="rank"))


def _retention_priority(score: float, segment: str) -> str:
    if segment == "High":
        return "urgent"
    if segment == "Medium":
        return "high"
    return "standard"


@router.post("/upload", response_model=BatchUploadResponse)
async def upload_and_score(
    request: Request,
    file: UploadFile,
) -> BatchUploadResponse:
    """
    Upload CSV/Excel, store to DB, predict churn for each row, return stats and KPIs.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename")
    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 50MB)")

    try:
        df = _parse_file(content, file.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Parse error: {e!s}") from e

    if len(df) > MAX_UPLOAD_ROWS:
        raise HTTPException(status_code=400, detail=f"Max {MAX_UPLOAD_ROWS} rows allowed")
    if len(df) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    missing = [c for c in REQUIRED_COLS if c not in df.columns]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing columns: {missing[:10]}{'...' if len(missing) > 10 else ''}")

    try:
        X, customer_refs = prepare_upload_for_scoring(df)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prepare error: {e!s}") from e

    if getattr(request.app.state, "churn_loaded", False):
        model = request.app.state.churn_model
        preprocessor = request.app.state.churn_preprocessor
    else:
        model, preprocessor, _ = load_churn_artifacts(str(settings.artifacts_dir))

    X_fe = feature_engineering(X)
    X_arr = transform(X_fe, preprocessor)
    scores = model.predict_proba(X_arr)[:, 1]
    segments_arr = pd.cut(scores, bins=(0, 0.25, 0.5, 1.0), labels=("Low", "Medium", "High"), include_lowest=True).astype(str)

    percentiles = np.array([_compute_percentile(scores, float(s)) for s in scores])
    high_risk_mask = np.array(segments_arr) == "High"
    monthly_fees = X["monthly_fee"].values if "monthly_fee" in X.columns else None

    stats = _compute_stats(scores, np.array(segments_arr), monthly_fees, high_risk_mask)
    kpis_summary = {
        "high_risk_count": int(high_risk_mask.sum()),
        "high_risk_pct": stats.high_risk_pct,
        "avg_churn_score": round(stats.churn_score_mean, 4),
        "median_churn_score": round(stats.churn_score_median, 4),
    }

    results = []
    sample_size = min(len(df), MAX_RETURN_ROWS)
    for i in range(sample_size):
        ref = str(customer_refs.iloc[i]) if customer_refs is not None and i < len(customer_refs) else None
        raw = X.iloc[i].to_dict() if i < len(X) else {}
        raw = {k: (float(v) if isinstance(v, (np.floating, np.integer)) else v) for k, v in raw.items()}
        kpis = BatchRecordKpis(
            churn_percentile=round(percentiles[i], 2),
            risk_segment=str(segments_arr[i]),
            revenue_impact_score=round(float(scores[i]) * (monthly_fees[i] if monthly_fees is not None and i < len(monthly_fees) else 1.0), 2),
            retention_priority=_retention_priority(float(scores[i]), str(segments_arr[i])),
        )
        results.append(
            BatchRecordResult(
                row_index=i,
                customer_ref=ref,
                churn_score=round(float(scores[i]), 4),
                churn_percentile=round(percentiles[i], 2),
                risk_segment=str(segments_arr[i]),
                kpis=kpis,
            )
        )

    upload_id = 0
    try:
        async with db_session() as db:
            upload = BatchUpload(
                filename=file.filename or "unknown",
                total_rows=len(df),
                status="completed",
                dataset_stats=stats.model_dump(),
                kpis=kpis_summary,
            )
            db.add(upload)
            await db.flush()
            upload_id = upload.id
            for i in range(len(df)):
                rec = BatchRecord(
                    upload_id=upload.id,
                    row_index=i,
                    customer_ref=str(customer_refs.iloc[i]) if customer_refs is not None and i < len(customer_refs) else None,  # noqa: E501
                    raw_data={k: (None if pd.isna(v) else (float(v) if isinstance(v, (np.floating, np.integer)) else str(v) if isinstance(v, (np.str_, str)) else v)) for k, v in X.iloc[i].to_dict().items()},
                    churn_score=float(scores[i]),
                    churn_percentile=float(percentiles[i]),
                    risk_segment=str(segments_arr[i]),
                    kpis={
                        "churn_percentile": float(percentiles[i]),
                        "risk_segment": str(segments_arr[i]),
                        "revenue_impact_score": float(scores[i]) * (float(monthly_fees[i]) if monthly_fees is not None and i < len(monthly_fees) else 1.0),
                        "retention_priority": _retention_priority(float(scores[i]), str(segments_arr[i])),
                    },
                )
                db.add(rec)
    except Exception:
        pass

    return BatchUploadResponse(
        upload_id=upload_id,
        filename=file.filename or "unknown",
        total_rows=len(df),
        dataset_stats=stats,
        kpis_summary=kpis_summary,
        results=results,
        sample_size=sample_size if sample_size < len(df) else None,
    )


@router.get("/upload/{upload_id}", response_model=BatchUploadResponse | None)
async def get_upload_results(
    upload_id: int,
    limit: int | None = None,
    db: AsyncSession = Depends(get_db),
) -> BatchUploadResponse | None:
    """Fetch stored upload results by ID (when DB is available).
    
    Args:
        upload_id: The upload ID to fetch
        limit: Optional limit on number of results to return. If None, returns all records.
    """
    from sqlalchemy import select

    try:
        r = await db.execute(select(BatchUpload).where(BatchUpload.id == upload_id))
        upload = r.scalar_one_or_none()
        if not upload:
            return None
        r2 = await db.execute(select(BatchRecord).where(BatchRecord.upload_id == upload_id).order_by(BatchRecord.row_index))
        records = r2.scalars().all()
        results = []
        for rec in records:
            # Extract phone_number from raw_data if available
            phone_number = None
            if rec.raw_data and isinstance(rec.raw_data, dict):
                phone_number = rec.raw_data.get('phone_number') or rec.raw_data.get('phone')
                if phone_number is not None:
                    phone_number = str(phone_number)
            
            results.append(
                BatchRecordResult(
                    row_index=rec.row_index,
                    customer_ref=rec.customer_ref,
                    phone_number=phone_number,
                    churn_score=rec.churn_score,
                    churn_percentile=rec.churn_percentile,
                    risk_segment=rec.risk_segment,
                    kpis=BatchRecordKpis(**rec.kpis) if rec.kpis else BatchRecordKpis(churn_percentile=rec.churn_percentile, risk_segment=rec.risk_segment),
                )
            )
        
        # Apply limit if specified, otherwise return all
        if limit is not None:
            results = results[:limit]
            sample_size = len(results) if len(records) > limit else None
        else:
            # Return all records for detail view
            sample_size = None
        
        stats = BatchUploadStats(**upload.dataset_stats) if upload.dataset_stats else None
        if not stats:
            return None
        return BatchUploadResponse(
            upload_id=upload.id,
            filename=upload.filename,
            total_rows=upload.total_rows,
            dataset_stats=stats,
            kpis_summary=upload.kpis or {},
            results=results,
            sample_size=sample_size,
        )
    except Exception as e:
        logger.error(f"Error fetching upload {upload_id}: {e!s}", exc_info=True)
        return None


@router.get("/uploads", response_model=list[BatchUploadSummary])
async def list_uploads(
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
) -> list[BatchUploadSummary]:
    """List all batch uploads with summary information."""
    try:
        r = await db.execute(
            select(BatchUpload)
            .order_by(BatchUpload.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        uploads = r.scalars().all()
        
        summaries = []
        for upload in uploads:
            stats = None
            if upload.dataset_stats:
                try:
                    stats = BatchUploadStats(**upload.dataset_stats)
                except Exception:
                    pass
            
            summaries.append(
                BatchUploadSummary(
                    upload_id=upload.id,
                    filename=upload.filename,
                    total_rows=upload.total_rows,
                    status=upload.status,
                    created_at=upload.created_at,
                    kpis_summary=upload.kpis or {},
                    dataset_stats=stats,
                )
            )
        
        return summaries
    except Exception as e:
        logger.error(f"Error listing uploads: {e!s}", exc_info=True)
        return []


@router.post("/upload-large", response_model=BatchUploadResponse)
async def upload_and_score_large(
    request: Request,
    file: UploadFile,
) -> BatchUploadResponse:
    """
    Upload CSV/Excel file (up to 100k rows), predict churn for all rows,
    and store ALL records to database with predictions.
    Optimized for large datasets with batch processing.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename")
    
    content = await file.read()
    if len(content) > 100 * 1024 * 1024:  # 100MB max
        raise HTTPException(status_code=400, detail="File too large (max 100MB)")

    try:
        df = _parse_file(content, file.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Parse error: {e!s}") from e

    if len(df) > MAX_UPLOAD_ROWS_LARGE:
        raise HTTPException(
            status_code=400, 
            detail=f"Max {MAX_UPLOAD_ROWS_LARGE} rows allowed for large upload"
        )
    if len(df) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    missing = [c for c in REQUIRED_COLS if c not in df.columns]
    if missing:
        raise HTTPException(
            status_code=400, 
            detail=f"Missing columns: {missing[:10]}{'...' if len(missing) > 10 else ''}"
        )

    try:
        X, customer_refs = prepare_upload_for_scoring(df)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prepare error: {e!s}") from e

    # Get model
    if getattr(request.app.state, "churn_loaded", False):
        model = request.app.state.churn_model
        preprocessor = request.app.state.churn_preprocessor
    else:
        model, preprocessor, _ = load_churn_artifacts(str(settings.artifacts_dir))

    # Feature engineering and prediction
    X_fe = feature_engineering(X)
    X_arr = transform(X_fe, preprocessor)
    scores = model.predict_proba(X_arr)[:, 1]
    segments_arr = pd.cut(
        scores, 
        bins=(0, 0.25, 0.5, 1.0), 
        labels=("Low", "Medium", "High"), 
        include_lowest=True
    ).astype(str)

    # Compute percentiles and stats
    percentiles = np.array([_compute_percentile(scores, float(s)) for s in scores])
    high_risk_mask = np.array(segments_arr) == "High"
    monthly_fees = X["monthly_fee"].values if "monthly_fee" in X.columns else None

    stats = _compute_stats(scores, np.array(segments_arr), monthly_fees, high_risk_mask)
    kpis_summary = {
        "high_risk_count": int(high_risk_mask.sum()),
        "high_risk_pct": stats.high_risk_pct,
        "avg_churn_score": round(stats.churn_score_mean, 4),
        "median_churn_score": round(stats.churn_score_median, 4),
    }

    # Verify database connection before attempting to store
    db_connected = await check_db()
    if not db_connected:
        logger.error("Database is not connected. Cannot store upload data.")
        raise HTTPException(
            status_code=503,
            detail="Database is not available. Please check your database connection."
        )

    # Store to database with batch inserts for efficiency
    upload_id = 0
    try:
        logger.info(f"Starting database storage for {len(df)} records...")
        async with db_session() as db:
            # Create upload record
            upload = BatchUpload(
                filename=file.filename or "unknown",
                total_rows=len(df),
                status="completed",
                dataset_stats=stats.model_dump(),
                kpis=kpis_summary,
            )
            db.add(upload)
            await db.flush()
            upload_id = upload.id
            logger.info(f"Created BatchUpload record with id={upload_id}")

            # Batch insert records for better performance
            batch_records = []
            total_batches = (len(df) + BATCH_INSERT_SIZE - 1) // BATCH_INSERT_SIZE
            for i in range(len(df)):
                customer_ref = (
                    str(customer_refs.iloc[i]) 
                    if customer_refs is not None and i < len(customer_refs) 
                    else None
                )
                
                # Prepare raw_data (handle NaN and numpy types)
                raw_dict = X.iloc[i].to_dict()
                raw_data = {}
                for k, v in raw_dict.items():
                    if pd.isna(v):
                        raw_data[k] = None
                    elif isinstance(v, (np.floating, np.integer)):
                        raw_data[k] = float(v)
                    elif isinstance(v, (np.str_, str)):
                        raw_data[k] = str(v)
                    else:
                        raw_data[k] = v

                # Calculate KPIs
                revenue_impact = (
                    float(scores[i]) * float(monthly_fees[i]) 
                    if monthly_fees is not None and i < len(monthly_fees) 
                    else float(scores[i])
                )
                
                kpis_dict = {
                    "churn_percentile": float(percentiles[i]),
                    "risk_segment": str(segments_arr[i]),
                    "revenue_impact_score": float(revenue_impact),
                    "retention_priority": _retention_priority(float(scores[i]), str(segments_arr[i])),
                }

                batch_records.append(
                    BatchRecord(
                        upload_id=upload.id,
                        row_index=i,
                        customer_ref=customer_ref,
                        raw_data=raw_data,
                        churn_score=float(scores[i]),
                        churn_percentile=float(percentiles[i]),
                        risk_segment=str(segments_arr[i]),
                        kpis=kpis_dict,
                    )
                )

                # Insert in batches for better performance
                if len(batch_records) >= BATCH_INSERT_SIZE:
                    db.add_all(batch_records)
                    await db.flush()
                    batch_records = []
                    logger.debug(f"Inserted batch of {BATCH_INSERT_SIZE} records")

            # Insert remaining records
            if batch_records:
                db.add_all(batch_records)
                await db.flush()
                logger.debug(f"Inserted final batch of {len(batch_records)} records")

            await db.commit()
            logger.info(f"Successfully stored {len(df)} records to database (upload_id={upload_id})")
            
    except HTTPException:
        # Re-raise HTTP exceptions (like database connection errors)
        raise
    except Exception as e:
        logger.error(f"Database error during large upload: {e!s}", exc_info=True)
        # Raise HTTP exception instead of silently failing
        raise HTTPException(
            status_code=500,
            detail=f"Failed to store data to database: {str(e)}"
        )

    # Return sample results (first 1000 for preview)
    results = []
    sample_size = min(len(df), MAX_RETURN_ROWS)
    for i in range(sample_size):
        ref = (
            str(customer_refs.iloc[i]) 
            if customer_refs is not None and i < len(customer_refs) 
            else None
        )
        kpis = BatchRecordKpis(
            churn_percentile=round(percentiles[i], 2),
            risk_segment=str(segments_arr[i]),
            revenue_impact_score=round(
                float(scores[i]) * (monthly_fees[i] if monthly_fees is not None and i < len(monthly_fees) else 1.0), 
                2
            ),
            retention_priority=_retention_priority(float(scores[i]), str(segments_arr[i])),
        )
        results.append(
            BatchRecordResult(
                row_index=i,
                customer_ref=ref,
                churn_score=round(float(scores[i]), 4),
                churn_percentile=round(percentiles[i], 2),
                risk_segment=str(segments_arr[i]),
                kpis=kpis,
            )
        )

    return BatchUploadResponse(
        upload_id=upload_id,
        filename=file.filename or "unknown",
        total_rows=len(df),
        dataset_stats=stats,
        kpis_summary=kpis_summary,
        results=results,
        sample_size=sample_size if sample_size < len(df) else None,
    )
