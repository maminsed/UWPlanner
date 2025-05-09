'use client'
import { useState, createContext, useEffect, useContext } from "react"

type AuthCtx = {
    access?: string;
    setAccess: (t?:string) => void;
    exp?:string;
    setExp: (t?:string) => void;
}

const AuthContext = createContext<AuthCtx>({ setAccess:()=>{}, setExp:()=>{} })

export function AuthProvider({children}:{children: React.ReactNode}) {
    const [access, setAccess] = useState<string|undefined>(undefined)
    const [exp, setExp] = useState<string|undefined>(undefined)

    useEffect(()=>{
        async function handleInitial() {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
                    method: "GET",
                    credentials: "include",
                    headers:{
                        "Content-Type": "application/json",
                    },
                })
                if (res.status != 200) {
                    setAccess(undefined);
                    setExp(undefined);
                } else {
                    const response = await res.json();
                    setAccess(response.Access_Token.token);
                    setExp(response.Access_Token.exp)
                }
            } catch (err) {
                setAccess(undefined);
                setExp(undefined);
            }
        }

        handleInitial();
    }, [])

    return (
        <AuthContext.Provider value={{ access, setAccess, exp, setExp }} >
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext);
export { AuthContext }