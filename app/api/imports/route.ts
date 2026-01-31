import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        // 1. Get the JSON body sent from your ImportPage (Frontend)
        const body = await request.json();

        // 2. Define your Python Backend URL
        // Make sure your FastAPI is running on port 8000
        const FASTAPI_URL = 'http://127.0.0.1:8000/api/predict/store-results';

        // 3. Forward the data to FastAPI
        const res = await fetch(FASTAPI_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        // 4. Handle Errors from the Backend
        if (!res.ok) {
            const errorText = await res.text();
            console.error('FastAPI Error:', errorText);
            return NextResponse.json(
                { message: `Backend Error: ${res.statusText}`, detail: errorText },
                { status: res.status }
            );
        }

        // 5. Return the Success Response to the Frontend
        const data = await res.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error('Next.js Proxy Error:', error);
        return NextResponse.json(
            { message: 'Internal Server Error', detail: error.message },
            { status: 500 }
        );
    }
}