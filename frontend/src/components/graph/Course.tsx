'use client';
import { useLayoutEffect, useRef } from "react";
import { LuCircleX, LuMoveDiagonal } from "react-icons/lu";

import { Location } from "../interface";

type CourseInterface = {
    setLocation: (arg0: Location) => void;
    course_dict: Map<number, string>;
    courseId: number;
    deleteCourse: () => void
}

export default function Course({setLocation, courseId, course_dict, deleteCourse}:CourseInterface) {
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
        const id = setTimeout(update,100)
        
        ro.observe(item)
        return () => {
            ro.disconnect();
            clearTimeout(id);
        }
    }, [])

    return (
        <div ref={ref} className="rounded-r-xl bg-[#8AD5DF]/60 text-dark-green flex items-center">
            <div className="bg-dark-green h-full w-2" />
            <div className="flex flex-col justify-between h-full py-1 pl-1">
                <LuMoveDiagonal className="h-auto w-[0.9rem] hover:text-teal-950 cursor-pointer duration-75"/>
                <LuCircleX onClick={deleteCourse}  className="h-auto w-[0.9rem] hover:text-teal-950 cursor-pointer duration-75"/>
            </div>
            <span className="py-5 px-1 min-w-25">{course_dict.get(courseId)?.toUpperCase()}</span>
            <div className="mr-2 border-1 rounded-full h-1.5 aspect-square" />
        </div>
    )
}
