"use client";
import {clsx} from "clsx";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import { IoMdSettings } from "react-icons/io";
import { LuMenu } from "react-icons/lu";
import { MdAccountCircle, MdExitToApp } from "react-icons/md";

import HoverEffect from "./HoverEffect";


import { useAuth } from "@/app/AuthProvider";


export default function LogedInNav() {
    const [panelOn, setPanelOn] = useState<boolean>(false);
    const [dropOn, setDropOn] = useState<boolean>(false);
    const [isXs, setIsXs] = useState<boolean>(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLDivElement>(null);
    const { setAccess, setExp, setUsername, username } = useAuth();
    const router = useRouter();

    async function logOut() {
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/auth/logout`,
                {
                    credentials: "include",
                }
            );
            const res = await response.json().catch(() => {});
            if (response.ok) {
                setAccess(undefined);
                setExp(undefined);
                setUsername(undefined);
                router.push("/");
            } else {
                console.log("error in backend");
                console.log(res.message);
            }
        } catch (err) {
            console.log("error occured in logout");
            console.log(err);
        }
    }

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (
                panelRef.current?.contains(e.target as Node) ||
                buttonRef.current?.contains(e.target as Node)
            )
                {return;}
            setPanelOn(false);
        }

        function handleResize() {
            setIsXs(window.innerWidth < 480);
        }

        handleResize();
        window.addEventListener("click", handleClick, true);
        window.addEventListener("resize", handleResize);
        return () => {window.removeEventListener("click", handleClick, true); window.removeEventListener("resize", handleResize)}
    }, []);
    
        return (
        <nav className="absolute top-0 left-0 right-0 z-50 flex flex-row justify-between items-center px-8 md:px-15 pt-6 pb-3 backdrop-blur-xs rounded-b-lg">
            <div>
                <Link href="/">
                    <Image
                        src="/Logo.png"
                        alt="UWPLANNER logo"
                        width={1722}
                        height={1722}
                        className="h-10 w-auto"
                    />
                </Link>
            </div>
            <div className="flex flex-row justify-center gap-1 xs:gap-4 items-center">
                <LuMenu className="cursor-pointer w-auto h-[2rem] xs:h-0" onClick={()=>setDropOn(!dropOn)}/>  
                <div className={clsx(
                    "xs:overflow-hidden xs:w-auto xs:flex xs:flex-row gap-2 xs:gap-4",
                    isXs && "absolute top-18 bg-dark-green/40 text-emerald-900 backdrop-blur-xs px-3 py-3 rounded contain-content duration-300",
                    isXs && (dropOn ? "max-h-30" : "max-h-0 !py-0")
                )}>
                    <div>
                        <Link href="/discussions" className="text-md sm:text-[1.2rem]">
                            Discussions
                        </Link>
                    </div>
                    <div>
                        <Link href="/courses" className="text-md sm:text-[1.2rem]">
                            Courses
                        </Link>
                    </div>
                    <div>
                        <Link href="/graph" className="text-md sm:text-[1.2rem]">
                            Graph
                        </Link>
                    </div>
                    <div>
                        <Link href="/semester" className="text-md sm:text-[1.2rem]">
                            Semester
                        </Link>
                    </div>
                </div>

                <div className="relative">
                    <div
                        ref={buttonRef}
                        onClick={() => setPanelOn(!panelOn)}
                        className="cursor-pointer"
                    >
                        <MdAccountCircle
                            style={{ height: "2.4rem", width: "auto" }}
                        />
                    </div>
                    <div
                        ref={panelRef}
                        className={clsx(`absolute backdrop-blur-xs bg-[#4bac7f49] top-full px-3 rounded-lg right-[100%] md:right-1/2 translate-x-1/2 font-medium overflow-y-clip transition-all duration-500`,
                            panelOn ? "max-h-30 py-[0.85rem]" : "max-h-0"
                        )}
                    >
                        <HoverEffect pClass="max-w-[100px]" hover={username || ""}>{username || ""}</HoverEffect>
                        <Link
                            href="/settings"
                            className="items-center flex hover:text-[#1a3337] transition-colors duration-300"
                        >
                            <IoMdSettings className="mr-1" />
                            Settings
                        </Link>
                        <button
                            onClick={logOut}
                            className="mt-5 text-red-500 cursor-pointer flex items-center hover:text-red-700 transition-colors duration-300"
                        >
                            <MdExitToApp className="mr-1" />
                            Log Out
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};
