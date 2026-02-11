'use client';

import React, {useMemo} from 'react';
import {
    Box,
    Paper,
    Typography,
    Avatar,
    Chip,
    LinearProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    InputBase,
    Grid,
    CircularProgress,
    Alert
} from '@mui/material';

import {
    TrendingUp,
    TrendingDown,
    Groups,
    Warning,
    MoreHoriz,
    Search,
    Close,
} from '@mui/icons-material';

import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
} from 'recharts';

import { useGetDashboardQuery } from '@/app/store/api/dashboardApi';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { setClientQuery, selectClientQuery, makeSelectFilteredClients } from '@/app/store/slices/dashboardSlice';
import type { DashboardData } from '@/app/store/types';

// --- UTILITAIRES ---

// Helper pour mapper le nom de l'icône (string) vers le composant React MUI
const getIconComponent = (iconName: string) => {
    switch (iconName) {
        case 'TrendingDown':
            return <TrendingDown/>;
        case 'Groups':
            return <Groups/>;
        case 'Warning':
            return <Warning/>;
        case 'TrendingUp':
            return <TrendingUp/>;
        default:
            return <Groups/>;
    }
};

const segmentChipColor = (segment: string) => {
    // Match dashboard risk distribution colors: High (#C62828), Medium (#EF6C00), Low (#2E7D32)
    if (segment === 'High' || segment === 'CRITICAL' || segment === 'High Risk') {
        return {bg: '#FFEBEE', fg: '#C62828', border: '#FFCDD2'};
    }
    if (segment === 'Medium' || segment === 'HIGH' || segment === 'Medium Risk') {
        return {bg: '#FFF3E0', fg: '#EF6C00', border: '#FFE0B2'};
    }
    // Low or default
    return {bg: '#E8F5E9', fg: '#2E7D32', border: '#C8E6C9'};
};

const normalizePhone = (value: string) =>
    (value || '')
        .toString()
        .trim()
        .replace(/^00/, '+')
        .replace(/\D/g, '');

// --- COMPOSANTS UI ---

