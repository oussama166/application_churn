import { baseApi } from './baseApi';
import type { BatchUploadResponse } from '../types';

export interface StoreResultsRequest {
    data: any[];
}

export interface StoreResultsResponse {
    message?: string;
    success?: boolean;
    [key: string]: any;
}

export interface FileUploadRequest {
    file: File;
}

export const importsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        storeResults: builder.mutation<StoreResultsResponse, StoreResultsRequest>({
            query: (body) => ({
                url: '/api/predict/store-results',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Dashboard'],
        }),
        uploadLargeFile: builder.mutation<BatchUploadResponse, FileUploadRequest>({
            query: ({ file }) => {
                const formData = new FormData();
                formData.append('file', file);
                return {
                    url: '/api/churn/upload-large',
                    method: 'POST',
                    body: formData,
                    // RTK Query will automatically handle FormData and not set Content-Type
                    // Browser will set it with boundary for multipart/form-data
                };
            },
            invalidatesTags: ['Dashboard'],
        }),
    }),
});

export const { useStoreResultsMutation, useUploadLargeFileMutation } = importsApi;
