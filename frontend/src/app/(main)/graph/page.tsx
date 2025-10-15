'use client';
import { useEffect, useRef, useState } from 'react';
import { IoSwapHorizontalOutline } from 'react-icons/io5';
import { LuCheckCheck, LuImport, LuMinus, LuPlus, LuShare } from 'react-icons/lu';

import AddACourse from '@/components/Courses/AddACourse';
import BatchAddCourses from '@/components/Courses/BatchAddCourses';
import CourseInfoPage from '@/components/Courses/CourseInfoPage';
import DeleteCourse from '@/components/Courses/DeleteCourse';
import Graph from '@/components/graph/Graph';
import Lines from '@/components/graph/Lines';
import {
  ClassLocations,
  CourseInformation,
  GQLCoursePreReq,
  Pair,
  termIdInterface,
} from '@/components/interface';
import ExpandPanel from '@/components/utils/ExpandPanel';
import PanZoomCanvas from '@/components/utils/PanZoomCanvas';
import { generateConnectionLines, preReq } from '@/components/utils/preReqUtils';
import { getCurrentTermId, getTermDistance } from '@/components/utils/termUtils';

function ControlPanel({ setOverlay }: { setOverlay: (arg0: overlayInterface) => void }) {
  return (
    <div className="text-light-green px-3 py-2 flex flex-col items-start text-sm gap-1">
      <button className="cursor-pointer" onClick={() => setOverlay('add_single')}>
        <LuPlus className="inline-block" /> Add a course
      </button>
      <button className="cursor-pointer" onClick={() => setOverlay('add_batch')}>
        <LuImport className="inline-block mr-0.2" /> Import a Semester
      </button>
      <button className="cursor-pointer">
        <IoSwapHorizontalOutline className="inline-block" /> Reorder semesters
      </button>
      <button className="cursor-pointer">
        <LuCheckCheck className="inline-block mr-1" />
        Checklists
      </button>
      <button className="cursor-pointer">
        <LuMinus className="inline-block" /> Remove Prereqs
      </button>
      <button className="cursor-pointer">
        <LuShare className="inline-block mr-1" />
        Export
      </button>
    </div>
  );
}

function ClassPanel() {
  return <div className="">Hi</div>;
}

type overlayInterface = 'none' | 'add_single' | 'add_batch' | 'delete_indiv' | 'course_info';

export default function GraphPage() {
  const [overlay, setOverlay] = useState<overlayInterface>('none');
  const [connections, setConnections] = useState<[Pair, Pair][]>([]);
  const [overlayedCourseInfo, setOverlayedCourseInfo] = useState<CourseInformation | undefined>(
    undefined,
  );
  const gqlCourseSections = useRef<GQLCoursePreReq[] | null>(null);

  const [_, setVersion] = useState<number>(0); // version for locations and GQLCoursePreReq
  const [update, setUpdate] = useState<number>(0); // update for the graph's courses
  const [updatePanRef, setUpdatePanRef] = useState<boolean>(true); // update Pan

  const pathRef = useRef<termIdInterface[]>([]);
  const locations = useRef<ClassLocations>(new Map());

  function updateCourse() {
    setOverlay('none');
    setUpdate((prev) => prev + 1);
  }

  useEffect(() => {
    if (!gqlCourseSections.current || !locations.current.size) return;
    setConnections(generateConnectionLines(preReq(gqlCourseSections.current), locations.current));
  }, [gqlCourseSections.current]);

  function getOverLay() {
    const closeFn = () => setOverlay('none');

    switch (overlay) {
      case 'add_single':
        return (
          <AddACourse close={closeFn} updatePage={updateCourse} termOptions={pathRef.current} />
        );
      case 'add_batch':
        return (
          <BatchAddCourses
            close={closeFn}
            updatePage={updateCourse}
            termOptions={pathRef.current.filter(
              (term) => getTermDistance(term.value, getCurrentTermId()) < 2,
            )}
          />
        );
      case 'delete_indiv':
        return (
          overlayedCourseInfo && (
            <DeleteCourse
              courseInfo={overlayedCourseInfo}
              close={closeFn}
              updatePage={updateCourse}
            />
          )
        );
      case 'course_info':
        return (
          overlayedCourseInfo && <CourseInfoPage close={closeFn} courseInfo={overlayedCourseInfo} />
        );
      default:
        return null;
    }
  }

  return (
    <section>
      {overlay != 'none' && (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-light-green/40 z-1 flex justify-center items-center">
          {getOverLay()}
        </div>
      )}
      <PanZoomCanvas updatePan={updatePanRef}>
        <>
          <Graph
            pathRef={pathRef}
            getUpdated={update}
            updatePan={() => setUpdatePanRef(false)}
            locations={locations}
            updatePreReqs={() => {
              setVersion((v) => v + 1);
            }}
            deleteCourse={(courseInfo) => {
              setOverlayedCourseInfo(courseInfo);
              setOverlay('delete_indiv');
            }}
            setCourseInformations={(courseInfo) => {
              gqlCourseSections.current = courseInfo;
              setVersion((v) => v + 1);
            }}
            viewCourse={(ci) => {
              setOverlayedCourseInfo(ci);
              setOverlay('course_info');
            }}
          />
          {/* {connections.map(([start,end],i)=>(
                        <div key={i}>
                            <div className="aspect-square w-2 z-20 rounded-full bg-amber-900 absolute" style={{left:start.x,top:start.y}}/>
                            <div className="aspect-square w-2 z-20 rounded-full bg-amber-900 absolute" style={{left:end.x,top:end.y}}/>
                        </div>
                    ))} */}
          <Lines connections={connections} />
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
