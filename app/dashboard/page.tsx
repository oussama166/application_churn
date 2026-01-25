'use client';

import React from 'react';
import {
    Box, Paper, Typography, Avatar, Chip, LinearProgress,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Button, InputBase, Grid
} from '@mui/material';
// [1] Import Grid2 explicitly to avoid version conflicts


import {
    TrendingUp, TrendingDown, Groups, Warning, MoreHoriz,
    Search, Map as MapIcon, ArrowForward
} from '@mui/icons-material';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, ReferenceDot
} from 'recharts';

// ... (Keep your Mock Data & KPI Component the same) ...
// (I will omit the data arrays here to save space, keep them as they were)
const CHURN_DATA = [
    {month: 'Jan', value: 2.1},
    {month: 'Mar', value: 2.8},
    {month: 'May', value: 2.4},
    {month: 'Jul', value: 3.5},
    {month: 'Sep', value: 4.2},
    {month: 'Nov', value: 4.8},
    {month: 'Jan (Proj)', value: 5.5},
];

const RISK_DATA = [
    {name: 'Low', value: 1240, color: '#00C853'},
    {name: 'Medium', value: 850, color: '#FFAB00'},
    {name: 'High', value: 320, color: '#FF3D00'},
];

const ARPU_DATA = [
    {tier: 'Enterprise', avgRev: '$5.2k', risk: 'Low', riskColor: 'success'},
    {tier: 'Mid-Market', avgRev: '$1.2k', risk: 'Med', riskColor: 'warning'},
    {tier: 'SMB', avgRev: '$199', risk: 'High', riskColor: 'error'},
    {tier: 'Starter', avgRev: '$49', risk: 'Critical', riskColor: 'error'},
];

const KpiCard = ({title, value, trend, trendLabel, icon, color, isAlert}: any) => (
    <Paper sx={{p: 3, height: '100%', borderRadius: 3, boxShadow: '0px 4px 20px rgba(0,0,0,0.02)'}}>
        <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2}}>
            <Box>
                <Typography variant="body2" color="text.secondary" fontWeight="500">{title}</Typography>
                <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mt: 1}}>
                    <Typography variant="h4" fontWeight="bold">{value}</Typography>
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
                    borderRadius: 1
                }}
            />
            <Typography variant="caption" color="text.secondary">{trendLabel}</Typography>
        </Box>
    </Paper>
);

