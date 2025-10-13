'use client'
import Graph from "@/components/graph/Graph";
import PanZoomCanvas from "@/components/utils/PanZoomCanvas";
import ExpandPanel from '@/components/utils/ExpandPanel'
import { IoSwapHorizontalOutline } from "react-icons/io5";
import { LuCheckCheck, LuImport, LuMinus, LuPlus, LuShare } from "react-icons/lu";
import { useRef, useState } from "react";
import AddACourse from "@/components/AddingCourses/AddACourse";
import { Pair, termIdInterface } from "@/components/interface";
import BatchAddCourses from "@/components/AddingCourses/BatchAddCourses";
import { getCurrentTermId, getTermDistance } from "@/components/utils/termUtils";
import Lines from "@/components/graph/Lines";

function ControlPanel({ setOverlay }: { setOverlay: (arg0: overlayInterface) => void }) {

    return (
        <div className="text-light-green px-3 py-2 flex flex-col items-start text-sm gap-1">
            <button className="cursor-pointer" onClick={() => setOverlay('add_single')}><LuPlus className="inline-block" /> Add a course</button>
            <button className="cursor-pointer" onClick={() => setOverlay('add_batch')}><LuImport className="inline-block mr-0.2" /> Import a Semester</button>
            <button className="cursor-pointer"><IoSwapHorizontalOutline className="inline-block" /> Reorder semesters</button>
            <button className="cursor-pointer"><LuCheckCheck className="inline-block mr-1" />Checklists</button>
            <button className="cursor-pointer"><LuMinus className="inline-block" /> Remove Prereqs</button>
            <button className="cursor-pointer"><LuShare className="inline-block mr-1" />Export</button>
        </div>
    )
}

function ClassPanel() {
    return (
        <div className="">
            Hi
        </div>
    )
}

type overlayInterface = 'none' | 'add_single' | 'add_batch'


export default function GraphPage() {
    const [overlay, setOverlay] = useState<overlayInterface>('none');
    const pathRef = useRef<termIdInterface[]>([]);
    const [line,setLine] = useState<[Pair,Pair]>([{x:0,y:0},{x:0,y:0}])
    const [update,setUpdate] = useState<number>(0);
    const [updatePanRef,setUpdatePanRef] = useState<boolean>(true);

    function updateCourse() {
        setOverlay("none");
        setUpdate(prev=>prev+1)
    }

    function getOverLay() {
        switch (overlay){
            case 'add_single': return <AddACourse close={() => setOverlay('none')} updatePage={updateCourse} termOptions={pathRef.current} />
            case 'add_batch': return <BatchAddCourses close={() => setOverlay('none')} updatePage={updateCourse} termOptions={pathRef.current.filter(term=>getTermDistance(term.value,getCurrentTermId()) < 2)}/>
            default: return null
        }
    }

    return (
        <section>
            {overlay != 'none' &&
                <div className="fixed top-0 left-0 right-0 bottom-0 bg-light-green/40 z-1">
                    {getOverLay()}
                </div>
            }
            <PanZoomCanvas updatePan={updatePanRef}>
                <>
                    <Graph pathRef={pathRef} getUpdated={update} updatePan={()=>setUpdatePanRef(false)} setLine={setLine}/>
                    {line && <Lines start={line[0]} end={line[1]}/>}
                </>
            </PanZoomCanvas>
            <div className="fixed left-6 bottom-5">
                <ExpandPanel>
                    <ControlPanel setOverlay={setOverlay} />
                </ExpandPanel>
            </div>
            <div className="fixed right-6 bottom-5">
                <ExpandPanel>
                    <ClassPanel />
                </ExpandPanel>
            </div>
        </section>
    );
}
