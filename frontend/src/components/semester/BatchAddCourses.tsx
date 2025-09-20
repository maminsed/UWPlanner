import { AiOutlineClose } from "react-icons/ai";
import RightSide from "../utils/RightSide";

export default function BatchAddCourses({ close, updatePage, termId }: { close: () => void, updatePage: () => void, termId: number }) {

    return (
        <div className="fixed top-0 bottom-0 left-0 right-0 bg-light-green/50 z-[999] flex items-center justify-center mx-2">
            <div className="w-[90vw] max-w-200 bg-white rounded-lg shadow-2xl shadow-dark-green/60 flex flex-col items-center px-4">
                <RightSide className="mt-4 w-full">
                    <AiOutlineClose className="w-6 font-semibold h-auto cursor-pointer hover:text-red-600 duration-150" onClick={close}/>
                </RightSide>
                <h3 className="text-3xl mb-5">Add Courses</h3>
                <div className="flex flex-col sm:flex-row justify-center items-center gap-5 sm:justify-between">
                    <div className="w-60 aspect-square bg-dark-green rounded-md max-w-[96%]"></div>
                    <textarea 
                        className="border-1 rounded w-60 aspect-square block resize-none p-2 max-w-[96%]"
                        placeholder="Enter here"
                    />
                </div>
                <RightSide className="my-2 w-full">
                    <button className="border-1 px-8 py-1 text-base mb-2 rounded-md cursor-pointer bg-dark-green text-light-green mx-8 mt-5">Add</button>
                </RightSide>
            </div>
        </div>
    )
}
