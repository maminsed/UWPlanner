'use client'
import { useEffect, useState } from "react";
import { api } from "@/lib/useApi";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navabar";
import { useAuth } from "../AuthProvider";

export default function Test() {
    const [message, setMessage] = useState<string>()
    const { username } = useAuth()
    const backend = api();
    const router = useRouter();

    useEffect(()=>{
        async function initial_handle() {
            try {
                const res = await backend(`${process.env.NEXT_PUBLIC_API_URL}/test/`, {
                    method: "POST",
                    body: JSON.stringify({
                        "error": "False"
                    }),
                    headers: {
                        "Content-Type": "application/json",
                    }
                })


                const response = await (res as Response).json().catch(()=>{})
                if (!res?.ok) {
                    if (response.action == "logout") {
                        router.push('/');
                    }
                    throw new Error("Error in Backend")
                }
                setMessage(response.message)
            } catch (err) {
                console.log(err)
                setMessage("Error in Response")
            }
            
        }

        initial_handle()

    }, [])
    
    return (
        <>
            <Navbar signedIn={true} username={username} />
            <div className="text-black text-xl mt-30">
                {message} + cats + {username}
            </div>
        </>
    )
}
