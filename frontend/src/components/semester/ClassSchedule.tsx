'use client'
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/useApi";
import { Fragment } from "react";
import { IoIosInformationCircleOutline } from "react-icons/io";
import { LuCamera, LuChevronLeft, LuChevronRight, LuMaximize2, LuPlus, LuShare2 } from "react-icons/lu";
import HoverEffect from "../HoverEffect";
import useGQL from "@/lib/useGQL";

export function RightSide({ children, className, ...props}: React.HTMLAttributes<HTMLDivElement>) {
    // Just a class that has stuff on the right side
    return (
        <div className={clsx("flex justify-end gap-2 mb-4 mr-2 items-center", className)} {...props}>
            {children}
        </div>
    )
}

type ClassInterface = {
    startSeconds: number;
    endSeconds: number;
    startDate: string;
    endDate: string;
    days: ("M"|"T"|"W"|"Th"|"F")[]; // :["M","T", "W","Th","F"]
    code: string;
    courseId: number;
    title: string;
    type: string;
    prof: string;
    location: string;
}

function translateSecToHour(time:number, checkBoxes: [string, boolean][][]) {
    const min = Math.floor((time % 3600) / 60);
    const hour = Math.floor(time / 3600);
    const AM_PM = getVal("AM/PM", checkBoxes)
    return `${AM_PM ? hour % 12 : hour}:${min}${min < 10 ? '0' : ''}${AM_PM && hour > 12 ? 'PM' : ''}`
}

function getVal(value:string, checkBoxes: [string, boolean][][]) {
    for (let r = 0; r < checkBoxes.length; ++r) {
        for (let c = 0; c < checkBoxes[r].length; ++c) {
            if (checkBoxes[r][c][0].toLocaleLowerCase() == value.toLocaleLowerCase()) return checkBoxes[r][c][1];
        }
    }
    return true;
}


function Class({startSeconds, endSeconds, days, code, type, title, prof, location, checkBoxes}: ClassInterface & {checkBoxes: [string, boolean][][]}) {
    const top = (startSeconds - (8 * 3600)) / 3600;
    const height = (endSeconds - startSeconds) / 3600;
    const dayMap = {"M": "100%/6", "T": "200%/6", "W":"300%/6", "Th": "400%/6", "F": "500%/6"};
    return (
        <Fragment>
            {days.map(day=> {
            const width = 6;
            return (
                <div 
                    key={day}
                    className="absolute bg-cyan-500/50 rounded-md text-sm leading-[120%] z-20 pl-1 overflow-y-auto overflow-x-hidden scroller" 
                    style={{left:`calc(${dayMap[day]})`, 
                            top:`calc(${19+top * 20} * var(--spacing))`, 
                            height:`calc(${20 * height} * var(--spacing)`,
                            width:`calc(100%/${width})`}}
                >
                    {getVal("course code", checkBoxes) && <p className="pt-1">{code}</p>}
                    <p>{type}</p>
                    {getVal("course title", checkBoxes) && <p>{title}</p>}
                    <p>{translateSecToHour(startSeconds, checkBoxes)}-{translateSecToHour(endSeconds, checkBoxes)}</p>
                    <p>{location}</p>
                    <p>{prof}</p>
                    <div className="flex justify-end pr-[3%]">
                        <LuMaximize2 className="right-2.5 my-1 cursor-pointer"/>
                    </div>
                </div>
            )})}
        </Fragment>
    )
}

function OnlineClass({code, type, title, startDate, endDate, first=false, checkBoxes}: ClassInterface & {first?: boolean, checkBoxes:[string, boolean][][]}) {
    return (
        <div className="flex flex-row px-2 py-1 items-center min-w-120 relative">
            {getVal("course code",checkBoxes) && <div className="flex-1 min-w-20 flex items-center gap-1 cursor-pointer">{code} <IoIosInformationCircleOutline  className="min-w-4"/></div>}
            {getVal("course title", checkBoxes) && <div className="flex-2 min-w-40">{title}</div>}
            <div className="flex-2 min-w-16">{type}</div>
            <div className="flex-1 min-w-20 text-sm sm:text-[1rem]">{startDate}</div>
            <div className="flex-1 min-w-20 text-sm sm:text-[1rem]">{endDate}</div>
            {!first && <div className="absolute right-4 left-4 top-0 border-t-1"/>}
        </div>
    )
}

