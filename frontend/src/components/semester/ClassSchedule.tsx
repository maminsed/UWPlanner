import clsx from "clsx";
import { Fragment } from "react";
import { IoIosInformationCircleOutline } from "react-icons/io";
import { LuCamera, LuChevronLeft, LuChevronRight, LuMaximize2, LuPlus, LuShare2 } from "react-icons/lu";
import HoverEffect from "../HoverEffect";

export function RightSide({ children, className, ...props}: React.HTMLAttributes<HTMLDivElement>) {
    // Just a class that has stuff on the right side
    return (
        <div className={clsx("flex justify-end gap-2 mb-4 mr-2 items-center", className)} {...props}>
            {children}
        </div>
    )
}

type ClassInterface = {
    start: string;
    end: string;
    code: string;
    type: string;
    title: string;
    location: string;
}

export function Class({start, end, code, type, title, location, ...props}: ClassInterface & React.HTMLAttributes<HTMLDivElement>) {
    // start, end: 8:50 (no space anywhere)
    const startList = start.split(":").map(i=>Number(i))
    const endList = end.split(":").map(i=>Number(i))
    const top = (startList[0] - 8) + startList[1] / 60
    const height = (endList[0] - startList[0]) + (endList[1] - startList[1]) / 60
    return (
        <div 
            className="absolute w-1/6 bg-cyan-500/50 rounded-md text-sm leading-[120%] z-20 pl-1 overflow-y-auto overflow-x-hidden scroller" 
            style={{left:"calc(100%/6)", top:`calc(${19+top * 20} * var(--spacing))`, height:`calc(${20 * height} * var(--spacing)`}}
            {...props}
        >
            <p className="pt-1">{code}</p>
            <p>{type}</p>
            <p>{title}</p>
            <p>{start}-{end}</p>
            <p>{location}</p>
            <div className="flex justify-end pr-[3%]">
                <LuMaximize2 className="right-2.5 my-1 cursor-pointer"/>
            </div>
        </div>
    )
}

