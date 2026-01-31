'use client';

import React, {useMemo, useState, useEffect} from 'react';
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

// --- DEFINITION DES TYPES (Correspond à ton Backend Python) ---
interface KpiData {
    title: string;
    value: string;
    trend: string;
    trendLabel: string;
    iconType: string;
    color: string;
    isAlert: boolean;
}

interface ClientData {
    id: string;
    phone: string;
    score: number;
    segment: string;
    action: string;
}

interface ChartData {
    name?: string;
    month?: string;
    value: number;
    color?: string;
}

interface ArpuData {
    tier: string;
    avgRev: string;
    risk: string;
    riskColor: string;
}

interface DashboardData {
    kpis: KpiData[];
    churn_evolution: ChartData[];
    risk_distribution: ChartData[];
    arpu_analysis: ArpuData[];
    clients_to_treat: ClientData[];
}

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
    if (segment === 'CRITICAL' || segment === 'High Risk') return {bg: '#FFEBEE', fg: '#C62828', border: '#FFCDD2'};
    if (segment === 'HIGH' || segment === 'Medium Risk') return {bg: '#FFF3E0', fg: '#EF6C00', border: '#FFE0B2'};
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
    <Paper sx={{p: 3, height: '100%', borderRadius: 3, boxShadow: '0px 4px 20px rgba(0,0,0,0.02)'}}>
        <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2}}>
            <Box>
                <Typography variant="body2" color="text.secondary" fontWeight="500">
                    {title}
                </Typography>
                <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mt: 1}}>
                    <Typography variant="h4" fontWeight="bold">
                        {value}
                    </Typography>
                    {isAlert && <Warning color="error"/>}
                </Box>
            </Box>
            <Avatar sx={{bgcolor: `${color}15`, color: color, borderRadius: 2}}>
                {icon}
            </Avatar>
        </Box>
        <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
            <Chip
                label={trend}
                size="small"
                sx={{
                    bgcolor: trend.startsWith('+') && !isAlert ? '#E8F5E9' : '#FFEBEE',
                    color: trend.startsWith('+') && !isAlert ? '#2E7D32' : '#C62828',
                    fontWeight: 'bold',
                    borderRadius: 1,
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
    const [clientQuery, setClientQuery] = useState('');

    // États pour les données dynamiques
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetching Data au chargement
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/dashboard');
                if (!res.ok) throw new Error('Erreur réseau');
                const jsonData = await res.json();

                if (jsonData.error) throw new Error(jsonData.error);

                setData(jsonData);
            } catch (err: any) {
                console.error("Erreur Dashboard:", err);
                setError(err.message || "Impossible de charger le dashboard");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Calcul dynamique du total des risques pour le PieChart
    const totalRiskCount = useMemo(() => {
        if (!data?.risk_distribution) return 0;
        return data.risk_distribution.reduce((acc, curr) => acc + curr.value, 0);
    }, [data]);

    // Filtrage des clients (recherche)
    const filteredClients = useMemo(() => {
        if (!data?.clients_to_treat) return [];

        const qRaw = clientQuery.trim();
        if (!qRaw) return data.clients_to_treat;

        const qLower = qRaw.toLowerCase();
        const qDigits = normalizePhone(qRaw);

        return data.clients_to_treat.filter((c) => {
            const id = (c.id || '').toLowerCase();
            const phoneDigits = normalizePhone(c.phone || '');
            const matchId = id.includes(qLower);
            const matchPhone = qDigits.length >= 3 && phoneDigits.includes(qDigits);
            return matchId || matchPhone;
        });
    }, [clientQuery, data]);

    // --- RENDER LOADING / ERROR ---

    if (loading) {
        return (
            <Box sx={{height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                <CircularProgress/>
            </Box>
        );
    }

    if (error || !data) {
        return (
            <Box sx={{p: 4}}>
                <Alert severity="error">Erreur: {error}</Alert>
            </Box>
        );
    }

    // --- RENDER DASHBOARD ---

    return (
        <Box sx={{width: '100%', maxWidth: 1600, mx: 'auto'}}>
            {/* Header Section */}
            <Box sx={{mb: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'end'}}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" sx={{color: '#1A1A1A', mb: 1}}>
                        Good Morning, Alex
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Monitor churn risks and find customer insights instantly.
                    </Typography>
                </Box>

                <Paper
                    sx={{
                        p: '2px 4px',
                        display: 'flex',
                        alignItems: 'center',
                        width: 300,
                        borderRadius: 2,
                        bgcolor: 'white',
                        border: '1px solid #E0E0E0',
                        boxShadow: 'none',
                    }}
                >
                    <InputBase sx={{ml: 1, flex: 1}} placeholder="Search by segment..."/>
                    <IconButton sx={{p: '10px'}}>
                        <Search/>
                    </IconButton>
                    <Box sx={{height: 20, width: '1px', bgcolor: '#E0E0E0', mx: 1}}/>
                    <IconButton sx={{p: '10px', fontSize: 14, fontWeight: 'bold', color: '#9E9E9E'}}>⌘K</IconButton>
                </Paper>
            </Box>

            {/* Top KPI Cards (Dynamique) */}
            <Grid container spacing={3} sx={{mb: 4}}>
                {data.kpis.map((kpi, index) => (
                    <Grid key={index} item size={{xs: 12, sm: 6, md: 3}}>
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
            <Grid container spacing={2} sx={{mb: 4}}>

                {/* Middle: Clients to Treat (Table) */}
                <Grid item size={{xs: 12, lg: 9}}>
                    <Paper
                        sx={{
                            p: 3,
                            borderRadius: 3,
                            height: 400,
                            boxShadow: '0px 4px 20px rgba(0,0,0,0.02)',
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
                                onChange={(e) => setClientQuery(e.target.value)}
                                placeholder="Rechercher par ID client ou téléphone"
                                sx={{flex: 1, fontSize: 14}}
                            />
                            {clientQuery.trim() !== '' && (
                                <IconButton size="small" onClick={() => setClientQuery('')}>
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
                                        <TableCell><Typography variant="caption" color="text.secondary"
                                                               fontWeight="bold">ID Client</Typography></TableCell>
                                        <TableCell><Typography variant="caption" color="text.secondary"
                                                               fontWeight="bold">Téléphone</Typography></TableCell>
                                        <TableCell align="center"><Typography variant="caption" color="text.secondary"
                                                                              fontWeight="bold">Score Churn</Typography></TableCell>
                                        <TableCell align="center"><Typography variant="caption" color="text.secondary"
                                                                              fontWeight="bold">Segment</Typography></TableCell>
                                        <TableCell><Typography variant="caption" color="text.secondary"
                                                               fontWeight="bold">Action
                                            Recommandée</Typography></TableCell>
                                    </TableRow>
                                </TableHead>

                                <TableBody>
                                    {filteredClients.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5}>
                                                <Typography variant="body2" color="text.secondary"
                                                            sx={{py: 2, textAlign: 'center'}}>
                                                    Aucun client trouvé.
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredClients.map((c) => {
                                            const chip = segmentChipColor(c.segment);
                                            return (
                                                <TableRow key={c.id} hover>
                                                    <TableCell><Typography variant="body2"
                                                                           fontWeight="bold">{c.id}</Typography></TableCell>
                                                    <TableCell><Typography variant="body2" color="text.secondary"
                                                                           noWrap>{c.phone}</Typography></TableCell>
                                                    <TableCell align="center"><Typography variant="body2"
                                                                                          fontWeight="bold">{c.score.toFixed(2)}</Typography></TableCell>
                                                    <TableCell align="center">
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
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell><Typography variant="body2"
                                                                           noWrap>{c.action}</Typography></TableCell>
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
                <Grid item size={{xs: 12, lg: 3, md: 3}}>
                    <Paper
                        sx={{
                            p: 4,
                            borderRadius: 3,
                            height: 400,
                            boxShadow: '0px 4px 20px rgba(0,0,0,0.02)',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <Typography variant="h6" fontWeight="bold">Risk Distribution</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>Customers by risk
                            level</Typography>

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
                    </Paper>
                </Grid>
            </Grid>

            {/* Bottom Detail Row */}
            <Grid container spacing={2} sx={{mb: 4}}>
                {/* Middle: Churn by Contract (Statique pour l'instant, ou à mapper si la DB le supporte) */}
                <Grid item size={{xs: 12,  md: 6}}>
                    <Paper sx={{p: 3, borderRadius: 3, height: '100%'}}>
                        <Typography variant="h6" fontWeight="bold" sx={{mb: 3}}>
                            Churn by Contract
                        </Typography>

                        <Box sx={{mb: 4}}>
                            <Box sx={{display: 'flex', justifyContent: 'space-between', mb: 1}}>
                                <Typography variant="body2" fontWeight="500">Monthly Plan</Typography>
                                <Typography variant="body2" fontWeight="bold">6.8%</Typography>
                            </Box>
                            <LinearProgress
                                variant="determinate"
                                value={68}
                                sx={{
                                    height: 8,
                                    borderRadius: 4,
                                    bgcolor: '#E3F2FD',
                                    '& .MuiLinearProgress-bar': {bgcolor: '#4285F4'},
                                }}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{mt: 0.5, display: 'block'}}>
                                High volatility segment
                            </Typography>
                        </Box>

                        <Box sx={{mb: 4}}>
                            <Box sx={{display: 'flex', justifyContent: 'space-between', mb: 1}}>
                                <Typography variant="body2" fontWeight="500">Annual Plan</Typography>
                                <Typography variant="body2" fontWeight="bold">1.2%</Typography>
                            </Box>
                            <LinearProgress
                                variant="determinate"
                                value={12}
                                sx={{
                                    height: 8,
                                    borderRadius: 4,
                                    bgcolor: '#E8F5E9',
                                    '& .MuiLinearProgress-bar': {bgcolor: '#00C853'},
                                }}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{mt: 0.5, display: 'block'}}>
                                Stable revenue base
                            </Typography>
                        </Box>
                    </Paper>
                </Grid>

                {/* Right: Analysis by ARPU (Dynamique) */}
                <Grid item size={{xs: 12,  md: 6}}>
                    <Paper sx={{p: 3, borderRadius: 3, height: '100%'}}>
                        <Box sx={{display: 'flex', justifyContent: 'space-between', mb: 2}}>
                            <Typography variant="h6" fontWeight="bold">
                                Analysis by ARPU
                            </Typography>
                            <IconButton size="small">
                                <MoreHoriz/>
                            </IconButton>
                        </Box>
                        <TableContainer>
                            <Table size="small" sx={{'& td, & th': {borderBottom: 'none', px: 0}}}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell><Typography variant="caption" color="text.secondary"
                                                               fontWeight="bold">TIER</Typography></TableCell>
                                        <TableCell align="right"><Typography variant="caption" color="text.secondary"
                                                                             fontWeight="bold">AVG
                                            REV</Typography></TableCell>
                                        <TableCell align="right"><Typography variant="caption" color="text.secondary"
                                                                             fontWeight="bold">RISK</Typography></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {data.arpu_analysis.map((row) => (
                                        <TableRow key={row.tier}>
                                            <TableCell sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                                                <Box sx={{
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: '50%',
                                                    bgcolor: '#E0E0E0'
                                                }}/>
                                                <Typography variant="body2" fontWeight="500">{row.tier}</Typography>
                                            </TableCell>
                                            <TableCell align="right">{row.avgRev}</TableCell>
                                            <TableCell align="right">
                                                <Chip
                                                    label={row.risk}
                                                    size="small"
                                                    variant="outlined"
                                                    color={row.riskColor as any}
                                                    sx={{height: 24, borderRadius: 1, fontWeight: 'bold'}}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}