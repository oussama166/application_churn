'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthShell from "@/app/components/templates/AutoShell";
import { Button, TextField, Box, Alert } from "@mui/material";
// On utilise une méthode 'server action' simulée ou l'API client
import { signIn } from "next-auth/react"

export default function LoginPage() {
    const router = useRouter();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const formData = new FormData(e.currentTarget);
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        // Appel à NextAuth
        // "redirect: false" nous permet de gérer la redirection manuellement sans recharger la page
        const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        if (result?.error) {
            setError("Email ou mot de passe invalide (Essayez mdp: 123456)");
            setLoading(false);
        } else {
            router.push("/dashboard"); // Redirection vers le dashboard
            router.refresh(); // Rafraîchir pour mettre à jour la session côté serveur
        }
    };

    return (
        <AuthShell
            title="Welcome back"
            subtitle="Please enter your details to sign in."
        >
            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>

                {error && <Alert severity="error">{error}</Alert>}

                <TextField name="email" label="Email address" type="email" required fullWidth defaultValue="alex@churnguard.com" />
                <TextField name="password" label="Password" type="password" required fullWidth defaultValue="123456" />

                <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={loading}
                    sx={{ py: 1.5, bgcolor: '#0A1929' }}
                >
                    {loading ? "Signing in..." : "Sign in"}
                </Button>
            </Box>
        </AuthShell>
    );
}