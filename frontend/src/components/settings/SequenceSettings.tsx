'use client';
import { MdArrowBackIosNew } from "react-icons/md";
import { Fragment, useEffect, useState } from "react";
import { api } from "@/lib/useApi";
import clsx from "clsx";
import { getTermName, termOperation } from "../utils/termUtils";

function groupK<T>(path: T[], k: number = 3): T[][] {
    const res: T[][] = []
    for (let j = 0; j < path.length; ++j) {
        if (j % k == 0) {
            res.push([])
        }
        res[res.length-1].push(path[j]);
    }
    return res;
}

export function SequenceSettings() {
    // TODO: Bitch you have a fake save changes here :skull - hoe this entire page is fake
    const backend = api();
    const [currentSem, setCurrentSem] = useState<number>(0);
    const [seq, setSeq] = useState<string>("");
    const [startedTerm, setStartedTerm] = useState<string>("");
    const [gradTerm, setGradTerm] = useState<string>("");
    const [coop, setCoop] = useState<boolean>(false);
    const [path, setPath] = useState<string[]>([]);

    useEffect(()=>{
        async function handleInitial() {
            const res = await backend(
                `${process.env.NEXT_PUBLIC_API_URL}/update_info/get_user_seq`
            )
            const response = await res.json().catch(()=>{});
            if (!res.ok) {
                console.error("error occured - please reload");
            } else {
                setCurrentSem(response.current_sem);
                setSeq(response.sequence);
                setStartedTerm(getTermName(response.started_term_id));
                setGradTerm(getTermName(termOperation(response.started_term_id, response.path.length)));
                setCoop(response.coop);
                setPath(response.path);
            }
        }

        handleInitial();
    },[])

    return (
        <div id="courses">
            <h2 className="text-xl font-medium text-palette-rich-teal mt-10">
                Sequence
            </h2>
            <p className="mb-8">View and manage your sequence-related settings.</p>
            <div className="max-w-80 mb-10 gap-3 flex flex-col">
                <div className="flex flex-row justify-between">
                    <p className="text-lg">
                        Current Semester
                    </p>
                    <select className="border-1 rounded-md min-w-20" onChange={(e)=>{setCurrentSem(parseInt(e.target.value))}} value={currentSem}>
                    {/* TODO: ADD API */}
                        {path.map((sem,i) => (
                            <option key={i} value={i}>
                                {sem}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-row justify-between">
                    <p className="text-lg">
                        Sequence
                    </p>
                    <select className="border-1 rounded-md min-w-20" value={seq} onChange={(e)=>{setSeq(e.target.value)}}>
                    {/* TODO: ADD API */}
                        <option>SEQ 1</option>
                        <option>SEQ 2</option>
                        <option>SEQ 3</option>
                        <option>SEQ 4</option>
                        <option>Stream1_Arts</option>
                    </select>
                </div>
                
                <div className="flex flex-row justify-between">
                    <p className="text-lg">
                        Started Term
                    </p>
                    <p>{startedTerm}</p>
                </div>
            
                <div className="flex flex-row justify-between">
                    <p className="text-lg">
                        Graduation Term
                    </p>
                    <p>{gradTerm}</p>
                </div>

                <div className="flex flex-row justify-between">
                    <p className="text-lg">
                        Coop?
                    </p>
                    <input 
                        type="checkbox" 
                        className="w-4 rounded-full accent-dark-green " 
                        checked={coop} 
                        onChange={(e)=>{setCoop(e.target.checked)}}/>
                </div>

                <div>
                    <p className="text-lg">
                        Path
                    </p>
                {/* TODO: Make the current sem update automaticaly and not require backend */}
                {groupK<string>(path).map((group, index) => (
                    <div className="flex flex-row justify-start gap-4 align-middle mt-2 max-w-60" key={index}>
                        {group.map((sem, j) => (
                            <Fragment key={j}>
                                <div className={clsx("w-11 aspect-square rounded-lg text-light-green text-center leading-11 font-semibold", 
                                    3*index + j !== currentSem ? "bg-dark-green" : "bg-green-400"
                                )}>{sem}</div>
                                {j!= group.length - 1 ? <MdArrowBackIosNew className="w-5 h-auto rotate-180"/> : ""}
                            </Fragment>
                        ))}
                    </div>
                ))}
                </div>

                
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4">
                <button style={true ? 
                    {} :  
                    {backgroundColor:"#aba5a561", color: "oklch(55.2% 0.016 285.938)", borderWidth:"0", cursor:"not-allowed"}} 
                    className="p-1 rounded-md font-medium cursor-pointer border border-gray-500 text-settings-text px-3 hover:bg-dark-green hover:text-light-green duration-150"
                    // disabled={loadingState != "Save Changes"}
                    // onClick={()=>{if (loadingState == "Save Changes") initialSetup(); setLoadingState("No Changes")}}
                >
                    Cancel
                </button>
                <button 
                    // onClick={handleSubmit} 
                    // disabled={loadingState != "Save Changes"}
                    style={true ? 
                    {} :  
                    {backgroundColor:"#aba5a561", color: "oklch(55.2% 0.016 285.938)", borderColor:"oklch(70.4% 0.04 256.788)", cursor:"not-allowed"}} 
                    className="p-1 rounded-md font-medium cursor-pointer bg-dark-green text-white duration-150 px-3 hover:bg-[#2c464a]">
                    Save Changes
                </button>
            </div>
        </div>
    );
}
