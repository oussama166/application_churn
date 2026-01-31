// app/components/CsvImporter.tsx
'use client'

import { useState } from "react";
import { ReactSpreadsheetImport } from "react-spreadsheet-import";

export default function CsvImporter() {
    const [isOpen, setIsOpen] = useState(false);

    // Define the columns your app expects
    const fields = [
        {
            label: "Full Name",
            key: "name",
            alternateMatches: ["first name", "fname"], // Helps auto-map
            fieldType: { type: "input" },
            example: "John Doe",
            validations: [
                {
                    rule: "required",
                    errorMessage: "Name is required",
                },
            ],
        },
        {
            label: "Email",
            key: "email",
            fieldType: { type: "input" },
            example: "john@example.com",
            validations: [
                {
                    rule: "regex",
                    value: "^[^@]+@[^@]+\\.[^@]+$",
                    errorMessage: "Invalid email format",
                },
            ],
        },
    ];

    return (
        <>
            <button onClick={() => setIsOpen(true)}>Import CSV</button>

            <ReactSpreadsheetImport
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                onSubmit={(data) => {
                    // data.validData contains the clean rows
                    console.log("Imported Data:", data.validData);
                    setIsOpen(false);
                }}
                fields={fields}
            />
        </>
    );
}