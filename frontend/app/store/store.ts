import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from './api/baseApi';
import dashboardReducer from './slices/dashboardSlice';
import importReducer from './slices/importSlice';
import { persistImportState } from './slices/importSlice';

export const store = configureStore({
    reducer: {
        [baseApi.reducerPath]: baseApi.reducer,
        dashboard: dashboardReducer,
        import: importReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware()
            .concat(baseApi.middleware)
            .concat(persistImportState),
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
