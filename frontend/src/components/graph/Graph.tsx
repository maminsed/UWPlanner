'use client'
import { RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";
import { api } from "@/lib/useApi";
import { getTermName, termOperation } from "../utils/termUtils";
import useGQL from "@/lib/useGQL";
import { Pair, termIdInterface } from "../interface";

type SemesterInterface = {
    semester: string;
    class_lst: number[];
    course_dict: Map<number, string>;
    setLine: React.Dispatch<React.SetStateAction<[Pair, Pair]>>;
}

function Semester({ semester, class_lst, course_dict, setLine }: SemesterInterface) {
    const ref = useRef<(HTMLDivElement | null)[]>([]);

    useLayoutEffect(() => {
        let update
        let item:HTMLDivElement|null = null
        if (semester === 'Fall 2024 - 1A') {
            if (!ref.current[0]) return;
            item = ref.current[0];
            update = () => {
                const point: Pair = { x: item!.offsetWidth+item!.offsetLeft, y: item!.offsetTop + item!.offsetHeight / 2 }
                setLine(prev => [point, prev[1]])
            }
        } else if (semester==='Fall 2025 - WT1') {
            const end = ref.current.length - 1
            if (!ref.current[end]) return;
            item = ref.current[end];
            update = () => {
                const point: Pair = { x:item!.offsetLeft, y: item!.offsetTop + item!.offsetHeight / 2 }
                setLine(prev => [prev[0], point])
            }
        }
        if (update && item) {
            update()
            const ro = new ResizeObserver(update);
            ro.observe(item)
            return () => ro.disconnect()
        }
    }, [])

    return (
        <div className="flex flex-col text-xl gap-6 items-center">
            <div className="px-6 py-2 rounded-3xl bg-white shadow-xs mb-3 w-full font-semibold text-center text-lg whitespace-nowrap">
                {semester}
            </div>
            {class_lst.map((course, i) => (
                <div ref={el => { ref.current[i] = el }} key={i} className="rounded-r-xl bg-[#8AD5DF]/60 text-dark-green flex items-center">
                    <div className="bg-dark-green h-full w-2" />
                    <span className="py-4 pr-6 pl-4 min-w-25">{course_dict.get(course)?.toUpperCase()}</span>
                    <div className="mr-2 border-1 rounded-full h-1.5 aspect-square" />
                </div>
            ))}
        </div>
    )
}

type GraphInterface = {
    pathRef: RefObject<termIdInterface[]>;
    getUpdated: number;
    updatePan: () => void;
    setLine: (arg0: any) => void;
}

export default function Graph({ pathRef, getUpdated, updatePan, setLine }: GraphInterface) {
    // TODO: 
    //       get the prerequisite chain
    //       add an update view function so you can tell panel your ready to be centerd 
    //       do something with the centering
    const backend = api();
    const gql = useGQL();
    const [path, setPath] = useState<[string, number[]][]>([])
    const [startedTerm, setStartedTerm] = useState<number>(0)
    const [courseDict, setCourseDict] = useState<Map<number, string>>(new Map())

    useEffect(() => {
        async function initialSetup() {
            const res = await backend(
                `${process.env.NEXT_PUBLIC_API_URL}/update_info/get_user_seq?include_courses=true`,
            )
            const response = await res.json().catch(() => { });
            if (!res.ok) {
                console.error("error occured - please reload");
            } else {
                setPath(response.path);
                setStartedTerm(response.started_term_id);
                const termIds: termIdInterface[] = [];
                const course_ids = new Set<number>();
                response.path.forEach((semester: [string, number[]], i: number) => {
                    semester[1].forEach(course => {
                        if (!course_ids.has(course)) course_ids.add(course);
                    })
                    const currTerm = termOperation(response.started_term_id, i)
                    termIds.push({ value: currTerm, display: `${semester[0]} - ${getTermName(currTerm)}` })
                })
                pathRef.current = termIds;
                updatePan();

                const GQL_QUERY = `
                    query Course($course_ids: [Int!]!) {
                        course(where: { id: { _in: $course_ids } }) {
                            code
                            coreqs
                            id
                            name
                            prereqs
                            antireqs
                        }
                    }
                `

                const gql_response = await gql(GQL_QUERY, { 'course_ids': Array.from(course_ids) });
                const newMap = new Map<number, string>();
                gql_response?.data?.course.forEach((course: any) => {
                    newMap.set(course.id, course.code);
                })
                setCourseDict(newMap);
            }
        }

        initialSetup()
    }, [getUpdated])

    return (
        <div className="flex gap-6 p-8">
            {path.map((semester, i) => (
                <Semester
                    key={i}
                    semester={`${getTermName(termOperation(startedTerm, i))} - ${semester[0]}`}
                    class_lst={semester[1]}
                    course_dict={courseDict}
                    setLine={setLine}
                />
            ))}
        </div>
    )
}