export default function DashboardPage() {
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

                <Paper sx={{
                    p: '2px 4px',
                    display: 'flex',
                    alignItems: 'center',
                    width: 300,
                    borderRadius: 2,
                    bgcolor: 'white',
                    border: '1px solid #E0E0E0',
                    boxShadow: 'none'
                }}>
                    <InputBase sx={{ml: 1, flex: 1}} placeholder="Search by segment..."/>
                    <IconButton sx={{p: '10px'}}><Search/></IconButton>
                    <Box sx={{height: 20, width: '1px', bgcolor: '#E0E0E0', mx: 1}}/>
                    <IconButton sx={{p: '10px', fontSize: 14, fontWeight: 'bold', color: '#9E9E9E'}}>⌘K</IconButton>
                </Paper>
            </Box>

            {/* 2. Top KPI Cards - FIXED GRID SYNTAX */}
            <Grid container spacing={3} sx={{mb: 4}}>
                <Grid size={{xs: 12, sm: 6, md: 3}}>
                    <KpiCard
                        title="Overall Churn Rate" value="4.2%" trend="+0.5%" trendLabel="vs last month"
                        icon={<TrendingDown/>} color="#4285F4"
                    />
                </Grid>
                <Grid size={{xs: 12, sm: 6, md: 3}}>
                    <KpiCard
                        title="Total Customers" value="1,240" trend="+1.2%" trendLabel="+15 net new"
                        icon={<Groups/>} color="#7B61FF"
                    />
                </Grid>
                <Grid size={{xs: 12, sm: 6, md: 3}}>
                    <KpiCard
                        title="High-Risk Revenue" value="$42k" trend="! Alert" trendLabel="12 Accounts at risk"
                        icon={<Warning/>} color="#FF5252" isAlert
                    />
                </Grid>
                <Grid size={{xs: 12, sm: 6, md: 3}}>
                    <KpiCard
                        title="Retention Rate" value="95.8%" trend="-0.2%" trendLabel="vs target (96%)"
                        icon={<TrendingUp/>} color="#00C853"
                    />
                </Grid>
            </Grid>

            {/* 3. Main Chart Row - FIXED GRID SYNTAX */}
            <Grid container spacing={3} sx={{mb: 4}}>

                {/* Left: Churn Evolution */}
                <Grid size={{xs: 12, md: 8}}>
                    <Paper sx={{p: 4, borderRadius: 3, height: 400, boxShadow: '0px 4px 20px rgba(0,0,0,0.02)'}}>
                        {/* ... Chart Header ... */}
                        <Box sx={{display: 'flex', justifyContent: 'space-between', mb: 4}}>
                            <Box>
                                <Typography variant="h6" fontWeight="bold">Churn Trend & AI Forecast</Typography>
                                <Typography variant="body2" color="text.secondary">12 Month Evolution</Typography>
                            </Box>
                            <Box sx={{display: 'flex', gap: 2}}>
                                <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                                    <Box sx={{width: 10, height: 10, borderRadius: '50%', bgcolor: '#4285F4'}}/>
                                    <Typography variant="caption" fontWeight="bold">Actual</Typography>
                                </Box>
                                <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                                    <Box sx={{width: 10, height: 10, borderRadius: '50%', bgcolor: '#E0E0E0'}}/>
                                    <Typography variant="caption" fontWeight="bold"
                                                color="text.secondary">Projected</Typography>
                                </Box>
                            </Box>
                        </Box>

                        <ResponsiveContainer width="100%" height="80%">
                            <AreaChart data={CHURN_DATA}>
                                <defs>
                                    <linearGradient id="colorChurn" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4285F4" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#4285F4" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#F5F5F5"/>
                                <XAxis dataKey="month" axisLine={false} tickLine={false}
                                       tick={{fill: '#9E9E9E', fontSize: 12}} dy={10}/>
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9E9E9E', fontSize: 12}}/>
                                <Tooltip/>
                                <Area type="monotone" dataKey="value" stroke="#4285F4" strokeWidth={3} fillOpacity={1}
                                      fill="url(#colorChurn)"/>
                                <ReferenceDot x="Nov" y={4.8} r={6} fill="#1A1A1A" stroke="white" strokeWidth={2}/>
                            </AreaChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* Right: Risk Distribution */}
                <Grid size={{xs: 12, md: 4}}>
                    <Paper sx={{
                        p: 4,
                        borderRadius: 3,
                        height: 400,
                        boxShadow: '0px 4px 20px rgba(0,0,0,0.02)',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <Typography variant="h6" fontWeight="bold">Risk Distribution</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>Customers by risk
                            level</Typography>

                        <Box sx={{flexGrow: 1, position: 'relative'}}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={RISK_DATA}
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={10}
                                        dataKey="value"
                                    >
                                        {RISK_DATA.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.color}
                                                stroke="none"
                                            />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>

                            {/* Center Label */}
                            <Box sx={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                textAlign: 'center'
                            }}>
                                {/* Adjusted font size slightly to fit the smaller hole */}
                                <Typography variant="h5" fontWeight="bold">1,240</Typography>
                                <Typography variant="caption" color="text.secondary">Total</Typography>
                            </Box>
                        </Box>

                        <Box sx={{display: 'flex', justifyContent: 'space-around', mt: 2}}>
                            {RISK_DATA.map(item => (
                                <Box key={item.name} sx={{textAlign: 'center'}}>
                                    <Box sx={{
                                        width: 40,
                                        height: 4,
                                        bgcolor: item.color,
                                        borderRadius: 2,
                                        mb: 1,
                                        mx: 'auto'
                                    }}/>
                                    <Typography variant="caption" fontWeight="bold"
                                                color="text.secondary">{item.name}</Typography>
                                    <Typography variant="body2"
                                                fontWeight="bold">{(item.value / 2410 * 100).toFixed(0)}%</Typography>
                                </Box>
                            ))}
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            {/* 4. Bottom Detail Row - FIXED GRID SYNTAX */}
            <Grid container spacing={3}>

                {/* Left: Global Hotspots */}
                <Grid size={{xs: 12, md: 4}}>
                    <Paper sx={{p: 3, borderRadius: 3, height: '100%', minHeight: 300}}>
                        <Box sx={{display: 'flex', justifyContent: 'space-between', mb: 2}}>
                            <Typography variant="h6" fontWeight="bold">Global Hotspots</Typography>
                            <Button size="small" endIcon={<ArrowForward/>}>View Map</Button>
                        </Box>
                        <Box sx={{
                            bgcolor: '#F5F7FA',
                            borderRadius: 2,
                            height: 200,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <MapIcon sx={{fontSize: 48, color: '#E0E0E0'}}/>
                            <Typography color="text.secondary" sx={{ml: 2}}>Map Visualization Component</Typography>
                        </Box>
                    </Paper>
                </Grid>

                {/* Middle: Churn by Contract */}
                <Grid size={{xs: 12, md: 4}}>
                    <Paper sx={{p: 3, borderRadius: 3, height: '100%'}}>
                        <Typography variant="h6" fontWeight="bold" sx={{mb: 3}}>Churn by Contract</Typography>

                        <Box sx={{mb: 4}}>
                            <Box sx={{display: 'flex', justifyContent: 'space-between', mb: 1}}>
                                <Typography variant="body2" fontWeight="500">Monthly Plan</Typography>
                                <Typography variant="body2" fontWeight="bold">6.8%</Typography>
                            </Box>
                            <LinearProgress variant="determinate" value={68} sx={{
                                height: 8,
                                borderRadius: 4,
                                bgcolor: '#E3F2FD',
                                '& .MuiLinearProgress-bar': {bgcolor: '#4285F4'}
                            }}/>
                            <Typography variant="caption" color="text.secondary" sx={{mt: 0.5, display: 'block'}}>High
                                volatility segment</Typography>
                        </Box>

                        <Box sx={{mb: 4}}>
                            <Box sx={{display: 'flex', justifyContent: 'space-between', mb: 1}}>
                                <Typography variant="body2" fontWeight="500">Annual Plan</Typography>
                                <Typography variant="body2" fontWeight="bold">1.2%</Typography>
                            </Box>
                            <LinearProgress variant="determinate" value={12} sx={{
                                height: 8,
                                borderRadius: 4,
                                bgcolor: '#E8F5E9',
                                '& .MuiLinearProgress-bar': {bgcolor: '#00C853'}
                            }}/>
                            <Typography variant="caption" color="text.secondary" sx={{mt: 0.5, display: 'block'}}>Stable
                                revenue base</Typography>
                        </Box>
                    </Paper>
                </Grid>

                {/* Right: Analysis by ARPU */}
                <Grid size={{xs: 12, md: 4}}>
                    <Paper sx={{p: 3, borderRadius: 3, height: '100%'}}>
                        <Box sx={{display: 'flex', justifyContent: 'space-between', mb: 2}}>
                            <Typography variant="h6" fontWeight="bold">Analysis by ARPU</Typography>
                            <IconButton size="small"><MoreHoriz/></IconButton>
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
                                    {ARPU_DATA.map((row) => (
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