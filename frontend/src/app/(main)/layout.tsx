"use client";

// import { Sidebar } from "../../components/Sidebar";
import { useAuth } from "@/app/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isExpired } from "@/lib/useApi";
import LogedInNav from "@/components/LogedInNav";

export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const { setAccess, exp, setExp, setUsername, clearAuth } = useAuth();
    useEffect(() => {
        // Checking if backend allows you to move, if not remove
        async function verify_jwt() {
            if (isExpired(exp)) {
                try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
                        method: "GET",
                        credentials: "include",
                        headers:{
                            "Content-Type": "application/json",
                        },
                    })

                    if (res.ok) {
                        const response = await res.json().catch(()=>{});
                        setAccess(response.Access_Token.token);
                        setExp(response.Access_Token.exp);
                        setUsername(response.username);
                    } else {
                        clearAuth();
                        router.push("/login")
                    }
                } catch (err) {
                    clearAuth();
                    console.log("error in frontend")
                    router.push("/login")
                }
            }
        }
        verify_jwt()
    }, [router]);


    return (
        <div>
            <LogedInNav />
            <main className="mt-20 overflow-x-hidden">
                {children}
            </main>
        </div>
    );
}
