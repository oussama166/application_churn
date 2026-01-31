"""Pytest configuration and shared fixtures."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.core.database import get_db


@pytest.fixture
def client():
    """Create a test client for FastAPI."""
    return TestClient(app)


@pytest.fixture
def mock_db_session():
    """Create a mock database session."""
    session = AsyncMock(spec=AsyncSession)
    session.execute = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.close = AsyncMock()
    return session


@pytest.fixture
def override_get_db(mock_db_session):
    """Override the database dependency."""
    async def _get_db():
        yield mock_db_session
    return _get_db


@pytest.fixture
def mock_churn_model():
    """Create a mock churn prediction model."""
    model = MagicMock()
    model.predict_proba = MagicMock(return_value=[[0.3, 0.7]])  # [prob_no_churn, prob_churn]
    return model


@pytest.fixture
def mock_preprocessor():
    """Create a mock preprocessor."""
    preprocessor = MagicMock()
    preprocessor.transform = MagicMock(return_value=[[0.1, 0.2, 0.3, 0.4, 0.5]])
    return preprocessor


@pytest.fixture
def mock_app_state(mock_churn_model, mock_preprocessor):
    """Create a mock app state with loaded model."""
    app_state = MagicMock()
    app_state.churn_loaded = True
    app_state.churn_model = mock_churn_model
    app_state.churn_preprocessor = mock_preprocessor
    app_state.churn_feature_names = ["feature1", "feature2", "feature3"]
    return app_state


@pytest.fixture
def sample_churn_input():
    """Sample churn input data."""
    return {
        "customer_ref": "CUST001",
        "age": 35,
        "gender": "M",
        "region": "Casablanca-Settat",
        "tenure_months": 24,
        "offer_type": "Standard",
        "contract_type": "postpaid",
        "commitment_duration_months": 12,
        "months_to_contract_end": 6,
        "renewal_last_12m": 1,
        "music_pack": 0,
        "intl_calls": 0,
        "extra_data": 0,
        "monthly_fee": 25.50,
        "last_bill_amount": 24.80,
        "payment_history_score": 0.95,
        "late_payments_6m": 0,
        "unpaid_invoices": 0,
        "bill_variation_3m": 0.02,
        "voice_minutes": 450.0,
        "data_gb": 8.5,
        "sms_count": 120,
        "usage_trend_3m": 0.05,
        "roaming_days_3m": 2,
        "out_of_bundle_charges": 0.0,
        "network_incidents_3m": 0,
        "avg_download_mbps": 15.2,
        "drop_call_rate": 0.01,
        "tech_complaints_3m": 0,
        "support_calls_3m": 1,
        "billing_contacts": 0,
        "tech_contacts": 0,
        "commercial_contacts": 1,
        "tickets_opened_3m": 0,
        "tickets_closed_3m": 0,
        "avg_resolution_time_hours": 0.0,
    }


@pytest.fixture
def sample_batch_upload_data():
    """Sample batch upload data."""
    return {
        "id": 1,
        "filename": "test_data.csv",
        "total_rows": 100,
        "status": "completed",
        "created_at": "2026-01-31T10:00:00Z",
        "dataset_stats": {
            "total_rows": 100,
            "risk_segment_counts": {"High": 30, "Medium": 50, "Low": 20},
            "churn_score_mean": 0.45,
            "churn_score_median": 0.43,
        },
        "kpis": {
            "high_risk_count": 30,
            "high_risk_pct": 30.0,
            "avg_churn_score": 0.45,
        },
    }
