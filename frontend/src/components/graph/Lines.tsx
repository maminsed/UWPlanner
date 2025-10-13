import { Pair } from "../interface";

export default function Lines({ connections }: { connections: [Pair, Pair][] }) {

    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="absolute top-0 left-0 w-full h-full -z-1">
            {connections.map(([start, end]) => {
                const width = end.x - start.x
                return (
                    <path d={`M ${start.x} ${start.y} C ${start.x + width * 0.50} ${start.y} ${end.x - width * 0.50} ${end.y} ${end.x} ${end.y}`} stroke="#FF0000" strokeWidth="3" fill="none" />
                )
            })}
        </svg>
    )
}