const KpiCard = ({title, value, trend, trendLabel, icon, color, isAlert}: any) => (
    <Paper 
        sx={{
            p: 3, 
            height: '100%', 
            borderRadius: 3, 
            boxShadow: '0px 2px 8px rgba(0,0,0,0.08)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0px 4px 12px rgba(0,0,0,0.12)',
            }
        }}
    >
        <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2}}>
            <Box sx={{flex: 1}}>
                <Typography variant="body2" color="text.secondary" fontWeight="500" sx={{mb: 1}}>
                    {title}
                </Typography>
                <Box sx={{display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap'}}>
                    <Typography variant="h4" fontWeight="bold" sx={{color: '#1A1A1A'}}>
                        {value}
                    </Typography>
                    {isAlert && <Warning color="error" sx={{fontSize: 20}}/>}
                </Box>
            </Box>
            <Avatar sx={{bgcolor: `${color}15`, color: color, borderRadius: 2, width: 48, height: 48}}>
                {icon}
            </Avatar>
        </Box>
        <Box sx={{display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap'}}>
            <Chip
                label={trend}
                size="small"
                sx={{
                    bgcolor: trend.startsWith('+') && !isAlert ? '#E8F5E9' : trend.includes('%') && !isAlert ? '#FFF3E0' : '#FFEBEE',
                    color: trend.startsWith('+') && !isAlert ? '#2E7D32' : trend.includes('%') && !isAlert ? '#EF6C00' : '#C62828',
                    fontWeight: 'bold',
                    borderRadius: 1,
                    fontSize: '0.75rem',
                }}
            />
            <Typography variant="caption" color="text.secondary">
                {trendLabel}
            </Typography>
        </Box>
    </Paper>
);

// --- MAIN COMPONENT ---

export default function DashboardPage() {
    const dispatch = useAppDispatch();
    const clientQuery = useAppSelector(selectClientQuery);
    const dateRange = useAppSelector((state) => state.dashboard.dateRange);
    
    // Fetch dashboard data using RTK Query with date range filter
    const { data, isLoading: loading, error } = useGetDashboardQuery(dateRange);

    // Calcul dynamique du total des risques pour le PieChart
    const totalRiskCount = useMemo(() => {
        if (!data?.risk_distribution) return 0;
        return data.risk_distribution.reduce((acc, curr) => acc + curr.value, 0);
    }, [data]);

    // Filtrage des clients (recherche) using Redux selector
    const selectFilteredClients = useMemo(
        () => makeSelectFilteredClients(data?.clients_to_treat || []),
        [data?.clients_to_treat]
    );
    const filteredClients = useAppSelector(selectFilteredClients);

    const handleClientQueryChange = (value: string) => {
        dispatch(setClientQuery(value));
    };

    // --- RENDER LOADING / ERROR ---

    if (loading) {
        return (
            <Box sx={{height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                <CircularProgress/>
            </Box>
        );
    }

    if (error || !data) {
        const errorMessage = error && 'data' in error 
            ? (error.data as any)?.error || 'Impossible de charger le dashboard'
            : 'Impossible de charger le dashboard';
        return (
            <Box sx={{p: 4}}>
                <Alert severity="error">Erreur: {errorMessage}</Alert>
            </Box>
        );
    }

    // --- RENDER DASHBOARD ---

    return (
        <Box sx={{width: '100%', maxWidth: 1600, mx: 'auto', px: {xs: 2, sm: 3, md: 4}, py: 3}}>
            {/* Header Section */}
            <Box sx={{mb: 4}}>
                <Typography variant="h4" fontWeight="bold" sx={{color: '#1A1A1A', mb: 1}}>
                    Tableau de Bord
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Surveillez les risques de désabonnement et trouvez des insights clients instantanément.
                </Typography>
            </Box>

            {/* Top KPI Cards (Dynamique) */}
            <Grid container spacing={3} sx={{mb: 4}}>
                {data.kpis.map((kpi, index) => (
                    <Grid key={index} size={{xs: 12, sm: 6, md: 3}}>
                        <KpiCard
                            title={kpi.title}
                            value={kpi.value}
                            trend={kpi.trend}
                            trendLabel={kpi.trendLabel}
                            icon={getIconComponent(kpi.iconType)}
                            color={kpi.color}
                            isAlert={kpi.isAlert}
                        />
                    </Grid>
                ))}
            </Grid>

            {/* Main Content Row */}
            <Grid container spacing={3} sx={{mb: 4}}>

                {/* Middle: Clients to Treat (Table) */}
                <Grid size={{xs: 12, lg: 9}}>
                    <Paper
                        sx={{
                            p: 3,
                            borderRadius: 3,
                            height: {xs: 'auto', md: 500},
                            minHeight: 400,
                            boxShadow: '0px 2px 8px rgba(0,0,0,0.08)',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Header */}
                        <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1.5}}>
                            <Box>
                                <Typography variant="h6" fontWeight="bold">
                                    Clients à Traiter
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {filteredClients.length} résultat(s) (Top Priority)
                                </Typography>
                            </Box>
                        </Box>

                        {/* Search bar */}
                        <Paper
                            sx={{
                                mb: 2,
                                px: 1.5,
                                py: 0.75,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                borderRadius: 2,
                                bgcolor: 'white',
                                border: '1px solid #E0E0E0',
                                boxShadow: 'none',
                            }}
                        >
                            <Search sx={{color: '#9E9E9E'}}/>
                            <InputBase
                                value={clientQuery}
                                onChange={(e) => handleClientQueryChange(e.target.value)}
                                placeholder="Rechercher par ID client ou téléphone"
                                sx={{flex: 1, fontSize: 14}}
                            />
                            {clientQuery.trim() !== '' && (
                                <IconButton size="small" onClick={() => handleClientQueryChange('')}>
                                    <Close fontSize="small"/>
                                </IconButton>
                            )}
                        </Paper>

                        {/* Table (scrollable) */}
                        <TableContainer
                            sx={{
                                flexGrow: 1,
                                overflowY: 'auto',
                                borderRadius: 2,
                                border: '1px solid #F2F2F2',
                            }}
                        >
                            <Table
                                size="small"
                                stickyHeader
                                sx={{
                                    '& th': {bgcolor: '#FAFAFA'},
                                    '& td, & th': {borderBottom: '1px solid #F2F2F2'},
                                }}
                            >
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{py: 1.5}}>
                                            <Typography variant="caption" color="text.secondary" fontWeight="bold">
                                                ID Client
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={{py: 1.5}}>
                                            <Typography variant="caption" color="text.secondary" fontWeight="bold">
                                                Téléphone
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center" sx={{py: 1.5}}>
                                            <Typography variant="caption" color="text.secondary" fontWeight="bold">
                                                Score Churn
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center" sx={{py: 1.5}}>
                                            <Typography variant="caption" color="text.secondary" fontWeight="bold">
                                                Segment
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={{py: 1.5}}>
                                            <Typography variant="caption" color="text.secondary" fontWeight="bold">
                                                Action Recommandée
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                </TableHead>

                                <TableBody>
                                    {filteredClients.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5}>
                                                <Typography variant="body2" color="text.secondary"
                                                            sx={{py: 2, textAlign: 'center'}}>
                                                    {data.clients_to_treat.length === 0 
                                                        ? "Aucune donnée disponible. Téléversez un fichier pour voir les prédictions clients."
                                                        : "Aucun client trouvé correspondant à votre recherche."}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredClients.map((c) => {
                                            const chip = segmentChipColor(c.segment);
                                            return (
                                                <TableRow key={c.id} hover sx={{'&:hover': {bgcolor: '#FAFAFA'}}}>
                                                    <TableCell sx={{py: 1.5}}>
                                                        <Typography variant="body2" fontWeight="600">
                                                            {c.id}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell sx={{py: 1.5}}>
                                                        <Typography variant="body2" color="text.secondary" noWrap>
                                                            {c.phone}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="center" sx={{py: 1.5}}>
                                                        <Typography variant="body2" fontWeight="bold" sx={{color: '#1A1A1A'}}>
                                                            {c.score.toFixed(2)}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="center" sx={{py: 1.5}}>
                                                        <Chip
                                                            label={c.segment}
                                                            size="small"
                                                            sx={{
                                                                bgcolor: chip.bg,
                                                                color: chip.fg,
                                                                border: `1px solid ${chip.border}`,
                                                                fontWeight: 'bold',
                                                                borderRadius: 1,
                                                                height: 24,
                                                                minWidth: 70,
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell sx={{py: 1.5}}>
                                                        <Typography variant="body2" noWrap>
                                                            {c.action}
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>

                {/* Right: Risk Distribution (Dynamique) */}
                <Grid size={{xs: 12, lg: 3}}>
                    <Paper
                        sx={{
                            p: 3,
                            borderRadius: 3,
                            height: {xs: 'auto', md: 500},
                            minHeight: 400,
                            boxShadow: '0px 2px 8px rgba(0,0,0,0.08)',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <Typography variant="h6" fontWeight="bold" sx={{mb: 0.5}}>Distribution des Risques</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
                            Clients par niveau de risque
                        </Typography>

                        {totalRiskCount === 0 ? (
                            <Box sx={{flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                <Typography variant="body2" color="text.secondary" sx={{textAlign: 'center'}}>
                                    Aucune donnée de distribution des risques disponible.<br/>
                                    Téléversez un fichier pour voir l'analyse des risques.
                                </Typography>
                            </Box>
                        ) : (
                            <>
                                <Box sx={{flexGrow: 1, position: 'relative'}}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={data.risk_distribution}
                                                innerRadius={60}
                                                outerRadius={90}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {data.risk_distribution.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none"/>
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>

                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            top: '50%',
                                            left: '50%',
                                            transform: 'translate(-50%, -50%)',
                                            textAlign: 'center',
                                        }}
                                    >
                                        <Typography variant="h5" fontWeight="bold">
                                            {totalRiskCount}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Total
                                        </Typography>
                                    </Box>
                                </Box>

                                <Box sx={{display: 'flex', justifyContent: 'space-around', mt: 2}}>
                                    {data.risk_distribution.map((item) => (
                                        <Box key={item.name} sx={{textAlign: 'center'}}>
                                            <Box sx={{
                                                width: 40,
                                                height: 4,
                                                bgcolor: item.color,
                                                borderRadius: 2,
                                                mb: 1,
                                                mx: 'auto'
                                            }}/>
                                            <Typography variant="caption" fontWeight="bold" color="text.secondary">
                                                {item.name}
                                            </Typography>
                                            <Typography variant="body2" fontWeight="bold">
                                                {/* Calcul du pourcentage dynamique */}
                                                {totalRiskCount > 0
                                                    ? ((item.value / totalRiskCount) * 100).toFixed(0)
                                                    : 0}%
                                            </Typography>
                                        </Box>
                                    ))}
                                </Box>
                            </>
                        )}
                    </Paper>
                </Grid>
            </Grid>

            {/* Bottom Detail Row */}
            <Grid container spacing={3} sx={{mb: 4}}>
                {/* Middle: Churn by Contract */}
                <Grid size={{xs: 12, md: 6}}>
                    <Paper sx={{p: 3, borderRadius: 3, height: '100%', boxShadow: '0px 2px 8px rgba(0,0,0,0.08)'}}>
                        <Typography variant="h6" fontWeight="bold" sx={{mb: 3}}>
                            Désabonnement par Contrat
                        </Typography>

                        {data.contract_churn && data.contract_churn.length > 0 ? (
                            data.contract_churn.map((contract) => {
                                const isHighRisk = contract.churn_pct >= 5;
                                const displayName = contract.type === 'prepaid' ? 'Forfait Prépayé' : 'Forfait Postpayé';
                                const description = isHighRisk 
                                    ? 'Segment à forte volatilité' 
                                    : 'Base de revenus stable';
                                
                                return (
                                    <Box key={contract.type} sx={{mb: 4}}>
                                        <Box sx={{display: 'flex', justifyContent: 'space-between', mb: 1}}>
                                            <Typography variant="body2" fontWeight="500">
                                                {displayName}
                                            </Typography>
                                            <Typography variant="body2" fontWeight="bold">
                                                {contract.churn_pct}%
                                            </Typography>
                                        </Box>
                                        <LinearProgress
                                            variant="determinate"
                                            value={Math.min(contract.churn_pct * 10, 100)}
                                            sx={{
                                                height: 8,
                                                borderRadius: 4,
                                                bgcolor: isHighRisk ? '#FFEBEE' : '#E8F5E9',
                                                '& .MuiLinearProgress-bar': {
                                                    bgcolor: isHighRisk ? '#EA4335' : '#34A853',
                                                },
                                            }}
                                        />
                                        <Typography variant="caption" color="text.secondary" sx={{mt: 0.5, display: 'block'}}>
                                            {description} ({contract.total} clients)
                                        </Typography>
                                    </Box>
                                );
                            })
                        ) : (
                            <Box sx={{mb: 4}}>
                                <Typography variant="body2" color="text.secondary" sx={{textAlign: 'center', py: 2}}>
                                    Aucune donnée de contrat disponible. Téléversez un fichier pour voir l'analyse des contrats.
                                </Typography>
                            </Box>
                        )}
                    </Paper>
                </Grid>

                {/* Right: Analysis by ARPU (Dynamique) */}
                <Grid size={{xs: 12, md: 6}}>
                    <Paper sx={{p: 3, borderRadius: 3, height: '100%', boxShadow: '0px 2px 8px rgba(0,0,0,0.08)'}}>
                        <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2}}>
                            <Typography variant="h6" fontWeight="bold">
                                Analyse par ARPU
                            </Typography>
                            <IconButton size="small" sx={{color: 'text.secondary'}}>
                                <MoreHoriz/>
                            </IconButton>
                        </Box>
                        <TableContainer>
                            <Table size="small" sx={{'& td, & th': {borderBottom: 'none', px: 0}}}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{py: 1.5}}>
                                            <Typography variant="caption" color="text.secondary" fontWeight="bold">
                                                TIER
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right" sx={{py: 1.5}}>
                                            <Typography variant="caption" color="text.secondary" fontWeight="bold">
                                                AVG REV
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right" sx={{py: 1.5}}>
                                            <Typography variant="caption" color="text.secondary" fontWeight="bold">
                                                RISK
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {data.arpu_analysis.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3}>
                                                <Typography variant="body2" color="text.secondary"
                                                            sx={{py: 2, textAlign: 'center'}}>
                                                    Aucune donnée ARPU disponible
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        data.arpu_analysis.map((row) => (
                                            <TableRow key={row.tier} hover sx={{'&:hover': {bgcolor: '#FAFAFA'}}}>
                                                <TableCell sx={{display: 'flex', alignItems: 'center', gap: 1, py: 1.5}}>
                                                    <Box sx={{
                                                        width: 10,
                                                        height: 10,
                                                        borderRadius: '50%',
                                                        bgcolor: '#4285F4'
                                                    }}/>
                                                    <Typography variant="body2" fontWeight="500">
                                                        {row.tier}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right" sx={{py: 1.5}}>
                                                    <Typography variant="body2" fontWeight="600">
                                                        {row.avgRev}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right" sx={{py: 1.5}}>
                                                    <Chip
                                                        label={row.risk}
                                                        size="small"
                                                        variant="outlined"
                                                        color={row.riskColor as any}
                                                        sx={{height: 24, borderRadius: 1, fontWeight: 'bold', minWidth: 70}}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}