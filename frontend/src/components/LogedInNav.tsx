"use client";
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/AuthProvider";
import Link from "next/link";
import Image from "next/image";
import { MdAccountCircle, MdExitToApp } from "react-icons/md";
import HoverEffect from "./HoverEffect";
import { IoMdSettings } from "react-icons/io";


export default function LogedInNav() {
    const [panelOn, setPanelOn] = useState<boolean>(false);
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
                return;
            setPanelOn(false);
        }

        window.addEventListener("click", handleClick, true);
        return () => window.removeEventListener("click", handleClick, true);
    }, []);
    
        return (
        <nav className="absolute top-0 left-0 right-0 z-50 flex flex-row justify-between items-center px-8 md:px-15 py-8">
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
            <div className="flex flex-row justify-center gap-2 xs:gap-4 items-center">
                
                <div>
                    <Link href="/discussions" className="text-[1.2rem]">
                        Discussions
                    </Link>
                </div>
                <div>
                    <Link href="/courses" className="text-[1.2rem]">
                        Courses
                    </Link>
                </div>
                <div>
                    <Link href="/graph" className="text-[1.2rem]">
                        Graph
                    </Link>
                </div>
                <div>
                    <Link href="/semester" className="text-[1.2rem]">
                        Semester
                    </Link>
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
                        className={`absolute backdrop-blur-xs bg-[#4bac7f49] top-full px-3 rounded-lg right-1/2 translate-x-1/2 font-medium overflow-y-clip ${
                            panelOn ? "max-h-30 py-[0.85rem]" : "max-h-0"
                        } transition-all duration-500`}
                    >
                        <HoverEffect text={username || ""}/>
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
