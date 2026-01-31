import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // 1. Next.js appelle ton backend FastAPI (Python)
        // Assure-toi que FastAPI tourne bien sur le port 8000
        const res = await fetch('http://127.0.0.1:8000/api/dashboard/static', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            // Important : 'no-store' empêche Next.js de mettre en cache des données périmées
            cache: 'no-store',
        });

        if (!res.ok) {
            throw new Error(`Erreur FastAPI: ${res.status}`);
        }

        const data = await res.json();

        // 2. Next.js renvoie les données propres à ton Frontend
        return NextResponse.json(data);

    } catch (error) {
        console.error("Erreur Proxy Next.js -> FastAPI:", error);
        return NextResponse.json(
            { error: "Impossible de récupérer les données du dashboard" },
            { status: 500 }
        );
    }
}
export async function GETUSER(){

}