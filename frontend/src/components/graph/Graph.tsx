

function Semester() {
    return (
        <div className="flex flex-col text-xl gap-6 items-center">
            <div className="px-6 py-2 rounded-3xl bg-white shadow-xs mb-3 w-full font-semibold text-center text-lg whitespace-nowrap">
                WT1 - Winter 2024
            </div>
            {[...Array(Math.floor(Math.random()*4+4))].map((_,i)=>(
                <div key={i} className="rounded-r-xl bg-[#8AD5DF]/60 text-dark-green flex items-center">
                    <div className="bg-dark-green h-full w-2"/><span className="py-4 pr-6 pl-4">CS12{i}</span><div className="mr-2 border-1 rounded-full h-1.5 aspect-square"/>
                </div>
            ))}
        </div>
    )
}

export default function Graph() {
    return (
        <div className="flex gap-6 p-8">
            {[...Array(15)].map((_,i)=>(
                <Semester key={i} />
            ))}
        </div>
    )
}
