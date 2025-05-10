'use client'
import { useEffect, useState } from "react";
import { api } from "@/lib/useApi";

export default function Test() {
    const [message, setMessage] = useState<string>()
    const backend = api();
    useEffect(()=>{
        async function initial_handle() {
            try {
                const res = await backend(`${process.env.NEXT_PUBLIC_API_URL}/test/`, {
                method: "GET",})

                if (!res?.ok) {
                    throw new Error("Error in Backend")
                }
                const response = await res.json()
                setMessage(response.message)
            } catch (err) {
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