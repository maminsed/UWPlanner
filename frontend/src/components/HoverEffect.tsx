import { clsx } from "clsx";
import { HTMLAttributes, CSSProperties } from "react"

interface HoverEffectProps extends HTMLAttributes<HTMLSpanElement> {
    outerClass?: string;
    pClass?: string;
    hoverStyle?: CSSProperties;
    children: React.ReactNode;
    hover?: string;
}

export default function HoverEffect({ outerClass="", pClass="", hoverStyle={},children, hover, ...props}: HoverEffectProps) {
    return (
        <div className={clsx("group relative w-fit ", outerClass)} {...props}>
            <p className={clsx("truncate w-fit ", pClass)}>
                {children}
            </p>
            <div className={"absolute max-h-0 py-0 overflow-x-auto group-hover:max-h-15 transition-all duration-600 bg-slate-900/70 overflow-y-hidden text-green-100 text-xs px-2 group-hover:py-1 rounded-md top-5 -right-2 z-20 "}
                style={hoverStyle}
            >
                {hover}
            </div>
        </div>
    )
}
