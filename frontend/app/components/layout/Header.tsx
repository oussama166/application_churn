'use client';

import React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
    Box,
    IconButton,
    Button,
    Badge,
    Link as MuiLink,
    Breadcrumbs,
    Typography,
    Select,
    SelectChangeEvent,
    MenuItem,
    InputAdornment
} from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import Link from 'next/link';
import { signOut } from "next-auth/react";
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { setDateRange, selectDateRange } from '@/app/store/slices/dashboardSlice';

// Helper to format "user-settings" -> "User Settings"
const formatSegment = (segment: string) => {
    return segment
        .replace(/-/g, ' ')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

export default function Header() {
    const pathname = usePathname();
    const router = useRouter(); // Optional: used if you want URL-based date state
    const dispatch = useAppDispatch();
    const dateRange = useAppSelector(selectDateRange);

    // 1. Filter out 'dashboard' if your Home link already points there
    // This prevents "Home > Dashboard > Settings"
    const pathSegments = pathname.split('/').filter((segment) => segment && segment !== 'dashboard');

    const handleDateChange = (event: SelectChangeEvent) => {
        dispatch(setDateRange(event.target.value as string));
        // Optional: Update URL params so the filter persists on refresh
        // router.push(`${pathname}?range=${event.target.value}`);
    };

    return (
        <Box
            component="header"
            sx={{
                height: 80,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: { xs: 2, md: 4 }, // Responsive padding
                bgcolor: '#FFFFFF',
                borderBottom: '1px solid #f0f0f0',
                position: 'sticky', // Optional: keeps header at top
                top: 0,
                zIndex: 1100,
            }}
        >
            {/* --- Left Side: Breadcrumbs --- */}
            <Breadcrumbs
                separator={<NavigateNextIcon fontSize="small" sx={{ color: '#999' }} />}
                aria-label="breadcrumb"
            >
                <MuiLink
                    component={Link}
                    underline="hover"
                    color="inherit"
                    href="/dashboard"
                    variant="body2"
                    sx={{ fontWeight: pathSegments.length === 0 ? 600 : 400 }}
                >
                    Tableau de Bord
                </MuiLink>

                {pathSegments.map((segment, index) => {
                    // Reconstruct path. Note: We need to add 'dashboard' back to the href
                    // since we filtered it out of the visual array
                    const href = `/dashboard/${pathSegments.slice(0, index + 1).join('/')}`;
                    const isLast = index === pathSegments.length - 1;
                    const formattedText = formatSegment(segment);

                    return isLast ? (
                        <Typography
                            key={href}
                            variant="body2"
                            color="text.primary"
                            fontWeight="600"
                        >
                            {formattedText}
                        </Typography>
                    ) : (
                        <MuiLink
                            key={href}
                            component={Link}
                            underline="hover"
                            color="inherit"
                            href={href}
                            variant="body2"
                        >
                            {formattedText}
                        </MuiLink>
                    );
                })}
            </Breadcrumbs>

            {/* --- Right Side: Actions Wrapper --- */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>

                {/* Date Select - Only show on dashboard page */}
                {pathname === '/dashboard' && (
                    <Select
                        value={dateRange}
                        onChange={handleDateChange}
                        displayEmpty
                        IconComponent={KeyboardArrowDownIcon}
                        startAdornment={
                            <InputAdornment position="start" sx={{ mr: 1 }}>
                                <CalendarTodayIcon fontSize="small" sx={{ color: '#5A6B7C' }} />
                            </InputAdornment>
                        }
                        sx={{
                            height: 40,
                            bgcolor: '#FFFFFF',
                            color: '#333',
                            border: '1px solid #E0E0E0',
                            borderRadius: 2,
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            boxShadow: 'none',
                            '&:hover': {
                                bgcolor: '#F9FAFB',
                                borderColor: '#B0B0B0',
                            },
                            '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                            '& .MuiSelect-select': {
                                paddingLeft: 0,
                                display: 'flex',
                                alignItems: 'center',
                            }
                        }}
                    >
                        <MenuItem value="7_days">7 Derniers Jours</MenuItem>
                        <MenuItem value="30_days">30 Derniers Jours</MenuItem>
                        <MenuItem value="90_days">3 Derniers Mois</MenuItem>
                        <MenuItem value="year">Dernière Année</MenuItem>
                    </Select>
                )}

                {/* Notification Bell */}
                <IconButton sx={{ bgcolor: '#F5F7FA', border: '1px solid #E0E0E0' }}>
                    <Badge color="error" variant="dot" overlap="circular">
                        <NotificationsNoneIcon sx={{ color: '#5A6B7C' }} />
                    </Badge>
                </IconButton>

                <Box sx={{ width: '1px', height: '24px', bgcolor: '#E0E0E0', mx: 1 }} />

                {/* Sign Out Button */}
                <Button
                    onClick={() => signOut()}
                    color="error"
                    size="small"
                >
                    Déconnexion
                </Button>
            </Box>
        </Box>
    );
}