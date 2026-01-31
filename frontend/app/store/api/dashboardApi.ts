import { baseApi } from './baseApi';
import type { DashboardData } from '../types';

export const dashboardApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getDashboard: builder.query<DashboardData, string | undefined>({
            query: (dateRange) => {
                const params = dateRange ? `?date_range=${dateRange}` : '';
                return `/api/dashboard/metrics${params}`;
            },
            providesTags: ['Dashboard'],
        }),
    }),
});

export const { useGetDashboardQuery } = dashboardApi;
