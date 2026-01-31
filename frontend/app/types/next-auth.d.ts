// types/next-auth.d.ts
import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
    /**
     * Étend l'interface User par défaut
     */
    interface User {
        role?: string
    }

    /**
     * Étend l'interface Session par défaut pour inclure le rôle
     */
    interface Session {
        user: {
            role?: string
        } & DefaultSession["user"]
    }
}

declare module "next-auth/jwt" {
    /**
     * Étend le JWT pour inclure le rôle
     */
    interface JWT {
        role?: string
    }
}