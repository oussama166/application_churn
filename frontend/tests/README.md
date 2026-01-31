# Frontend Tests

This directory contains mock test files for the frontend React/Next.js application.

## Structure

- `setup.ts`: Jest configuration and global test setup
- `mocks/`: Mock data and functions
  - `apiMocks.ts`: Mock API responses
  - `storeMocks.ts`: Mock Redux store and state
- `components/`: Component tests
  - `Dashboard.test.tsx`: Dashboard component tests

## Running Tests

```bash
# Install dependencies (if not already installed)
npm install

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Mock Files

### `__mocks__/next-auth.js`
Mocks for NextAuth authentication functions.

### `__mocks__/@reduxjs/toolkit.js`
Mocks for Redux Toolkit functions.

## Test Utilities

### `mocks/apiMocks.ts`
Contains mock data for:
- Dashboard data
- Analytics uploads
- Upload details
- API response helpers

### `mocks/storeMocks.ts`
Contains:
- Mock Redux store
- Mock initial state
- Mock selectors and actions

## Writing New Tests

1. Create test files with `.test.tsx` or `.test.ts` extension
2. Use the provided mocks from `tests/mocks/`
3. Mock Next.js specific modules using `jest.mock()`
4. Use React Testing Library for component testing

## Example

```typescript
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import MyComponent from "@/app/components/MyComponent";
import { createMockStore } from "../mocks/storeMocks";

describe("MyComponent", () => {
  it("should render correctly", () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <MyComponent />
      </Provider>
    );
    expect(screen.getByText("Expected Text")).toBeInTheDocument();
  });
});
```
