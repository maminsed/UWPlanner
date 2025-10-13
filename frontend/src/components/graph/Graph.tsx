'use client'
import { RefObject, useEffect, useState } from "react";
import { api } from "@/lib/useApi";
import { getTermName, termOperation } from "../utils/termUtils";
import useGQL from "@/lib/useGQL";
import { CourseInformation, Location, termIdInterface } from "../interface";
import Semester from "./Semester";

type GraphInterface = {
    pathRef: RefObject<termIdInterface[]>;
    getUpdated: number;
    updatePan: () => void;
    locations: RefObject<Map<string, Location[]>>
    updateFunction: () => void;
    deleteCourse: (courseInfo: CourseInformation) => void
}

export default function Graph({ pathRef, getUpdated, updatePan, locations, updateFunction, deleteCourse }: GraphInterface) {
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
            {path.map((semester, i) => {
                const termId = termOperation(startedTerm, i)
                const termName = `${getTermName(termOperation(startedTerm, i))} - ${semester[0]}`
                return (
                    <Semester
                        key={i}
                        semester={termName}
                        class_lst={semester[1]}
                        course_dict={courseDict}
                        locations={locations}
                        updateFunction={updateFunction}
                        deleteCourse={(courseId, courseName) => deleteCourse({ courseId, courseName, termId, termName })}
                    />
                )
            })}
        </div>
    )
}
