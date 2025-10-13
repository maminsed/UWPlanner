'use client'
import { RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";
import { api } from "@/lib/useApi";
import { getTermName, termOperation } from "../utils/termUtils";
import useGQL from "@/lib/useGQL";
import { Location, Pair, termIdInterface } from "../interface";

type CourseInterface = {
    setLocation: (arg0: Location) => void;
    course_dict: Map<number, string>;
    courseId: number;
}

function Course({setLocation, courseId, course_dict}:CourseInterface) {
    const ref = useRef<HTMLDivElement|null>(null)

    useLayoutEffect(() => {
        const item = ref.current;
        if (!item) return;
        const update = () => {
            setLocation({
                left:item!.offsetLeft,
                top:item!.offsetTop,
                width:item!.offsetWidth,
                height:item!.offsetHeight
            })
        }
        update()
        const ro = new ResizeObserver(update);
        ro.observe(item)
        return () => ro.disconnect()
    }, [])

    return (
        <div ref={ref} className="rounded-r-xl bg-[#8AD5DF]/60 text-dark-green flex items-center">
            <div className="bg-dark-green h-full w-2" />
            <span className="py-4 pr-6 pl-4 min-w-25">{course_dict.get(courseId)?.toUpperCase()}</span>
            <div className="mr-2 border-1 rounded-full h-1.5 aspect-square" />
        </div>
    )
}

type SemesterInterface = {
    semester: string;
    class_lst: number[];
    course_dict: Map<number, string>;
    locations: RefObject<Map<string,Location[]>>
    updateFunction: ()=>void
}

function Semester({ semester, class_lst, course_dict, locations, updateFunction }: SemesterInterface) {

    return (
        <div className="flex flex-col text-xl gap-6 items-center">
            <div className="px-6 py-2 rounded-3xl bg-white shadow-xs mb-3 w-full font-semibold text-center text-lg whitespace-nowrap">
                {semester}
            </div>
            {class_lst.map((courseId, i) => (
                <Course 
                    key={i} 
                    courseId={courseId} 
                    course_dict={course_dict}
                    setLocation={(loc)=>{
                        const newLocs = locations.current;
                        const course = course_dict.get(courseId) || '';
                        if (!newLocs.has(course)) {
                            newLocs.set(course,[])
                        }
                        newLocs.get(course)!.push(loc)
                        updateFunction();
                    }}
                />
            ))}
        </div>
    )
}

type GraphInterface = {
    pathRef: RefObject<termIdInterface[]>;
    getUpdated: number;
    updatePan: () => void;
    locations: RefObject<Map<string,Location[]>>
    updateFunction: ()=>void
}

export default function Graph({ pathRef, getUpdated, updatePan, locations, updateFunction }: GraphInterface) {
    // TODO: 
    //       get the prerequisite chain
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
                    locations={locations}
                    updateFunction={updateFunction}
                />
            ))}
        </div>
    )
}
