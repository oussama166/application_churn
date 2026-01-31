import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import type { ClientData } from '../types';

interface DashboardState {
    clientQuery: string;
    dateRange: string;
}

const initialState: DashboardState = {
    clientQuery: '',
    dateRange: '30_days',
};

const dashboardSlice = createSlice({
    name: 'dashboard',
    initialState,
    reducers: {
        setClientQuery: (state, action: PayloadAction<string>) => {
            state.clientQuery = action.payload;
        },
        setDateRange: (state, action: PayloadAction<string>) => {
            state.dateRange = action.payload;
        },
    },
});

export const { setClientQuery, setDateRange } = dashboardSlice.actions;

// Selectors
export const selectClientQuery = (state: RootState) => state.dashboard.clientQuery;
export const selectDateRange = (state: RootState) => state.dashboard.dateRange;

// Helper function for phone normalization
const normalizePhone = (value: string) =>
    (value || '')
        .toString()
        .trim()
        .replace(/^00/, '+')
        .replace(/\D/g, '');

// Memoized selector factory for filtered clients
export const makeSelectFilteredClients = (clients: ClientData[]) => 
    createSelector(
        [(state: RootState) => state.dashboard.clientQuery],
        (clientQuery) => {
            if (!clients || clients.length === 0) return [];

            const qRaw = clientQuery.trim();
            if (!qRaw) return clients;

            const qLower = qRaw.toLowerCase();
            const qDigits = normalizePhone(qRaw);

            return clients.filter((c) => {
                const id = (c.id || '').toLowerCase();
                const phoneDigits = normalizePhone(c.phone || '');
                const matchId = id.includes(qLower);
                const matchPhone = qDigits.length >= 3 && phoneDigits.includes(qDigits);
                return matchId || matchPhone;
            });
        }
    );

export default dashboardSlice.reducer;
