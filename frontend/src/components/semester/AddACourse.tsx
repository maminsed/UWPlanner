import { AiOutlineClose } from "react-icons/ai";
import HoverEffect from "../HoverEffect";
import { LuSearch } from "react-icons/lu";
import RightSide from "../utils/RightSide";
import {clsx} from "clsx";

export default function AddACourse({className, close, ...props}: React.HTMLAttributes<HTMLDivElement> & {close: ()=>void, updatePage: ()=>void}) {
    return (
    <div 
        className={
            clsx("fixed top-0 bottom-0 left-0 right-0 bg-light-green/50 z-[999] flex items-center justify-center"
                , className)
        }
        {...props}
        
    >
        <div className="bg-white pt-8 px-6 rounded-xl shadow-2xl shadow-dark-green/10">
            <RightSide className="!mb-1 !mr-0">
                <HoverEffect hover="close" className="cursor-pointer" onClick={close}>
                    <AiOutlineClose className="w-6 font-semibold h-auto" />
                </HoverEffect>
            </RightSide>
            <h3 className="w-full text-center text-xl font-semibold">Add Course:</h3>
            <p className="text-sm text-center mb-5">Just choose one/or more options and fill it out</p>
            <label className="block text-lg">
                Search:
                <div className="relative">
                    <input className="border-1 rounded-sm  block w-full py-2 pl-1 pr-7 focus:outline-none focus:shadow-2xs focus:shadow-dark-green duration-75" />
                    <LuSearch className="absolute top-0 right-1 h-full cursor-pointer w-6" />
                </div>
            </label>
            <label className="block text-lg mt-4">
                Id:
                <div className="relative">
                    <input className="border-1 rounded-sm  block w-full py-2 pl-1 pr-7 focus:outline-none focus:shadow-2xs focus:shadow-dark-green duration-75" />
                    <LuSearch className="absolute top-0 right-1 h-full cursor-pointer w-6" />
                </div>
            </label>
            <RightSide className="!mr-0">
                <button className="border-1 px-8 py-1 text-base mt-5 rounded-md cursor-pointer bg-dark-green text-light-green">Add</button>
            </RightSide>
        </div>
    </div>
    )
}
