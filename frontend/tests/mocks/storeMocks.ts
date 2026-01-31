/**
 * Mock Redux store and state
 */

import { configureStore } from "@reduxjs/toolkit";

// Mock initial state
export const mockInitialState = {
  dashboard: {
    clientQuery: "",
    dateRange: "30_days",
  },
  import: {
    activeStep: 0,
    mappings: {},
    file: null,
    csvColumns: [],
    rawCsvData: [],
    isComplete: false,
  },
  api: {
    queries: {},
    mutations: {},
  },
};

// Mock store
export const createMockStore = (initialState = mockInitialState) => {
  return configureStore({
    reducer: {
      dashboard: (state = initialState.dashboard) => state,
      import: (state = initialState.import) => state,
      api: (state = initialState.api) => state,
    },
    preloadedState: initialState,
  });
};

// Mock selectors
export const mockSelectors = {
  selectDateRange: () => "30_days",
  selectClientQuery: () => "",
  selectImportState: () => mockInitialState.import,
};

// Mock actions
export const mockActions = {
  setDateRange: jest.fn(),
  setClientQuery: jest.fn(),
  setImportStep: jest.fn(),
  setImportMappings: jest.fn(),
  resetImport: jest.fn(),
};
