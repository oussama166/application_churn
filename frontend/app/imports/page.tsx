'use client';

import React, {useRef, useEffect} from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import {
    Box, Typography, Paper, Stepper, Step, StepLabel, Button,
    Select, MenuItem, FormControl, Chip, Alert,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Grid, Divider
} from '@mui/material';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckIcon from '@mui/icons-material/Check';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import {
    setActiveStep,
    setMappings,
    setFile,
    setCsvColumns,
    setRawCsvData,
    setIsComplete,
    resetImport,
} from '@/app/store/slices/importSlice';
import type { FieldMapping } from '@/app/store/types';

// --- CONFIGURATION ---
const STEPS = ['Téléverser les Données', 'Valider & Mapper', 'Aperçu & Exécuter'];

// LISTE EXACTE DES CHAMPS DU BACKEND (app/schemas.py)
// key: nom du champ dans le JSON envoyé au backend
const INITIAL_MAPPING = [
    // Identifiants
    {id: 1, key: 'customer_id', label: 'Customer ID', type: 'string', required: true},
    {id: 2, key: 'snapshot_date', label: 'Snapshot Date', type: 'date', required: true},

    // Demographics
    {id: 3, key: 'age', label: 'Age', type: 'number', required: true},
    {id: 4, key: 'gender', label: 'Gender', type: 'string', required: true},
    {id: 5, key: 'region', label: 'Region', type: 'string', required: true},

    // Contrat
    {id: 6, key: 'activation_date', label: 'Activation Date', type: 'date', required: true},
    {id: 7, key: 'tenure_months', label: 'Tenure (Months)', type: 'number', required: true},
    {id: 8, key: 'offer_type', label: 'Offer Type', type: 'string', required: true},
    {id: 9, key: 'contract_type', label: 'Contract Type', type: 'string', required: true},
    {id: 10, key: 'commitment_duration_months', label: 'Commitment (Months)', type: 'number', required: true},
    {id: 11, key: 'months_to_contract_end', label: 'Months to End', type: 'number', required: true},
    {id: 12, key: 'renewal_last_12m', label: 'Renewed (12m)', type: 'boolean', required: true},

    // Services
    {id: 13, key: 'music_pack', label: 'Music Pack', type: 'boolean', required: true},
    {id: 14, key: 'intl_calls', label: 'Intl Calls', type: 'boolean', required: true},
    {id: 15, key: 'extra_data', label: 'Extra Data', type: 'boolean', required: true},

    // Facturation
    {id: 16, key: 'monthly_fee', label: 'Monthly Fee', type: 'number', required: true},
    {id: 17, key: 'last_bill_amount', label: 'Last Bill Amount', type: 'number', required: true},
    {id: 18, key: 'payment_history_score', label: 'Payment Score', type: 'number', required: true},
    {id: 19, key: 'late_payments_6m', label: 'Late Payments (6m)', type: 'number', required: true},
    {id: 20, key: 'unpaid_invoices', label: 'Unpaid Invoices', type: 'number', required: true},
    {id: 21, key: 'bill_variation_3m', label: 'Bill Variation (3m)', type: 'number', required: true},

    // Usage
    {id: 22, key: 'voice_minutes', label: 'Voice Minutes', type: 'number', required: true},
    {id: 23, key: 'data_gb', label: 'Data (GB)', type: 'number', required: true},
    {id: 24, key: 'sms_count', label: 'SMS Count', type: 'number', required: true},
    {id: 25, key: 'usage_trend_3m', label: 'Usage Trend', type: 'string', required: true},
    {id: 26, key: 'roaming_days_3m', label: 'Roaming Days', type: 'number', required: true},
    {id: 27, key: 'out_of_bundle_charges', label: 'Out Bundle Charges', type: 'number', required: true},

    // Technique
    {id: 28, key: 'network_incidents_3m', label: 'Network Incidents', type: 'number', required: true},
    {id: 29, key: 'avg_download_mbps', label: 'Avg Speed (Mbps)', type: 'number', required: true},
    {id: 30, key: 'drop_call_rate', label: 'Drop Call Rate', type: 'number', required: true},

    // Support
    {id: 31, key: 'tech_complaints_3m', label: 'Tech Complaints', type: 'number', required: true},
    {id: 32, key: 'support_calls_3m', label: 'Support Calls', type: 'number', required: true},
    {id: 33, key: 'billing_contacts', label: 'Billing Contacts', type: 'number', required: true},
    {id: 34, key: 'tech_contacts', label: 'Tech Contacts', type: 'number', required: true},
    {id: 35, key: 'commercial_contacts', label: 'Commercial Contacts', type: 'number', required: true},
    {id: 36, key: 'tickets_opened_3m', label: 'Tickets Opened', type: 'number', required: true},
    {id: 37, key: 'tickets_closed_3m', label: 'Tickets Closed', type: 'number', required: true},
    {id: 38, key: 'avg_resolution_time_hours', label: 'Avg Res Time (Hrs)', type: 'number', required: true},
    {id: 39, key: 'phone_number', label: 'Phone Number', type: 'string', required: true},
].map(f => ({...f, csvHeader: '', status: 'error' as const, desc: f.required ? 'Requis' : 'Optionnel'}));

