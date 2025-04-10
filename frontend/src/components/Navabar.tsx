import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MdAccountCircle } from "react-icons/md";

const Navbar: React.FC = () => {
    return (
        <nav className="flex flex-row justify-between items-center px-8 md:px-12 py-8">
            <div>
                <Link href="/">
                    <Image src="/Logo.png" alt='UWPLANNER logo' width={1722} height={1722} className='h-10 w-auto'/>
                </Link>
            </div>
            <ul className="flex flex-row justify-center gap-4 items-center">
                <li>
                    <Link href="/" className='text-[1.2rem]'>login</Link>
                </li>
                <li className='h-2 w-2 bg-dark-green rounded'></li>
                <li className='px-10 border-2 py-1 border-dark-green'>
                    <Link href="/">Sign Up</Link>
                </li>
                <li>
                    <Link href="/"><MdAccountCircle style={{height:"2.4rem", width:"auto"}}/></Link>
                </li>
            </ul>
        </nav>
    );
};

export default Navbar;