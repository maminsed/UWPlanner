'use client'
import { useEffect, useState } from "react";
import { api } from "@/lib/useApi";
import { useRouter } from "next/navigation";

export default function Test() {
    const [message, setMessage] = useState<string>()
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
        <div className="bg-amber-400 text-green-300 text-5xl">
            {message}
        </div>
    )
}