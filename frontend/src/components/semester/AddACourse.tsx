'use client'
import { AiOutlineClose } from "react-icons/ai";
import HoverEffect from "../HoverEffect";
import { LuSearch } from "react-icons/lu";
import RightSide from "../utils/RightSide";
import { clsx } from "clsx";
import { useEffect, useState } from "react";
import useGQL from "@/lib/useGQL";

type OptionsInterface = {
    code: string;
    course_id: number;
    name: string;
}

function changeQuery(phrase: string): [number, string] {
    let onSpace = true;
    let count = 0
    let res = ""
    phrase = phrase.replace(/[*:&\(\)!]/g, "").trim()
    for(let i = 0; i < phrase.length; ++i) {
        if (phrase[i] == " ") {
            if (!onSpace) {
                res+=":* & "
            }
            onSpace = true;
        } else {
            if (onSpace) ++count;
            res+=phrase[i];
            onSpace = false;
        }
    }

    return [count, res+":* "]
}

export default function AddACourse({ className, close, updatePage, ...props }: React.HTMLAttributes<HTMLDivElement> & { close: () => void, updatePage: () => void }) {
    const [searchPhrase, setSearchPhrase] = useState<OptionsInterface>({ code: "", course_id: -1, name: "" });
    const [searchOptions, setSearchOptions] = useState<OptionsInterface[]>([])
    const [closeSearchOptions, setCloseSearchOptions] = useState<boolean>(true)
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
            const response1 = (await gql(GQL_QUERY, { queryValue: phrase, code_only: true, limit: 3})).data.search_courses;
            if (response1.length == 3) {
                setSearchOptions(response1)
            } else {
                console.log("not enough")
                const response2 = (await gql(GQL_QUERY, { queryValue: phrase, code_only: false, limit: 3})).data.search_courses;
                setSearchOptions(response2)
            }
        }

        fetchOptions()
    }, [searchPhrase])

    function updateSearchPhrase(closeSearchOptions:boolean, searchPhrase: OptionsInterface) {
        setCloseSearchOptions(closeSearchOptions);
        setSearchPhrase(searchPhrase);
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        const size = searchOptions.length
        if (size == 0) return ;
        if (e.key === "ArrowDown") {
            updateSearchPhrase(true, searchOptions[0]);
        } else if (e.key === "ArrowUp") {
            updateSearchPhrase(true, searchOptions[size -1]);
        }
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
                <p className="text-sm text-center mb-5">Just choose one/or more options and fill it out</p>
                <label className="block text-lg">
                    Search:
                    <div className="relative">
                        <input
                            className="border-1 rounded-sm  block w-full py-2 pl-1 pr-7 focus:outline-none focus:shadow-2xs focus:shadow-dark-green duration-75"
                            value={`${searchPhrase.code.toUpperCase()}${searchPhrase.code == "" ? "" : " - "}${searchPhrase.name}`}
                            onChange={(e) => updateSearchPhrase(false, { name: e.currentTarget.value, code: "", course_id: -1 })}
                            onKeyDown={handleKeyDown}
                        />
                        <LuSearch className="absolute top-0 right-1 h-full cursor-pointer w-6" />
                    </div>
                    {!closeSearchOptions &&
                        <div className="bg-teal-800 text-light-green px-1 py-1 rounded-sm mt-1">
                            {searchOptions.map((o, k) => (
                                <HoverEffect hover={`${o.code.toUpperCase()}-${o.name}`} key={k}>
                                    <div
                                        className="cursor-pointer hover:bg-teal-700 max-w-75 truncate"
                                        onClick={() => updateSearchPhrase(true, o)}
                                    >
                                        {o.code.toUpperCase()} {o.name}
                                    </div>
                                </HoverEffect>
                            )
                            )}
                            {searchOptions.length == 0 && 
                                <div className="cursor-pointer hover:bg-teal-700 max-w-75 truncate" > No results </div>
                            }
                        </div>}
                </label>
                <label className="block text-lg mt-4">
                    Id:
                    <div className="relative">
                        <input className="border-1 rounded-sm  block w-full py-2 pl-1 pr-7 focus:outline-none focus:shadow-2xs focus:shadow-dark-green duration-75" />
                        <LuSearch className="absolute top-0 right-1 h-full cursor-pointer w-6" />
                    </div>
                </label>
                <RightSide className="mb-4">
                    <button className="border-1 px-8 py-1 text-base mt-5 rounded-md cursor-pointer bg-dark-green text-light-green">Add</button>
                </RightSide>
            </div>
        </div>
    )
}
