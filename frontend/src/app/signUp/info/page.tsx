import { LuCirclePlus } from "react-icons/lu"

export default function Info() {

    return (
        <main>
            <h2 className="md:mt-15 px-3 mt-5 text-center md:text-2xl text-xl font-semibold">Just a few more questions to know you better</h2>

            <div className="mx-auto w-fit mt-20 px-6 py-5 rounded-lg bg-[#DAEBE3] shadow-[0px_0px_57.4px_0px_rgba(0,0,0,0.4)]">
                <h5 className="text-2xl font-medium mb-10 text-center">What's your Major?</h5>
                <div className="relative">
                    <select name="major" defaultValue="default" className="w-64 bg-light-green px-1 pr-6 py-1 rounded-md appearance-none focus:outline-none">
                        <option value="default" disabled={true}>Choose from the list below</option>
                        <option value="Communication Studies">Communication Studies</option>
                        <option disabled={true}>Engineering</option>
                        <option value="Global Business and Digital Arts">Global Business and Digital Arts</option>
                        <option value="Global Business and Digital Arts">Global Business and Digital Arts</option>
                        <option value="Global Business and Digital Arts">Global Business and Digital Arts</option>
                        <option value="Global Business and Digital Arts">Global Business and Digital Arts</option>
                        <option value="Global Business and Digital Arts">Global Business and Digital Arts</option>
                        <option value="Global Business and Digital Arts">Global Business and Digital Arts</option>
                        <option value="Global Business and Digital Arts">Global Business and Digital Arts</option>
                        <option value="Global Business and Digital Arts">Global Business and Digital Arts</option>
                        <option value="Global Business and Digital Arts">Global Business and Digital Arts</option>
                        <option value="Global Business and Digital Arts">Global Business and Digital Arts</option>
                        <option value="Global Business and Digital Arts">Global Business and Digital Arts</option>
                        <option value="Global Business and Digital Arts">Global Business and Digital Arts</option>
                        <option value="Business Administration (Laurier) and Computer Science (Waterloo) Double Degree">Business Administration (Lauri.</option>
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-1 flex items-center">
                        <svg
                            className="w-6 h-6 text-dark-green"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path
                                d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 
                                0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.08 
                                0L5.21 8.27a.75.75 0 01.02-1.06z"
                            />
                        </svg>
                    </span>
                </div>
                <button className="mt-4"><LuCirclePlus /></button>
            </div>

            <div className="h-[50vh] md:h-fit w-dvw fixed left-0 bottom-0 overflow-x-hidden z-[-1]">
                <img
                    src="/background.svg"
                    width="1000"
                    height="500"
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: "bottom",
                    }}
                    alt="background"
                />
            </div>
        </main>
    )
}
