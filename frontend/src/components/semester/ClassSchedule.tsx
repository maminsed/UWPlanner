'use client'
import clsx from "clsx";
import { useEffect, useState } from "react";
import { api } from "@/lib/useApi";
import { Fragment } from "react";
import { IoIosInformationCircleOutline } from "react-icons/io";
import { LuCamera, LuChevronLeft, LuChevronRight, LuMaximize2, LuPlus, LuSearch, LuShare2 } from "react-icons/lu";
import HoverEffect from "../HoverEffect";
import useGQL from "@/lib/useGQL";
import { AiOutlineClose } from "react-icons/ai";

export function RightSide({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    // Just a class that has stuff on the right side
    return (
        <div className={clsx("flex justify-end gap-2 mb-4 mr-2 items-center", className)} {...props}>
            {children}
        </div>
    )
}

type ClassInterface = {
    sectionId: number;
    startSeconds: number;
    endSeconds: number;
    startDate: string;
    endDate: string;
    days: ("M" | "T" | "W" | "Th" | "F")[]; // :["M","T", "W","Th","F"]
    code: string;
    classNumber: number;
    courseId: number;
    title: string;
    type: string;
    prof: string;
    location: string;
}

function translateSecToHour(time: number, checkBoxes: [string, boolean][][]) {
    const min = Math.floor((time % 3600) / 60);
    const hour = Math.floor(time / 3600);
    const AM_PM = getVal("AM/PM", checkBoxes)
    return `${AM_PM ? hour % 12 : hour}:${min}${min < 10 ? '0' : ''}${AM_PM && hour > 12 ? 'PM' : ''}`
}

function getVal(value: string, checkBoxes: [string, boolean][][]) {
    for (let r = 0; r < checkBoxes.length; ++r) {
        for (let c = 0; c < checkBoxes[r].length; ++c) {
            if (checkBoxes[r][c][0].toLocaleLowerCase() == value.toLocaleLowerCase()) return checkBoxes[r][c][1];
        }
    }
    return true;
}


function Class({ startSeconds, endSeconds, days, code, courseId, type, title, prof, location, checkBoxes, dayMap, top, height }: ClassInterface & { checkBoxes: [string, boolean][][], dayMap: DayMapInterface, top: number, height: number }) {
    const dayLeft = { "M": "100%/6", "T": "200%/6", "W": "300%/6", "Th": "400%/6", "F": "500%/6" };

    function countOccurance(
        day: keyof DayMapInterface): [number, number] // #overlap,ith overlap
    {
        let count = 0;
        let ith = 0;
        dayMap[day].forEach(section => {
            if (hasOverlap([startSeconds, endSeconds], [section[0], section[1]])) {
                if (section[2] === courseId) ith = count;
                ++count;
            }
        })
        return [count, ith]
    }

    return (
        <Fragment>
            {days.map(day => {
                const [count, ith] = countOccurance(day);
                const width = 6 * count;
                const offset = `${100 * ith}%/${width}`

                return (
                    <div
                        key={day}
                        className="absolute bg-cyan-500/50 rounded-md text-sm leading-[120%] z-20 pl-1 overflow-y-auto overflow-x-hidden scroller"
                        style={{
                            left: `calc(${dayLeft[day]} + ${offset})`,
                            top: `calc(${top} * var(--spacing))`,
                            height: `calc(${height} * var(--spacing)`,
                            width: `calc(100%/${width})`
                        }}
                    >
                        {getVal("course code", checkBoxes) && <p className="pt-1">{code}</p>}
                        {getVal("course title", checkBoxes) && <p>{title}</p>}
                        <p>{courseId}</p>
                        <p>{type}</p>
                        <p>{translateSecToHour(startSeconds, checkBoxes)}-{translateSecToHour(endSeconds, checkBoxes)}</p>
                        <p>{location}</p>
                        <p>{prof}</p>
                        <div className="flex justify-end pr-[3%]">
                            <LuMaximize2 className="right-2.5 my-1 cursor-pointer" />
                        </div>
                    </div>
                )
            })}
        </Fragment>
    )
}

function OnlineClass({ code, type, title, startDate, endDate, first = false, checkBoxes }: ClassInterface & { first?: boolean, checkBoxes: [string, boolean][][] }) {
    return (
        <div className="flex flex-row px-2 py-1 items-center min-w-120 relative">
            {getVal("course code", checkBoxes) && <div className="flex-1 min-w-20 flex items-center gap-1 cursor-pointer">{code} <IoIosInformationCircleOutline className="min-w-4" /></div>}
            {getVal("course title", checkBoxes) && <div className="flex-2 min-w-40">{title}</div>}
            <div className="flex-2 min-w-16">{type}</div>
            <div className="flex-1 min-w-20 text-sm sm:text-[1rem]">{startDate}</div>
            <div className="flex-1 min-w-20 text-sm sm:text-[1rem]">{endDate}</div>
            {!first && <div className="absolute right-4 left-4 top-0 border-t-1" />}
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

function hasOverlap([start1, end1]: [number, number], [start2, end2]: [number, number]) {
    return !((start1 >= end2) || (end1 <= start2))
}



type DayMapInterface = {
    "M": [number, number, number][], //start,end,course_id
    "T": [number, number, number][],
    "W": [number, number, number][],
    "Th": [number, number, number][],
    "F": [number, number, number][],
    "Tot": [number, number][],
}

// TODO: fix this
function getTermId() {
    return 1255;
}

function getTermName(termId: number) {
    let res = ""
    if (termId % 10 == 5) {
        res += "Spring "
    } else if (termId % 10 == 9) {
        res += "Fall "
    } else {
        res += "Winter "
    }
    res += Math.floor(termId / 10) + 1900
    return res;
}

function termOperation(termId: number, distance: number) {
    let currTerm = 0;
    if (termId % 10 == 5) currTerm = 1;
    else if (termId % 10 == 9) currTerm = 2;

    let resTerm = (currTerm + distance) % 3;
    if (resTerm < 0) resTerm += 3;
    if (resTerm == 0) resTerm = 1;
    else if (resTerm == 1) resTerm = 5;
    else resTerm = 9;

    const yearDiff = Math.floor((currTerm + distance) / 3);
    return (Math.floor(termId / 10) + yearDiff) * 10 + resTerm;
}

export default function ClassSchedule() {
    const dateBoxClass = clsx("bg-[#CAEDF2] text-center flex-1 h-16 flex flex-col justify-center text-sm md:text-lg")
    const normalBoxClass = clsx("bg-white flex-1 text-sm xs:text-base")
    const lineVertClass = "border-r-1 border-[#6EC0CB]"
    const lineHorMidClass = "absolute w-[85%] right-4 border-b-1 border-[#6EC0CB]/50 border-dashed"
    const lineHorFullClass = "absolute w-[85%] right-4 border-b-1 border-[#6EC0CB]/80"
    const [classes, setClasses] = useState<ClassInterface[]>([]);
    const [mondayDate, setMondayDate] = useState<Date>(() => getMonday());
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri"]
    const [checkBoxes, setCheckBoxes] = useState<[string, boolean][][]>([
        [["Course Code", true], ["AM/PM", false], ["Lectures", true], ["Final Week", false]],
        [["Course Title", true], ["Tutorials", true], ["Tests", true], ["Compress", false]]
    ]);
    const [overLay, setOverLay] = useState<boolean>(false)
    const [termId, setTermId] = useState<number>(getTermId);


    const [dayMap, setDayMap] = useState<DayMapInterface>({ "M": [], "T": [], "W": [], "Th": [], "F": [], "Tot": [] })
    const backend = api();
    const gql = useGQL();
    useEffect(() => {
        async function initialSetup() {
            const res = await backend(`${process.env.NEXT_PUBLIC_API_URL}/courses/get_user_sections`, {
                "method": "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "term_id": termId
                })
            })
            if (!res?.ok) {
                console.error("error!")
            } else {
                const response = await res.json().catch(() => { });
                const sections = response.sections;
                // TODO: UPDATE TERM_ID!
                const GQL_QUERY = `
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
                const gql_response = await gql(GQL_QUERY, { sections, termId });
                const data: ClassInterface[] = []
                gql_response?.data?.course_section.forEach((section: any): void => {
                    section.meetings.forEach((meeting: any) => {
                        const prevSection = data[data.length - 1];
                        const newSection = {
                            sectionId: section.id,
                            startSeconds: meeting.start_seconds || 0,
                            endSeconds: meeting.end_seconds || 0,
                            startDate: meeting.start_date,
                            endDate: meeting.end_date,
                            classNumber: section.class_number,
                            days: meeting.days,
                            code: section.course.code.toUpperCase() || '',
                            courseId: section.course_id,
                            title: section.course.name || '',
                            type: section.section_name || '',
                            location: meeting.location || '',
                            prof: meeting.prof_id || ''
                        }
                        if (JSON.stringify(prevSection) != JSON.stringify(newSection)) {
                            data.push(newSection)
                        }

                    })

                })
                setClasses(data as ClassInterface[]);
            }
        }

        initialSetup()
    }, [termId])

    useEffect(() => {
        function updateDayMap() {
            const res: DayMapInterface = { "M": [], "T": [], "W": [], "Th": [], "F": [], "Tot": [] };

            classes.forEach(section => {
                if (inWeek(section.startDate, section.endDate)) {
                    section.days.forEach(day => {
                        res[day].push([section.startSeconds, section.endSeconds, section.courseId]);
                        res["Tot"].push([section.startSeconds, section.endSeconds]);
                    })
                }
            })

            Object.keys(res).forEach((day) => {
                const dayKey = day as keyof DayMapInterface;
                res[dayKey].sort(([s1, e1, _1], [s2, e2, _2]) => s1 - s2 || e1 - e2)
            })

            if (res["Tot"].length) {
                const tot: [number, number][] = []
                let [start, end] = res["Tot"][0]
                res["Tot"].forEach(day => {
                    if (hasOverlap([start, end], day)) {
                        start = Math.min(start, day[0]);
                        end = Math.max(end, day[1]);
                    } else {
                        tot.push([start, end]);
                        start = day[0];
                        end = day[1];
                    }
                })
                tot.push([start, end])
                res["Tot"] = tot;
            }

            setDayMap(res);
        }

        updateDayMap()

    }, [classes, mondayDate])


    function moveTime(diff: number) {
        setMondayDate(prevDate => {
            const date = new Date(prevDate);
            date.setDate(date.getDate() + diff);
            return date;
        })
    }

    function inWeek(startDate: string, endDate: string) {
        const [startYear, startMonth, startDay] = startDate.split("-").map(Number)
        const startObj = new Date(startYear, startMonth - 1, startDay)

        const [endYear, endMonth, endDay] = endDate.split("-").map(Number)
        const endObj = new Date(endYear, endMonth - 1, endDay)

        const fridayDate = new Date(mondayDate);
        fridayDate.setDate(fridayDate.getDate() + 4);
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
                {classes.map((section, i) => {
                    if (section.startSeconds === section.endSeconds && section.startSeconds === 0 && selectedClass(section.type)) {
                        if (first) {
                            first = false;
                            return <OnlineClass {...section} key={i} first={true} checkBoxes={checkBoxes} />
                        }
                        return <OnlineClass {...section} key={i} checkBoxes={checkBoxes} />
                    }
                    return null
                })}
            </>
        )
    }


    function handleOptions(outerI: number, innerI: number, value: boolean | null = null) {

        if (checkBoxes[outerI][innerI][0] == 'Final Week' && checkBoxes[outerI][innerI][1] == false && value === null) {
            let res: null | string = null;
            classes.forEach(section => {
                if (res === null || section.endDate > res) {
                    res = section.endDate;
                }
            })
            if (res !== null) {
                const [Year, Month, Day] = (res as String).split("-").map(Number)
                const Obj = new Date(Year, Month - 1, Day)
                setMondayDate(() => getMonday(new Date(Obj)))
            }
        }

        setCheckBoxes((prev) => (
            prev.map((r, rI) => (
                rI != outerI ? r : r.map((item, c) =>
                    c != innerI ? item : [item[0], value === null ? !item[1] : value]
                )
            ))
        ))



    }

    function handleAdd() {
        setOverLay(true);
    }

    function getIthValue(i: number, isSeconds: boolean = false) {
        // Funciton that takes in the ith value and if it's compressed it returns the compressed version, if not it returns the normal version
        if (!getVal('Compress', checkBoxes)) {
            if (isSeconds) i = (i / 3600) - 8;
            return i * 20 + 19;
        }
        if (!isSeconds) i = (i + 8) * 3600;
        let res = 19;
        let prevEnd = 8 * 3600;
        for (let j = 0; j < dayMap['Tot'].length; ++j) {
            // If the start is bigger
            if (dayMap['Tot'][j][0] > i) {
                return res + ((i - prevEnd) / 3600) * 10;
            }
            // If the end is bigger
            if (dayMap['Tot'][j][1] > i) {
                return res + (((i - dayMap['Tot'][j][0]) * 20) + ((dayMap['Tot'][j][0] - prevEnd) * 10)) / 3600;
            }
            // If start and end are smaller
            res += (((dayMap['Tot'][j][1] - dayMap['Tot'][j][0]) / 3600) * 20) + (((dayMap['Tot'][j][0] - prevEnd) / 3600) * 10)
            prevEnd = dayMap['Tot'][j][1];
        }
        return res + (isSeconds ? ((i - prevEnd) / 3600) * 10 : 10);
    }

    return (
        <section className="my-5 max-w-[96vw]">
            {overLay &&
                <div className="fixed top-0 bottom-0 left-0 right-0 bg-light-green/50 z-[999] flex items-center justify-center">
                    <div className="bg-white pt-8 px-6 rounded-xl shadow-2xl shadow-dark-green/10">
                        <RightSide className="!mb-1 !mr-0">
                            <HoverEffect hover="close" className="cursor-pointer" onClick={() => setOverLay(false)}>
                                <AiOutlineClose className="w-6 font-semibold h-auto" />
                            </HoverEffect>
                        </RightSide>
                        <h3 className="w-full text-center text-xl font-semibold">Add Course:</h3>
                        <p className="text-sm text-center mb-5">Just choose one/or more options and fill it out</p>
                        <label className="block text-lg">
                            Search:
                            <div className="relative">
                                <input className="border-1 rounded-sm  block w-full py-2 pl-1 pr-7 focus:outline-none focus:shadow-2xs focus:shadow-dark-green duration-75" />
                                <LuSearch className="absolute top-0 right-1 h-full cursor-pointer w-6" />
                            </div>
                        </label>
                        <label className="block text-lg mt-4">
                            Id:
                            <div className="relative">
                                <input className="border-1 rounded-sm  block w-full py-2 pl-1 pr-7 focus:outline-none focus:shadow-2xs focus:shadow-dark-green duration-75" />
                                <LuSearch className="absolute top-0 right-1 h-full cursor-pointer w-6" />
                            </div>
                        </label>
                        <RightSide className="!mr-0">
                            <button className="border-1 px-8 py-1 text-base mt-5 rounded-md cursor-pointer bg-dark-green text-light-green">Add</button>
                        </RightSide>
                    </div>
                </div>
            }
            {/* Calendar buttons */}

            <div className="w-full flex justify-center">
                <select
                    className="border-1 rounded-md px-2 py-1 w-50 max-w-[95%]"
                    value={termId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setTermId(Number(e.currentTarget.value)) }}>
                    {[...Array(5)].map((_, i) => (
                        <option
                            value={termOperation(termId, i - 2)}
                            key={i}>
                            {getTermName(termOperation(termId, i - 2))}
                        </option>
                    ))}
                </select>
            </div>

            <RightSide>
                {/* Fix it so first and final are off when u move */}
                <button
                    onClick={() => {
                        moveTime(-7);
                        handleOptions(0, checkBoxes[0].length - 1, false);
                    }}
                >
                    <LuChevronLeft className="w-4 md:w-5 h-auto cursor-pointer rounded-full border-1 hover:bg-dark-green/90 hover:text-light-green duration-150 active:bg-dark-green" />
                </button>
                <button
                    onClick={() => {
                        moveTime(7);
                        handleOptions(0, checkBoxes[0].length - 1, false)
                    }}
                >
                    <LuChevronRight className="w-4 md:w-5 h-auto cursor-pointer rounded-full border-1 hover:bg-dark-green/90 hover:text-light-green duration-150 active:bg-dark-green" />
                </button>
                <button
                    onClick={() => {
                        setMondayDate(() => getMonday(new Date()));
                        handleOptions(0, checkBoxes[0].length - 1, false)
                    }}
                    className="rounded-lg border-1 px-2 cursor-pointer hover:bg-dark-green/90 hover:text-light-green duration-150 active:bg-dark-green"
                >
                    Current Week
                </button>
            </RightSide>

            {/* Calendar */}
            <div className="relative w-181 max-w-[92vw] [box-shadow:2px_4px_54.2px_0px_#608E9436] mx-auto overflow-y-clip">
                {/* Classes */}
                {classes.map((section, i) => (
                    (inWeek(section.startDate, section.endDate) && selectedClass(section.type)) ?
                        <Class
                            key={i}
                            {...section}
                            checkBoxes={checkBoxes}
                            dayMap={dayMap}
                            top={getIthValue(section.startSeconds, true)}
                            height={getIthValue(section.endSeconds, true) - getIthValue(section.startSeconds, true)}
                        />
                        : null
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
                <div className={lineHorFullClass} style={{ top: `calc(${getIthValue(0)}*var(--spacing))` }} />
                {[...Array(13)].map((_, i) => (
                    <Fragment key={i}>
                        <div className={lineHorMidClass} style={{ top: `calc(${getIthValue(i + 0.5)}*var(--spacing))` }} />
                        <div className={lineHorFullClass} style={{ top: `calc(${getIthValue(i + 1)}*var(--spacing))` }} />
                    </Fragment>
                ))}

                {/* Dates: */}
                <div className="flex flex-row">
                    <div className={clsx(dateBoxClass, "rounded-tl-lg")}></div>
                    {[...Array(5)].map((_, i) => {
                        const date = new Date(mondayDate);
                        date.setDate(mondayDate.getDate() + i);

                        return (
                            <div key={i} className={i == 4 ? clsx(dateBoxClass, "rounded-tr-lg") : dateBoxClass}>{days[i]} {months[date.getMonth()]} {date.getDate()}</div>
                        )
                    })}
                </div>
                {/* The days */}
                <div>
                    {[...Array(13)].map((_, i) => (
                        <div className="flex flex-row" style={{ height: `calc(${getIthValue(i + 1) - getIthValue(i)} * var(--spacing))` }} key={i}>
                            <div className={clsx(normalBoxClass, i == 12 && "rounded-bl-lg", "pl-2 xs:text-center")}>{i + 8}:00</div>
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
                        <div className="flex-2 min-w-16">Type</div>
                        <div className="flex-1 min-w-20">Start Date</div>
                        <div className="flex-1 min-w-20">End Date</div>
                    </div>
                    {loadOnlines()}
                </div>
                <div className="absolute left-0 right-0 top-10 bottom-2 min-w-120 flex flex-row pr-2 z-2">
                    {getVal("course code", checkBoxes) && <div className="border-r-1 flex-1 min-w-20" />}
                    {getVal("course title", checkBoxes) && <div className="border-r-1 flex-2 min-w-40" />}
                    <div className="border-r-1 flex-2 min-w-16" />
                    <div className="border-r-1 flex-1 min-w-20" />
                    <div className="flex-1 min-w-20" />
                </div>
            </div>

            <RightSide className="mb-5">
                <HoverEffect hover="Add Class" onClick={handleAdd}>
                    <LuPlus className="w-6 h-auto font-semibold cursor-pointer" />
                </HoverEffect>
                <HoverEffect hover="Import Schedule">
                    <LuCamera className="w-6 h-auto font-semibold cursor-pointer" />
                </HoverEffect>
                <HoverEffect hover="Export Schedule">
                    <LuShare2 className="w-5 h-auto font-semibold cursor-pointer" />
                </HoverEffect>
            </RightSide>

            {/* Options */}
            <div className="mt-10 mb-4 overflow-x-auto bg-white rounded-b-lg scroller relative [box-shadow:2px_4px_54.2px_0px_#608E9436] rounded-lg">
                <div className="bg-dark-green rounded-t-lg text-light-green pl-4 py-0.5 text-lg min-w-108">Options</div>
                <div className="flex flex-col px-4 py-2 min-w-108">
                    {checkBoxes.map((options, outerI) => (
                        <div className="flex gap-1" key={options[0][0]}>
                            {options.map((option, innerI) => (
                                <label className="cursor-pointer text-sm sm:text-[1.1rem] min-w-20 flex-1" key={option[0]}>
                                    <input
                                        type="checkbox"
                                        disabled={option[0] == "-"}
                                        className="mr-1"
                                        checked={option[1]}
                                        onChange={() => handleOptions(outerI, innerI)} />
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
