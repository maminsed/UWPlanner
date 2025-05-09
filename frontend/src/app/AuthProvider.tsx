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
        console.log("Hi were at AuthContext")
        console.log(process.env.NEXT_PUBLIC_API_URL)
        async function handleInitial() {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
                    method: "GET",
                    credentials: "include",
                    headers:{
                        "Content-Type": "application/json",
                    },
                }).then(res => res.json())
                setAccess(res.Access_Token.token);
                setExp(res.Access_Token.exp)
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