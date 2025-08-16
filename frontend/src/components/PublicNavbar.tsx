"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { MdAccountCircle } from "react-icons/md";

const PublicNavbar: React.FC = () => {
    return (
        <nav className="top-0 left-0 right-0 z-50 flex flex-row justify-between items-center px-8 md:px-10 py-8 absolute w-full">
            <div>
                <Link href="/">
                    <Image
                        src="/Logo.png"
                        alt="UWPLANNER logo"
                        width={1722}
                        height={1722}
                        className="h-12 w-auto"
                    />
                </Link>
            </div>
            <div className="flex flex-row justify-center gap-2 xs:gap-4 items-center">
                <div>
                    <Link href="/login" className="text-[1.2rem]">
                        login
                    </Link>
                </div>
                <div className="hidden xs:block h-2 w-2 bg-dark-green rounded"></div>
                <Link
                    href="/signUp"
                    className="px-5 xs:px-10 border-2 py-1 border-dark-green hover:text-light-green cursor-pointer relative overflow-hidden transition-all duration-700 text-center active:duration-500 active:bg-[#1a393d] active:border-[#1a393d] before:content-[''] before:absolute before:bg-dark-green before:transition-all before:duration-700 before:w-[200%] before:h-[200%] before:top-[110%] before:left-[110%]  hover:before:top-[-30px] hover:before:left-[-30px] before:z-[-1] before:rounded"
                >
                    Sign Up
                </Link>
                
                <MdAccountCircle
                    style={{ height: "2.4rem", width: "auto" }}
                />
                
            </div>
        </nav>
    );
};

export default PublicNavbar;
