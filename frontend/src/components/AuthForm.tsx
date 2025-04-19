import { FaGoogle } from "react-icons/fa";
import { FaApple } from "react-icons/fa";
import { FaGithub } from "react-icons/fa";

export default function SignIn() {
    return (
        <div className="flex flex-col pt-8 rounded-xl bg-white shadow-[0_2px_49.9px_0_#222E3033]">
            <h3 className="w-full text-center text-3xl font-bold z-2">Sign In</h3>
            <div className="w-full h-full bg-dark-green p-6 pt-8 pb-8 mt-6 rounded-xl rounded-t-3xl text-light-green drop-shadow-[0_-2px_19.1px_rgba(47,55,56,0.25)]">
                <form className="flex flex-col">
                    <input name="Email" required={true} className="mb-2 border-2 border-light-green rounded-xl pl-3 py-2 text-sm w-[220px] focus:outline-none focus:shadow-[0px_0px_5px_0px_#ECFDF5] transition-all" placeholder="Email" type="email"/>
                    <input name="password" required={true} className="border-2 border-light-green rounded-xl pl-3 py-2 text-sm focus:outline-none focus:shadow-[0px_0px_5px_0px_#ECFDF5] transition-all" placeholder="Password" type="password"/>
                    <a className="mt-2 mb-16 mr-1.5 cursor-pointer text-xs ml-auto">Forgot Password?</a>
                    <button type="submit" className="cursor-pointer rounded-3xl bg-light-green text-dark-green py-2 hover:bg-[#00b03e] hover:text-light-green transition-all duration-500 active:bg-green-600">Sign In</button>
                </form>

                <p className="w-full text-center mt-5 text-sm mb-1">Or sign in with</p>
                <div className="flex w-full justify-center gap-5 items-center h-8 mt-2">
                    <a className="cursor-pointer bg-light-green text-dark-green p-2 rounded-full aspect-square h-full relative z-9 overflow-hidden transition-all duration-300 before:absolute before:bottom-0 before:left-0 before:h-0 before:w-full before:bg-[#0F9D58] before:-z-10 before:shadow-lg before:transition-all before:duration-300 hover:before:h-full hover:text-light-green"><FaGoogle style={{width:"auto",height:"100%"}}/></a>
                    <a className="cursor-pointer bg-light-green text-dark-green p-2 rounded-full aspect-square h-full relative z-9 overflow-hidden transition-all duration-300 before:absolute before:bottom-0 before:left-0 before:h-0 before:w-full before:bg-[#666666] before:-z-10 before:shadow-lg before:transition-all before:duration-300 hover:before:h-full hover:text-light-green"><FaApple style={{width:"auto",height:"100%"}}/></a>
                    <a className="cursor-pointer bg-light-green text-dark-green p-2 rounded-full aspect-square h-full relative z-9 overflow-hidden transition-all duration-300 before:absolute before:bottom-0 before:left-0 before:h-0 before:w-full before:bg-[#6e5494] before:-z-10 before:shadow-lg before:transition-all before:duration-300 hover:before:h-full hover:text-light-green"><FaGithub style={{width:"auto",height:"100%"}}/></a>
                </div>
            </div>
        </div>
    )
}