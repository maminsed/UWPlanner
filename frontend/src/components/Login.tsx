import { FaGoogle } from "react-icons/fa";
import { FaApple } from "react-icons/fa";
import { FaGithub } from "react-icons/fa";

export default function SignIn() {
    return (
        <div className="flex flex-col border-1 p-6 py-8 rounded-xl bg-dark-green text-light-green">
            <h3 className="w-full text-center text-3xl font-bold">Sign In</h3>
            <form className="flex flex-col">
                <input name="Email" className="mt-8 mb-4 border-2 border-light-green rounded-xl pl-3 py-1" placeholder="Email" type="email"/>
                <input name="password" className="border-2 border-light-green rounded-xl pl-3 py-1" placeholder="Password" type="password"/>
                <a className="mt-2 mb-16 ml-1 cursor-pointer text-xs">Forgot Password?</a>
                <button type="submit" className="cursor-pointer rounded-3xl bg-light-green text-dark-green py-2">Sign In</button>
            </form>

            <p className="w-full text-center mt-5 text-sm mb-1">Or sign in with</p>
            <div className="flex w-full justify-center gap-5 items-center h-8 mt-2">
                <a className="cursor-pointer bg-light-green text-dark-green p-2 rounded-full aspect-square h-full"><FaGoogle style={{width:"auto",height:"100%"}}/></a>
                <a className="cursor-pointer bg-light-green text-dark-green p-2 rounded-full aspect-square h-full"><FaApple style={{width:"auto",height:"100%"}}/></a>
                <a className="cursor-pointer bg-light-green text-dark-green p-2 rounded-full aspect-square h-full"><FaGithub style={{width:"auto",height:"100%"}}/></a>
            </div>
        </div>
    )
}