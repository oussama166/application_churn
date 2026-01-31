'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Box,
    Paper,
    Typography,
    LinearProgress,
    CircularProgress,
    Alert,
    Button,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAppSelector } from '@/app/store/hooks';
import { useUploadLargeFileMutation } from '@/app/store/api/importsApi';
import { setIsComplete } from '@/app/store/slices/importSlice';
import { useAppDispatch } from '@/app/store/hooks';

export default function ImportProgressPage() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const file = useAppSelector((state) => state.import.file);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState<'uploading' | 'processing' | 'storing' | 'completed' | 'error'>('uploading');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [uploadResult, setUploadResult] = useState<any>(null);

    const [uploadLargeFile, { isLoading, error }] = useUploadLargeFileMutation();

    useEffect(() => {
        if (!file) {
            router.push('/imports');
            return;
        }

        let isMounted = true;

        // Start upload process
        const startUpload = async () => {
            try {
                // Simulate progress stages
                if (isMounted) {
                    setStatus('uploading');
                    setProgress(10);
                }

                // Upload file
                const result = await uploadLargeFile({ file }).unwrap();
                
                if (isMounted) {
                    setProgress(100);
                    setStatus('completed');
                    setUploadResult(result);
                    dispatch(setIsComplete(true));
                }
            } catch (err: any) {
                console.error('Upload error:', err);
                if (isMounted) {
                    setStatus('error');
                    const errorMsg = err?.data?.detail || err?.data?.message || err?.message || 'Failed to process file';
                    setErrorMessage(errorMsg);
                }
            }
        };

        // Small delay to ensure state is ready and show initial progress
        const timer = setTimeout(() => {
            startUpload();
        }, 100);

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [file, uploadLargeFile, dispatch, router]);

    // Simulate progress during upload (since we don't have real-time progress from backend)
    useEffect(() => {
        if ((status === 'uploading' || status === 'processing' || status === 'storing') && isLoading) {
            const interval = setInterval(() => {
                setProgress((prev) => {
                    if (prev < 30) {
                        return Math.min(prev + 1.5, 30);
                    } else if (prev < 60) {
                        return Math.min(prev + 0.8, 60);
                    } else if (prev < 90) {
                        return Math.min(prev + 0.5, 90);
                    }
                    return prev;
                });
            }, 300);

            return () => clearInterval(interval);
        }
    }, [status, isLoading]);

    // Update status based on progress
    useEffect(() => {
        if (progress >= 30 && status === 'uploading') {
            setStatus('processing');
        } else if (progress >= 60 && status === 'processing') {
            setStatus('storing');
        }
    }, [progress, status]);

    const getStatusMessage = () => {
        switch (status) {
            case 'uploading':
                return 'Téléversement du fichier vers le serveur...';
            case 'processing':
                return 'Traitement des données et génération des prédictions...';
            case 'storing':
                return 'Stockage des résultats dans la base de données...';
            case 'completed':
                return 'Téléversement terminé avec succès !';
            case 'error':
                return 'Une erreur s\'est produite lors du traitement';
            default:
                return 'Traitement en cours...';
        }
    };

    if (status === 'completed' && uploadResult) {
        return (
            <Box sx={{ maxWidth: 800, mx: 'auto', mt: 8, p: 4 }}>
                <Paper sx={{ p: 5, borderRadius: 4, textAlign: 'center' }}>
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
                        <CheckCircleIcon sx={{ fontSize: 40, color: '#2E7D32' }} />
                    </Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        Importation Réussie !
                    </Typography>
                    <Typography color="text.secondary" sx={{ mb: 2 }}>
                        Vos données ont été traitées et les prédictions de désabonnement sont prêtes.
                    </Typography>
                    
                    {/* Summary Stats */}
                    <Box sx={{ mt: 4, p: 3, bgcolor: '#F8F9FC', borderRadius: 2, textAlign: 'left' }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                            Résumé du Téléversement
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            <strong>Nom du fichier:</strong> {uploadResult.filename}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            <strong>Total des lignes:</strong> {uploadResult.total_rows.toLocaleString()}
                        </Typography>
                        {uploadResult.dataset_stats && (
                            <>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                    <strong>Clients à Risque Élevé:</strong> {uploadResult.dataset_stats.high_risk_pct}%
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    <strong>Score de Désabonnement Moyen:</strong> {uploadResult.dataset_stats.churn_score_mean.toFixed(4)}
                                </Typography>
                            </>
                        )}
                    </Box>

                    <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
                        <Button
                            variant="outlined"
                            startIcon={<ArrowBackIcon />}
                            onClick={() => router.push('/imports')}
                        >
                            Importer un Autre
                        </Button>
                        <Button
                            variant="contained"
                            onClick={() => router.push('/dashboard')}
                        >
                            Voir le Tableau de Bord
                        </Button>
                    </Box>
                </Paper>
            </Box>
        );
    }

    if (status === 'error') {
        return (
            <Box sx={{ maxWidth: 600, mx: 'auto', mt: 8, p: 4 }}>
                <Paper sx={{ p: 5, borderRadius: 4, textAlign: 'center' }}>
                    <Box sx={{
                        width: 80,
                        height: 80,
                        bgcolor: '#FFEBEE',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 3
                    }}>
                        <ErrorIcon sx={{ fontSize: 40, color: '#C62828' }} />
                    </Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom color="error">
                        Échec du Téléversement
                    </Typography>
                    <Alert severity="error" sx={{ mt: 3, mb: 3, textAlign: 'left' }}>
                        {errorMessage || 'Une erreur inconnue s\'est produite lors du traitement de votre fichier.'}
                    </Alert>
                    <Button
                        variant="contained"
                        startIcon={<ArrowBackIcon />}
                        onClick={() => router.push('/imports')}
                    >
                        Retour
                    </Button>
                </Paper>
            </Box>
        );
    }

    // At this point, status can only be 'uploading' | 'processing' | 'storing' | 'completed'
    const isErrorState = error !== undefined && error !== null;

    return (
        <Box sx={{ maxWidth: 600, mx: 'auto', mt: 8, p: 4 }}>
            <Paper sx={{ p: 5, borderRadius: 4 }}>
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <CircularProgress size={60} sx={{ mb: 3 }} />
                    <Typography variant="h5" fontWeight="bold" gutterBottom>
                        Traitement de Votre Fichier
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                        {getStatusMessage()}
                    </Typography>
                </Box>

                {/* Progress Bar */}
                <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            {status === 'uploading' && 'Téléversement...'}
                            {status === 'processing' && 'Traitement...'}
                            {status === 'storing' && 'Stockage dans la base de données...'}
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                            {Math.round(progress)}%
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{
                            height: 10,
                            borderRadius: 5,
                            bgcolor: '#E0E0E0',
                            '& .MuiLinearProgress-bar': {
                                bgcolor: isErrorState ? '#C62828' : '#4285F4',
                                borderRadius: 5,
                            },
                        }}
                    />
                </Box>

                {/* File Info */}
                {file && (
                    <Box sx={{ mt: 4, p: 2, bgcolor: '#F8F9FC', borderRadius: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                            <strong>Fichier:</strong> {file.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            <strong>Taille:</strong> {(file.size / 1024 / 1024).toFixed(2)} Mo
                        </Typography>
                    </Box>
                )}

                {/* Status Steps */}
                <Box sx={{ mt: 4 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                        Étape Actuelle:
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {['uploading', 'processing', 'storing'].map((step) => (
                            <Box
                                key={step}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    p: 1,
                                    borderRadius: 1,
                                    bgcolor: status === step ? '#E3F2FD' : 'transparent',
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        bgcolor:
                                            status === step
                                                ? '#4285F4'
                                                : progress > (step === 'uploading' ? 0 : step === 'processing' ? 30 : 60)
                                                ? '#4CAF50'
                                                : '#E0E0E0',
                                    }}
                                />
                                <Typography
                                    variant="body2"
                                    sx={{
                                        color:
                                            status === step
                                                ? '#4285F4'
                                                : progress > (step === 'uploading' ? 0 : step === 'processing' ? 30 : 60)
                                                ? '#4CAF50'
                                                : 'text.secondary',
                                        fontWeight: status === step ? 600 : 400,
                                    }}
                                >
                                    {step === 'uploading' && 'Téléversement du fichier'}
                                    {step === 'processing' && 'Génération des prédictions'}
                                    {step === 'storing' && 'Stockage dans la base de données'}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
}
