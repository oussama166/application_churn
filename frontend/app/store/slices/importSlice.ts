import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { FieldMapping, ImportState } from '../types';

// Load from localStorage on initialization
const loadFromStorage = (): Partial<ImportState> => {
    if (typeof window === 'undefined') return {};
    
    try {
        const stored = localStorage.getItem('importState');
        if (stored) {
            const parsed = JSON.parse(stored);
            // Don't restore file object (can't be serialized)
            return {
                ...parsed,
                file: null,
            };
        }
    } catch (error) {
        console.error('Failed to load import state from localStorage:', error);
    }
    return {};
};

const initialState: ImportState = {
    activeStep: 0,
    mappings: [],
    file: null,
    csvColumns: [],
    rawCsvData: [],
    isComplete: false,
    ...loadFromStorage(),
};

const importSlice = createSlice({
    name: 'import',
    initialState,
    reducers: {
        setActiveStep: (state, action: PayloadAction<number>) => {
            state.activeStep = action.payload;
        },
        setMappings: (state, action: PayloadAction<FieldMapping[]>) => {
            state.mappings = action.payload;
        },
        setFile: (state, action: PayloadAction<File | null>) => {
            state.file = action.payload;
        },
        setCsvColumns: (state, action: PayloadAction<string[]>) => {
            state.csvColumns = action.payload;
        },
        setRawCsvData: (state, action: PayloadAction<any[]>) => {
            state.rawCsvData = action.payload;
        },
        setIsComplete: (state, action: PayloadAction<boolean>) => {
            state.isComplete = action.payload;
        },
        resetImport: (state) => {
            state.activeStep = 0;
            state.mappings = [];
            state.file = null;
            state.csvColumns = [];
            state.rawCsvData = [];
            state.isComplete = false;
            if (typeof window !== 'undefined') {
                localStorage.removeItem('importState');
            }
        },
    },
});

// Middleware to persist to localStorage
export const persistImportState = (store: any) => (next: any) => (action: any) => {
    const result = next(action);
    
    if (action.type?.startsWith('import/')) {
        const state = store.getState();
        if (typeof window !== 'undefined' && state.import) {
            try {
                // Don't persist file object
                const { file, ...stateToPersist } = state.import;
                localStorage.setItem('importState', JSON.stringify(stateToPersist));
            } catch (error) {
                console.error('Failed to persist import state to localStorage:', error);
            }
        }
    }
    
    return result;
};

export const {
    setActiveStep,
    setMappings,
    setFile,
    setCsvColumns,
    setRawCsvData,
    setIsComplete,
    resetImport,
} = importSlice.actions;

export default importSlice.reducer;
