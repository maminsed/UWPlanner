'use client';
import { AiOutlineClose } from "react-icons/ai";
import RightSide from "../utils/RightSide";
import Image from "next/image";
import { useState, useRef } from "react";
import { api } from "@/lib/useApi";

export default function BatchAddCourses({ close, updatePage, termId }: { close: () => void, updatePage: () => void, termId: number }) {
    const zoneRef = useRef<HTMLDivElement>(null);
    const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
    const [message, setMessage] = useState<string>("")
    const [text, setText] = useState<string>("")

    const [addedCourses, setAddedCourses] = useState<string[]>([])
    const backend = api()

    function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
        const isPaste = ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') || (e.shiftKey && e.key === 'Insert')
        if (!isPaste) e.preventDefault();
    }

    async function onPaste(e: React.ClipboardEvent<HTMLDivElement>) {
        e.preventDefault(); // stop the browser from inserting content
        setStatus("sending");
        setMessage("Processing paste...");

        const html = e.clipboardData.getData("text/html");
        const text = e.clipboardData.getData("text/plain");
        setText(text);
        if (!html) {
            setMessage("We cannot parse your input. If it persists please Contact someone. ");
            setStatus("error")
        }
        try {
            const res = await backend(`${process.env.NEXT_PUBLIC_API_URL}/courses/add_batch`,
                {
                    method: "POST",
                    headers: {
                        "Content-type": "application/json",
                    },
                    body: JSON.stringify({
                        "term_id": termId,
                        "html": html,
                    }),
                }
            )
            const response = await res.json().catch(() => {})
            if (!res.ok) {
                setStatus("error")
                setMessage(response.message ? response.message : "Error Occured")
            } else {
                setStatus("done")
                setMessage("")
                console.log(response)
                setAddedCourses(response.added_sections || [])
                close = updatePage
            }
        } catch (err) {
            setStatus("error");
            setMessage("Error occured. Please try again.")
        }
    }

    return (
        <div className="fixed top-0 bottom-0 left-0 right-0 bg-light-green/50 z-[999] flex items-center justify-center mx-2">
            <div className="w-[90vw] pb-4 max-w-200 bg-white max-h-full overflow-y-auto scroller rounded-lg shadow-2xl shadow-dark-green/60 flex flex-col items-center px-4">
                <RightSide className="mt-4 w-full">
                    <AiOutlineClose className="w-6 font-semibold h-auto cursor-pointer hover:text-red-600 duration-150" onClick={close} />
                </RightSide>
                <h3 className="text-3xl">Add Courses</h3>
                <p className="text-center text-sm max-w-120 mb-5 text-teal-600">Your data is used solely for the purposes of extracting your courses and will be discarded after adding your courses.</p>
                {status === "done" ?
                    <div>
                        <p className="text-lg mb-2">You are added to the following sections: </p>
                        <ul className="list-disc list-inside">
                            {addedCourses.map((c, i) => (
                                <li key={i}>{c}</li>
                            ))}
                        </ul>
                    </div>
                    :
                    <>
                        <div className="flex flex-col px-5 mb-8 sm:flex-row justify-center items-center sm:items-start gap-5 sm:justify-between">
                            <div className="flex-1 shrink min-w-30 flex flex-col items-center">
                                <p className="h-15 sm:text-base text-sm">
                                    <a
                                        href="https://quest.pecs.uwaterloo.ca/psp/SS/ACADEMIC/SA/?cmd=login&languageCd=ENG"
                                        className="text-blue-800 underline"
                                        target="blank"
                                    > Log into Quest</a> and click "Class Schedule"
                                </p>
                                <Image src="/questPage.png" width={250} height={50} className="aspect-square bg-dark-green rounded-md" alt="please log into quest"></Image>
                            </div>
                            <div className="flex-1 shrink min-w-30 flex flex-col items-center">
                                <p className="h-15 text-sm">
                                    Pick your term then select All (Ctrl + A) and Copy (Ctrl + C)
                                </p>
                                <Image src="/printPage.png" width={250} height={50} className="aspect-square bg-dark-green rounded-md" alt="please log into quest"></Image>
                            </div>
                            <div className="flex-1 shrink min-w-30 flex flex-col items-center">
                                <p className="h-15">
                                    Paste it here (Ctrl + V)
                                </p>
                                <div
                                    ref={zoneRef}
                                    onPaste={onPaste}
                                    tabIndex={0}
                                    aria-label="Paste Zone"
                                    className="border rounded-xl overflow-y-auto p-2 aspect-square w-full outline-none cursor-text focus:border-2"
                                    // Prevent typing/dragging: we only accept paste
                                    onDrop={(e) => e.preventDefault()}
                                    onDragOver={(e) => e.preventDefault()}
                                    onKeyDown={onKeyDown}
                                    onBeforeInput={(e) => { e.preventDefault() }}
                                    contentEditable={true}
                                >
                                    <div className="opacity-70">
                                        {text.length ? text : "Paste here!"}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {message.length ?
                            <p className="text-red-700">{message}</p>
                            : ""}
                    </>
                }
            </div>
        </div>
    )
}
