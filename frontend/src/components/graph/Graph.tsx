'use client'
import { useEffect, useState } from "react";
import { api } from "@/lib/useApi";
import { getTermName, termOperation } from "../utils/termUtils";

function Semester({ semester, class_lst }: { semester: string, class_lst:number[] }) {
    return (
        <div className="flex flex-col text-xl gap-6 items-center">
            <div className="px-6 py-2 rounded-3xl bg-white shadow-xs mb-3 w-full font-semibold text-center text-lg whitespace-nowrap">
                {semester}
            </div>
            {class_lst.map((_, i) => (
                <div key={i} className="rounded-r-xl bg-[#8AD5DF]/60 text-dark-green flex items-center">
                    <div className="bg-dark-green h-full w-2" /><span className="py-4 pr-6 pl-4">CS12{i}</span><div className="mr-2 border-1 rounded-full h-1.5 aspect-square" />
                </div>
            ))}
        </div>
    )
}

export default function Graph() {
    const backend = api();
    const [path, setPath] = useState<[string,number[]][]>([])
    const [startedTerm, setStartedTerm] = useState<number>(0)

    useEffect(() => {
        async function initialSetup() {
            const res = await backend(
                `${process.env.NEXT_PUBLIC_API_URL}/update_info/get_user_seq?include_courses=true`,
            )
            const response = await res.json().catch(() => { });
            if (!res.ok) {
                console.error("error occured - please reload");
            } else {
                setPath(response.path)
                setStartedTerm(response.started_term_id)
            }
        }

        initialSetup()
    }, [])

    return (
        <div className="flex gap-6 p-8">
            {path.map((semester, i) => (
                <Semester key={i} semester={`${getTermName(termOperation(startedTerm, i))} - ${semester[0]}`} class_lst={semester[1]}/>
            ))}
        </div>
    )
}
