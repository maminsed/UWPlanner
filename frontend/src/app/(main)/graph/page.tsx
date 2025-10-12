'use client'
import Graph from "@/components/graph/Graph";
import PanZoomCanvas from "@/components/utils/PanZoomCanvas";
import ExpandPanel from '@/components/utils/ExpandPanel'
import { IoSwapHorizontalOutline } from "react-icons/io5";
import { LuCheckCheck, LuImport, LuMinus, LuPlus, LuShare } from "react-icons/lu";
import { useRef, useState } from "react";
import AddACourse from "@/components/AddingCourses/AddACourse";
import { termIdInterface } from "@/components/interface";

function ControlPanel({setOverlay}:{setOverlay:(arg0:overlayInterface)=>void}) {
    
    return (
        <div className="text-light-green px-3 py-2 flex flex-col items-start text-sm gap-1">
            <button className="cursor-pointer" onClick={()=>setOverlay('add_single')}><LuPlus className="inline-block" /> Add a course</button>
            <button className="cursor-pointer"><LuImport className="inline-block mr-0.2" /> Import a Semester</button>
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

type overlayInterface = 'none'|'add_single'|'add_batch'

export default function GraphPage() {
    const [overlay,setOverlay] = useState<overlayInterface>('none');
    const pathRef= useRef<termIdInterface[]>([])

    return (
        <section>
            {overlay != 'none' &&
            <div className="fixed top-0 left-0 right-0 bottom-0 bg-light-green/40 z-1">
                <AddACourse 
                    close={()=>setOverlay('none')} 
                    updatePage={()=>setOverlay('none')}
                    termOptions={pathRef.current}
                />    
            </div>}
            <PanZoomCanvas>
                <Graph pathRef={pathRef}/>
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