function getMonday(today = new Date()) {
    const day = today.getDay();

    let diff = day - 1
    if (day === 0) diff = -1;
    if (day === 6) diff = -2;
    today.setDate(today.getDate() - diff);
    const newD = new Date(today);
    return newD;
}

function hasOverlap([start1,end1]:[number,number], [start2,end2]:[number,number]) {
    return !((start1 >= end2) || (end1 <=start2))
}



type DayMapInterface = {
    "M": [number, number, number][], //start,end,course_id
    "T": [number, number, number][],
    "W": [number, number, number][],
    "Th": [number, number, number][],
    "F": [number, number, number][],
    "Tot": [number, number][],
}

export default function ClassSchedule() {
    const dateBoxClass = clsx("bg-[#CAEDF2] text-center flex-1 h-16 flex flex-col justify-center text-sm md:text-lg")
    const normalBoxClass = clsx("bg-white flex-1 h-20 text-sm xs:text-base")
    const lineVertClass = "border-r-1 border-[#6EC0CB]"
    const lineHorMidClass = "absolute w-[85%] right-4 border-b-1 border-[#6EC0CB]/50 border-dashed"
    const lineHorFullClass = "absolute w-[85%] right-4 border-b-1 border-[#6EC0CB]/80"
    const [classes, setClasses] = useState<ClassInterface[]>([]);
    const [mondayDate, setMondayDate] = useState<Date>(()=>getMonday());
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const days = ["Mon", "Tue", "Wed","Thu","Fri"]
    const [checkBoxes, setCheckBoxes] = useState<[string, boolean][][]>([
        [["Course Code", true], ["AM/PM", false], ["Lectures", true], ["Final Week", false]],
        [["Course Title", true], ["Tutorials", true], ["Tests", true], ["Compress", false]]
    ]);


    const dayMap = useRef<DayMapInterface>({"M": [], "T": [], "W": [], "Th": [], "F": [], "Tot": []})
    const backend = api();
    const gql = useGQL();
    console.log(mondayDate)
    useEffect(()=>{
        async function initialSetup() {
            const res = await backend(`${process.env.NEXT_PUBLIC_API_URL}/courses/get_user_sections`)
            if (!res?.ok) {
                console.error("error!")
            } else {
                const response = await res.json().catch(()=>{});
                const sections = response.sections;
                // TODO: UPDATE TERM_ID!
                const GQL_QUERY= `
                    query Course_section($sections: [Int!]!, $termId: Int!) {
                            course_section(
                            where: {
                                class_number: { _in: $sections }
                                term_id: { _eq: $termId }
                            }
                        ) {
                            class_number
                            course_id
                            id
                            section_name
                            term_id
                            course {
                                code
                                name
                            }
                            meetings {
                                days
                                end_date
                                end_seconds
                                is_cancelled
                                is_closed
                                is_tba
                                location
                                section_id
                                start_date
                                start_seconds
                                prof_id
                            }
                        }
                    }
                `
                const gql_response = await gql(GQL_QUERY, {sections, termId: 1255});
                // console.log(gql_response?.data?.course_section)
                const data: ClassInterface[] = []
                gql_response?.data?.course_section.forEach((section:any):void=>{
                    section.meetings.forEach((meeting:any)=>{
                        data.push({
                            startSeconds: meeting.start_seconds || 0,
                            endSeconds: meeting.end_seconds || 0,
                            startDate: meeting.start_date,
                            endDate: meeting.end_date,
                            days: meeting.days,
                            code: section.course.code.toUpperCase() || '',
                            courseId: section.course_id,
                            title: section.course.name || '',
                            type: section.section_name || '',
                            location: meeting.location || '',
                            prof: meeting.prof_id || ''})
                        
                    })
                    
                })
                setClasses(data as ClassInterface[]);
            }
        }

        initialSetup()
    },[])

    useEffect(()=>{
        function updateDayMap() {
            const res: DayMapInterface = {"M": [], "T": [], "W": [], "Th": [], "F": [], "Tot": []};
            
            classes.forEach(section=> {
                if (inWeek(section.startDate, section.endDate)) {
                    section.days.forEach(day=> {
                        res[day].push([section.startSeconds, section.endSeconds, section.courseId]);
                        res["Tot"].push([section.startSeconds, section.endSeconds]);
                    })
                }
            })

            Object.keys(res).forEach((day)=>{
                const dayKey = day as keyof DayMapInterface;
                res[dayKey].sort(([s1,e1,_1],[s2,e2,_2])=>s1 - s2 || e1 - e2)
            })

            if (res["Tot"].length) {
                const tot:[number,number][] = []
                let [start,end] = res["Tot"][0]
                res["Tot"].forEach(day=> {
                    if (hasOverlap([start,end], day)) {
                        start = Math.min(start, day[0]);
                        end = Math.max(end, day[1]);
                    } else {
                        tot.push([start,end]);
                        start = day[0];
                        end = day[1];
                    }
                })
                tot.push([start,end])
                res["Tot"] = tot;
            }

            dayMap.current = res;
        }

        updateDayMap()

    },[classes, mondayDate])


    function moveTime(diff: number) {
        setMondayDate(prevDate=>{
            const date= new Date(prevDate);
            date.setDate(date.getDate()+diff);
            return date;
        })
    }

    function inWeek(startDate: string, endDate: string) {
        const [startYear, startMonth, startDay] = startDate.split("-").map(Number)
        const startObj = new Date(startYear, startMonth - 1, startDay)

        const [endYear, endMonth, endDay] = endDate.split("-").map(Number)
        const endObj = new Date(endYear, endMonth - 1, endDay)

        const fridayDate = new Date(mondayDate);
        fridayDate.setDate(fridayDate.getDate()+4);
        return startObj < fridayDate && endObj > mondayDate;
    }

    function selectedClass(course_type: string) {
        const type = course_type.split(' ')[0] as keyof typeof type_map;
        const type_map = { TUT: 'Tutorials', LEC: 'lectures', TST: 'tests' };
        if (type_map[type]) {
            return getVal(type_map[type], checkBoxes);
        }
        return true;
    }

    function loadOnlines() {
        let first = true;
        return (
            <>
                {classes.map((section,i)=> {
                    if (section.startSeconds === section.endSeconds && section.startSeconds === 0 && selectedClass(section.type)) {
                        if (first) {
                            first = false;
                            return <OnlineClass {...section} key={i} first={true} checkBoxes={checkBoxes}/>
                        }
                        return <OnlineClass {...section} key={i} checkBoxes={checkBoxes}/>
                    }
                    return null
                })}
            </>
        )
    }


    function handleOptions(outerI: number, innerI: number, value:boolean|null=null) {

        if (checkBoxes[outerI][innerI][0] == 'Final Week' && checkBoxes[outerI][innerI][1] == false && value  === null) {
            let res: null|string = null;
            classes.forEach(section => {
                if (res === null || section.endDate > res) {
                    res = section.endDate;
                }
            })
            if (res !== null) {
                const [Year, Month, Day] = (res as String).split("-").map(Number)
                const Obj = new Date(Year, Month - 1, Day)
                setMondayDate(()=>getMonday(new Date(Obj)))
            }
        }

        setCheckBoxes((prev)=> (
            prev.map((r,rI)=> (
                rI != outerI ? r : r.map((item,c)=> 
                    c != innerI ? item : [item[0], value === null ? !item[1] : value]
                )
            ))
        ))
        

        
    }

    console.log(dayMap.current)
    return (
        <section className="my-5 max-w-[96vw]">
            {/* Calendar buttons */}
            <RightSide>
                {/* Fix it so first and final are off when u move */}
                <button 
                    onClick={()=>{
                        moveTime(-7); 
                        handleOptions(0, checkBoxes[0].length-1, false);
                    }}
                >
                    <LuChevronLeft className="w-4 md:w-5 h-auto cursor-pointer rounded-full border-1 hover:bg-dark-green/90 hover:text-light-green duration-150 active:bg-dark-green"/>
                </button>
                <button 
                    onClick={()=>{
                        moveTime(7); 
                        handleOptions(0, checkBoxes[0].length-1, false)}}
                >
                    <LuChevronRight className="w-4 md:w-5 h-auto cursor-pointer rounded-full border-1 hover:bg-dark-green/90 hover:text-light-green duration-150 active:bg-dark-green"/>
                </button>
                <button 
                    onClick={()=>{
                        setMondayDate(()=>getMonday(new Date())); 
                        handleOptions(0, checkBoxes[0].length-1, false)}} 
                    className="rounded-lg border-1 px-2 cursor-pointer hover:bg-dark-green/90 hover:text-light-green duration-150 active:bg-dark-green"
                >
                    Current Week
                </button>
            </RightSide>

            {/* Calendar */}
            <div className="relative w-181 max-w-[92vw] [box-shadow:2px_4px_54.2px_0px_#608E9436] mx-auto overflow-y-clip">
                {/* Classes */}
                {classes.map((section,i)=> (
                    (inWeek(section.startDate, section.endDate) && selectedClass(section.type)) ? <Class key={i} {...section} checkBoxes={checkBoxes}/> : null
                ))}

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
                {[...Array(13)].map((_,i) => (
                    <Fragment key={i}>
                        <div className={lineHorMidClass} style={{top: `calc(${29+20*i}*var(--spacing))`}}/>
                        <div className={lineHorFullClass} style={{top: `calc(${39+20*i}*var(--spacing))`}}/>
                    </Fragment>
                ))}

                {/* Dates: */}
                <div className="flex flex-row">
                    <div className={clsx(dateBoxClass, "rounded-tl-lg")}></div>
                    {[...Array(5)].map((_,i)=>{ 
                        const date = new Date(mondayDate);
                        date.setDate(mondayDate.getDate() + i);

                        return (
                            <div key={i} className={i==4 ? clsx(dateBoxClass, "rounded-tr-lg") : dateBoxClass}>{days[i]} {months[date.getMonth()]} {date.getDate()}</div>
                        )
                    })}
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
            <div className="mt-15 mb-4 overflow-x-auto bg-white rounded-b-lg scroller relative [box-shadow:2px_4px_54.2px_0px_#608E9436] rounded-t-lg">
                <div className="bg-dark-green rounded-t-lg text-light-green pl-4 py-0.5 text-lg min-w-120">Online Classes</div>
                <div className="text-sm sm:text-[1.1rem] gap-0.5 min-w-120 z-20 relative">
                    <div className="flex flex-row pl-2 py-2 border-b-1 items-center">
                        {getVal("course code", checkBoxes) && <div className="flex-1 min-w-20">Code</div>}
                        {getVal("course title", checkBoxes) && <div className="flex-2 min-w-40">Course Title</div>}
                        <div className="flex-2 min-w-16">Section</div>
                        <div className="flex-1 min-w-20">Start Date</div>
                        <div className="flex-1 min-w-20">End Date</div>
                    </div>
                    {loadOnlines()}
                </div>
                <div className="absolute left-0 right-0 top-10 bottom-2 min-w-120 flex flex-row pr-2 z-2">
                    {getVal("course code", checkBoxes) && <div className="border-r-1 flex-1 min-w-20"/>}
                    {getVal("course title", checkBoxes) && <div className="border-r-1 flex-2 min-w-40"/>}
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
            <div className="mt-10 mb-4 overflow-x-auto bg-white rounded-b-lg scroller relative [box-shadow:2px_4px_54.2px_0px_#608E9436] rounded-lg">
                <div className="bg-dark-green rounded-t-lg text-light-green pl-4 py-0.5 text-lg min-w-108">Options</div>
                <div className="flex flex-col px-4 py-2 min-w-108">
                    {checkBoxes.map((options, outerI) => (
                        <div className="flex gap-1" key={options[0][0]}>
                            {options.map((option,innerI)=>(
                                <label className="cursor-pointer text-sm sm:text-[1.1rem] min-w-20 flex-1" key={option[0]}>
                                    <input 
                                        type="checkbox" 
                                        disabled={option[0] == "-"} 
                                        className="mr-1" 
                                        checked={option[1]} 
                                        onChange={()=>handleOptions(outerI, innerI)}/>
                                    {option[0]}
                                </label>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
