'use client'
import { AiOutlineClose } from "react-icons/ai";
import HoverEffect from "../HoverEffect";
import RightSide from "../utils/RightSide";
import { clsx } from "clsx";
import { useEffect, useState } from "react";
import useGQL from "@/lib/useGQL";
import { IoIosInformationCircleOutline } from "react-icons/io";
import { api } from "@/lib/useApi";
import { LuMinus, LuPlus } from "react-icons/lu";
import DropDown2 from "../utils/DropDown2";
import { termIdInterface } from "../interface";
import { getCurrentTermId, getTermDistance } from "../utils/termUtils";

type OptionsInterface = {
    code: string;
    course_id: number;
    name: string;
}

type SectionInterface = {
    class_number: number;
    course_id: number;
    section_name: string;

}

function changeQuery(phrase: string): [number, string] {
    let onSpace = true;
    let count = 0
    let res = ""
    phrase = phrase.replace(/[*:&\(\)!]/g, "").trim()
    for (let i = 0; i < phrase.length; ++i) {
        if (phrase[i] == " ") {
            if (!onSpace) {
                res += ":* & "
            }
            onSpace = true;
        } else {
            if (onSpace) ++count;
            res += phrase[i];
            onSpace = false;
        }
    }

    return [count, res + ":* "]
}

