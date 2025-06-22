'use client';
import { LuCirclePlus } from "react-icons/lu"
import DropDown from "@/components/DropDown";

export default function Info() {

    

    return (
        <main>
            <h2 className="md:mt-15 px-3 mt-8 text-center md:text-2xl text-xl font-semibold">Just a few more questions to know you better</h2>

            <div className="mx-auto w-fit mt-20 px-6 py-5 rounded-lg bg-[#DAEBE3] shadow-[0px_0px_57.4px_0px_rgba(0,0,0,0.4)]">
                <h5 className="text-2xl font-medium mb-10 text-center">What's your Major?</h5>
                <DropDown />
                <button className="mt-4"><LuCirclePlus /></button>
            </div>

            <div className="h-[50vh] md:h-fit w-dvw fixed left-0 bottom-0 overflow-x-hidden z-[-1]">
                <img
                    src="/background.svg"
                    width="1000"
                    height="500"
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: "bottom",
                    }}
                    alt="background"
                />
            </div>
        </main>
    )
}
