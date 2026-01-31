"""Pydantic request/response schemas (validation)."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


# --- Health ---


class HealthResponse(BaseModel):
    model_config = ConfigDict(json_schema_extra={"example": {"status": "ok", "database": "connected"}})

    status: Literal["ok", "degraded"] = "ok"
    database: Literal["connected", "disconnected"] = "connected"


class ModelInfoResponse(BaseModel):
    """Model metadata (loaded at startup)."""

    loaded: bool
    features_count: int
    features: list[str]


# --- Churn score ---

# Raw feature columns (same schema as training input, no target/drop cols).
# Categorical: gender, region, offer_type, contract_type. Rest numeric.


class ChurnScoreInput(BaseModel):
    """Single-record input for churn scoring. Validated against training schema."""

    model_config = ConfigDict(extra="forbid")

    customer_ref: str | None = Field(default=None, max_length=128, description="Optional customer id for audit log")
    age: int = Field(ge=0, le=120, description="Customer age")
    gender: Literal["M", "F"] = Field(description="Gender")
    region: str = Field(min_length=1, max_length=128)
    tenure_months: int = Field(ge=0, le=200)
    offer_type: Literal["Basic", "Standard", "Premium"] = Field(description="Offer type")
    contract_type: Literal["prepaid", "postpaid"] = Field(description="Contract type")
    commitment_duration_months: int = Field(ge=0, le=36)
    months_to_contract_end: int = Field(ge=0, le=36)
    renewal_last_12m: int = Field(ge=0, le=1)
    music_pack: int = Field(ge=0, le=1)
    intl_calls: int = Field(ge=0, le=1)
    extra_data: int = Field(ge=0, le=1)
    monthly_fee: float = Field(ge=0.0, le=1000.0)
    last_bill_amount: float = Field(ge=0.0, le=1000.0)
    payment_history_score: float = Field(ge=0.0, le=1.0)
    late_payments_6m: int = Field(ge=0, le=20)
    unpaid_invoices: int = Field(ge=0, le=10)
    bill_variation_3m: float = Field(ge=-2.0, le=2.0)
    voice_minutes: float = Field(ge=0.0, le=2000.0)
    data_gb: float = Field(ge=0.0, le=500.0)
    sms_count: float = Field(ge=0.0, le=1000.0)
    usage_trend_3m: float = Field(ge=-2.0, le=2.0)
    roaming_days_3m: int = Field(ge=0, le=31)
    out_of_bundle_charges: float = Field(ge=0.0, le=500.0)
    network_incidents_3m: int = Field(ge=0, le=50)
    avg_download_mbps: float = Field(ge=0.0, le=200.0)
    drop_call_rate: float = Field(ge=0.0, le=1.0)
    tech_complaints_3m: int = Field(ge=0, le=50)
    support_calls_3m: int = Field(ge=0, le=50)
    billing_contacts: int = Field(ge=0, le=20)
    tech_contacts: int = Field(ge=0, le=20)
    commercial_contacts: int = Field(ge=0, le=20)
    tickets_opened_3m: int = Field(ge=0, le=50)
    tickets_closed_3m: int = Field(ge=0, le=50)
    avg_resolution_time_hours: float = Field(ge=0.0, le=200.0)


class ChurnScoreResponse(BaseModel):
    model_config = ConfigDict(json_schema_extra={"example": {"churn_score": 0.35, "risk_segment": "Medium"}})

    churn_score: float = Field(ge=0.0, le=1.0, description="Churn probability (0–1)")
    risk_segment: Literal["Low", "Medium", "High"] = Field(description="CRM risk segment")


class ScoreLogCreate(BaseModel):
    """Payload for logging a score to DB (internal)."""

    churn_score: float
    risk_segment: str
    customer_ref: str | None = None


class ScoreLogEntry(BaseModel):
    """Single log entry from DB."""

    id: int
    churn_score: float
    risk_segment: str
    customer_ref: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Batch upload ---


class BatchUploadStats(BaseModel):
    """Dataset statistics."""

    total_rows: int
    risk_segment_counts: dict[str, int]
    churn_score_mean: float
    churn_score_median: float
    churn_score_std: float
    churn_score_min: float
    churn_score_max: float
    high_risk_pct: float
    avg_monthly_fee: float | None = None
    high_risk_avg_fee: float | None = None


class BatchRecordKpis(BaseModel):
    """KPIs per churn prediction."""

    churn_percentile: float
    risk_segment: str
    revenue_impact_score: float | None = None
    retention_priority: str | None = None


class BatchRecordResult(BaseModel):
    """Single prediction result with KPIs."""

    row_index: int
    customer_ref: str | None
    phone_number: str | None = None
    churn_score: float
    churn_percentile: float
    risk_segment: str
    kpis: BatchRecordKpis


class BatchUploadResponse(BaseModel):
    """Response for batch upload."""

    upload_id: int
    filename: str
    total_rows: int
    dataset_stats: BatchUploadStats
    kpis_summary: dict
    results: list[BatchRecordResult]
    sample_size: int | None = None


class BatchUploadSummary(BaseModel):
    """Summary of a batch upload for listing."""

    upload_id: int
    filename: str
    total_rows: int
    status: str
    created_at: datetime
    kpis_summary: dict
    dataset_stats: BatchUploadStats | None = None

    model_config = ConfigDict(from_attributes=True)
