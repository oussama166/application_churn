import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
    const isLoggedIn = !!req.auth
    const isOnDashboard = req.nextUrl.pathname.startsWith('/dashboard') || req.nextUrl.pathname === '/'
    const isOnLogin = req.nextUrl.pathname.startsWith('/login')

    // 1. Si on est sur le dashboard et PAS connecté -> Redirection Login
    if (isOnDashboard && !isLoggedIn) {
        return NextResponse.redirect(new URL('/login', req.nextUrl))
    }

    // 2. Si on est sur Login et DÉJÀ connecté -> Redirection Dashboard
    if (isOnLogin && isLoggedIn) {
        return NextResponse.redirect(new URL('/', req.nextUrl))
    }

    return NextResponse.next()
})

// Configuration pour éviter de bloquer les fichiers statiques (images, css...)
export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}