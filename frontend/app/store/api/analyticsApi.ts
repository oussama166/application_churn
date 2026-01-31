import { baseApi } from './baseApi';
import type { BatchUploadSummary, BatchUploadResponse } from '../types';

export const analyticsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getAnalytics: builder.query<BatchUploadSummary[], { limit?: number; offset?: number }>({
            query: ({ limit = 50, offset = 0 }) => ({
                url: '/api/churn/uploads',
                params: { limit, offset },
            }),
            providesTags: ['Dashboard'],
        }),
        getUploadDetails: builder.query<BatchUploadResponse, number>({
            query: (uploadId) => `/api/churn/upload/${uploadId}`,
            providesTags: ['Dashboard'],
        }),
    }),
});

export const { useGetAnalyticsQuery, useGetUploadDetailsQuery } = analyticsApi;
