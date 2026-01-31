# Backend Tests

This directory contains mock test files for the backend API.

## Structure

- `conftest.py`: Pytest configuration and shared fixtures
- `test_churn_api.py`: Tests for churn prediction endpoints
- `test_upload_api.py`: Tests for file upload endpoints
- `test_dashboard_api.py`: Tests for dashboard metrics endpoints

## Running Tests

```bash
# Install test dependencies
pip install -r requirements.txt

# Run all tests
pytest

# Run specific test file
pytest tests/test_churn_api.py

# Run with coverage
pytest --cov=app --cov-report=html

# Run with verbose output
pytest -v
```

## Test Fixtures

The `conftest.py` file provides several useful fixtures:

- `client`: FastAPI test client
- `mock_db_session`: Mock database session
- `mock_churn_model`: Mock ML model
- `mock_preprocessor`: Mock data preprocessor
- `sample_churn_input`: Sample input data for testing
- `sample_batch_upload_data`: Sample batch upload data

## Mock Data

All mock data is defined in the fixtures and can be customized for specific test cases.

## Notes

- Tests use mocks to avoid requiring actual database connections or ML models
- Some tests may need adjustment based on actual async implementation
- Database-related tests use AsyncMock to simulate async database operations
