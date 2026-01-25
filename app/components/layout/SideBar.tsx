'use client';

import React, {useState} from 'react';
import Link from 'next/link'; // [1] Import Link
import {usePathname} from 'next/navigation'; // [2] Import usePathname for active state
import {
    Box, List, ListItemButton, ListItemIcon, ListItemText,
    Typography, Avatar, IconButton, Divider, Tooltip, Collapse
} from '@mui/material';
import HomeIcon from '@mui/icons-material/HomeRounded';
import PeopleIcon from '@mui/icons-material/PeopleAltRounded';
import BarChartIcon from '@mui/icons-material/BarChartRounded';
import DescriptionIcon from '@mui/icons-material/DescriptionRounded';
import SettingsIcon from '@mui/icons-material/SettingsRounded';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import UploadIcon from '@mui/icons-material/Upload';
import type {SideBarProps} from "@/app/types/type"

// [3] Updated Items with real paths
const MENU_ITEMS = [
    {text: 'Home', icon: <HomeIcon/>, path: '/dashboard'}, // Or '/dashboard'
    {text: 'Imports', icon: <UploadIcon/>, path: '/imports'},
    {text: 'Analytics', icon: <BarChartIcon/>, path: '/analytics'},
    {text: 'Reports', icon: <DescriptionIcon/>, path: '/reports'},
    {text: 'Settings', icon: <SettingsIcon/>, path: '/settings'},
];

const DRAWER_WIDTH = 280;
const MINI_DRAWER_WIDTH = 80;

export default function SideBar({user}: SideBarProps) {
    const [isOpen, setIsOpen] = useState(true);
    const pathname = usePathname(); // [4] Get current URL

    const toggleDrawer = () => {
        setIsOpen(!isOpen);
    };

    return (
        <Box
            sx={{
                width: isOpen ? DRAWER_WIDTH : MINI_DRAWER_WIDTH,
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                borderRight: '1px solid #E0E0E0',
                bgcolor: '#FFFFFF',
                position: 'sticky',
                top: 0,
                left: 0,
                transition: 'width 0.3s ease',
                overflowX: 'hidden',
                flexShrink: 0,
            }}
        >
            {/* Header Section */}
            <Box
                sx={{
                    p: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isOpen ? 'space-between' : 'center',
                    height: 80
                }}
            >
                {isOpen && (
                    <Box sx={{display: 'flex', alignItems: 'center', gap: 1.5}}>
                        <Box
                            sx={{
                                width: 32, height: 32, bgcolor: 'primary.main', borderRadius: 1,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                            }}
                        >
                            <AutoAwesomeIcon fontSize="small"/>
                        </Box>
                        <Typography variant="h6" fontWeight="bold" sx={{color: '#1a1a1a', whiteSpace: 'nowrap'}}>
                            ChurnGuard
                        </Typography>
                    </Box>
                )}

                <IconButton onClick={toggleDrawer} size="small">
                    {isOpen ? <ChevronLeftIcon/> : <ChevronRightIcon/>}
                </IconButton>
            </Box>

            {/* Navigation Menu */}
            <List sx={{px: 2}}>
                {MENU_ITEMS.map((item) => {
                    // [5] Logic to determine if this item is active
                    const isActive = pathname === item.path;

                    return (
                        <Tooltip title={!isOpen ? item.text : ""} placement="right" arrow key={item.text}>
                            <ListItemButton
                                component={Link} // [6] This turns the button into a Next.js Link
                                href={item.path}
                                sx={{
                                    borderRadius: 2,
                                    mb: 0.5,
                                    justifyContent: isOpen ? 'initial' : 'center',
                                    // Use isActive variable for styling
                                    bgcolor: isActive ? 'primary.light' : 'transparent',
                                    color: isActive ? 'primary.main' : 'text.secondary',
                                    px: isOpen ? 2 : 1,
                                    '&:hover': {
                                        bgcolor: isActive ? 'primary.light' : '#F5F5F5',
                                    },
                                }}
                            >
                                <ListItemIcon
                                    sx={{
                                        minWidth: 0,
                                        mr: isOpen ? 2 : 0,
                                        justifyContent: 'center',
                                        color: isActive ? 'primary.main' : 'text.secondary'
                                    }}
                                >
                                    {item.icon}
                                </ListItemIcon>

                                {isOpen && (
                                    <ListItemText
                                        primary={item.text}
                                        primaryTypographyProps={{fontWeight: isActive ? 600 : 400, noWrap: true}}
                                    />
                                )}
                            </ListItemButton>
                        </Tooltip>
                    );
                })}
            </List>

            <Box sx={{flexGrow: 1}}/>

            {/* AI Insight Card */}
            <Collapse in={isOpen} orientation="horizontal" unmountOnExit>
                <Box sx={{p: 2, width: DRAWER_WIDTH, boxSizing: 'border-box'}}>
                    <Box
                        sx={{
                            bgcolor: '#4285F4',
                            borderRadius: 3,
                            p: 2,
                            color: 'white',
                            background: 'linear-gradient(135deg, #4285F4 0%, #2b6ad0 100%)',
                            width: '100%'
                        }}
                    >
                        <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mb: 1}}>
                            <AutoAwesomeIcon fontSize="small"/>
                            <Typography variant="caption" fontWeight="bold" noWrap>AI INSIGHT</Typography>
                        </Box>
                        <Typography variant="body2" sx={{mb: 2, opacity: 0.9}}>
                            Churn risk increased by 2.4%.
                        </Typography>
                        <Typography variant="caption" sx={{textDecoration: 'underline', cursor: 'pointer'}}>
                            View Details
                        </Typography>
                    </Box>
                </Box>
            </Collapse>

            <Divider sx={{my: 1}}/>

            {/* User Profile */}

            <Box sx={{p: 2, display: 'flex', gap: 2}}>
                <Avatar src={user?.image || "/default-avatar.png"} alt={user?.name || "User"}/>
                {isOpen && (
                    <Box sx={{minWidth: 0}}>
                        <Typography variant="subtitle2" fontWeight="bold" noWrap>
                            {user?.name || "Guest"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                            {user?.email}
                        </Typography>
                    </Box>
                )}
            </Box>
        </Box>
    );
}