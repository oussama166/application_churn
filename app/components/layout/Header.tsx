'use client';

import React, {useState} from 'react';
import {usePathname} from 'next/navigation'; // [1] Hook to get current path
import {
    Box,
    IconButton,
    Button,
    Badge,
    Link as MuiLink,
    Breadcrumbs,
    Typography,
    Select,
    SelectChangeEvent, MenuItem, InputAdornment
} from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import Link from 'next/link';
import { signOut } from "next-auth/react";

export default function Header() {
    const pathname = usePathname(); // Example: "/dashboard/settings"


    const pathSegments = pathname.split('/').filter((segment) => segment);

    const [dateRange, setDateRange] = useState('30_days');

    const handleDateChange = (event: SelectChangeEvent) => {
        setDateRange(event.target.value as string);
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
                px: 4,
                bgcolor: '#FFFFFF',
                borderBottom: '1px solid #f0f0f0'
            }}
        >
            {/* 1. Dynamic Breadcrumbs */}
            <Breadcrumbs
                separator={<NavigateNextIcon fontSize="small"/>}
                aria-label="breadcrumb"
            >
                {/* Always show Home as the first item */}
                <MuiLink
                    component={Link}
                    underline="hover"
                    color="inherit"
                    href="/"
                    variant="body2"
                >
                    Home
                </MuiLink>

                {/* Map over the path segments to create the rest */}
                {pathSegments.map((segment, index) => {
                    // Reconstruct the path for this segment (e.g., /dashboard/settings)
                    const href = `/${pathSegments.slice(0, index + 1).join('/')}`;

                    // Check if it's the last segment (current page)
                    const isLast = index === pathSegments.length - 1;

                    // Format the text: "dashboard" -> "Dashboard"
                    const formattedText = segment.charAt(0).toUpperCase() + segment.slice(1);

                    return isLast ? (
                        // Render Text for the current page (not clickable)
                        <Typography
                            key={href}
                            variant="body2"
                            color="text.primary"
                            fontWeight="500"
                        >
                            {formattedText}
                        </Typography>
                    ) : (
                        // Render Link for parent pages
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

            {/* 2. Actions (Unchanged) */}
            <Box sx={{display: 'flex', alignItems: 'center', gap: 2}}>

                {/* Notification Bell */}
                <IconButton sx={{bgcolor: '#F5F7FA'}}>
                    <Badge color="error" variant="dot" overlap="circular">
                        <NotificationsNoneIcon sx={{color: '#5A6B7C'}}/>
                    </Badge>
                </IconButton>

                {/* Date Range Select Dropdown */}
                <Select
                    value={dateRange}
                    onChange={handleDateChange}
                    displayEmpty
                    // Use your specific arrow icon
                    IconComponent={KeyboardArrowDownIcon}
                    // Add the calendar icon at the start
                    startAdornment={
                        <InputAdornment position="start" sx={{mr: 1}}>
                            <CalendarTodayIcon fontSize="small" sx={{color: '#5A6B7C'}}/>
                        </InputAdornment>
                    }
                    // Custom Styling to match your previous Button
                    sx={{
                        height: 40, // Match standard button height
                        bgcolor: '#FFFFFF',
                        color: '#333',
                        border: '1px solid #E0E0E0',
                        borderRadius: 2,
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        boxShadow: 'none',
                        '&:hover': {
                            bgcolor: '#F9FAFB',
                            borderColor: '#E0E0E0',
                        },
                        // Remove the default MUI blue outline/border
                        '& .MuiOutlinedInput-notchedOutline': {
                            border: 'none',
                        },
                        // Adjust padding to look like a button
                        '& .MuiSelect-select': {
                            paddingLeft: 0,
                            display: 'flex',
                            alignItems: 'center',
                        }
                    }}
                >
                    <MenuItem value="7_days">Last 7 Days</MenuItem>
                    <MenuItem value="30_days">Last 30 Days</MenuItem>
                    <MenuItem value="90_days">Last 3 Months</MenuItem>
                    <MenuItem value="year">Last Year</MenuItem>
                </Select>
            </Box>
            <Button onClick={() => signOut()}>Sign Out</Button>
        </Box>
    );
}