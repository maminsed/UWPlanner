'use client';
import Link from "next/link";
import { useContext, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form"
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthContext } from "@/app/AuthProvider";
import { useRouter } from "next/navigation";

//Logos
import { FaGoogle } from "react-icons/fa";
import { FaApple } from "react-icons/fa";
import { FaGithub } from "react-icons/fa";
import { IoMdEye,IoMdEyeOff } from "react-icons/io";


const schema = z.object({
    email: z.string({"required_error": "Email is mandatory"}).email(),
    password: z.string({"required_error": "Pass is mandatory"}).min(8, {"message": "password at least 8 characters"}),
})

type FormFields = z.infer<typeof schema>;

export default function LogIn() {
    const [visiblePass, setVisiblePass] = useState("password");
    const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<FormFields>({ resolver:zodResolver(schema) });
    const { setAccess, setExp } = useContext(AuthContext)
    const router = useRouter()

    function reverseVisibility() {
        setVisiblePass(visiblePass == "password" ? "text" : "password");
    }

    const onSubmit: SubmitHandler<FormFields> = async (data) => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
                "method": "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                "body": JSON.stringify({
                    "email": data.email,
                    "password": data.password
                })
            })
            if (!response.ok) {
                const { message, error } = await response.json().catch(()=>({}))
                console.log("Error Occured")
                console.log(message)
                console.log(error)
                console.log(response.status)
                throw new Error(message || `Request Faild. Res: ${response.status}`)
            }

            const res = await response.json();
            let { Access_Token, exp } = res;
            setAccess(Access_Token)
            setExp(exp)
            const { username } = res;
            console.log(`Welcome Back baby ${username}`)
            router.push("/semester")
        } catch (err) {
            setError("root", {
                "message": err instanceof Error ? err.message : "Error - Please Try again"
            })
        }
    }


    return (
        <div className="max-xs:mt-25 max-w-[96vw] w-[270px] flex flex-col pt-8 rounded-xl bg-white shadow-[0_2px_49.9px_0_#222E3033] overflow-x-hidden">
            <h3 className="w-full text-center text-3xl font-bold z-2">Log In</h3>
            <div className="w-full h-full bg-dark-green p-6 pt-8 pb-8 mt-6 rounded-xl rounded-t-3xl text-light-green drop-shadow-[0_-2px_19.1px_rgba(47,55,56,0.25)]">
                <form className="flex flex-col" onSubmit={handleSubmit(onSubmit)}>
                    <input 
                        {...register("email")}
                        className="border-2 border-light-green rounded-xl pl-3 py-2 text-sm focus:outline-none focus:shadow-[0px_0px_5px_0px_#ECFDF5] transition-all" 
                        placeholder="Email" 
                        type="text"/>
                    { errors.email && <span className="text-red-600 text-sm">{errors.email.message}</span>}
                    <div className="flex relative mt-2">
                        <input 
                            {...register("password")}
                            className="border-2 border-light-green rounded-xl pl-3 pr-6 py-2 text-sm focus:outline-none focus:shadow-[0px_0px_5px_0px_#ECFDF5] transition-all w-full" 
                            placeholder="Password" 
                            type={visiblePass} />
                        {visiblePass == "password" ?
                            <IoMdEyeOff className="absolute right-2 top-[50%] translate-y-[-50%] cursor-pointer" onClick={reverseVisibility} style={{height:"18px", width:"auto"}}/> : 
                            <IoMdEye className="absolute right-2 top-[50%] translate-y-[-50%] cursor-pointer" onClick={reverseVisibility} style={{height:"18px", width:"auto"}}/>}
                    </div>
                    { errors.password && <span className="text-red-600 text-sm">{errors.password.message}</span>}
                    <a className="mr-1.5 cursor-pointer text-xs ml-auto underline mt-2">Forgot Password?</a>
                    <button disabled={isSubmitting} type="submit" className="mt-16 cursor-pointer rounded-3xl bg-light-green text-dark-green py-2 hover:bg-[#00b03e] hover:text-light-green hover:shadow-[0px_0px_30px_0px_#f0fdfa44] transition-all duration-500 active:bg-green-600">{ isSubmitting ? "Loading..." : "Log In"}</button>
                    { errors.root && <span className="text-red-600">{errors.root.message}</span>}
                </form>

                <Link href="/signUp" className="block w-full text-center text-sm mt-2 mb-6 underline">Don't have an account?</Link>
                <div className="flex w-full justify-center gap-5 items-center h-8 mt-2">
                    <a className="cursor-pointer bg-light-green text-dark-green p-2 rounded-full aspect-square h-full relative z-9 overflow-hidden transition-all duration-300 before:absolute before:bottom-0 before:left-0 before:h-0 before:w-full before:bg-[#0F9D58] before:-z-10 before:shadow-lg before:transition-all before:duration-300 hover:before:h-full hover:text-light-green"><FaGoogle style={{width:"auto",height:"100%"}}/></a>
                    <a className="cursor-pointer bg-light-green text-dark-green p-2 rounded-full aspect-square h-full relative z-9 overflow-hidden transition-all duration-300 before:absolute before:bottom-0 before:left-0 before:h-0 before:w-full before:bg-[#666666] before:-z-10 before:shadow-lg before:transition-all before:duration-300 hover:before:h-full hover:text-light-green"><FaApple style={{width:"auto",height:"100%"}}/></a>
                    <a className="cursor-pointer bg-light-green text-dark-green p-2 rounded-full aspect-square h-full relative z-9 overflow-hidden transition-all duration-300 before:absolute before:bottom-0 before:left-0 before:h-0 before:w-full before:bg-[#6e5494] before:-z-10 before:shadow-lg before:transition-all before:duration-300 hover:before:h-full hover:text-light-green"><FaGithub style={{width:"auto",height:"100%"}}/></a>
                </div>
            </div>
        </div>
    )
}
