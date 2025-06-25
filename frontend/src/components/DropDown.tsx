'use client';
import { useState, useEffect, useRef } from "react";
import { FiSearch } from "react-icons/fi";
import { api } from "@/lib/useApi";
import { Fragment } from "react";
import HoverEffect from "./HoverEffect";

interface DropDownType {
    selectedValue:string|undefined;
    setSelectedValue: (value:string)=>void;
    className?: string;
    curr: string;
}

export default function DropDown({className, curr, selectedValue, setSelectedValue}:DropDownType) {
    const [isSelectorOpen, setIsSelectorOpen] = useState<boolean>(false)
    const [searchValue, setSearchValue] = useState<string>("")
    const [selectedId, setSelectedId] = useState<number>(-1)
    const [options, setOptions] = useState<[string,[string,number][]][]>([])
    const search = useRef<HTMLInputElement>(null);
    const backend = api();

    useEffect(()=> {
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
    }, [curr])


    return (
        <div className={className}>
            <div>
                <div
                    onClick={() => {
                        if (!isSelectorOpen && search.current) search.current.focus();
                        setIsSelectorOpen(!isSelectorOpen)
                    }}
                    className="w-70 bg-light-green px-1 pr-6 py-1 rounded-md appearance-none focus:outline-none relative"
                >
                    {selectedValue === undefined ? 
                        <div>Choose your option</div>
                    : <HoverEffect text={selectedValue} maxWidth="260px"/>}
                    <span className={`pointer-events-none absolute inset-y-0 right-1 flex items-center ${isSelectorOpen ? "rotate-180" : ""}`}>
                        <svg
                            className="w-6 h-6 text-dark-green"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path
                                d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 
                                0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.08 
                                0L5.21 8.27a.75.75 0 01.02-1.06z"
                            />
                        </svg>
                    </span>
                </div>
                
                <ul className={`relative scroller overflow-y-auto mt-1 rounded-md w-70 bg-light-green ${isSelectorOpen ? "max-h-25 px-1" : "max-h-0 py-0"}`}>
                    <div className="flex py-2 items-center sticky top-0 bg-light-green">
                        <FiSearch />
                        <input 
                            type="text" 
                            ref={search}
                            value={searchValue} 
                            onChange={(e)=>{setSearchValue(e.target.value)}} 
                            placeholder="search..."
                            className="ml-1 focus:outline-none"/>
                    </div>
                    {options.map(item => {
                        const santizedList : [string,number][] = []
                        item[1].forEach(option => {
                            const check = curr == "sequence" ? option[0] : option
                            if (check[0].toLowerCase().includes(searchValue.toLowerCase())) santizedList.push(check as string);
                        })
                        if (santizedList.length == 0) return ;
                        return (
                            <Fragment key={item[0]}>
                            <div className="text-dark-green/60">{item[0]}</div>
                            {santizedList.map(option => {
                                return (<ul
                                        key={option[1]}
                                        className={`truncate ${option[1] == selectedId ? "bg-dark-green/30" : ""}`}
                                        onClick={()=>{setSelectedId(option[1]); setIsSelectorOpen(false); setSelectedValue(option[0])}}
                                        >
                                            {option[0]}
                                        </ul>)
                            })}
                            </Fragment>
                        )
                    })}
                </ul>
            </div>
        </div>
    )
}