export default function ClassSchedule() {
    const dateBoxClass = clsx("bg-[#CAEDF2] text-center flex-1 h-16 flex flex-col justify-center text-sm md:text-lg")
    const normalBoxClass = clsx("bg-white flex-1 h-20 text-sm xs:text-base")
    const lineVertClass = "border-r-1 border-[#6EC0CB]"
    const lineHorMidClass = "absolute w-[85%] right-4 border-b-1 border-[#6EC0CB]/50 border-dashed"
    const lineHorFullClass = "absolute w-[85%] right-4 border-b-1 border-[#6EC0CB]/80"
    const checkBoxes: string[][] = [
        ["Course Code", "Open All", "AM/PM", "Lectures", "Final Week"],
        ["Course Title", "Close All", "Tutorials", "Tests", "First Week"]
    ];

    return (
        <section className="my-5 max-w-[96vw]">
            {/* Calendar buttons */}
            <RightSide>
                <button><LuChevronLeft className="w-4 md:w-5 h-auto cursor-pointer rounded-full border-1"/></button>
                <button><LuChevronRight className="w-4 md:w-5 h-auto cursor-pointer rounded-full border-1"/></button>
                <button className="rounded-lg border-1 px-2 cursor-pointer">Current Week</button>
            </RightSide>

            {/* Calendar */}
            <div className="relative w-181 max-w-[96vw] [box-shadow:2px_4px_54.2px_0px_#608E9436]">
                {/* Classes */}
                <Class start="9:00" end="10:20" code="CS246" type="LEC" title="Object-Oriented Software Development" location="MC2035"/>

                {/* lines */}
                {/* Vertical */}
                <div className="flex justify-between absolute top-4 bottom-4 left-0 right-0">
                    <div className={clsx(lineVertClass, "!border-r-0")} />
                    <div className={lineVertClass} />
                    <div className={lineVertClass} />
                    <div className={lineVertClass} />
                    <div className={lineVertClass} />
                    <div className={lineVertClass} />
                    <div className={clsx(lineVertClass, "!border-r-0")} />
                </div>

                {/* Horizantal */}
                <div className={lineHorFullClass} style={{top: `calc(${19}*var(--spacing))`}}/>
                {[...Array(12)].map((_,i) => (
                    <Fragment key={i}>
                        <div className={lineHorMidClass} style={{top: `calc(${29+20*i}*var(--spacing))`}}/>
                        <div className={lineHorFullClass} style={{top: `calc(${39+20*i}*var(--spacing))`}}/>
                    </Fragment>
                ))}
                <div className={lineHorMidClass} style={{top: `calc(${29+20*12}*var(--spacing))`}}/>

                {/* Dates: */}
                <div className="flex flex-row">
                    <div className={clsx(dateBoxClass, "rounded-tl-lg")}></div>
                    <div className={dateBoxClass}>Mon Aug 25</div>
                    <div className={dateBoxClass}>Tue Aug 26</div>
                    <div className={dateBoxClass}>Wed Aug 27</div>
                    <div className={dateBoxClass}>Thur Aug 28</div>
                    <div className={clsx(dateBoxClass, "rounded-tr-lg")}>Fri Aug 29</div>
                </div>
                {/* The days */}
                <div>
                    {[...Array(13)].map((_,i) => (
                        <div className="flex flex-row" key={i}>
                            <div className={clsx(normalBoxClass, i == 12 && "rounded-bl-lg", "pl-2 xs:text-center")}>{i+8}:00</div>
                            <div className={normalBoxClass}></div>
                            <div className={normalBoxClass}></div>
                            <div className={normalBoxClass}></div>
                            <div className={normalBoxClass}></div>
                            <div className={clsx(normalBoxClass, i == 12 && "rounded-br-lg")}></div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Online Classes */}
            <div className="mt-15 mb-4 overflow-x-auto mx-2 bg-white rounded-b-lg scroller relative [box-shadow:2px_4px_54.2px_0px_#608E9436] rounded-t-lg">
                <div className="bg-dark-green rounded-t-lg text-light-green pl-4 py-0.5 text-lg min-w-120">Online Classes</div>
                <div className="text-base sm:text-[1.1rem] gap-0.5 min-w-120 z-20 relative">
                    <div className="flex flex-row pl-2 py-2 border-b-1 items-center">
                        <div className="flex-1 min-w-20">Code</div>
                        <div className="flex-2 min-w-40">Course Title</div>
                        <div className="flex-2 min-w-16">Section</div>
                        <div className="flex-1 min-w-20">Start Date</div>
                        <div className="flex-1 min-w-20">End Date</div>
                    </div>
                    <div className="flex flex-row px-2 py-1 items-center min-w-120 relative">
                        <div className="flex-1 min-w-20 flex items-center gap-1 cursor-pointer">CS246 <IoIosInformationCircleOutline  className="min-w-4"/></div>
                        <div className="flex-2 min-w-40">Object-Oriented Software Development</div>
                        <div className="flex-2 min-w-16">LEC101</div>
                        <div className="flex-1 min-w-20">2/9/2025</div>
                        <div className="flex-1 min-w-20">19/12/2025</div>
                        <div className="absolute right-4 left-4 bottom-0 border-t-1"/>
                    </div>
                    <div className="flex flex-row px-2 py-1 items-center min-w-120">
                        <div className="flex-1 min-w-20 flex items-center gap-1 cursor-pointer">CS246 <IoIosInformationCircleOutline  className="min-w-4"/></div>
                        <div className="flex-2 min-w-40">Object-Oriented Software Development</div>
                        <div className="flex-2 min-w-16">LEC101</div>
                        <div className="flex-1 min-w-20">2/9/2025</div>
                        <div className="flex-1 min-w-20">19/12/2025</div>
                    </div>
                </div>
                <div className="absolute left-0 right-0 top-10 bottom-2 min-w-120 flex flex-row pr-2 z-2">
                    <div className="border-r-1 flex-1 min-w-20"/>
                    <div className="border-r-1 flex-2 min-w-40"/>
                    <div className="border-r-1 flex-2 min-w-16"/>
                    <div className="border-r-1 flex-1 min-w-20"/>
                    <div className="flex-1 min-w-20"/>
                </div>
            </div>

            <RightSide className="mb-5">
                <HoverEffect hover="Add Class">
                    <LuPlus className="w-6 h-auto font-semibold cursor-pointer"/>
                </HoverEffect>
                <HoverEffect hover="Import Schedule">
                    <LuCamera className="w-6 h-auto font-semibold cursor-pointer"/>
                </HoverEffect>
                <HoverEffect hover="Export Schedule">
                    <LuShare2 className="w-5 h-auto font-semibold cursor-pointer"/>
                </HoverEffect>
            </RightSide>

            {/* Options */}
            <div className="mt-10 mb-4 overflow-x-auto mx-2 bg-white rounded-b-lg scroller relative [box-shadow:2px_4px_54.2px_0px_#608E9436] rounded-lg">
                <div className="bg-dark-green rounded-t-lg text-light-green pl-4 py-0.5 text-lg min-w-108">Options</div>
                <div className="flex flex-col px-4 py-2 min-w-108">
                    {checkBoxes.map(options => (
                        <div className="flex gap-1" key={options[0]}>
                            {options.map(option=>(
                                <label className="cursor-pointer text-sm sm:text-[1.1rem] min-w-20 flex-1" key={option}>
                                    <input type="checkbox" disabled={option == "-"} className="mr-1"/>
                                    {option}
                                </label>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
