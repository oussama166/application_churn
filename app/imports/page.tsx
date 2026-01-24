'use client';

import React, { useState, useRef } from 'react';
import Papa from 'papaparse'; // Import the parser
import { useMutation } from '@tanstack/react-query';
import {
    Box, Typography, Paper, Stepper, Step, StepLabel, Button,
    Select, MenuItem, FormControl, Chip, Alert,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckIcon from '@mui/icons-material/Check';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

// --- CONFIGURATION ---
const STEPS = ['Upload Data', 'Validate & Map', 'Preview & Run'];

const INITIAL_MAPPING = [
    { id: 1, systemField: 'Customer ID', desc: 'Unique identifier', csvHeader: '', status: 'error', required: true, type: 'string' },
    { id: 2, systemField: 'MRR', desc: 'Monthly Recurring Revenue', csvHeader: '', status: 'error', required: true, type: 'number' },
    { id: 3, systemField: 'ARPU', desc: 'Avg Revenue Per User', csvHeader: '', status: 'error', required: true, type: 'number' },
    { id: 4, systemField: 'Subscription Start', desc: 'Date (ISO 8601)', csvHeader: '', status: 'error', required: true, type: 'date' },
];

export default function ImportPage() {
    // State
    const [activeStep, setActiveStep] = useState(0);
    const [mappings, setMappings] = useState(INITIAL_MAPPING);
    const [file, setFile] = useState<File | null>(null);
    const [csvColumns, setCsvColumns] = useState<string[]>([]);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isComplete, setIsComplete] = useState(false);

    // 1. Define the Mutation
    const mutation = useMutation({
        mutationFn: async (payload: any) => {
            const response = await fetch('/api/imports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error('Failed to upload data');
            }

            return response.json();
        },
        onSuccess: (data) => {
            console.log("Success:", data);
            setIsComplete(true); // Show success screen
        },
        onError: (error) => {
            console.error("Error:", error);
            alert("Upload failed. Please try again.");
        }
    });

    // Hidden Input Ref
    const fileInputRef = useRef<HTMLInputElement>(null);

    const validateColumnData = (rows: any[], columnName: string, type: string) => {
        let invalidCount = 0;

        // Check first 50 rows (or all rows if less)
        const rowsToCheck = rows.slice(0, 50);

        rowsToCheck.forEach(row => {
            const value = row[columnName];
            if (!value) return; // Skip empty for now (handled by required check)

            if (type === 'number') {
                // Remove currency symbols ($) and commas before checking
                const cleanValue = value.toString().replace(/[$,]/g, '');
                if (isNaN(parseFloat(cleanValue)) || !isFinite(cleanValue)) {
                    invalidCount++;
                }
            }
            else if (type === 'date') {
                // Simple date check
                if (isNaN(Date.parse(value))) {
                    invalidCount++;
                }
            }
        });

        return invalidCount;
    };

    // --- 1. HANDLE FILE UPLOAD ---
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = event.target.files?.[0];
        if (!uploadedFile) return;

        setFile(uploadedFile);

        // Parse the CSV to get headers and preview data
        Papa.parse(uploadedFile, {
            header: true, // Treat first row as headers
            skipEmptyLines: true,
            preview: 5, // Only parse first 5 rows for the preview
            complete: (results) => {
                // 1. Get Headers from the first row
                const headers = results.meta.fields || [];
                setCsvColumns(headers);
                setPreviewData(results.data);

                // 2. Auto-Map Logic (Optional Smart Matching)
                // Checks if CSV header roughly matches System field (e.g. "email" == "User Email")
                const newMappings = INITIAL_MAPPING.map(field => {
                    const match = headers.find(h =>
                        h.toLowerCase().includes(field.systemField.toLowerCase().split(' ')[0]) ||
                        h.toLowerCase() === field.systemField.toLowerCase()
                    );

                    return {
                        ...field,
                        csvHeader: match || '', // Auto-select if found
                        status: match ? 'matched' : (field.required ? 'error' : 'warning')
                    };
                });

                setMappings(newMappings);
                setActiveStep(1); // Move to next step
            },
            error: (error) => {
                console.error("Error parsing CSV:", error);
                alert("Failed to parse CSV file.");
            }
        });
    };

    // --- 2. HANDLE MAPPING CHANGES ---
    const handleMappingChange = (id: number, newValue: string) => {
        setMappings((prev) =>
            prev.map((field) => {
                if (field.id !== id) return field;

                // 1. Basic Required Check
                if (!newValue || newValue === 'select') {
                    return {
                        ...field,
                        csvHeader: '',
                        status: field.required ? 'error' : 'warning',
                        desc: field.required ? 'Required field' : 'Optional'
                    };
                }

                // 2. Type Validation (The new part)
                // We pass the entire 'previewData' state to check the values
                const invalidCount = validateColumnData(previewData, newValue, field.type);

                let newStatus = 'matched';
                let newDesc = field.desc; // Reset to default description

                if (invalidCount > 0) {
                    newStatus = 'warning';
                    newDesc = `Found ${invalidCount} invalid ${field.type}s in first 50 rows`;
                }

                return {
                    ...field,
                    csvHeader: newValue,
                    status: newStatus,
                    desc: newDesc
                };
            })
        );
    };

    // --- 3. HELPER: FILE SIZE FORMATTER ---
    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
    const handleStartScoring = () => {
        // Validate first
        const hasErrors = mappings.some(m => m.required && (m.status === 'error' || !m.csvHeader));
        if (hasErrors) {
            alert("Please map all required fields.");
            return;
        }

        // Prepare payload
        const payload = {
            data: previewData,
            mappings: mappings
        };

        // Trigger the mutation
        mutation.mutate(payload);
    };

    // --- RENDER SUCCESS ---
    if (isComplete) {
        return (
            <Box sx={{ maxWidth: 600, mx: 'auto', mt: 10, textAlign: 'center' }}>
                <Paper sx={{ p: 5, borderRadius: 4 }}>
                    <Box sx={{ width: 80, height: 80, bgcolor: '#E8F5E9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
                        <CheckIcon sx={{ fontSize: 40, color: '#2E7D32' }} />
                    </Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>Import Successful!</Typography>
                    <Button variant="contained" onClick={() => { setActiveStep(0); setFile(null); setIsComplete(false); }}>Import Another</Button>
                </Paper>
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto', p: 4 }}>

            {/* HEADER */}
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>Import Churn Data</Typography>
                    <Typography variant="body1" color="text.secondary">Upload CSV for batch processing.</Typography>
                </Box>
                <Button variant="outlined" color="inherit" onClick={() => { setActiveStep(0); setFile(null); }}>Cancel</Button>
            </Box>

            {/* STEPPER */}
            <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
                <Stepper activeStep={activeStep} alternativeLabel>
                    {STEPS.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
                </Stepper>
            </Paper>

            {/* --- STEP 0: UPLOAD --- */}
            {activeStep === 0 && (
                <Paper
                    sx={{
                        p: 10,
                        textAlign: 'center',
                        border: '2px dashed #E0E0E0',
                        bgcolor: '#FAFAFA',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: '#F5F5F5', borderColor: '#2962FF' }
                    }}
                    // Clicking the box triggers the hidden input
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        type="file"
                        accept=".csv"
                        hidden
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                    />
                    <CloudUploadIcon sx={{ fontSize: 60, color: '#BDBDBD', mb: 2 }} />
                    <Typography variant="h6" fontWeight="medium">Click to upload or drag and drop</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>CSV files only (Max 50MB)</Typography>
                    <Button variant="contained" sx={{ mt: 3, pointerEvents: 'none' }}>
                        Select CSV File
                    </Button>
                </Paper>
            )}

            {/* --- STEP 1 & 2: MAPPING & PREVIEW --- */}
            {activeStep >= 1 && (
                <>
                    {/* FILE INFO CARD */}
                    <Paper sx={{ p: 2, mb: 3, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#F8F9FC', border: '1px solid #E0E0E0' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ width: 40, height: 40, bgcolor: '#E3F2FD', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <InsertDriveFileIcon sx={{ color: '#1976D2' }} />
                            </Box>
                            <Box>
                                {/* Real File Name & Size */}
                                <Typography variant="subtitle2" fontWeight="bold">{file?.name}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {file ? formatFileSize(file.size) : ''} • Uploaded just now
                                </Typography>
                            </Box>
                        </Box>
                        <Button size="small" onClick={() => setActiveStep(0)}>Replace File</Button>
                    </Paper>

                    {/* MAPPING TABLE */}
                    <Paper sx={{ mb: 3, borderRadius: 3, overflow: 'hidden' }}>
                        <Box sx={{ p: 3, borderBottom: '1px solid #f0f0f0' }}>
                            <Typography variant="h6" fontWeight="bold">Schema Validation</Typography>
                        </Box>
                        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {mappings.map((field) => (
                                <Paper key={field.id} variant="outlined" sx={{ p: 2, display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', alignItems: 'center', gap: 2, borderColor: field.status === 'error' ? '#FFCDD2' : '#E0E0E0', bgcolor: field.status === 'error' ? '#FFEBEE' : 'white' }}>
                                    <Box>
                                        <Typography variant="subtitle2" fontWeight="bold">{field.systemField}</Typography>
                                        <Typography variant="caption" color="text.secondary">{field.desc}</Typography>
                                    </Box>

                                    {/* DYNAMIC DROPDOWN */}
                                    <FormControl fullWidth size="small" error={field.status === 'error'}>
                                        <Select
                                            value={field.csvHeader || "select"}
                                            onChange={(e) => handleMappingChange(field.id, e.target.value)}
                                            sx={{ bgcolor: 'white' }}
                                        >
                                            <MenuItem value="select" disabled>Select column...</MenuItem>
                                            {/* These items now come from your real CSV file */}
                                            {csvColumns.map(col => (
                                                <MenuItem key={col} value={col}>{col}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {field.status === 'matched' && <CheckCircleIcon color="success" fontSize="small" />}
                                        {field.status === 'warning' && <WarningIcon color="warning" fontSize="small" />}
                                        {field.status === 'error' && <ErrorIcon color="error" fontSize="small" />}

                                        <Typography variant="body2" fontWeight="bold"
                                                    color={field.status === 'matched' ? 'success.main' : field.status === 'error' ? 'error.main' : 'warning.main'}>
                                            {field.status === 'matched' ? 'Matched' : field.status === 'error' ? 'Required' : 'Check Data'}
                                        </Typography>
                                    </Box>
                                </Paper>
                            ))}
                        </Box>
                    </Paper>

                    {/* PREVIEW TABLE */}
                    <Paper sx={{ mb: 4, borderRadius: 3, overflow: 'hidden' }}>
                        <Box sx={{ p: 3, borderBottom: '1px solid #f0f0f0' }}>
                            <Typography variant="h6" fontWeight="bold">Data Preview</Typography>
                        </Box>
                        <TableContainer>
                            <Table>
                                <TableHead sx={{ bgcolor: '#F8F9FC' }}>
                                    <TableRow>
                                        {csvColumns.slice(0, 5).map(col => (
                                            <TableCell key={col}><strong>{col}</strong></TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {/* Render first 5 rows of real data */}
                                    {previewData.map((row, index) => (
                                        <TableRow key={index}>
                                            {csvColumns.slice(0, 5).map(col => (
                                                <TableCell key={col}>{row[col]}</TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>

                    {/* ACTIONS */}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                        <Button startIcon={<ArrowBackIcon />} onClick={() => setActiveStep(0)}>Back</Button>
                        <Button
                            variant="contained"
                            disabled={mutation.isPending} // <--- Auto-managed loading state
                            startIcon={!mutation.isPending && <PlayArrowIcon />}
                            onClick={handleStartScoring}
                        >
                            {mutation.isPending ? 'Processing...' : 'Run Import'}
                        </Button>
                    </Box>
                </>
            )}
        </Box>
    );
}