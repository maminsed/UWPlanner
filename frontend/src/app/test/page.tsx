'use client'
import { useContext } from "react";
import { AuthContext } from "../AuthProvider"

export default function Test() {
    const { access } = useContext(AuthContext);
    
    return (
        <div className="bg-amber-400 text-green-300 text-5xl">
            Meow Meow Bitch!
        </div>
    )
}