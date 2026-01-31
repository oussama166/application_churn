"""API routes."""

from fastapi import APIRouter

from app.api.routes import churn, dashboard, upload

api_router = APIRouter()
api_router.include_router(churn.router, prefix="/churn", tags=["churn"])
api_router.include_router(upload.router, prefix="/churn", tags=["churn"])
api_router.include_router(dashboard.router, tags=["dashboard"])