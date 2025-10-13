import { useLayoutEffect, useRef } from "react";
import { Location } from "../interface";

type CourseInterface = {
    setLocation: (arg0: Location) => void;
    course_dict: Map<number, string>;
    courseId: number;
}

export default function Course({setLocation, courseId, course_dict}:CourseInterface) {
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
