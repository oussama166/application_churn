// Mock for Redux Toolkit
export const createApi = jest.fn(() => ({
  reducerPath: "api",
  reducer: jest.fn(),
  middleware: jest.fn(),
  injectEndpoints: jest.fn((fn) => fn({})),
}));

export const fetchBaseQuery = jest.fn(() => jest.fn());

export const createSlice = jest.fn(() => ({
  name: "testSlice",
  reducer: jest.fn(),
  actions: {},
}));

export const configureStore = jest.fn(() => ({
  dispatch: jest.fn(),
  getState: jest.fn(() => ({})),
  subscribe: jest.fn(),
  replaceReducer: jest.fn(),
}));
