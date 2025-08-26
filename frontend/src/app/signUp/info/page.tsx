'use client';
import { LuCircleMinus, LuCirclePlus } from "react-icons/lu"
import DropDown from "@/components/DropDown";
import { useState, useEffect } from "react";
import { api } from "@/lib/useApi";
import { useRouter } from "next/navigation";

const ordering = ["majors", "minors", "specializations", "coop", "sequence"]
const heading = ["What's your Major(s)?", "What's your Minor(s)?", "What's your Specialization(s)?", "Are you in Co-op?", "What's your Sequence?"]

export default function Info() {
    const [nextId, setNextId] = useState<number>(1);
    const [dropIds, setDropIds] = useState<[number, [string,string,number]|undefined][]>([[0,undefined]]);
    const [message, setMessage] = useState<undefined|string>(undefined);
    const [options, setOptions] = useState<[string,[string,string,number][]][]>([])
    const [order, setOrder] = useState<number>(0);
    const backend = api();
    const router = useRouter();

    const curr = ordering[order];
    const blank_allowed = order == 1 || order == 2;
    const onlyOne = order >= 3;

    useEffect(()=>{
        async function gettingData() {
            try {
                const res = await backend(`${process.env.NEXT_PUBLIC_API_URL}/update_info/${curr}`, {
                    method: "GET"
                })

                const response = await (res as Response).json().catch(()=>{})
                if (!res.ok) {
                    console.log("Error in Resposne")
                    console.log(response)
                    return 
                }
                setOptions(response.data)
            } catch (err) {
                console.log("Error: ")
                console.log(err)
            }
        }

        gettingData()
    },[curr])
    
    async function handleNext() {
        setMessage("loading...")
        const res = await backend(`${process.env.NEXT_PUBLIC_API_URL}/update_info/${curr}`, {
            method: "POST",
            body: JSON.stringify({
                "selected": dropIds.map(i=>i[1])
            }),
            headers: {
                "Content-Type":"application/json"
            }
        })

        const response = await (res as Response).json().catch(()=>{})
        if (res.ok) {
            if (order == ordering.length - 1) {
                router.push("/test")
                console.log("ended")
                return
            }
            setOrder(order+1)
            if (order+1 == 1 || order+1 == 2) {
                setNextId(0)
                setDropIds([])
            } else {
                setNextId(1)
                setDropIds([[0,undefined]])
            }
            setMessage(undefined)
        } else {
            setMessage(response.message || "error occured")
        }
    }
    
    function handleAdd() {
        setNextId(nextId+1)
        setDropIds((ids)=>[...ids,[nextId, undefined]])
        if (nextId == 2) setMessage("You should try the job market");
    }
    
    function handleRemove(id:number) {
        if (nextId >= 2 && dropIds.length <= 2) setMessage("Good job");
        setDropIds((ids)=>ids.filter(x=>x[0] !== id))
    }

    function handleUpdate(id:number, value:[string,string,number]|undefined) {
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
                <h5 className="text-2xl font-medium text-center mt-2">{heading[order]}</h5>
                {blank_allowed ? <p className="text-center">You can leave it blank if you want</p> : ""}
                <div className="mb-8"></div>
                {dropIds.map(item => (
                    <div key={item[0]} className="flex items-center gap-2 justify-center">
                        <DropDown classes={{mainDiv: "mt-1"}} selectedValue={item[1]} options={options}  setSelectedValue={(value)=>handleUpdate(item[0], value)}/>
                        {((dropIds.length != 1 || blank_allowed) && !onlyOne) && <LuCircleMinus className="cursor-pointer" onClick={()=>handleRemove(item[0])}/>}
                    </div>
                ))}
                {onlyOne ? <div className="mt-4"></div> : <button className="mt-4 cursor-pointer" onClick={handleAdd}><LuCirclePlus /></button>}
                <button className="mt-1 text-center w-full bg-dark-green text-light-green rounded-sm py-1 cursor-pointer hover:bg-dark-green/95 active:bg-[#204044] duration-300 ease-in" onClick={handleNext}>Next</button>
                {message && <p className="text-red-500 mt-1">{message}</p>}
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
