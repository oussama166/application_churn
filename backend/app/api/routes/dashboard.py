"""Dashboard metrics and analytics endpoints."""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import BatchRecord, BatchUpload, get_db

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/dashboard/metrics")
async def get_dashboard_data(
    date_range: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """
    Calculate and return dashboard metrics from batch uploads.
    Aggregates data from completed uploads filtered by date range.
    
    Args:
        date_range: Optional filter - "7_days", "30_days", "90_days", or "year"
    """
    try:
        # Calculate date filter based on date_range parameter
        now = datetime.now(timezone.utc)
        date_filter = None
        
        if date_range == "7_days":
            date_filter = now - timedelta(days=7)
        elif date_range == "30_days":
            date_filter = now - timedelta(days=30)
        elif date_range == "90_days":
            date_filter = now - timedelta(days=90)
        elif date_range == "year":
            date_filter = now - timedelta(days=365)
        
        # Build query with optional date filter
        query = select(BatchUpload).where(BatchUpload.status == "completed")
        if date_filter:
            query = query.where(BatchUpload.created_at >= date_filter)
        
        # Get filtered completed uploads
        uploads_result = await db.execute(query)
        uploads = uploads_result.scalars().all()
        
        if not uploads:
            # Return empty dashboard with zeros if no data
            return {
                "kpis": [
                    {
                        "title": "Total Clients",
                        "value": "0",
                        "trend": "0",
                        "trendLabel": "téléversements",
                        "iconType": "Groups",
                        "color": "#4285F4",
                        "isAlert": False,
                    },
                    {
                        "title": "Clients à Risque Élevé",
                        "value": "0",
                        "trend": "0%",
                        "trendLabel": "du total",
                        "iconType": "Warning",
                        "color": "#EA4335",
                        "isAlert": False,
                    },
                    {
                        "title": "Score de Désabonnement Moyen",
                        "value": "0%",
                        "trend": "Normal",
                        "trendLabel": "niveau de risque",
                        "iconType": "TrendingDown",
                        "color": "#34A853",
                        "isAlert": False,
                    },
                    {
                        "title": "Revenus en Péril",
                        "value": "$0",
                        "trend": "0%",
                        "trendLabel": "risque élevé",
                        "iconType": "Warning",
                        "color": "#FBBC04",
                        "isAlert": False,
                    },
                ],
                "churn_evolution": [],
                "risk_distribution": [
                    {"name": "High", "value": 0, "color": "#C62828"},
                    {"name": "Medium", "value": 0, "color": "#EF6C00"},
                    {"name": "Low", "value": 0, "color": "#2E7D32"},
                ],
                "arpu_analysis": [],
                "clients_to_treat": [],
                "contract_churn": [],
            }
        
        # Get all records from completed uploads
        upload_ids = [upload.id for upload in uploads]
        records_result = await db.execute(
            select(BatchRecord)
            .where(BatchRecord.upload_id.in_(upload_ids))
            .order_by(BatchRecord.churn_score.desc())
        )
        all_records = records_result.scalars().all()
        
        if not all_records:
            return {
                "kpis": [
                    {
                        "title": "Total Customers",
                        "value": "0",
                        "trend": f"+{len(uploads)}",
                        "trendLabel": "des téléversements",
                        "iconType": "Groups",
                        "color": "#4285F4",
                        "isAlert": False,
                    },
                    {
                        "title": "Clients à Risque Élevé",
                        "value": "0",
                        "trend": "0%",
                        "trendLabel": "du total",
                        "iconType": "Warning",
                        "color": "#EA4335",
                        "isAlert": False,
                    },
                    {
                        "title": "Score de Désabonnement Moyen",
                        "value": "0%",
                        "trend": "Normal",
                        "trendLabel": "niveau de risque",
                        "iconType": "TrendingDown",
                        "color": "#34A853",
                        "isAlert": False,
                    },
                    {
                        "title": "Revenus en Péril",
                        "value": "$0",
                        "trend": "0%",
                        "trendLabel": "risque élevé",
                        "iconType": "Warning",
                        "color": "#FBBC04",
                        "isAlert": False,
                    },
                ],
                "churn_evolution": [],
                "risk_distribution": [
                    {"name": "High", "value": 0, "color": "#C62828"},
                    {"name": "Medium", "value": 0, "color": "#EF6C00"},
                    {"name": "Low", "value": 0, "color": "#2E7D32"},
                ],
                "arpu_analysis": [],
                "clients_to_treat": [],
                "contract_churn": [],
            }
        
        total_records = len(all_records)
        
        # Calculate risk distribution
        high_risk = sum(1 for r in all_records if r.risk_segment == "High")
        medium_risk = sum(1 for r in all_records if r.risk_segment == "Medium")
        low_risk = sum(1 for r in all_records if r.risk_segment == "Low")
        
        high_risk_pct = (high_risk / total_records * 100) if total_records > 0 else 0
        medium_risk_pct = (medium_risk / total_records * 100) if total_records > 0 else 0
        low_risk_pct = (low_risk / total_records * 100) if total_records > 0 else 0
        
        # Calculate average churn score
        avg_churn_score = sum(r.churn_score for r in all_records) / total_records if total_records > 0 else 0
        
        # Calculate total revenue impact (sum of revenue_impact_score from KPIs)
        total_revenue_impact = 0
        for record in all_records:
            if record.kpis and isinstance(record.kpis, dict):
                revenue_impact = record.kpis.get("revenue_impact_score", 0)
                if revenue_impact:
                    total_revenue_impact += float(revenue_impact)
        
        # Get top priority clients (high risk, sorted by churn score)
        top_clients = []
        high_risk_records = [r for r in all_records if r.risk_segment == "High"]
        high_risk_records.sort(key=lambda x: x.churn_score, reverse=True)
        
        for record in high_risk_records[:100]:  # Top 100 high-risk clients
            # Extract phone number from raw_data
            phone_number = None
            if record.raw_data and isinstance(record.raw_data, dict):
                phone_number = record.raw_data.get("phone_number") or record.raw_data.get("phone")
                if phone_number is not None:
                    phone_number = str(phone_number)
            
            # Determine action based on retention priority
            retention_priority = "urgent"
            if record.kpis and isinstance(record.kpis, dict):
                retention_priority = record.kpis.get("retention_priority", "urgent")
            
            action_map = {
                "urgent": "Contact immédiat requis",
                "high": "Plan de rétention prioritaire",
                "standard": "Surveillance continue",
            }
            action = action_map.get(retention_priority, "Surveillance continue")
            
            top_clients.append({
                "id": record.customer_ref or f"ID-{record.row_index}",
                "phone": phone_number or "N/A",
                "score": float(record.churn_score),
                "segment": record.risk_segment,
                "action": action,
            })
        
        # Calculate ARPU analysis (group by monthly_fee ranges)
        arpu_tiers = {
            "Premium": {"sum": 0, "count": 0, "high_risk": 0},
            "Standard": {"sum": 0, "count": 0, "high_risk": 0},
            "Basic": {"sum": 0, "count": 0, "high_risk": 0},
        }
        
        for record in all_records:
            if record.raw_data and isinstance(record.raw_data, dict):
                monthly_fee = record.raw_data.get("monthly_fee")
                if monthly_fee:
                    try:
                        fee = float(monthly_fee)
                        is_high_risk = record.risk_segment == "High"
                        
                        if fee >= 20:
                            tier = "Premium"
                        elif fee >= 10:
                            tier = "Standard"
                        else:
                            tier = "Basic"
                        
                        arpu_tiers[tier]["sum"] += fee
                        arpu_tiers[tier]["count"] += 1
                        if is_high_risk:
                            arpu_tiers[tier]["high_risk"] += 1
                    except (ValueError, TypeError):
                        pass
        
        arpu_analysis = []
        for tier_name, tier_data in arpu_tiers.items():
            if tier_data["count"] > 0:
                avg_rev = tier_data["sum"] / tier_data["count"]
                risk_pct = (tier_data["high_risk"] / tier_data["count"] * 100) if tier_data["count"] > 0 else 0
                
                if risk_pct >= 40:
                    risk_level = "High"
                    risk_color = "error"
                elif risk_pct >= 20:
                    risk_level = "Medium"
                    risk_color = "warning"
                else:
                    risk_level = "Low"
                    risk_color = "success"
                
                arpu_analysis.append({
                    "tier": tier_name,
                    "avgRev": f"${avg_rev:.2f}",
                    "risk": risk_level,
                    "riskColor": risk_color,
                })
        
        # Calculate churn evolution (last 6 months - simplified to show trend)
        # For now, we'll use upload dates to simulate monthly data
        churn_evolution = []
        if uploads:
            # Group by upload month
            monthly_data: dict[str, list[float]] = {}
            for upload in uploads:
                if upload.created_at:
                    month_key = upload.created_at.strftime("%Y-%m")
                    if month_key not in monthly_data:
                        monthly_data[month_key] = []
                    # Get records for this upload
                    upload_records = [r for r in all_records if r.upload_id == upload.id]
                    if upload_records:
                        avg_score = sum(r.churn_score for r in upload_records) / len(upload_records)
                        monthly_data[month_key].append(avg_score)
            
            # Calculate average per month
            for month, scores in sorted(monthly_data.items()):
                avg_score = sum(scores) / len(scores) if scores else 0
                churn_evolution.append({
                    "month": month,
                    "value": round(avg_score * 100, 2),
                })
        
        # Calculate churn by contract type
        contract_data = {
            "prepaid": {"total": 0, "high_risk": 0, "avg_churn": []},
            "postpaid": {"total": 0, "high_risk": 0, "avg_churn": []},
        }
        
        for record in all_records:
            if record.raw_data and isinstance(record.raw_data, dict):
                contract_type = record.raw_data.get("contract_type", "").lower()
                if contract_type in contract_data:
                    contract_data[contract_type]["total"] += 1
                    contract_data[contract_type]["avg_churn"].append(record.churn_score)
                    if record.risk_segment == "High":
                        contract_data[contract_type]["high_risk"] += 1
        
        # Calculate contract churn percentages
        contract_churn = []
        for contract_type, data in contract_data.items():
            if data["total"] > 0:
                avg_churn_pct = (sum(data["avg_churn"]) / len(data["avg_churn"]) * 100) if data["avg_churn"] else 0
                contract_churn.append({
                    "type": contract_type,
                    "churn_pct": round(avg_churn_pct, 1),
                    "total": data["total"],
                })
        
        # Build KPIs
        kpis = [
            {
                "title": "Total Clients",
                "value": f"{total_records:,}",
                "trend": f"+{len(uploads)}",
                "trendLabel": "des téléversements",
                "iconType": "Groups",
                "color": "#4285F4",
                "isAlert": False,
            },
            {
                "title": "Clients à Risque Élevé",
                "value": f"{high_risk:,}",
                "trend": f"{high_risk_pct:.1f}%",
                "trendLabel": "du total",
                "iconType": "Warning",
                "color": "#EA4335",
                "isAlert": high_risk_pct > 30,
            },
            {
                "title": "Score de Désabonnement Moyen",
                "value": f"{avg_churn_score * 100:.1f}%",
                "trend": f"{'Élevé' if avg_churn_score > 0.5 else 'Normal'}",
                "trendLabel": "niveau de risque",
                "iconType": "TrendingUp" if avg_churn_score > 0.5 else "TrendingDown",
                "color": "#EA4335" if avg_churn_score > 0.5 else "#34A853",
                "isAlert": avg_churn_score > 0.5,
            },
            {
                "title": "Revenus en Péril",
                "value": f"${total_revenue_impact:,.0f}",
                "trend": f"{high_risk_pct:.1f}%",
                "trendLabel": "risque élevé",
                "iconType": "Warning",
                "color": "#FBBC04",
                "isAlert": total_revenue_impact > 10000,
            },
        ]
        
        return {
            "kpis": kpis,
            "churn_evolution": churn_evolution,
            "risk_distribution": [
                {"name": "High", "value": high_risk, "color": "#C62828"},
                {"name": "Medium", "value": medium_risk, "color": "#EF6C00"},
                {"name": "Low", "value": low_risk, "color": "#2E7D32"},
            ],
            "arpu_analysis": arpu_analysis,
            "clients_to_treat": top_clients,
            "contract_churn": contract_churn,
        }
        
    except Exception as e:
        logger.error(f"Error calculating dashboard data: {e!s}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to calculate dashboard metrics: {str(e)}")
