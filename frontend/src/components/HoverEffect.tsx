import { HTMLAttributes } from "react"

interface HoverEffectProps extends HTMLAttributes<HTMLSpanElement> {
    outerClass?: string;
    pClass?: string;
    hoverClass?: string;
    text: string;
    maxWidth?: string;
}

export default function HoverEffect({ outerClass="", pClass="", hoverClass="",text, maxWidth="100px", ...props}: HoverEffectProps) {

    return (
        <div className={"group relative w-fit "+outerClass} {...props}>
            <p className={"truncate w-fit "+pClass} style={{maxWidth:maxWidth}}>
                {text}
            </p>
            <div className={"absolute max-h-0 py-0 group-hover:max-h-15 transition-all duration-600 bg-slate-900/70 overflow-y-hidden text-green-100 text-xs px-2 group-hover:py-1 rounded-md top-5 -right-2 z-20 "+hoverClass}>
                {text}
            </div>
        </div>
    )
}
