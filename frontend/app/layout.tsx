import React from 'react';
import "./globals.css";
import {AppRouterCacheProvider} from '@mui/material-nextjs/v15-appRouter';
import {Roboto} from 'next/font/google';
import {ThemeProvider} from '@mui/material/styles';
import {Box, CssBaseline} from '@mui/material';
import theme from './theme';

import { auth } from "@/auth";
import Header from "@/app/components/layout/Header";
import SideBar from "@/app/components/layout/SideBar";
import ReduxProvider from "@/app/lib/ReduxProvider";

const roboto = Roboto({
    weight: ['300', '400', '500', '700'],
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-roboto',
});

export default async function RootLayout({children}: { children: React.ReactNode }) {
    // 1. Check if the user is authenticated
    // Wrap in try-catch to handle errors gracefully in production
    let session = null;
    let isAuthenticated = false;
    try {
        session = await auth();
        isAuthenticated = !!session?.user;
    } catch (error) {
        // Log error but don't crash the app
        console.error('Auth error in layout:', error);
        // Default to unauthenticated state
        isAuthenticated = false;
    }

    return (
        <html lang="en" className={roboto.variable}>
        <body>
        <ReduxProvider>
            <AppRouterCacheProvider options={{key: 'css'}}>
                <ThemeProvider theme={theme}>
                    <CssBaseline/>

                    {isAuthenticated && session?.user ? (
                        // --- LAYOUT A: DASHBOARD (Logged In) ---
                        <Box sx={{display: 'flex', minHeight: '100vh', bgcolor: '#F8F9FC'}}>
                            {/* Sidebar gets the user info */}
                            <SideBar user={session.user}/>

                            <Box sx={{flexGrow: 1, display: 'flex', flexDirection: 'column'}}>
                                <Header/>
                                <Box component="main" sx={{p: 4, flexGrow: 1}}>
                                    {children}
                                </Box>
                            </Box>
                        </Box>
                    ) : (
                        // --- LAYOUT B: AUTH PAGES (Logged Out) ---
                        // Simply render children (LoginPage with AuthShell)
                        <Box component="main" sx={{ minHeight: '100vh' }}>
                            {children}
                        </Box>
                    )}

                </ThemeProvider>
            </AppRouterCacheProvider>
        </ReduxProvider>
        </body>
        </html>
    );
}