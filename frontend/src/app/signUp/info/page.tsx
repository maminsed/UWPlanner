'use client';
import { LuCircleMinus, LuCirclePlus } from "react-icons/lu"
import DropDown from "@/components/DropDown";
import { useState } from "react";

export default function Info() {
    const [nextId, setNextId] = useState<number>(1)
    const [dropIds, setDropIds] = useState<[number, string][]>([[0,"Choose your option"]])

    function handleAdd() {
        setNextId(nextId+1)
        setDropIds((ids)=>[...ids,[nextId, "Choose your option"]])
    }

    function handleRemove(id:number) {
        setDropIds((ids)=>ids.filter(x=>x[0] !== id))
    }

    function handleUpdate(id:number, value:string) {
        setDropIds((ids)=>ids.map(item=> {
            if(item[0] == id) {
                return [id, value]
            }
            return item
        }))
    }
    return (
        <main>
            <h2 className="md:mt-15 px-3 mt-5 text-center md:text-2xl text-xl font-semibold">Just a few more questions to know you better</h2>

            <div className="mx-auto w-fit mt-20 px-6 py-5 rounded-lg bg-[#DAEBE3] shadow-[0px_0px_57.4px_0px_rgba(0,0,0,0.4)]">
                <h5 className="text-2xl font-medium mb-10 text-center">What's your Major?</h5>
                {dropIds.map(item => (
                    <div key={item[0]} className="flex items-center gap-2">
                        <DropDown className="mt-1" selectedValue={item[1]} setSelectedValue={(value)=>handleUpdate(item[0], value)}/>
                        {dropIds.length != 1 && <LuCircleMinus onClick={()=>handleRemove(item[0])}/>}
                    </div>
                ))}
                <button className="mt-2" onClick={handleAdd}><LuCirclePlus /></button>
            </div>

            <div className="h-[50vh] md:h-fit w-dvw fixed left-0 bottom-0 overflow-x-hidden z-[-1]">
                <img
                    src="/background.svg"
                    width="1000"
                    height="500"
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: "bottom",
                    }}
                    alt="background"
                />
            </div>
        </main>
    )
}
