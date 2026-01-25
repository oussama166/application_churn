// src/middleware.ts
import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
    // Est-ce que l'utilisateur est connecté ?
    const isLoggedIn = !!req.auth

    // Chemin actuel
    const { pathname } = req.nextUrl

    // On définit la page de login
    const isOnLoginPage = pathname.startsWith('/login')

    // SCÉNARIO 1 : L'utilisateur n'est PAS connecté et essaie d'accéder à une page protégée
    // (Tout est protégé sauf la page de login)
    if (!isLoggedIn && !isOnLoginPage) {
        return NextResponse.redirect(new URL('/login', req.nextUrl))
    }

    // SCÉNARIO 2 : L'utilisateur EST connecté mais essaie de retourner sur le login
    // On le renvoie sur le dashboard (accueil)
    if (isLoggedIn && isOnLoginPage) {
        return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
    }

    return NextResponse.next()
})

// Configuration du Matcher (Indispensable pour que le middleware ne tourne pas sur les images/api)
export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}