type statusInterface = 'idle'|'error'|'term_chosing'|'section_excempt'|'section_excempt_error'
export default function AddACourse({ className, close, updatePage, termId, termOptions, ...props }: React.HTMLAttributes<HTMLDivElement> & { close: () => void, updatePage: () => void, termId?: number, termOptions?: termIdInterface[] }) {
    //TODO: disable when loading - allow the user to add multiple if the term is too faraway
    const [searchPhrase, setSearchPhrase] = useState<OptionsInterface>({ code: "", course_id: -1, name: "" });
    const [searchOptions, setSearchOptions] = useState<OptionsInterface[]>([])

    const [message, setMessage] = useState<string>("");
    const backend = api();
    const currentTerm = getCurrentTermId();
    const [status,setStatus] = useState<statusInterface>('idle')
    const [sectionOptions, setSectionOptions] = useState<SectionInterface[]>([])
    const [chosenSections, setChosenSections] = useState<(SectionInterface | undefined)[]>([undefined])

    const [actualTermId, setActualTermId] = useState<termIdInterface>({ value: termId || -1, display: "" })


    const gql = useGQL();

    useEffect(() => {
        async function fetchOptions() {
            const [numPhrase, phrase] = changeQuery(searchPhrase.name);
            if (numPhrase == 0) {
                setSearchOptions([])
                return;
            }

            const GQL_QUERY = `
                query Course_section($queryValue: String!, $code_only: Boolean!, $limit: Int!) {
                    search_courses(args: { query: $queryValue, code_only: $code_only }, limit: $limit, where: null) {
                        code
                        course_id
                        name
                    }
                }
            `
            const response1 = (await gql(GQL_QUERY, { queryValue: phrase, code_only: true, limit: 3 })).data.search_courses;
            if (response1.length == 3) {
                setSearchOptions(response1)
            } else {
                const response2 = (await gql(GQL_QUERY, { queryValue: phrase, code_only: false, limit: 3 })).data.search_courses;
                setSearchOptions(response2)
            }
        }

        fetchOptions()
    }, [searchPhrase])

    async function fetchIds() {
        if (searchPhrase.course_id == -1) {
            setMessage("Please choose a course first")
            updateStatus("error")
            return;
        } else if (actualTermId.value == -1) {
            updateStatus("error")
            setMessage("Please choose your term first");
            return;
        }
        if (sectionOptions.length) {
            return;
        }
        const GQL_QUERY = `
            query Course_section($term_id: Int!, $course_id: Int!) {
                course_section(
                    limit: 50
                    where: { term_id: { _eq: $term_id }, course_id: { _eq: $course_id } }
                ) {
                    class_number
                    course_id
                    section_name
                }
            }
        `
        const response = (await gql(GQL_QUERY, { term_id: actualTermId.value, course_id: searchPhrase.course_id })).data.course_section;
        if (!response || response.length == 0) {
            setMessage("There are no available sections for this course this semster.")
            updateStatus("error")
        }
        setSectionOptions(response);
    }

    function updateSearchPhrase(searchPhrase: OptionsInterface) {
        if (searchPhrase.course_id != -1) setMessage(""); updateStatus("idle");
        setSearchPhrase(searchPhrase);
        setSectionOptions([]);
        setChosenSections((prev) => prev.map(() => undefined));
    }

    function updateChosenSection(chosenSection: SectionInterface | string, index: number) {
        if (typeof chosenSection === "string") {
            chosenSection = { class_number: -1, course_id: -1, section_name: chosenSection }
        }
        setChosenSections(prev => prev.map((item, i) => (i === index ? chosenSection : item)))
    }

    function filterSectionOptions(sectionPhrase: string) {
        if (sectionPhrase === '') return sectionOptions;
        let phraseList = sectionPhrase.replace(/[^A-Za-z0-9]/g, " ").replace(/\s+/g, " ").toLowerCase().trim().split(" ")
        let res: SectionInterface[] = []
        sectionOptions.forEach(section => {
            for (let i = 0; i < phraseList.length; ++i) {
                const phrase = phraseList[i];
                if (String(section.class_number).includes(phrase)) {
                    res.push(section)
                    return;
                } else if (section.section_name.toLowerCase().includes(phrase)) {
                    res.push(section)
                    return;
                }
            }
        })
        return res;
    }

    function filterTermId() {
        const display = actualTermId.display.toLowerCase();
        return termOptions?.filter((value) => value.display.toLowerCase().includes(display) || value.value == actualTermId.value) || []
    }

    function updateStatus(newStatus:statusInterface, termId:number=actualTermId.value) {
        const secExceptMsg = "The term is too far away from the current term. Just enter the course."
        const isTooFar = getTermDistance(currentTerm, termId) > 1;
        if (newStatus == 'idle' && termId > 1 &&  isTooFar) newStatus = 'section_excempt';
        if (newStatus == 'error' && termId > 1 && isTooFar) newStatus = 'section_excempt_error';
        if (!isTooFar && newStatus.includes("section_excempt")) newStatus = newStatus === 'section_excempt' ? 'idle' : 'error';
        
        if (newStatus.includes('section_excempt') && chosenSections.length) setChosenSections([]);
        if (newStatus == 'section_excempt') setMessage(secExceptMsg);
        if (newStatus == 'idle' && message == secExceptMsg) setMessage("");
        setStatus(newStatus);
    }

    async function handleSubmit() {
        const class_numbers = [];
        if (status != 'section_excempt') {
            for (const chosenSection of chosenSections) {
                if (!chosenSection || chosenSection.class_number == -1) {
                    setMessage("Please choose all the options first");
                    updateStatus("error")
                    return;
                }
                class_numbers.push(chosenSection.class_number);
            }
        }
        if (searchPhrase.course_id == -1) {
            setMessage("Please choose all the options first");
            updateStatus("error")
            return
        }
        setMessage("Loading...");
        updateStatus("idle")
        const res = await backend(`${process.env.NEXT_PUBLIC_API_URL}/courses/add_single`, {
            method: "POST",
            headers: {
                "Content-type": "application/json",
            },
            body: JSON.stringify({
                "term_id": actualTermId.value,
                "class_numbers": status === 'section_excempt' ? [] : class_numbers ,
                "course_id": searchPhrase.course_id,
            })
        })

        const response = await res.json().catch(() => { })
        if (!res.ok) {
            if (response.message) setMessage(response.message);
            else setMessage('error occured')
            updateStatus("error");
            return;
        }
        updatePage();
    }

    return (
        <div
            className={
                clsx("fixed top-0 bottom-0 left-0 right-0 bg-light-green/50 z-[999] flex items-center justify-center mx-2"
                    , className)
            }
            {...props}

        >
            <div className="bg-white pt-8 px-6 rounded-xl shadow-2xl shadow-dark-green/10">
                <RightSide className="!mb-1 !mr-0">
                    <HoverEffect hover="close" className="cursor-pointer" onClick={close}>
                        <AiOutlineClose className="w-6 font-semibold h-auto" />
                    </HoverEffect>
                </RightSide>
                <h3 className="w-full text-center text-xl font-semibold">Add Course:</h3>
                <p className="text-sm text-center">Just choose one/or more options and fill it out</p>
                <p className="text-sm text-center mb-5 text-teal-400">*To add multiple click on the import button*</p>
                {(!termId && termOptions) &&
                    <label className="block text-lg">
                        Term Id:
                        <DropDown2<termIdInterface>
                            currentValue={actualTermId}
                            valueFunction={(v) => v.display}
                            options={filterTermId()}
                            updateInputFunction={(str) => setActualTermId({ value: -1, display: str })}
                            updateSelectFunction={(termId)=>{updateStatus(status, termId.value); setActualTermId(termId)}}
                        />
                    </label>}
                <label className="block text-lg">
                    Search:
                    <DropDown2<OptionsInterface>
                        currentValue={searchPhrase}
                        valueFunction={(phrase) => `${phrase.code.toUpperCase()}${phrase.code == "" ? "" : " - "}${phrase.name}`}
                        options={searchOptions}
                        updateInputFunction={(str) => updateSearchPhrase({ name: str, code: "", course_id: -1 })}
                        updateSelectFunction={(value) => updateSearchPhrase(value)}
                    />
                </label>
                {status.includes('section_excempt') ||
                <label className="block text-lg mt-4" onFocus={fetchIds}>
                    Class Number: <IoIosInformationCircleOutline className="inline-block cursor-pointer" />
                    {chosenSections.map((section, i) => (
                        <div key={i} className="flex items-center gap-1">
                            <DropDown2<SectionInterface>
                                currentValue={section}
                                options={section ? filterSectionOptions(section.class_number > 0 ? `${section.class_number}-${section.section_name}` : section.section_name) : sectionOptions}
                                placeholder="Class Number"
                                valueFunction={(section => section.class_number > 0 ? `${section.class_number}-${section.section_name}` : section.section_name)}
                                updateSelectFunction={(section) => updateChosenSection(section, i)}
                                updateInputFunction={(str) => updateChosenSection(str, i)}
                                className="flex-1 mt-1"
                            />
                            {chosenSections.length > 1 &&
                                <LuMinus
                                    className="w-5 h-auto border-1 p-1 rounded-full cursor-pointer hover:bg-dark-green hover:text-light-green"
                                    onClick={() => setChosenSections((prev) => prev.filter((_, index) => index != i))}
                                />}
                        </div>
                    ))}
                    <LuPlus
                        className="mt-2 w-6 h-auto border-1 p-1 rounded-full cursor-pointer hover:bg-dark-green hover:text-light-green"
                        onClick={() => setChosenSections(prev => [...prev, undefined])}
                    />
                </label>}
                {message.length ?
                    <p className={clsx(!status.includes('error') ? "text-dark-green" : "text-red-600", "my-2 max-w-75")}>{message}</p>
                    : ""
                }
                <RightSide className="my-2">
                    <button className="border-1 px-8 py-1 text-base mb-2 rounded-md cursor-pointer bg-dark-green text-light-green" onClick={handleSubmit} disabled={message === "Loading..."}>Add</button>
                </RightSide>
            </div>
        </div>
    )
}
