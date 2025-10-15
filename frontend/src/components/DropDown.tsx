'use client';
import { clsx } from "clsx";
import { useState, useEffect, useRef } from "react";
import { Fragment } from "react";
import { FiSearch } from "react-icons/fi";

import HoverEffect from "./HoverEffect";

/*
Format:
    [
        [field, [ [word,hover,id],[word,hover,id],[word,hover,id] ]]
        [field, [ [word,hover,id],[word,hover,id],[word,hover,id] ]]
    ]

*/

type DropDownClasses = {
    mainDiv?: string;
    searchBar?: string;
    options?: string;
    optionBox?: string;
    dropDownColor?:string;
}

interface DropDownType {
    // The value that is currently in display
    //    text, hover text, id
    selectedValue:[string,string,number]|undefined;
    //A function thats sets the value that is currently in display
    setSelectedValue: (value:[string,string,number]|undefined)=>void;
    // classes
    classes?: DropDownClasses;
    // The List ordered by: [groupName, selectedValues]
    options: [string,[string,string,number][]][];
}

export default function DropDown({classes = {}, selectedValue, setSelectedValue, options}:DropDownType) {
    const [isSelectorOpen, setIsSelectorOpen] = useState<boolean>(false)
    const [searchValue, setSearchValue] = useState<string>("")
    const [searchResult, setSearchResult] = useState<[string, [string,string,number][]][]>(options)
    const search = useRef<HTMLInputElement>(null);
    if (!classes?.dropDownColor) { 
        classes.dropDownColor = "bg-light-green";
    }
    useEffect(()=>{setSearchResult(options)}, [options])

    useEffect(()=>{
        const res:[string,[string,string,number][]][] = []
        options.forEach(item=>{
            const match:[string,string,number][] = []
            item[1].forEach(result=>{
                if (result[0].toLowerCase().includes(searchValue.toLowerCase())){
                    match.push(result)
                }
            })
            if (match.length != 0) {
                res.push([item[0], match])
            }
        })
        setSearchResult(res)
    }, [searchValue])

    function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
        if ((e.key == "Enter" && searchResult.length > 0)) {
            setIsSelectorOpen(!isSelectorOpen)
        }
        if ((e.key == 'ArrowDown' || e.key == 'ArrowUp') && searchResult.length > 0) {
            let option_index = -1;
            let field_index = -1;
            if (selectedValue) {
                searchResult.forEach((item,fi) => {
                    item[1].forEach((item,oi) => {
                        if (item[2] == selectedValue[2]) {
                            option_index = oi;
                            field_index = fi;
                        }
                    }) 
                })
            }

            if (e.key == 'ArrowDown') {
                if (field_index == -1) {
                    field_index = 0;
                }
                if (option_index + 1 < searchResult[field_index][1].length) {
                    setSelectedValue(searchResult[field_index][1][option_index+1]);
                } else if (field_index + 1 < searchResult.length) {
                    setSelectedValue(searchResult[field_index+1][1][0]);
                } else {
                    setSelectedValue(searchResult[0][1][0])
                }
            } else {
                const lastfi = searchResult.length - 1;
                if (option_index - 1 >= 0) {
                    setSelectedValue(searchResult[field_index][1][option_index-1]);
                } else if (field_index - 1 >= 0 || field_index == -1) {
                    if (field_index == -1) field_index = lastfi + 1;
                    setSelectedValue(searchResult[field_index-1][1][searchResult[field_index-1][1].length - 1]);
                } else {
                    const lastoi = searchResult[lastfi][1].length - 1;
                    setSelectedValue(searchResult[lastfi][1][lastoi]);
                }
            }

        }
    }


    return (
        <div className={clsx(classes?.mainDiv)} onKeyDown={handleKeyDown}>
            <div>
                <div
                    onClick={() => {
                        if (!isSelectorOpen && search.current) search.current.focus();
                        setIsSelectorOpen(!isSelectorOpen)
                    }}
                    className={clsx(classes?.searchBar, "w-70 bg-light-green px-1 pr-6 py-1 rounded-md appearance-none focus:outline-none relative")}
                >
                    {selectedValue === undefined ? 
                        <div>Choose your option</div>
                    : <HoverEffect hover={selectedValue[1]} pClass="max-w-[59vw] xs:max-w-[264px]" hoverStyle={{right:"50%", transform: "translateX(50%)", maxWidth:"264px", width: "max-content"}}>{selectedValue[0]}</HoverEffect>
                    }
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
                
                <ul className={clsx(
                    "relative scroller overflow-y-auto mt-1 rounded-md w-70",
                    classes.dropDownColor,
                    classes.optionBox, 
                    isSelectorOpen ? "max-h-25 px-1" : "max-h-0 py-0 !border-0")}
                >
                    <div className={clsx("flex py-2 items-center sticky top-0", classes.dropDownColor)}>
                        <FiSearch />
                        <input 
                            type="text" 
                            ref={search}
                            value={searchValue} 
                            onChange={(e)=>{setSearchValue(e.target.value)}} 
                            placeholder="search..."
                            className="ml-1 focus:outline-none"/>
                    </div>
                    {searchResult.map(item => {
                        return (
                            <Fragment key={item[0]}>
                            <div className="text-dark-green/60">{item[0]}</div>
                            {item[1].map(option => {
                                return (<ul
                                        key={option[1]}
                                        className={`truncate ${selectedValue && option[2] == selectedValue[2] ? "bg-dark-green/30" : ""}`}
                                        onClick={()=>{setIsSelectorOpen(false); setSelectedValue(option)}}
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
