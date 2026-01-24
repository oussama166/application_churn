import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        // 1. Parse the incoming JSON data
        const body = await request.json();
        const { data, mappings } = body;

        // 2. Log it to your VS Code terminal (Server-side)
        console.log("------------------------------------------------");
        console.log("🚀 SERVER RECEIVED IMPORT REQUEST");
        console.log(`📦 Rows received: ${data.length}`);
        console.log("🔧 Mappings used:", mappings);
        console.log("📝 First row sample:", data[0]);
        console.log("------------------------------------------------");

        // 3. Simulate a database delay (2 seconds)
        // This lets you see the "Processing..." spinner on the frontend
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // 4. Return success
        return NextResponse.json({
            success: true,
            message: `Successfully processed ${data.length} records.`
        });

    } catch (error) {
        console.error("Server Error:", error);
        return NextResponse.json(
            { success: false, message: "Failed to process data" },
            { status: 500 }
        );
    }
}