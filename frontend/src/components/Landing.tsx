import Link from "next/link"
import Image from "next/image"

export default function Landing() {

    return (
        <section className="pt-18 gap-18 mt-20 sm:mt-15 md:h-dvh flex w-full justify-around items-center flex-col md:flex-row md:gap-0 md:mt-0">
            <div className="max-sm:text-center">
                <h1 className="text-5xl sm:text-6xl font-extrabold border-b-3 py-1">UWPLANER</h1>
                <p className="text-2xl font-light">Get ready for future</p>
                <ul className="flex flex-row justify-center md:justify-start gap-4 items-center mt-5">
                    <li>
                        <Link href="/" className='text-[1.2rem]'>login</Link>
                    </li>
                    <li className='h-2 w-2 bg-dark-green rounded'></li>
                    <li className="px-10 border-2 py-1 border-dark-green hover:text-light-green cursor-pointer relative overflow-hidden transition-all duration-700 active:duration-500 active:bg-[#1a393d] active:border-[#1a393d] before:content-[''] before:absolute before:bg-dark-green before:transition-all before:duration-700 before:w-[200%] before:h-[200%] before:top-[110%] before:left-[110%]  hover:before:top-[-30px] hover:before:left-[-30px] before:z-[-1] before:rounded">
                        <Link href="/">Sign Up</Link>
                    </li>
                </ul>
            </div>

            <Image className="w-[95%] sm:w-[80%] md:w-[55%] h-auto max-w-[39rem] shadow-[2px_4px_51px_1px_rgba(58,97,102,0.28)]" src="/mock.png?var=2" alt="Picture of the app in action" width={717} height={511}/>

            <div className="h-[50vh] md:h-fit w-dvw fixed left-0 bottom-0 overflow-x-hidden z-[-1]">
                <img src="/background.svg" width="1000" height="500" style={{width: "100%", height:"100%", objectFit:"cover", objectPosition:"bottom"}} alt="background"/>
            </div>

        </section>
    )
}