import clsx from "clsx";
import { Fragment } from "react";

export default function ClassSchedule() {
    const dateBoxClass = clsx("bg-[#CAEDF2] text-center flex-1 h-16 flex flex-col justify-center text-sm md:text-lg")
    const normalBoxClass = clsx("bg-white flex-1 h-20 text-sm xs:text-base")
    const lineVertClass = "border-r-1 border-[#6EC0CB]"
    const lineHorMidClass = "absolute w-[85%] right-4 border-b-1 border-[#6EC0CB]/50 border-dashed"
    const lineHorFullClass = "absolute w-[85%] right-4 border-b-1 border-[#6EC0CB]/80"

    return (
        <section className="my-5">
            {/* Calendar */}
            <div className="relative w-181 max-w-[96vw]">
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

            {/* Options */}
        </section>
    )
}
