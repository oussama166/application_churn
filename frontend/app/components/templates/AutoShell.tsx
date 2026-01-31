'use client';

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

interface AuthShellProps {
    children: React.ReactNode;
    title: string;
    subtitle?: string; // J'ai ajouté un sous-titre optionnel pour plus de flexibilité
}

export default function AuthShell({ children, title, subtitle }: AuthShellProps) {
    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#FFFFFF' }}>

            {/* 1. CÔTÉ GAUCHE : Branding & Témoignage (Caché sur mobile) */}
            <Box
                sx={{
                    display: { xs: 'none', md: 'flex' }, // Responsive : caché sur petit écran
                    width: '50%',
                    bgcolor: '#0A1929', // Bleu Marine Profond
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    p: 6,
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                {/* Dégradé d'arrière-plan subtil */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: '-20%',
                        left: '-20%',
                        width: '60%',
                        height: '60%',
                        background: 'radial-gradient(circle, rgba(66,133,244,0.4) 0%, rgba(10,25,41,0) 70%)',
                        zIndex: 0,
                    }}
                />

                {/* Logo */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, zIndex: 1 }}>
                    <Box
                        sx={{
                            width: 40, height: 40, bgcolor: '#4285F4', borderRadius: 1.5,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                        }}
                    >
                        <AutoAwesomeIcon />
                    </Box>
                    <Typography variant="h5" fontWeight="bold" sx={{ fontFamily: 'inherit' }}>
                        ChurnGuard AI
                    </Typography>
                </Box>

                {/* Section Témoignage */}
                <Box sx={{ zIndex: 1, maxWidth: 480 }}>
                    <Typography variant="h4" fontWeight="bold" sx={{ mb: 2, lineHeight: 1.2 }}>
                        "Stop customer churn before it happens."
                    </Typography>

                    <Paper sx={{ bgcolor: 'rgba(255,255,255,0.05)', p: 3, borderRadius: 2, border: '1px solid rgba(255,255,255,0.1)' }}>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', opacity: 0.9, mb: 2, color: 'white' }}>
                            "The integration was seamless, and the insights were actionable from Day 1. It's a game changer."
                        </Typography>
                        <Box>
                            <Typography variant="subtitle2" fontWeight="bold" color="white">Alex Morgan</Typography>
                            <Typography variant="caption" sx={{ opacity: 0.7, color: 'white' }}>VP of Customer Success</Typography>
                        </Box>
                    </Paper>
                </Box>

                {/* Copyright */}
                <Typography variant="caption" sx={{ opacity: 0.4, zIndex: 1 }}>
                    © 2026 ChurnGuard Inc.
                </Typography>
            </Box>

            {/* 2. CÔTÉ DROIT : Zone du Formulaire */}
            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 4
                }}
            >
                <Box sx={{ width: '100%', maxWidth: 400 }}>

                    {/* Logo visible uniquement sur Mobile */}
                    <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', justifyContent: 'center', gap: 1, mb: 4 }}>
                        <Box sx={{ width: 32, height: 32, bgcolor: '#4285F4', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                            <AutoAwesomeIcon fontSize="small" />
                        </Box>
                        <Typography variant="h6" fontWeight="bold">ChurnGuard</Typography>
                    </Box>

                    {/* Titre de la page (Login / Register) */}
                    <Box sx={{ mb: 4, textAlign: 'center' }}>
                        <Typography variant="h4" fontWeight="bold" gutterBottom>{title}</Typography>
                        {subtitle && <Typography variant="body1" color="text.secondary">{subtitle}</Typography>}
                    </Box>

                    {/* Le formulaire (Children) */}
                    {children}

                </Box>
            </Box>
        </Box>
    );
}