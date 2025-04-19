import Link from "next/link";
import { FaGoogle } from "react-icons/fa";
import { FaApple } from "react-icons/fa";
import { FaGithub } from "react-icons/fa";

export default function SignIn({mode}:{mode:"Sign In"|"Sign Up"}) {
    return (
        <div className="max-xs:mt-25 max-w-[96vw] w-[270px] flex flex-col pt-8 rounded-xl bg-white shadow-[0_2px_49.9px_0_#222E3033] overflow-x-hidden">
            <h3 className="w-full text-center text-3xl font-bold z-2">{mode}</h3>
            <div className="w-full h-full bg-dark-green p-6 pt-8 pb-8 mt-6 rounded-xl rounded-t-3xl text-light-green drop-shadow-[0_-2px_19.1px_rgba(47,55,56,0.25)]">
                <form className="flex flex-col">
                    <input name="Email" required={true} className="mb-2 border-2 border-light-green rounded-xl pl-3 py-2 text-sm focus:outline-none focus:shadow-[0px_0px_5px_0px_#ECFDF5] transition-all" placeholder="Email" type="email"/>
                    <input name="password" required={true} className="border-2 border-light-green rounded-xl pl-3 py-2 text-sm focus:outline-none focus:shadow-[0px_0px_5px_0px_#ECFDF5] transition-all mb-2" placeholder="Password" type="password"/>
                    {mode == "Sign In" ? <a className="mr-1.5 cursor-pointer text-xs ml-auto underline">Forgot Password?</a> : 
                    <input name="password" required={true} className="border-2 border-light-green rounded-xl pl-3 py-2 text-sm focus:outline-none focus:shadow-[0px_0px_5px_0px_#ECFDF5] transition-all mb-2" placeholder="Confirm Password" type="password"/>}
                    <button type="submit" className="mt-16 cursor-pointer rounded-3xl bg-light-green text-dark-green py-2 hover:bg-[#00b03e] hover:text-light-green transition-all duration-500 active:bg-green-600">{mode}</button>
                </form>

                <Link href={mode == "Sign In" ? "/signUp" : "/login" } className="block w-full text-center text-sm mt-2 mb-6 underline">{mode == "Sign Up" ?"Already Have an account?" : "Don't have an account?"}</Link>
                <div className="flex w-full justify-center gap-5 items-center h-8 mt-2">
                    <a className="cursor-pointer bg-light-green text-dark-green p-2 rounded-full aspect-square h-full relative z-9 overflow-hidden transition-all duration-300 before:absolute before:bottom-0 before:left-0 before:h-0 before:w-full before:bg-[#0F9D58] before:-z-10 before:shadow-lg before:transition-all before:duration-300 hover:before:h-full hover:text-light-green"><FaGoogle style={{width:"auto",height:"100%"}}/></a>
                    <a className="cursor-pointer bg-light-green text-dark-green p-2 rounded-full aspect-square h-full relative z-9 overflow-hidden transition-all duration-300 before:absolute before:bottom-0 before:left-0 before:h-0 before:w-full before:bg-[#666666] before:-z-10 before:shadow-lg before:transition-all before:duration-300 hover:before:h-full hover:text-light-green"><FaApple style={{width:"auto",height:"100%"}}/></a>
                    <a className="cursor-pointer bg-light-green text-dark-green p-2 rounded-full aspect-square h-full relative z-9 overflow-hidden transition-all duration-300 before:absolute before:bottom-0 before:left-0 before:h-0 before:w-full before:bg-[#6e5494] before:-z-10 before:shadow-lg before:transition-all before:duration-300 hover:before:h-full hover:text-light-green"><FaGithub style={{width:"auto",height:"100%"}}/></a>
                </div>
            </div>
        </div>
    )
}