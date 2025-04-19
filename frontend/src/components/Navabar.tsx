import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MdAccountCircle } from "react-icons/md";

const Navbar: React.FC = () => {
    return (
        <nav className="overflow-x-hidden flex flex-row justify-between items-center px-8 md:px-12 py-8 absolute top-0 left-0 w-full">
            <div>
                <Link href="/">
                    <Image src="/Logo.png" alt='UWPLANNER logo' width={1722} height={1722} className='h-10 w-auto'/>
                </Link>
            </div>
            <ul className="flex flex-row justify-center gap-2 xs:gap-4 items-center">
                <li>
                    <Link href="/login" className='text-[1.2rem]'>login</Link>
                </li>
                <li className='hidden xs:block h-2 w-2 bg-dark-green rounded'></li>
                <li className="px-5 xs:px-10 border-2 py-1 border-dark-green hover:text-light-green cursor-pointer relative overflow-hidden transition-all duration-700 text-center active:duration-500 active:bg-[#1a393d] active:border-[#1a393d] before:content-[''] before:absolute before:bg-dark-green before:transition-all before:duration-700 before:w-[200%] before:h-[200%] before:top-[110%] before:left-[110%]  hover:before:top-[-30px] hover:before:left-[-30px] before:z-[-1] before:rounded">
                    <Link href="/signUp">Sign Up</Link>
                </li>
                <li>
                    <Link href="/"><MdAccountCircle style={{height:"2.4rem", width:"auto"}}/></Link>
                </li>
            </ul>
        </nav>
    );
};

export default Navbar;