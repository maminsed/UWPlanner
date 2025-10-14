import { RefObject } from "react";
import Course from "./Course";
import { ClassLocations, Location } from "../interface";

type SemesterInterface = {
    semester: string;
    termId: number;
    class_lst: number[];
    course_dict: Map<number, string>;
    locations: RefObject<ClassLocations>
    updateFunction: ()=>void
    deleteCourse: (courseId:number, course_name:string) => void
}

function isLocEqual(loc1:Location|undefined,loc2:Location) {
    if (!loc1) return false;
    return loc1.height === loc2.height && loc1.left === loc2.left && loc1.top === loc2.top && loc1.width === loc1.width;
}

export default function Semester({ semester, termId, class_lst, course_dict, locations, updateFunction,deleteCourse }: SemesterInterface) {

    return (
        <div className="flex flex-col text-xl gap-6 items-center" >
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
                        if (!newLocs.has(courseId)) {
                            newLocs.set(courseId,new Map)
                        }
                        const course = newLocs.get(courseId)!;
                        if (!isLocEqual(course.get(termId),loc)) {
                            course.set(termId,loc);
                            updateFunction();
                        }
                    }}
                    deleteCourse={()=>deleteCourse(courseId,course_dict.get(courseId)!.toUpperCase())}
                />
            ))}
        </div>
    )
}
