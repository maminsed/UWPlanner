import Image from "next/image"
export default function Verify() {

    return (
        <main className="relative h-dvh overflow-x-hidden flex justify-center items-center">
            <Image className="absolute object-cover object-center left-[-2px] right-[-2px] w-[calc(100vw+15rem)]  md:w-[calc(100vw+4px)] max-w-none" src="/backgroundLogin.svg" alt="background2" width={1437} height={496}/>
            <section className="z-2 bg-dark-green text-light-green">
                <h3>Two-Factor Verification</h3>
                <p>Enter the code sent to the email: </p>
                <form>
                    <div className="flex gap-2 justify-center">
                        <input type="tel" maxLength={1} className="bg-light-green text-dark-green text-center rounded-md font-semibold text-xl focus:drop-shadow-xs focus:outline-none focus:drop-shadow-emerald-100/70 w-8 aspect-[4/5]"/>
                        <input type="tel" maxLength={1} className="bg-light-green text-dark-green text-center rounded-md font-semibold text-xl focus:drop-shadow-xs focus:outline-none focus:drop-shadow-emerald-100/70 w-8 aspect-[4/5]"/>
                        <input type="tel" maxLength={1} className="bg-light-green text-dark-green text-center rounded-md font-semibold text-xl focus:drop-shadow-xs focus:outline-none focus:drop-shadow-emerald-100/70 w-8 aspect-[4/5]"/>
                        <input type="tel" maxLength={1} className="bg-light-green text-dark-green text-center rounded-md font-semibold text-xl focus:drop-shadow-xs focus:outline-none focus:drop-shadow-emerald-100/70 w-8 aspect-[4/5]"/>
                        <input type="tel" maxLength={1} className="bg-light-green text-dark-green text-center rounded-md font-semibold text-xl focus:drop-shadow-xs focus:outline-none focus:drop-shadow-emerald-100/70 w-8 aspect-[4/5]"/>
                        <input type="tel" maxLength={1} className="bg-light-green text-dark-green text-center rounded-md font-semibold text-xl focus:drop-shadow-xs focus:outline-none focus:drop-shadow-emerald-100/70 w-8 aspect-[4/5]"/>
                    </div>
                    <p>didn't recieve a code? <button>resend</button></p>
                    <button type="submit">Verify</button>
                </form>
            </section>
        </main>
    )
}
