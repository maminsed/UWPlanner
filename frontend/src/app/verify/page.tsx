'use client'
import Image from "next/image"
import { useEffect, useState } from "react";
import { useAuth } from "../AuthProvider";
import { useRouter } from "next/navigation";
import { SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const Schema = z.object({
    code: z.string()
})

type FormFields = z.infer<typeof Schema>;

export default function Verify() {
    const [code, setCode] = useState<string[]>(['','','','','',''])
    //                                                 start, end
    const [last, setLast] = useState<[number, number]>([0,0])
    const [email, setEmail] = useState<string>('')
    const { handleSubmit, register, setError, clearErrors, formState: {errors} } = useForm<FormFields>({ resolver: zodResolver(Schema)})
    const {username} = useAuth()
    const router = useRouter()

    useEffect(()=>{
        if (!username) {
            console.log("please logIn First")
            router.push("/login")
            return
        }
        sendVerification()

    }, [])

    async function sendVerification() {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh_veri`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                "username": username,
            })
        })

        const res = await response.json().catch(()=>{})
        if (!response.ok) {
            if (res.action == "main_page") {
                router.push("/test")
            }
            return 
        }
        setEmail(res.email);
        clearErrors();
    }

    const onSubmit: SubmitHandler<FormFields> = async (data) => {
        const finalCode = code.join("").trim()
        console.log(finalCode)
        if (finalCode.length < 6) {
            setError("code", {"message": "Please Enter 6 characters"})
            return 
        }
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/confirm_veri`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    "username": username,
                    "code": finalCode,
                })
            })
            const res = await response.json().catch(()=>{})
            if (!response.ok) {
                setError("code", {
                    "message": res.message || "error"
                })
            } else {
                console.log("Congrats: "+res.message)
                router.push('test')
            }   
        } catch (err) {
            setError("code", {
                "message": err instanceof Error ? err.message : "Error - Please Try again"
            })
        }
    }

    function handleChange(e:React.ChangeEvent<HTMLInputElement>) {
        const data = e.target.value.split('');
        const res:string[] = []
        data.map((item)=>res.push(item));
        let i = res.length;
        while (i < 6) {
            res.push('')
            ++i;
        }
        setCode(res)
    }

    function handleKeyUp(e:React.KeyboardEvent<HTMLInputElement>) {
        setLast([(e.currentTarget.selectionStart||0)-1,(e.currentTarget.selectionEnd||0)-1])
    }

    return (
        <main className="relative h-dvh overflow-x-hidden flex justify-center items-center">
            <Image className="absolute object-cover object-center left-[-2px] right-[-2px] w-[calc(100vw+15rem)]  md:w-[calc(100vw+4px)] max-w-none" src="/backgroundLogin.svg" alt="background2" width={1437} height={496}/>
            <section className="z-2 bg-dark-green text-light-green flex flex-col items-center py-6 px-3 rounded-lg">
                <h3 className="text-2xl font-bold leading-[98%] mb-1">Two-Factor <br/> Verification</h3>
                <p className="text-sm mb-6 text-center">Enter the code sent to the email: <br/> <span>{email}</span></p>
                <form className="flex flex-col items-center" onSubmit={handleSubmit(onSubmit)}>
                    <div className="relative">
                        <div className="flex gap-2 justify-center">
                            {code.map((item, index)=> (
                                <input 
                                    type="tel" 
                                    key={index} 
                                    maxLength={1} 
                                    value={item} 
                                    readOnly={true} 
                                    onClick={()=>{console.log("HOLA")}}
                                    className={`bg-light-green text-dark-green text-center rounded-md font-semibold text-xl ${(index >= last[0] && index <= last[1]) ? "shadow-[0_0_21.7px_0px_#DEF2F580]" : ""} w-8 aspect-[4/5]`}/>
                            ))}
                        </div>
                        <input 
                            type="tel"
                            {...register("code")}
                            inputMode="numeric" 
                            autoComplete="one-time-code"
                            maxLength={6}
                            onChange={handleChange}
                            onKeyUp={handleKeyUp}
                            onSelect={handleKeyUp}
                            className="absolute font-mono inset-0 w-full h-full text-amber-800 pl-[0.92rem] tracking-[1.61rem] text-2xl font-semibold opacity-0"
                            />
                    </div>
                    <p className="text-sm text-center mt-1 mb-5">didn't recieve a code? <button type="button" onClick={sendVerification} className="text-cyan-400 underline cursor-pointer">resend</button></p>
                    {errors?.code && <p className="text-sm text-red-400 mb-1">{errors.code.message}</p>}
                    <button type="submit" className="bg-light-green text-dark-green px-8 py-1 rounded-md font-semibold cursor-pointer active:inset-shadow-sm active:inset-shadow-dark-green transition duration-200 ease-in">Verify</button>
                </form>
            </section>
        </main>
    )
}
