// src/auth.ts
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        Credentials({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            // C'est ici que tu vérifieras la BDD plus tard (ex: Prisma + bcrypt)
            authorize: async (credentials) => {
                // SIMULATION : On accepte n'importe qui si le mot de passe est "123456"
                if (credentials.password === "123456") {
                    return {
                        id: "1",
                        name: "Alex Morgan",
                        email: String(credentials.email),
                        image: "https://i.pravatar.cc/150?u=a042581f4e29026704d", // Avatar
                        role: "admin"
                    }
                }
                return null // Échec de connexion
            },
        }),
    ],
    pages: {
        signIn: '/login', // Redirige ici si non connecté
    },
    callbacks: {
        async session({ session, token }) {
            if (token && session.user) {
                session.user.role = token.role as string;
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.role = (user as any).role;
            }
            return token;
        }
    }
})