"""FastAPI application entrypoint."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import api_router
from app.core.config import settings
from app.core.database import init_db

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    # Load churn model at startup
    try:
        from index import load_churn_artifacts
        model, preprocessor, feature_names = load_churn_artifacts(str(settings.artifacts_dir))
        app.state.churn_model = model
        app.state.churn_preprocessor = preprocessor
        app.state.churn_feature_names = feature_names
        app.state.churn_loaded = True
        logger.info("Churn model loaded from %s", settings.artifacts_dir)
    except Exception as e:
        app.state.churn_loaded = False
        logger.warning("Churn model not loaded: %s", e)
    yield


app = FastAPI(
    title="Churn Prediction API",
    description="Score churn probability and risk segment (CRM-ready).",
    version="0.1.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Allow all headers (needed for file uploads with FormData)
    expose_headers=["*"],  # Expose all headers in response
)

app.include_router(api_router, prefix="/api")


@app.get("/")
def root():
    return {
        "message": "Churn Prediction API",
        "docs": "/docs",
        "health": "/api/churn/health",
        "model_info": "/api/churn/model-info",
        "score": "POST /api/churn/score",
        "score_batch": "POST /api/churn/score/batch",
        "upload": "POST /api/churn/upload (CSV/Excel)",
    }
