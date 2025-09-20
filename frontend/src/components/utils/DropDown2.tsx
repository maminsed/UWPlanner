import { clsx } from "clsx";
import { JSX } from "react";
import HoverEffect from "../HoverEffect";

interface DropDown2Props<T> {
    optionList: T[];
    hover?: boolean;
    hoverFunction: (arg0: T) => string;
    valueFunction: (arg0: T) => string;
    updateFunction: (arg0: boolean, arg1: T) => void;
    highlitedIndex: number;
    setHighlitedIndex: (arg0: number) => void;
}

export default function DropDown2<T>({
    optionList,
    hover = true,
    hoverFunction,
    valueFunction,
    updateFunction,
    highlitedIndex,
}: DropDown2Props<T>): JSX.Element {


    return (
        <div className="bg-teal-800 text-light-green py-1 rounded-sm mt-1 w-[90vw] max-w-75 scroller max-h-30 overflow-x-clip overflow-y-auto">
            {optionList.map((o, k) => (
                <div
                    className={clsx("cursor-pointer w-[92vw] max-w-75 hover:bg-teal-700 truncate px-1", highlitedIndex === k && "bg-teal-600")}
                    onClick={() => updateFunction(true, o)}
                    key={k}
                    ref={(el) => {
                        if (highlitedIndex === k && el) {
                            el.scrollIntoView({ behavior: "smooth", block: "nearest" });
                        }
                    }}
                >
                    {hover ?
                        <HoverEffect hover={hoverFunction(o)} >
                            {valueFunction(o)}
                        </HoverEffect>
                        :
                        valueFunction(o)
                    }
                </div>
            )
            )}
            {optionList.length == 0 &&
                <div className="cursor-pointer hover:bg-teal-700 truncate px-1 " > No results </div>
            }
        </div>
    )
}
