// API Response Types
export interface KpiData {
    title: string;
    value: string;
    trend: string;
    trendLabel: string;
    iconType: string;
    color: string;
    isAlert: boolean;
}

export interface ClientData {
    id: string;
    phone: string;
    score: number;
    segment: string;
    action: string;
}

export interface ChartData {
    name?: string;
    month?: string;
    value: number;
    color?: string;
}

export interface ArpuData {
    tier: string;
    avgRev: string;
    risk: string;
    riskColor: string;
}

export interface ContractChurnData {
    type: string;
    churn_pct: number;
    total: number;
}

export interface DashboardData {
    kpis: KpiData[];
    churn_evolution: ChartData[];
    risk_distribution: ChartData[];
    arpu_analysis: ArpuData[];
    clients_to_treat: ClientData[];
    contract_churn?: ContractChurnData[];
}

// Import Types
export interface FieldMapping {
    id: number;
    key: string;
    label: string;
    type: 'string' | 'number' | 'date' | 'boolean';
    required: boolean;
    csvHeader: string;
    status: 'error' | 'matched' | 'warning';
    desc: string;
}

export interface ImportState {
    activeStep: number;
    mappings: FieldMapping[];
    file: File | null;
    csvColumns: string[];
    rawCsvData: any[];
    isComplete: boolean;
}

// Batch Upload Types (from backend)
export interface BatchUploadStats {
    total_rows: number;
    risk_segment_counts: Record<string, number>;
    churn_score_mean: number;
    churn_score_median: number;
    churn_score_std: number;
    churn_score_min: number;
    churn_score_max: number;
    high_risk_pct: number;
    avg_monthly_fee: number | null;
    high_risk_avg_fee: number | null;
}

export interface BatchRecordKpis {
    churn_percentile: number;
    risk_segment: string;
    revenue_impact_score: number | null;
    retention_priority: string | null;
}

export interface BatchRecordResult {
    row_index: number;
    customer_ref: string | null;
    phone_number: string | null;
    churn_score: number;
    churn_percentile: number;
    risk_segment: string;
    kpis: BatchRecordKpis;
}

export interface BatchUploadResponse {
    upload_id: number;
    filename: string;
    total_rows: number;
    dataset_stats: BatchUploadStats;
    kpis_summary: Record<string, any>;
    results: BatchRecordResult[];
    sample_size: number | null;
}

export interface BatchUploadSummary {
    upload_id: number;
    filename: string;
    total_rows: number;
    status: string;
    created_at: string;
    kpis_summary: Record<string, any>;
    dataset_stats: BatchUploadStats | null;
}

// RootState is now inferred from the store
// Import it from store.ts instead
