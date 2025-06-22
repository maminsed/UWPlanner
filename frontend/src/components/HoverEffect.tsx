import { HTMLAttributes } from "react"

interface HoverEffectProps extends HTMLAttributes<HTMLSpanElement> {
    className?: string;
    text: string;
}

export default function HoverEffect({ className,text, ...props}: HoverEffectProps) {

    return (
        <span className={className} {...props}>{text}</span>
    )
}
