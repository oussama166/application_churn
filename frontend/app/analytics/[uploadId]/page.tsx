'use client';

import React, { useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
    Button,
    InputBase,
    IconButton,
    Stack,
    Card,
    CardContent,
    Grid,
    Tooltip,
} from '@mui/material';
import {
    ArrowBack,
    Search,
    Close,
    Warning,
    CheckCircle,
    Person,
    TrendingUp,
    Assessment,
    ArrowUpward,
    ArrowDownward,
    Phone,
    Info as InfoIcon,
} from '@mui/icons-material';
import {
    Pagination,
    TableSortLabel,
} from '@mui/material';
import { useGetUploadDetailsQuery } from '@/app/store/api/analyticsApi';

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

const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
};

const formatPercent = (num: number) => {
    return `${(num * 100).toFixed(2)}%`;
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

type SortField = 'churn_score' | 'risk_segment' | 'customer_ref' | 'phone_number' | null;
type SortDirection = 'asc' | 'desc';

export default function UploadDetailsPage() {
    const router = useRouter();
    const params = useParams();
    const uploadId = parseInt(params.uploadId as string, 10);
    const [searchQuery, setSearchQuery] = useState('');
    const [phoneQuery, setPhoneQuery] = useState('');
    const [riskFilter, setRiskFilter] = useState<string | null>(null);
    const [sortField, setSortField] = useState<SortField>('churn_score');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [page, setPage] = useState(1);
    const rowsPerPage = 50;

    const { data: uploadData, isLoading, error } = useGetUploadDetailsQuery(uploadId);

    const filteredAndSortedResults = useMemo(() => {
        if (!uploadData?.results) return [];
        
        let filtered = [...uploadData.results];
        
        // Apply search filter (customer reference)
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter((result) => {
                const customerRef = result.customer_ref?.toLowerCase() || '';
                return customerRef.includes(query);
            });
        }
        
        // Apply phone number filter
        if (phoneQuery) {
            const query = phoneQuery.replace(/\D/g, ''); // Remove non-digits
            filtered = filtered.filter((result) => {
                const phone = result.phone_number?.replace(/\D/g, '') || '';
                return phone.includes(query);
            });
        }
        
        // Apply risk segment filter
        if (riskFilter) {
            filtered = filtered.filter((result) => result.risk_segment === riskFilter);
        }
        
        // Apply sorting
        if (sortField) {
            filtered.sort((a, b) => {
                let aVal: any;
                let bVal: any;
                
                switch (sortField) {
                    case 'churn_score':
                        aVal = a.churn_score;
                        bVal = b.churn_score;
                        break;
                    case 'risk_segment':
                        // Sort: High > Medium > Low
                        const riskOrder: Record<string, number> = { 'High': 3, 'Medium': 2, 'Low': 1 };
                        aVal = riskOrder[a.risk_segment] || 0;
                        bVal = riskOrder[b.risk_segment] || 0;
                        break;
                    case 'customer_ref':
                        aVal = a.customer_ref?.toLowerCase() || '';
                        bVal = b.customer_ref?.toLowerCase() || '';
                        break;
                    case 'phone_number':
                        aVal = a.phone_number?.replace(/\D/g, '') || '';
                        bVal = b.phone_number?.replace(/\D/g, '') || '';
                        break;
                    default:
                        return 0;
                }
                
                if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }
        
        return filtered;
    }, [uploadData?.results, searchQuery, phoneQuery, riskFilter, sortField, sortDirection]);

    // Pagination
    const totalPages = Math.ceil(filteredAndSortedResults.length / rowsPerPage);
    const paginatedResults = filteredAndSortedResults.slice(
        (page - 1) * rowsPerPage,
        page * rowsPerPage
    );

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
        setPage(1); // Reset to first page when sorting changes
    };

    const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
        setPage(value);
        // Scroll to top of table
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error || !uploadData) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">
                    Échec du chargement des détails du téléversement. Veuillez réessayer plus tard.
                </Alert>
                <Button
                    startIcon={<ArrowBack />}
                    onClick={() => router.push('/analytics')}
                    sx={{ mt: 2 }}
                >
                    Retour aux Analytiques
                </Button>
            </Box>
        );
    }

    const stats = uploadData.dataset_stats;
    const kpis = uploadData.kpis_summary;

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                <IconButton onClick={() => router.push('/analytics')} sx={{ mr: 1 }}>
                    <ArrowBack />
                </IconButton>
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h4" fontWeight="bold">
                        Détails du Téléversement
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {uploadData.filename} • {formatNumber(uploadData.total_rows)} enregistrements
                    </Typography>
                </Box>
            </Stack>

            {/* Summary Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <Person sx={{ fontSize: 40, color: 'primary.main' }} />
                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Total des Enregistrements
                                    </Typography>
                                    <Typography variant="h4" fontWeight="bold">
                                        {formatNumber(uploadData.total_rows)}
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
                                        Risque Élevé
                                    </Typography>
                                    <Typography variant="h4" fontWeight="bold">
                                        {kpis?.high_risk_count ? formatNumber(kpis.high_risk_count) : '0'}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {kpis?.high_risk_pct ? `${kpis.high_risk_pct.toFixed(2)}%` : '0%'}
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
                                        Score de Désabonnement Moyen
                                    </Typography>
                                    <Typography variant="h4" fontWeight="bold">
                                        {kpis?.avg_churn_score ? formatPercent(kpis.avg_churn_score) : '0%'}
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
                                <Assessment sx={{ fontSize: 40, color: 'success.main' }} />
                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Segments de Risque
                                    </Typography>
                                    <Typography variant="h4" fontWeight="bold">
                                        {stats?.risk_segment_counts ? Object.keys(stats.risk_segment_counts).length : 0}
                                    </Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
                <Stack spacing={2}>
                    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                        <Paper
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                px: 2,
                                py: 1,
                                flex: 1,
                                minWidth: 250,
                            }}
                        >
                            <Search sx={{ color: 'text.secondary', mr: 1 }} />
                            <InputBase
                                placeholder="Rechercher par référence client..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setPage(1);
                                }}
                                sx={{ flex: 1 }}
                            />
                            {searchQuery && (
                                <IconButton
                                    size="small"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setPage(1);
                                    }}
                                >
                                    <Close fontSize="small" />
                                </IconButton>
                            )}
                        </Paper>
                        <Paper
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                px: 2,
                                py: 1,
                                flex: 1,
                                minWidth: 250,
                            }}
                        >
                            <Phone sx={{ color: 'text.secondary', mr: 1 }} />
                            <InputBase
                                placeholder="Rechercher par numéro de téléphone..."
                                value={phoneQuery}
                                onChange={(e) => {
                                    setPhoneQuery(e.target.value);
                                    setPage(1);
                                }}
                                sx={{ flex: 1 }}
                            />
                            {phoneQuery && (
                                <IconButton
                                    size="small"
                                    onClick={() => {
                                        setPhoneQuery('');
                                        setPage(1);
                                    }}
                                >
                                    <Close fontSize="small" />
                                </IconButton>
                            )}
                        </Paper>
                    </Stack>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Chip
                            label="Tous"
                            onClick={() => {
                                setRiskFilter(null);
                                setPage(1);
                            }}
                            color={riskFilter === null ? 'primary' : 'default'}
                            variant={riskFilter === null ? 'filled' : 'outlined'}
                        />
                        <Chip
                            label="Risque Élevé"
                            onClick={() => {
                                setRiskFilter('High');
                                setPage(1);
                            }}
                            color={riskFilter === 'High' ? 'error' : 'default'}
                            variant={riskFilter === 'High' ? 'filled' : 'outlined'}
                        />
                        <Chip
                            label="Risque Moyen"
                            onClick={() => {
                                setRiskFilter('Medium');
                                setPage(1);
                            }}
                            color={riskFilter === 'Medium' ? 'warning' : 'default'}
                            variant={riskFilter === 'Medium' ? 'filled' : 'outlined'}
                        />
                        <Chip
                            label="Risque Faible"
                            onClick={() => {
                                setRiskFilter('Low');
                                setPage(1);
                            }}
                            color={riskFilter === 'Low' ? 'success' : 'default'}
                            variant={riskFilter === 'Low' ? 'filled' : 'outlined'}
                        />
                    </Stack>
                </Stack>
            </Paper>

            {/* Results Table */}
            <Paper sx={{ borderRadius: 3, boxShadow: '0px 4px 20px rgba(0,0,0,0.02)' }}>
                <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" spacing={2}>
                        <Typography variant="h6" fontWeight="bold">
                            Prédictions Clients
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Affichage de {formatNumber((page - 1) * rowsPerPage + 1)} à {formatNumber(Math.min(page * rowsPerPage, filteredAndSortedResults.length))} sur {formatNumber(filteredAndSortedResults.length)} enregistrements filtrés
                            {uploadData.sample_size && uploadData.sample_size < uploadData.total_rows && (
                                <span> (Total: {formatNumber(uploadData.total_rows)})</span>
                            )}
                        </Typography>
                    </Stack>
                </Box>
                <TableContainer sx={{ maxHeight: '70vh' }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell><strong>#</strong></TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <TableSortLabel
                                            active={sortField === 'customer_ref'}
                                            direction={sortField === 'customer_ref' ? sortDirection : 'asc'}
                                            onClick={() => handleSort('customer_ref')}
                                        >
                                            <strong>Référence Client</strong>
                                        </TableSortLabel>
                                        <Tooltip title="Identifiant unique du client dans votre système" arrow>
                                            <InfoIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
                                        </Tooltip>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <TableSortLabel
                                            active={sortField === 'phone_number'}
                                            direction={sortField === 'phone_number' ? sortDirection : 'asc'}
                                            onClick={() => handleSort('phone_number')}
                                        >
                                            <strong>Numéro de Téléphone</strong>
                                        </TableSortLabel>
                                        <Tooltip title="Numéro de téléphone du client pour le contacter" arrow>
                                            <InfoIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
                                        </Tooltip>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <TableSortLabel
                                            active={sortField === 'churn_score'}
                                            direction={sortField === 'churn_score' ? sortDirection : 'desc'}
                                            onClick={() => handleSort('churn_score')}
                                        >
                                            <strong>Score de Désabonnement</strong>
                                        </TableSortLabel>
                                        <Tooltip title="Probabilité de désabonnement du client (0-100%). Plus le score est élevé, plus le risque est important." arrow>
                                            <InfoIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
                                        </Tooltip>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <TableSortLabel
                                            active={sortField === 'risk_segment'}
                                            direction={sortField === 'risk_segment' ? sortDirection : 'desc'}
                                            onClick={() => handleSort('risk_segment')}
                                        >
                                            <strong>Segment de Risque</strong>
                                        </TableSortLabel>
                                        <Tooltip title="Classification du niveau de risque: Élevé (risque critique), Moyen (surveillance), Faible (stable)" arrow>
                                            <InfoIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
                                        </Tooltip>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <strong>Percentile</strong>
                                        <Tooltip title="Position du client par rapport aux autres clients. Un percentile de 90% signifie que 90% des clients ont un score inférieur." arrow>
                                            <InfoIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
                                        </Tooltip>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <strong>Priorité de Rétention</strong>
                                        <Tooltip title="Niveau d'urgence pour contacter le client: Urgent (action immédiate), Élevé (sous 48h), Standard (planifié)" arrow>
                                            <InfoIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
                                        </Tooltip>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <strong>Impact Revenus</strong>
                                        <Tooltip title="Estimation de la perte de revenus potentielle si le client se désabonne (en dollars)" arrow>
                                            <InfoIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
                                        </Tooltip>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedResults.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                                        <Typography variant="body2" color="text.secondary">
                                            Aucun résultat trouvé
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedResults.map((result) => (
                                    <TableRow key={result.row_index} hover>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="500">
                                                {result.row_index + 1}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {result.customer_ref || 'N/A'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {result.phone_number || 'N/A'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="500">
                                                {formatPercent(result.churn_score)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={result.risk_segment}
                                                size="small"
                                                sx={{
                                                    bgcolor: segmentColor(result.risk_segment).bg,
                                                    color: segmentColor(result.risk_segment).fg,
                                                    fontWeight: 500,
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {result.churn_percentile.toFixed(1)}%
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={result.kpis.retention_priority || 'N/A'}
                                                size="small"
                                                color={
                                                    result.kpis.retention_priority === 'urgent' ? 'error' :
                                                    result.kpis.retention_priority === 'high' ? 'warning' :
                                                    'default'
                                                }
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="500">
                                                {result.kpis.revenue_impact_score
                                                    ? formatNumber(result.kpis.revenue_impact_score)
                                                    : 'N/A'}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                {totalPages > 1 && (
                    <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
                        <Pagination
                            count={totalPages}
                            page={page}
                            onChange={handlePageChange}
                            color="primary"
                            size="large"
                            showFirstButton
                            showLastButton
                        />
                    </Box>
                )}
            </Paper>
        </Box>
    );
}
