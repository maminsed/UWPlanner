"use client";

import { Sidebar } from "../../components/Sidebar";
import { useAuth } from "@/app/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { access } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // A short delay to allow the auth state to be populated.
        const timer = setTimeout(() => {
            if (access === undefined) {
                // Still resolving auth state.
                return;
            }
            if (!access) {
                router.push("/login");
            }
        }, 100);

        return () => clearTimeout(timer);
    }, [access, router]);

    // Render a loading state or nothing while we verify auth.
    if (!access) {
        return null; // Or a loading spinner
    }

    return (
        <div className="flex h-screen bg-background">
            <div className="w-64 fixed top-0 left-0 h-full">
                <Sidebar />
            </div>
            <main className="flex-1 ml-64 p-12 overflow-y-auto text-foreground">
                {children}
            </main>
        </div>
    );
}
