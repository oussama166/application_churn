import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Custom fetch function to handle FormData properly
const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    // If body is FormData, don't set Content-Type (browser will set it with boundary)
    if (init?.body instanceof FormData) {
        const headers = new Headers(init.headers);
        headers.delete('Content-Type');
        return fetch(input, { ...init, headers });
    }
    return fetch(input, init);
};

// Base API configuration pointing directly to FastAPI
// Use environment variable in production, fallback to localhost for development
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export const baseApi = createApi({
    reducerPath: 'api',
    baseQuery: fetchBaseQuery({
        baseUrl: API_BASE_URL,
        fetchFn: customFetch,
        prepareHeaders: (headers) => {
            // Set JSON content type by default
            // For FormData, customFetch will remove it
            headers.set('Content-Type', 'application/json');
            return headers;
        },
    }),
    tagTypes: ['Dashboard', 'Uploads'],
    endpoints: () => ({}),
});
