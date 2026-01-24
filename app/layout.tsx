import React from 'react';
import "./globals.css";
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { Roboto } from 'next/font/google';
import { ThemeProvider } from '@mui/material/styles';
import { Box, CssBaseline } from '@mui/material'; // Added CssBaseline for consistent reset
import theme from './theme';

// Import your components
import Header from "@/app/components/layout/Header";
import SideBar from "@/app/components/layout/SideBar";

const roboto = Roboto({
    weight: ['300', '400', '500', '700'],
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-roboto',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={roboto.variable}>
        <body>
        <AppRouterCacheProvider options={{ key: 'css' }}>
            <ThemeProvider theme={theme}>
                <CssBaseline /> {/* Normalizes CSS across browsers */}

                {/* 1. Global Flex Container */}
                <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F8F9FC' }}>

                    {/* 2. Sidebar (Fixed Left) */}
                    <SideBar />

                    {/* 3. Main Content Area (Header + Page Content) */}
                    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>

                        {/* Header sits at the top of the content area */}
                        <Header />

                        {/* The actual page content */}
                        <Box component="main" sx={{ p: 4, flexGrow: 1 }}>
                            {children}
                        </Box>
                    </Box>

                </Box>
            </ThemeProvider>
        </AppRouterCacheProvider>
        </body>
        </html>
    );
}