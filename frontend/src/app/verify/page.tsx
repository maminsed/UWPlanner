'use client'
import Image from "next/image"
import { useState } from "react";
export default function Verify() {
    const [code, setCode] = useState<string[]>(['','','','','',''])
    //                                                 start, end
    const [last, setLast] = useState<[number, number]>([0,0])

    function handleChange(e:React.ChangeEvent<HTMLInputElement>) {
        const data = e.target.value.split('');
        const res:string[] = []
        data.map((item)=>res.push(item))
        let i = res.length;
        while (i < 6) {
            res.push('')
            ++i;
        }
        setCode(res)
    }

    function handleKeyUp(e:React.KeyboardEvent<HTMLInputElement>) {
        setLast([(e.currentTarget.selectionStart||0)-1,(e.currentTarget.selectionEnd||0)-1])
    }

    return (
        <main className="relative h-dvh overflow-x-hidden flex justify-center items-center">
            <Image className="absolute object-cover object-center left-[-2px] right-[-2px] w-[calc(100vw+15rem)]  md:w-[calc(100vw+4px)] max-w-none" src="/backgroundLogin.svg" alt="background2" width={1437} height={496}/>
            <section className="z-2 bg-dark-green text-light-green flex flex-col items-center">
                <h3>Two-Factor Verification</h3>
                <p>Enter the code sent to the email: </p>
                <form>
                    <div className="relative">
                        <div className="flex gap-2 justify-center">
                            {code.map((item, index)=> (
                                <input 
                                    type="tel" 
                                    key={index} 
                                    maxLength={1} 
                                    value={item} 
                                    readOnly={true} 
                                    onClick={()=>{console.log("HOLA")}}
                                    className={`bg-light-green text-dark-green text-center rounded-md font-semibold text-xl ${(index >= last[0] && index <= last[1]) ? "shadow-[0_0_21.7px_0px_#DEF2F580]" : ""} w-8 aspect-[4/5]`}/>
                            ))}
                        </div>
                        <input 
                            type="tel" 
                            inputMode="numeric" 
                            autoComplete="one-time-code" 
                            maxLength={6}
                            onChange={handleChange}
                            onKeyUp={handleKeyUp}
                            onSelect={handleKeyUp}
                            className="absolute font-mono inset-0 w-full h-full text-amber-800 pl-[0.92rem] tracking-[1.61rem] text-2xl font-semibold opacity-0"
                            />
                    </div>
                    <p>didn't recieve a code? <button>resend</button></p>
                    <button type="submit">Verify</button>
                </form>
            </section>
        </main>
    )
}

//
