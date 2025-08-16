"use client";
import { useState, createContext, useEffect, useContext } from "react";

type AuthCtx = {
    access?: string;
    setAccess: (t?: string) => void;
    exp?: string;
    setExp: (t?: string) => void;
    username?: string;
    setUsername: (t?: string) => void;
    profilePicture?: string;
    setProfilePicture: (url?: string) => void;
    clearAuth: () => void;
};

const AuthContext = createContext<AuthCtx>({
    setAccess: () => {},
    setExp: () => {},
    setUsername: () => {},
    setProfilePicture: () => {},
    clearAuth: () => {}
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [access, setAccess] = useState<string | undefined>(undefined);
    const [exp, setExp] = useState<string | undefined>(undefined);
    const [username, setUsername] = useState<string | undefined>(undefined);
    const [profilePicture, setProfilePicture] = useState<string | undefined>(
        undefined
    );

    // useEffect(()=>{
    //     async function handleInitial() {
    //         try {
    //             const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
    //                 method: "GET",
    //                 credentials: "include",
    //                 headers:{
    //                     "Content-Type": "application/json",
    //                 },
    //             })
    //             if (res.status != 200) {
    //                 throw new Error("Error in AuthProvider")
    //             }
    //             const response = await res.json();
    //             setAccess(response.Access_Token.token);
    //             setExp(response.Access_Token.exp)
    //             console.log(response.Access_Token.exp)
    //         } catch (err) {
    //             setAccess(undefined);
    //             setExp(undefined);
    //         }
    //     }

    //     handleInitial();
    // }, [])

    const clearAuth = () => {
        setAccess(undefined);
        setExp(undefined);
        setUsername(undefined);
        setProfilePicture(undefined);
    };

    return (
        <AuthContext.Provider
            value={{
                access,
                setAccess,
                exp,
                setExp,
                username,
                setUsername,
                profilePicture,
                setProfilePicture,
                clearAuth
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
export { AuthContext };
