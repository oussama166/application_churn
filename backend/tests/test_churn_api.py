"""Tests for churn prediction API endpoints."""

import pytest
from unittest.mock import patch, MagicMock
from fastapi import status
from fastapi.testclient import TestClient

from app.main import app
from tests.conftest import sample_churn_input


@pytest.fixture
def client():
    """Create a test client."""
    return TestClient(app)


class TestChurnHealthEndpoint:
    """Tests for /api/churn/health endpoint."""

    @patch("app.api.routes.churn.check_db")
    @patch("app.api.routes.churn.check_tables_exist")
    def test_health_check_success(self, mock_check_tables, mock_check_db, client):
        """Test health check when database is connected."""
        mock_check_db.return_value = True
        mock_check_tables.return_value = {
            "churn_score_log": True,
            "batch_upload": True,
            "batch_record": True,
        }

        response = client.get("/api/churn/health")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "ok"
        assert data["database"] == "connected"

    @patch("app.api.routes.churn.check_db")
    def test_health_check_database_disconnected(self, mock_check_db, client):
        """Test health check when database is disconnected."""
        mock_check_db.return_value = False

        response = client.get("/api/churn/health")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "degraded"
        assert data["database"] == "disconnected"


class TestChurnScoreEndpoint:
    """Tests for /api/churn/score endpoint."""

    @patch("app.api.routes.churn._get_model")
    @patch("app.api.routes.churn.feature_engineering")
    @patch("app.api.routes.churn.transform")
    @patch("app.api.routes.churn._risk_segment")
    def test_score_single_customer(
        self,
        mock_risk_segment,
        mock_transform,
        mock_feature_engineering,
        mock_get_model,
        client,
        mock_churn_model,
        mock_preprocessor,
        sample_churn_input,
    ):
        """Test scoring a single customer."""
        # Setup mocks
        mock_get_model.return_value = (mock_churn_model, mock_preprocessor)
        mock_feature_engineering.return_value = MagicMock()
        mock_transform.return_value = [[0.1, 0.2, 0.3]]
        mock_risk_segment.return_value = ["High"]
        mock_churn_model.predict_proba.return_value = [[0.3, 0.7]]

        response = client.post("/api/churn/score", json=sample_churn_input)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "churn_score" in data
        assert "risk_segment" in data
        assert data["churn_score"] == pytest.approx(0.7, abs=0.01)
        assert data["risk_segment"] == "High"

    def test_score_invalid_input(self, client):
        """Test scoring with invalid input data."""
        invalid_input = {"customer_ref": "CUST001"}  # Missing required fields

        response = client.post("/api/churn/score", json=invalid_input)

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestChurnModelInfoEndpoint:
    """Tests for /api/churn/model-info endpoint."""

    @patch("app.api.routes.churn._get_model")
    def test_model_info_success(
        self,
        mock_get_model,
        client,
        mock_churn_model,
        mock_preprocessor,
    ):
        """Test getting model information."""
        mock_get_model.return_value = (mock_churn_model, mock_preprocessor)

        response = client.get("/api/churn/model-info")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "loaded" in data
        assert "artifacts_dir" in data
