/**
 * Mock data and functions for API testing
 */

// Mock dashboard data
export const mockDashboardData = {
  kpis: [
    {
      title: "Total Clients",
      value: "15000",
      trend: "5",
      trendLabel: "téléversements",
      iconType: "Groups",
      color: "#4285F4",
      isAlert: false,
    },
    {
      title: "Clients à Risque Élevé",
      value: "5727",
      trend: "38.18%",
      trendLabel: "du total",
      iconType: "Warning",
      color: "#EA4335",
      isAlert: true,
    },
    {
      title: "Score de Désabonnement Moyen",
      value: "49.45%",
      trend: "Normal",
      trendLabel: "niveau de risque",
      iconType: "TrendingDown",
      color: "#34A853",
      isAlert: false,
    },
    {
      title: "Revenus en Péril",
      value: "$94,000",
      trend: "38.18%",
      trendLabel: "risque élevé",
      iconType: "Warning",
      color: "#FBBC04",
      isAlert: true,
    },
  ],
  churn_evolution: [
    { month: "Jan", value: 0.45 },
    { month: "Fév", value: 0.48 },
    { month: "Mar", value: 0.46 },
  ],
  risk_distribution: [
    { name: "High", value: 5727, color: "#C62828" },
    { name: "Medium", value: 9273, color: "#EF6C00" },
    { name: "Low", value: 0, color: "#2E7D32" },
  ],
  arpu_analysis: [
    { segment: "High Risk", arpu: 16.42 },
    { segment: "Medium Risk", arpu: 16.33 },
  ],
  clients_to_treat: [
    {
      customer_ref: "CUST001",
      churn_score: 0.85,
      risk_segment: "High",
      monthly_fee: 25.50,
    },
  ],
  contract_churn: [
    { contract_type: "prepaid", churn_rate: 0.52 },
    { contract_type: "postpaid", churn_rate: 0.47 },
  ],
};

// Mock analytics uploads list
export const mockAnalyticsUploads = [
  {
    id: 1,
    filename: "churn_dataset_synthetic_v1.csv",
    total_rows: 15000,
    status: "completed",
    created_at: "2026-01-31T10:00:00Z",
    kpis: {
      high_risk_count: 5727,
      high_risk_pct: 38.18,
      avg_churn_score: 0.4945,
    },
  },
  {
    id: 2,
    filename: "churn_dataset_synthetic_v2.csv",
    total_rows: 8000,
    status: "completed",
    created_at: "2026-01-30T15:30:00Z",
    kpis: {
      high_risk_count: 2800,
      high_risk_pct: 35.0,
      avg_churn_score: 0.465,
    },
  },
];

// Mock upload details
export const mockUploadDetails = {
  id: 1,
  filename: "churn_dataset_synthetic_v1.csv",
  total_rows: 15000,
  status: "completed",
  created_at: "2026-01-31T10:00:00Z",
  dataset_stats: {
    total_rows: 15000,
    risk_segment_counts: { High: 5727, Medium: 9273, Low: 0 },
    churn_score_mean: 0.4945,
    churn_score_median: 0.4934,
  },
  kpis: {
    high_risk_count: 5727,
    high_risk_pct: 38.18,
    avg_churn_score: 0.4945,
  },
  records: [
    {
      id: 1,
      customer_ref: "CUST001",
      phone_number: "+212612345678",
      churn_score: 0.85,
      risk_segment: "High",
      monthly_fee: 25.50,
      raw_data: {},
    },
    {
      id: 2,
      customer_ref: "CUST002",
      phone_number: "+212612345679",
      churn_score: 0.35,
      risk_segment: "Low",
      monthly_fee: 15.00,
      raw_data: {},
    },
  ],
};

// Mock API response functions
export const mockApiResponse = {
  success: (data: any) => ({
    data,
    error: null,
    isLoading: false,
    isSuccess: true,
    isError: false,
  }),
  error: (error: any) => ({
    data: null,
    error,
    isLoading: false,
    isSuccess: false,
    isError: true,
  }),
  loading: () => ({
    data: null,
    error: null,
    isLoading: true,
    isSuccess: false,
    isError: false,
  }),
};

// Mock file upload response
export const mockUploadResponse = {
  upload_id: 1,
  filename: "test.csv",
  total_rows: 100,
  status: "processing",
  message: "File uploaded successfully",
};
