'use client'
import { useState, createContext, useEffect, useContext } from "react"

type AuthCtx = {
    access?: string;
    setAccess: (t?:string) => void;
}

const AuthContext = createContext<AuthCtx>({ setAccess:()=>{} })

export function AuthProvider({children}:{children: React.ReactNode}) {
    const [access, setAccess] = useState<string|undefined>(undefined)
    useEffect(()=>{
        async function handleInitial() {
            try {
                const res = await fetch(`${process.env.API_URL}/auth/refresh`, {
                    method: "GET",
                    credentials: "include",
                    headers:{
                        "Content-Type": "application/json",
                    },
                }).then(res => res.json())
                setAccess(res.Access_Token);
            } catch (err) {
                setAccess(undefined);
            }
        }

        handleInitial();
    }, [])

    return (
        <AuthContext.Provider value={{ access, setAccess }} >
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = useContext(AuthContext);