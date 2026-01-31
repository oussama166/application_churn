'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Drawer, Box, IconButton, useTheme, Divider, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import MenuIcon from '@mui/icons-material/Menu';

const MIN_WIDTH = 240;
const MAX_WIDTH = 600;

export default function Sidebar({ children }: { children: React.ReactNode }) {
    const theme = useTheme();

    // States
    const [width, setWidth] = useState(MIN_WIDTH);
    const [isOpen, setIsOpen] = useState(true);
    const [isResizing, setIsResizing] = useState(false);

    // Toggle Function
    const toggleDrawer = () => {
        setIsOpen(!isOpen);
    };

    // Resize Logic
    const startResizing = useCallback(() => setIsResizing(true), []);
    const stopResizing = useCallback(() => setIsResizing(false), []);

    const resize = useCallback(
        (mouseEvent: MouseEvent) => {
            if (isResizing) {
                const newWidth = mouseEvent.clientX;
                if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
                    setWidth(newWidth);
                }
            }
        },
        [isResizing]
    );

    useEffect(() => {
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResizing);
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [resize, stopResizing]);

    return (
        <>
            {/* 1. The Closed State Trigger (Floating Button when sidebar is hidden) */}
            {!isOpen && (
                <Box sx={{ position: 'fixed', top: 15, left: 15, zIndex: 1300 }}>
                    <IconButton onClick={toggleDrawer} sx={{ bgcolor: 'background.paper', boxShadow: 3 }}>
                        <MenuIcon />
                    </IconButton>
                </Box>
            )}

            {/* 2. The Drawer */}
            <Drawer
                variant="permanent"
                open={isOpen}
                PaperProps={{
                    sx: {
                        // Logic: If closed, width is 0. If open, width is dynamic.
                        width: isOpen ? width : 0,
                        overflowX: 'hidden',
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                        boxSizing: 'border-box',
                        borderRight: '1px solid rgba(0, 0, 0, 0.12)',
                        // Animation Trick: Enable transition normally, DISABLE it while dragging
                        transition: isResizing
                            ? 'none'
                            : theme.transitions.create('width', {
                                easing: theme.transitions.easing.sharp,
                                duration: theme.transitions.duration.enteringScreen,
                            }),
                    },
                }}
                // The root element also needs width control to push content
                sx={{
                    width: isOpen ? width : 0,
                    transition: isResizing ? 'none' : theme.transitions.create('width', {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.enteringScreen,
                    }),
                }}
            >
                {/* Header with Close Button */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: theme.spacing(0, 1),
                        height: 64, // Standard Toolbar height
                    }}
                >
                    <Typography variant="h6" sx={{ ml: 2 }}>
                        MyApp
                    </Typography>
                    <IconButton onClick={toggleDrawer}>
                        <ChevronLeftIcon />
                    </IconButton>
                </Box>
                <Divider />

                {/* Sidebar Content */}
                <Box sx={{ p: 2 }}>{children}</Box>

                {/* 3. The Dragger Handle (Only visible when open) */}
                {isOpen && (
                    <Box
                        onMouseDown={startResizing}
                        sx={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            width: '4px',
                            height: '100%',
                            cursor: 'col-resize',
                            zIndex: 1200,
                            '&:hover': {
                                background: theme.palette.primary.main,
                                cursor: 'col-resize',
                            },
                            // Visual line on hover/active
                            borderRight: isResizing ? `2px solid ${theme.palette.primary.main}` : 'none',
                        }}
                    />
                )}
            </Drawer>
        </>
    );
}