export default function ImportPage() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Redux state
    const activeStep = useAppSelector((state) => state.import.activeStep);
    const mappings = useAppSelector((state) => state.import.mappings);
    const file = useAppSelector((state) => state.import.file);
    const csvColumns = useAppSelector((state) => state.import.csvColumns);
    const rawCsvData = useAppSelector((state) => state.import.rawCsvData);
    const isComplete = useAppSelector((state) => state.import.isComplete);

    // Initialize mappings if empty (first load)
    useEffect(() => {
        if (mappings.length === 0) {
            dispatch(setMappings(INITIAL_MAPPING as FieldMapping[]));
        }
    }, [dispatch, mappings.length]);

    // --- VALIDATION HELPER ---
    const validateColumnData = (rows: any[], columnName: string, type: string) => {
        let invalidCount = 0;
        const rowsToCheck = rows.slice(0, 50);

        rowsToCheck.forEach(row => {
            const value = row[columnName];
            if (value === undefined || value === null || value === '') return;

            if (type === 'number') {
                const cleanValue = value.toString().replace(/[$,]/g, '');
                if (isNaN(parseFloat(cleanValue)) || !isFinite(cleanValue)) invalidCount++;
            } else if (type === 'date') {
                if (isNaN(Date.parse(value))) invalidCount++;
            } else if (type === 'boolean') {
                // Accepte: true, false, 0, 1, yes, no
                const v = value.toString().toLowerCase();
                if (!['true', 'false', '1', '0', 'yes', 'no'].includes(v)) invalidCount++;
            }
        });
        return invalidCount;
    };

    // --- FILE UPLOAD ---
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = event.target.files?.[0];
        if (!uploadedFile) return;

        dispatch(setFile(uploadedFile));

        Papa.parse(uploadedFile, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const headers = results.meta.fields || [];
                dispatch(setCsvColumns(headers));
                dispatch(setRawCsvData(results.data));

                // Auto-Map Logic
                const newMappings = INITIAL_MAPPING.map(field => {
                    // Essaie de trouver une correspondance exacte ou partielle
                    const match = headers.find(h =>
                        h.toLowerCase() === field.key.toLowerCase() ||
                        h.toLowerCase() === field.label.toLowerCase() ||
                        h.toLowerCase().replace(/_/g, ' ') === field.label.toLowerCase()
                    );

                    return {
                        ...field,
                        csvHeader: match || '',
                        status: match ? 'matched' as const : 'error' as const
                    };
                });

                dispatch(setMappings(newMappings as FieldMapping[]));
                dispatch(setActiveStep(1));
            },
            error: () => alert("Échec de l'analyse du fichier CSV.")
        });
    };

    // --- HANDLE MAPPING CHANGE ---
    const handleMappingChange = (id: number, newValue: string) => {
        const updatedMappings = mappings.map((field) => {
            if (field.id !== id) return field;

            if (!newValue || newValue === 'select') {
                return {...field, csvHeader: '', status: 'error' as const, desc: 'Requis'};
            }

            const invalidCount = validateColumnData(rawCsvData, newValue, field.type);
            let newStatus: 'matched' | 'warning' | 'error' = 'matched';
            let newDesc = field.desc;

            if (invalidCount > 0) {
                newStatus = 'warning';
                newDesc = `${invalidCount} valeurs potentiellement invalides trouvées`;
            }

            return {...field, csvHeader: newValue, status: newStatus, desc: newDesc};
        });
        
        dispatch(setMappings(updatedMappings));
    };

    // --- FILE UPLOAD TO BACKEND ---
    const handleStartScoring = () => {
        // 1. Vérifier si tout est mappé (for validation purposes)
        const missing = mappings.filter(m => m.required && !m.csvHeader);
        if (missing.length > 0) {
            alert(`Veuillez mapper les champs suivants: ${missing.map(m => m.label).join(', ')}`);
            return;
        }

        // 2. Check if file exists
        if (!file) {
            alert('Aucun fichier sélectionné');
            return;
        }

        // 3. Navigate to progress page (which will handle the upload)
        // The progress page will show loading state and handle the upload
        router.push('/imports/progress');
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + ['Bytes', 'KB', 'MB', 'GB'][i];
    };

    if (isComplete) {
        return (
            <Box sx={{maxWidth: 600, mx: 'auto', mt: 10, textAlign: 'center'}}>
                <Paper sx={{p: 5, borderRadius: 4}}>
                    <Box sx={{
                        width: 80,
                        height: 80,
                        bgcolor: '#E8F5E9',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 3
                    }}>
                        <CheckIcon sx={{fontSize: 40, color: '#2E7D32'}}/>
                    </Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>Importation Réussie !</Typography>
                    <Typography color="text.secondary" sx={{mb: 3}}>Vos données ont été traitées et les prédictions de désabonnement
                        sont prêtes.</Typography>
                    <Button variant="contained" onClick={() => {
                        dispatch(resetImport());
                    }}>Importer un Autre</Button>
                </Paper>
            </Box>
        );
    }

    return (
        <Box sx={{maxWidth: 1200, mx: 'auto', p: 4}}>
            {/* Header */}
            <Box sx={{mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>Importer des Données</Typography>
                    <Typography variant="body1" color="text.secondary">
                        Mappez vos colonnes CSV aux champs d'entrée du modèle IA.
                    </Typography>
                </Box>
                <Button variant="outlined" color="inherit" onClick={() => {
                    dispatch(setActiveStep(0));
                    dispatch(setFile(null));
                }}>
                    Annuler
                </Button>
            </Box>

            {/* Stepper */}
            <Paper sx={{p: 3, mb: 3, borderRadius: 3}}>
                <Stepper activeStep={activeStep} alternativeLabel>
                    {STEPS.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>
            </Paper>

            {/* STEP 0: UPLOAD */}
            {activeStep === 0 && (
                <Paper
                    sx={{
                        p: 10,
                        textAlign: 'center',
                        border: '2px dashed #E0E0E0',
                        bgcolor: '#FAFAFA',
                        cursor: 'pointer',
                        '&:hover': {bgcolor: '#F5F5F5', borderColor: '#2962FF'}
                    }}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input type="file" accept=".csv" hidden ref={fileInputRef} onChange={handleFileUpload}/>
                    <CloudUploadIcon sx={{fontSize: 60, color: '#BDBDBD', mb: 2}}/>
                    <Typography variant="h6" fontWeight="medium">Cliquez pour téléverser ou glisser-déposer</Typography>
                    <Button variant="contained" sx={{mt: 3, pointerEvents: 'none'}}>Sélectionner un Fichier CSV</Button>
                </Paper>
            )}

            {/* STEP 1: MAPPING & PREVIEW */}
            {activeStep >= 1 && (
                <>
                    {/* File Info Bar */}
                    <Paper sx={{
                        p: 2,
                        mb: 3,
                        borderRadius: 3,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        bgcolor: '#F8F9FC'
                    }}>
                        <Box sx={{display: 'flex', gap: 2, alignItems: 'center'}}>
                            <InsertDriveFileIcon color="primary"/>
                            <Box>
                                <Typography variant="subtitle2" fontWeight="bold">{file?.name}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {file ? formatFileSize(file.size) : ''}
                                </Typography>
                            </Box>
                        </Box>
                        <Button size="small" onClick={() => dispatch(setActiveStep(0))}>Changer de Fichier</Button>
                    </Paper>

                    {/* Mapping Grid */}
                    <Paper sx={{mb: 3, borderRadius: 3, overflow: 'hidden'}}>
                        <Box sx={{p: 3, borderBottom: '1px solid #f0f0f0'}}>
                            <Typography variant="h6" fontWeight="bold">Mapping des Colonnes</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Assurez-vous que tous les champs sont mappés correctement pour des prédictions précises.
                            </Typography>
                        </Box>

                        <Box sx={{p: 3}}>
                            <Grid container spacing={2}>
                                {mappings.map((field) => (
                                    <Grid size={{xs: 12, md: 6}} key={field.id}>
                                        <Paper variant="outlined" sx={{
                                            p: 2,
                                            borderColor: field.status === 'error' ? '#FFCDD2' : '#E0E0E0',
                                            bgcolor: field.status === 'error' ? '#FFF5F5' : 'white'
                                        }}>
                                            {/* Field Header */}
                                            <Box sx={{mb: 1, display: 'flex', justifyContent: 'space-between'}}>
                                                <Box>
                                                    <Typography variant="subtitle2" fontWeight="bold">
                                                        {field.label} <span style={{color: 'red'}}>*</span>
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Type: {field.type === 'string' ? 'Texte' : field.type === 'number' ? 'Nombre' : field.type === 'date' ? 'Date' : field.type === 'boolean' ? 'Booléen' : field.type}
                                                    </Typography>
                                                </Box>
                                                {field.status === 'matched' &&
                                                    <CheckCircleIcon color="success" fontSize="small"/>}
                                                {field.status === 'warning' &&
                                                    <WarningIcon color="warning" fontSize="small"/>}
                                            </Box>

                                            {/* Dropdown Input */}
                                            <FormControl fullWidth size="small">
                                                <Select
                                                    value={field.csvHeader || "select"}
                                                    onChange={(e) => handleMappingChange(field.id, e.target.value)}
                                                    error={field.status === 'error'}
                                                >
                                                    <MenuItem value="select" disabled>Sélectionner une colonne...</MenuItem>
                                                    {csvColumns.map(col => (
                                                        <MenuItem key={col} value={col}>{col}</MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>

                                            {/* Helper Text */}
                                            {field.status === 'warning' && (
                                                <Typography variant="caption" color="warning.main"
                                                            sx={{mt: 1, display: 'block'}}>
                                                    {field.desc}
                                                </Typography>
                                            )}
                                        </Paper>
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    </Paper>

                    {/* --- DATA PREVIEW SECTION (Restored) --- */}
                    <Paper sx={{mb: 4, borderRadius: 3, overflow: 'hidden'}}>
                        <Box sx={{p: 3, borderBottom: '1px solid #f0f0f0'}}>
                            <Typography variant="h6" fontWeight="bold">Aperçu des Données</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Affichage des 5 premières lignes de votre fichier.
                            </Typography>
                        </Box>
                        <TableContainer>
                            <Table size="small">
                                <TableHead sx={{bgcolor: '#F8F9FC'}}>
                                    <TableRow>
                                        {csvColumns.slice(0, 8).map(col => (
                                            <TableCell key={col}><strong>{col}</strong></TableCell>
                                        ))}
                                        {/* If too many columns, show a placeholder header */}
                                        {csvColumns.length > 8 && <TableCell><strong>...</strong></TableCell>}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {rawCsvData.slice(0, 5).map((row, index) => (
                                        <TableRow key={index}>
                                            {csvColumns.slice(0, 8).map(col => (
                                                <TableCell key={`${index}-${col}`} sx={{
                                                    maxWidth: 150,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {row[col]}
                                                </TableCell>
                                            ))}
                                            {csvColumns.length > 8 && <TableCell>...</TableCell>}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>

                    {/* Footer Actions */}
                    <Box sx={{display: 'flex', justifyContent: 'flex-end', gap: 2}}>
                        <Button startIcon={<ArrowBackIcon/>} onClick={() => dispatch(setActiveStep(0))}>Retour</Button>
                        <Button
                            variant="contained"
                            startIcon={<PlayArrowIcon/>}
                            onClick={handleStartScoring}
                        >
                            Lancer l'Analyse
                        </Button>
                    </Box>
                </>
            )}
        </Box>
    );
}
