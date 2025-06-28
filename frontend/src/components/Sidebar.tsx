"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
    MessageSquare,
    BookOpen,
    BarChart2,
    Calendar,
    Settings,
    LogOut,
    User,
} from "lucide-react";
import { useAuth } from "@/app/AuthProvider";

const navItems = [
    { name: "Discussions", href: "/discussions", icon: MessageSquare },
    { name: "Courses", href: "/courses", icon: BookOpen },
    { name: "Graph", href: "/graph", icon: BarChart2 },
    { name: "Semester", href: "/semester", icon: Calendar },
    { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const { username, setAccess, setExp, setUsername, profilePicture } =
        useAuth();

    async function logOut() {
        // Logout logic from old Navbar.tsx
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/auth/logout`,
                {
                    credentials: "include",
                }
            );
            if (response.ok) {
                setAccess(undefined);
                setExp(undefined);
                setUsername(undefined);
                // router.push("/"); // This should be handled by AuthProvider or a redirect
            } else {
                console.log("error in backend");
            }
        } catch (err) {
            console.log("error occured in logout");
            console.log(err);
        }
    }

    return (
        <div className="flex h-full flex-col bg-[#111827] text-white">
            <div className="flex h-16 items-center border-b pl-4 py-12 border-gray-700">
                <Link href="/" className="flex items-center gap-2">
                    <Image
                        src="/Logo.png"
                        alt="UWPLANNER logo"
                        width={40}
                        height={40}
                    />
                    <span className="text-xl font-bold">UWPlanner</span>
                </Link>
            </div>
            <nav className="flex-1 space-y-2 p-4">
                {navItems.map((item) => (
                    <Link
                        key={item.name}
                        href={item.href}
                        className={`flex items-center rounded-md px-3 py-2 text-sm font-medium ${
                            pathname.startsWith(item.href)
                                ? "bg-gray-700"
                                : "hover:bg-gray-700/50"
                        }`}
                    >
                        <item.icon className="mr-3 h-5 w-5" />
                        <span>{item.name}</span>
                    </Link>
                ))}
            </nav>
            <div className="border-t border-gray-700 p-4">
                <div className="flex items-center gap-3">
                    {profilePicture ? (
                        <img
                            src={profilePicture}
                            alt="Profile"
                            className="h-10 w-10 rounded-full object-cover"
                        />
                    ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700">
                            <User className="h-6 w-6" />
                        </div>
                    )}
                    <div>
                        <p className="text-sm font-semibold">{username}</p>
                        <p className="text-xs text-gray-400">Student</p>
                    </div>
                </div>
                <button
                    onClick={logOut}
                    className="mt-4 flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-red-400 hover:bg-gray-700/50"
                >
                    <LogOut className="mr-3 h-5 w-5" />
                    <a href="/">Logout</a>
                </button>
            </div>
        </div>
    );
}
