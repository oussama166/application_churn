'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
    Box,
    Paper,
    Typography,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    Alert,
    Card,
    CardContent,
    Grid,
    Stack,
    Tooltip,
} from '@mui/material';
import {
    Assessment,
    InsertDriveFile,
    People,
    TrendingUp,
    Warning,
    CheckCircle,
    Info as InfoIcon,
} from '@mui/icons-material';
import { useGetAnalyticsQuery } from '@/app/store/api/analyticsApi';

const segmentColor = (segment: string) => {
    switch (segment) {
        case 'High':
            return { bg: '#FFEBEE', fg: '#C62828' };
        case 'Medium':
            return { bg: '#FFF3E0', fg: '#EF6C00' };
        case 'Low':
            return { bg: '#E8F5E9', fg: '#2E7D32' };
        default:
            return { bg: '#F5F5F5', fg: '#616161' };
    }
};

const formatDate = (dateString: string) => {
    try {
        const date = new Date(dateString);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[date.getMonth()];
        const day = date.getDate();
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${month} ${day}, ${year} ${hours}:${minutes}`;
    } catch {
        return dateString;
    }
};

const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
};

const formatPercent = (num: number) => {
    return `${num.toFixed(2)}%`;
};

export default function AnalyticsPage() {
    const router = useRouter();
    const { data: uploads, isLoading, error } = useGetAnalyticsQuery({ limit: 100 });

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">
                    Échec du chargement des données analytiques. Veuillez réessayer plus tard.
                </Alert>
            </Box>
        );
    }

    if (!uploads || uploads.length === 0) {
        return (
            <Box sx={{ p: 3 }}>
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Assessment sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                        Aucune donnée analytique disponible
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Téléversez un fichier pour voir les analyses prédites ici.
                    </Typography>
                </Paper>
            </Box>
        );
    }

    // Calculate summary statistics
    const totalUploads = uploads.length;
    const totalRows = uploads.reduce((sum, u) => sum + u.total_rows, 0);
    const avgHighRisk = uploads.reduce((sum, u) => {
        const highRiskPct = u.kpis_summary?.high_risk_pct || 0;
        return sum + highRiskPct;
    }, 0) / totalUploads;

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
                Analytiques
            </Typography>

            {/* Summary Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <InsertDriveFile sx={{ fontSize: 40, color: 'primary.main' }} />
                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Total des Téléversements
                                    </Typography>
                                    <Typography variant="h4" fontWeight="bold">
                                        {formatNumber(totalUploads)}
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <People sx={{ fontSize: 40, color: 'success.main' }} />
                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Total des Enregistrements
                                    </Typography>
                                    <Typography variant="h4" fontWeight="bold">
                                        {formatNumber(totalRows)}
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <Warning sx={{ fontSize: 40, color: 'error.main' }} />
                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        % Moyen de Risque Élevé
                                    </Typography>
                                    <Typography variant="h4" fontWeight="bold">
                                        {formatPercent(avgHighRisk)}
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <TrendingUp sx={{ fontSize: 40, color: 'info.main' }} />
                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Téléversements Actifs
                                    </Typography>
                                    <Typography variant="h4" fontWeight="bold">
                                        {uploads.filter(u => u.status === 'completed').length}
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Uploads Table */}
            <Paper sx={{ borderRadius: 3, boxShadow: '0px 4px 20px rgba(0,0,0,0.02)' }}>
                <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="h6" fontWeight="bold">
                        Téléversements par Lots
                    </Typography>
                </Box>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell><strong>ID</strong></TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <strong>Nom du Fichier</strong>
                                        <Tooltip title="Nom du fichier CSV/Excel téléversé" arrow>
                                            <InfoIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
                                        </Tooltip>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <strong>Enregistrements</strong>
                                        <Tooltip title="Nombre total de lignes de données traitées dans ce téléversement" arrow>
                                            <InfoIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
                                        </Tooltip>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <strong>Risque Élevé</strong>
                                        <Tooltip title="Pourcentage et nombre de clients classés comme à risque élevé de désabonnement" arrow>
                                            <InfoIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
                                        </Tooltip>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <strong>Score Moyen</strong>
                                        <Tooltip title="Score de désabonnement moyen calculé pour tous les clients de ce téléversement" arrow>
                                            <InfoIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
                                        </Tooltip>
                                    </Box>
                                </TableCell>
                                <TableCell><strong>Statut</strong></TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <strong>Date de Téléversement</strong>
                                        <Tooltip title="Date et heure à laquelle le fichier a été téléversé et traité" arrow>
                                            <InfoIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
                                        </Tooltip>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {uploads.map((upload) => {
                                const highRiskPct = upload.kpis_summary?.high_risk_pct || 0;
                                const avgScore = upload.kpis_summary?.avg_churn_score || 0;
                                const stats = upload.dataset_stats;
                                const highRiskCount = stats?.risk_segment_counts?.High || 0;
                                const mediumRiskCount = stats?.risk_segment_counts?.Medium || 0;
                                const lowRiskCount = stats?.risk_segment_counts?.Low || 0;

                                return (
                                    <TableRow
                                        key={upload.upload_id}
                                        hover
                                        onClick={() => router.push(`/analytics/${upload.upload_id}`)}
                                        sx={{
                                            cursor: 'pointer',
                                            '&:hover': {
                                                bgcolor: 'action.hover',
                                            },
                                        }}
                                    >
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="500">
                                                #{upload.upload_id}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <InsertDriveFile sx={{ fontSize: 20, color: 'text.secondary' }} />
                                                <Typography variant="body2">
                                                    {upload.filename}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="500">
                                                {formatNumber(upload.total_rows)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                <Typography variant="body2" fontWeight="500" color="error.main">
                                                    {formatPercent(highRiskPct)} ({formatNumber(highRiskCount)})
                                                </Typography>
                                                {stats && (
                                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                                        {highRiskCount > 0 && (
                                                            <Chip
                                                                label={`Élevé: ${highRiskCount}`}
                                                                size="small"
                                                                sx={{
                                                                    bgcolor: segmentColor('High').bg,
                                                                    color: segmentColor('High').fg,
                                                                    fontSize: '0.7rem',
                                                                    height: 20,
                                                                }}
                                                            />
                                                        )}
                                                        {mediumRiskCount > 0 && (
                                                            <Chip
                                                                label={`Moyen: ${mediumRiskCount}`}
                                                                size="small"
                                                                sx={{
                                                                    bgcolor: segmentColor('Medium').bg,
                                                                    color: segmentColor('Medium').fg,
                                                                    fontSize: '0.7rem',
                                                                    height: 20,
                                                                }}
                                                            />
                                                        )}
                                                        {lowRiskCount > 0 && (
                                                            <Chip
                                                                label={`Faible: ${lowRiskCount}`}
                                                                size="small"
                                                                sx={{
                                                                    bgcolor: segmentColor('Low').bg,
                                                                    color: segmentColor('Low').fg,
                                                                    fontSize: '0.7rem',
                                                                    height: 20,
                                                                }}
                                                            />
                                                        )}
                                                    </Box>
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="500">
                                                {(avgScore * 100).toFixed(2)}%
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                icon={upload.status === 'completed' ? <CheckCircle /> : <Warning />}
                                                label={upload.status}
                                                color={upload.status === 'completed' ? 'success' : 'warning'}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">
                                                {formatDate(upload.created_at)}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
}
