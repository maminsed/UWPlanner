'use client';
import { useState } from "react";
import { FiSearch } from "react-icons/fi";

export default function DropDown() {
    const [isSelectorOpen, setIsSelectorOpen] = useState<boolean>(false)
    const [searchValue, setSearchValue] = useState<string>("")
    const [selectedId, setSelectedId] = useState<number>(-1)
    const [selectedValue, setSelectedValue] = useState<string>("Choose your option")

    const options: [string,[string,number][]][] = [
        ["engineering", [
            ["Architectural",0],
            ["fat",1],
            ["say",2],
            ["KYS",3]
        ]],
        ["obesity", [
            ["Atectural asdfasdklfjad  alksdjfla skdjflalakds fj",4],
            ["faties",5],
            ["sasdfsy",6],
            ["KYSSS",7]
        ]]
    ]

    return (
        <div>
            <div>
                <div
                    onClick={() => setIsSelectorOpen(!isSelectorOpen)}
                    className="w-70 bg-light-green px-1 pr-6 py-1 rounded-md appearance-none focus:outline-none relative"
                >
                    <span>{selectedValue}</span>
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
                
                <ul className={`overflow-y-auto mt-1 rounded-md w-70 bg-light-green ${isSelectorOpen ? "max-h-60 px-1" : "max-h-0 py-0"}`}>
                    <div className="flex py-2 items-center sticky top-0 bg-light-green">
                        <FiSearch />
                        <input 
                            type="text" 
                            value={searchValue} 
                            onChange={(e)=>{setSearchValue(e.target.value)}} 
                            placeholder="search..."
                            className="ml-1 focus:outline-none"/>
                    </div>
                    {options.map(item => {
                        return (
                            <>
                            <div className="text-dark-green/60">{item[0]}</div>
                            {item[1].map(option => {
                                return (<ul
                                        className={`truncate ${option[1] == selectedId ? "bg-dark-green/30" : ""} ${option[0].toLowerCase().includes(searchValue.toLowerCase()) ? "" : "hidden"}`}
                                        key={option[1]}
                                        onClick={()=>{setSelectedId(option[1]); setIsSelectorOpen(false); setSelectedValue(option[0])}}
                                        >
                                            {option[0]}
                                        </ul>)
                            })}
                            </>
                        )
                    })}
                </ul>
            </div>
        </div>
    )
}
