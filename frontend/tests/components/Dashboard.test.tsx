/**
 * Mock test file for Dashboard component
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import DashboardPage from "@/app/dashboard/page";
import { createMockStore, mockInitialState } from "../mocks/storeMocks";
import { mockDashboardData } from "../mocks/apiMocks";

// Mock the dashboard API hook
jest.mock("@/app/store/api/dashboardApi", () => ({
  useGetDashboardQuery: jest.fn(() => ({
    data: mockDashboardData,
    isLoading: false,
    isError: false,
    error: null,
  })),
}));

// Mock Redux hooks
jest.mock("@/app/store/hooks", () => ({
  useAppDispatch: jest.fn(() => jest.fn()),
  useAppSelector: jest.fn((selector) => selector(mockInitialState)),
}));

describe("Dashboard Component", () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore();
  });

  it("should render dashboard with KPIs", () => {
    render(
      <Provider store={store}>
        <DashboardPage />
      </Provider>
    );

    // Check if KPIs are rendered
    expect(screen.getByText(/Total Clients/i)).toBeInTheDocument();
    expect(screen.getByText(/Clients à Risque Élevé/i)).toBeInTheDocument();
  });

  it("should display loading state", () => {
    const { useGetDashboardQuery } = require("@/app/store/api/dashboardApi");
    useGetDashboardQuery.mockReturnValue({
      data: null,
      isLoading: true,
      isError: false,
      error: null,
    });

    render(
      <Provider store={store}>
        <DashboardPage />
      </Provider>
    );

    // Check for loading indicator
    expect(screen.getByText(/Chargement/i)).toBeInTheDocument();
  });

  it("should handle empty data", () => {
    const { useGetDashboardQuery } = require("@/app/store/api/dashboardApi");
    useGetDashboardQuery.mockReturnValue({
      data: {
        kpis: [],
        churn_evolution: [],
        risk_distribution: [],
        arpu_analysis: [],
        clients_to_treat: [],
        contract_churn: [],
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    render(
      <Provider store={store}>
        <DashboardPage />
      </Provider>
    );

    // Should still render the dashboard structure
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
  });
});
