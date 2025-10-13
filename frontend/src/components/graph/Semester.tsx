import { RefObject } from "react";
import Course from "./Course";
import { Location } from "../interface";

type SemesterInterface = {
    semester: string;
    class_lst: number[];
    course_dict: Map<number, string>;
    locations: RefObject<Map<string,Location[]>>
    updateFunction: ()=>void
}

export default function Semester({ semester, class_lst, course_dict, locations, updateFunction }: SemesterInterface) {

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
