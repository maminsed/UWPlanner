import Image from "next/image";

import AuthForm from "@/components/AuthForm-Login";
import PublicNavbar from "@/components/PublicNavbar";

export default function Landing() {
    return (
        <section className="overflow-x-hidden flex justify-center items-center h-dvh w-dvw relative">
            <Image
                className="absolute object-cover object-center left-[-2px] right-[-2px] w-[calc(100vw+15rem)]  md:w-[calc(100vw+4px)] max-w-none"
                src="/backgroundLogin.svg"
                alt="background2"
                width={1437}
                height={496}
            />
            <PublicNavbar />
            <AuthForm />
        </section>
    );
}
