'use client'
import { AiOutlineClose } from "react-icons/ai";
import HoverEffect from "../HoverEffect";
import { LuSearch } from "react-icons/lu";
import RightSide from "../utils/RightSide";
import { clsx } from "clsx";
import { JSX, useEffect, useState } from "react";
import useGQL from "@/lib/useGQL";
import { IoIosInformationCircleOutline } from "react-icons/io";

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

interface DropDown2Props<T> {
    optionList: T[];
    hover?: boolean;
    hoverFunction: (arg0: T) => string;
    valueFunction: (arg0: T) => string;
    updateFunction: (arg0: boolean, arg1: T) => void;
    highlitedIndex: number;
    setHighlitedIndex: (arg0: number)=>void;
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

function DropDown2<T>({
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

export default function AddACourse({ className, close, updatePage, termId, ...props }: React.HTMLAttributes<HTMLDivElement> & { close: () => void, updatePage: () => void, termId: number }) {
    const [searchPhrase, setSearchPhrase] = useState<OptionsInterface>({ code: "", course_id: -1, name: "" });
    const [searchOptions, setSearchOptions] = useState<OptionsInterface[]>([])
    const [closeSearchOptions, setCloseSearchOptions] = useState<boolean>(true)
    const [searchHighlitedIndex, setSearchHighlitedIndex] = useState<number>(-1);

    const [message, setMessage] = useState<string>("")

    const [sectionOptions, setSectionOptions] = useState<SectionInterface[]>([])
    const [chosenSection, setChosenSection] = useState<SectionInterface>({ class_number: -1, course_id: -1, section_name: "" })
    const [sectionPhrase, setSectionPhrase] = useState<string>("");
    const [closeSection, setCloseSections] = useState<boolean>(true);
    const [sectionHighlitedIndex, setSectionHighlitedIndex] = useState<number>(-1);

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
        const response = (await gql(GQL_QUERY, { term_id: termId, course_id: searchPhrase.course_id })).data.course_section;
        if (!response) {
            setMessage("There are no available sections for this course this semster.")
        }
        setCloseSections(false);
        setSectionOptions(response);
    }

    function updateSearchPhrase(closeSearchOptions: boolean, searchPhrase: OptionsInterface) {
        setCloseSearchOptions(closeSearchOptions);
        setSearchPhrase(searchPhrase);
        setSearchHighlitedIndex(-1);
        setSectionOptions([]);
        setChosenSection({ class_number: -1, course_id: -1, section_name: "" })
    }

    function updateChosenSection(closeSearchOptions: boolean, chosenSection: SectionInterface | string) {
        if (typeof chosenSection === "object") {
            setSectionPhrase(`${chosenSection.class_number} ${chosenSection.section_name}`);
            setChosenSection(chosenSection);
        } else {
            setChosenSection({ class_number: -1, course_id: -1, section_name: "" });
            setSectionPhrase(chosenSection);
        }
        setSectionHighlitedIndex(-1);
        setCloseSections(closeSearchOptions);
    }

    function handleKeyDown<T>(
        e: React.KeyboardEvent<HTMLInputElement>, 
        options: T[],
        updateIndexFunction: (arg0:number)=>void, 
        IndexValue: number,
        updateValueFunction: (arg1:boolean, arg2:T)=>void
    )
    {
        const size = options.length
        if (size == 0) return;
        if (e.key === "ArrowDown") {
            e.preventDefault()
            updateIndexFunction((IndexValue+1)%options.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault()
            if (IndexValue <= 0) IndexValue = options.length
            updateIndexFunction(IndexValue-1);
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (IndexValue != -1) {
                updateValueFunction(true, options[IndexValue]);
            }
        }
    }

    function filterSectionOptions() {
        if (sectionPhrase === '') return sectionOptions;
        let phraseList = sectionPhrase.replace(/[^A-Za-z0-9]/g, " ").replace(/\s+/g, " ").trim().split(" ")
        let res: SectionInterface[] = []
        sectionOptions.forEach(section => {
            for (let i = 0; i < phraseList.length; ++i) {
                const phrase = phraseList[i];
                if (String(section.class_number).includes(phrase)) {
                    res.push(section)
                    return;
                } else if (section.section_name.includes(phrase)) {
                    res.push(section)
                    return;
                }
            }
        })
        return res;
    }

    filterSectionOptions()
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
                <p className="text-sm text-center mb-5">Just choose one/or more options and fill it out</p>
                <label className="block text-lg">
                    Search:
                    <div className="relative">
                        <input
                            className="border-1 rounded-sm  block w-full py-2 px-1 pr-2 focus:outline-none focus:shadow-2xs focus:shadow-dark-green duration-75"
                            value={`${searchPhrase.code.toUpperCase()}${searchPhrase.code == "" ? "" : " - "}${searchPhrase.name}`}
                            onChange={(e) => updateSearchPhrase(false, { name: e.currentTarget.value, code: "", course_id: -1 })}
                            onKeyDown={(e)=>handleKeyDown<OptionsInterface>(e, searchOptions, setSearchHighlitedIndex, searchHighlitedIndex, updateSearchPhrase)}
                            />
                    </div>
                    {!closeSearchOptions &&
                        <DropDown2<OptionsInterface>
                            optionList={searchOptions}
                            hoverFunction={(o) => `${o.code.toUpperCase()}-${o.name}`}
                            valueFunction={(o) => `${o.code.toUpperCase()} ${o.name}`}
                            updateFunction={updateSearchPhrase}
                            highlitedIndex={searchHighlitedIndex}
                            setHighlitedIndex={setSearchHighlitedIndex}
                        />
                    }
                </label>
                <label className="block text-lg mt-4">
                    Class Number: <IoIosInformationCircleOutline className="inline-block cursor-pointer" />
                    <div className="relative">
                        <input
                            className="border-1 rounded-sm  block w-full py-2 pl-1 pr-2 focus:outline-none focus:shadow-2xs focus:shadow-dark-green duration-75"
                            onFocus={fetchIds}
                            value={sectionPhrase}
                            onChange={(e) => updateChosenSection(false, e.currentTarget.value)}
                            onKeyDown={(e)=>handleKeyDown<SectionInterface>(e, filterSectionOptions(), setSectionHighlitedIndex, sectionHighlitedIndex, updateChosenSection)}
                        />
                    </div>
                    {!closeSection &&
                        <DropDown2<SectionInterface>
                            optionList={filterSectionOptions()}
                            hover={false}
                            hoverFunction={(o) => `${o.class_number}-${o.section_name}`}
                            valueFunction={(o) => `${o.class_number} ${o.section_name}`}
                            updateFunction={updateChosenSection}
                            highlitedIndex={sectionHighlitedIndex}
                            setHighlitedIndex={setSectionHighlitedIndex}
                        />}
                </label>
                <RightSide className="mb-4">
                    <button className="border-1 px-8 py-1 text-base mt-5 rounded-md cursor-pointer bg-dark-green text-light-green">Add</button>
                </RightSide>
            </div>
        </div>
    )
}
