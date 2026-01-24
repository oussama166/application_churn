export function AuthShell({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-2 h-screen">
            <div className="bg-black text-white p-10">
                {/* Left side branding */}
                <h1>MyApp</h1>
            </div>
            <div className="flex items-center justify-center p-10">
                <div className="w-full max-w-md">
                    <h2 className="text-2xl font-bold mb-6">{title}</h2>
                    {children}
                </div>
            </div>
        </div>
    );
}