'use client';
import { RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { IoSwapHorizontalOutline } from 'react-icons/io5';
import { LuCheckCheck, LuImport, LuMinus, LuPlus, LuRefreshCcw, LuShare } from 'react-icons/lu';

import AddACourse from '@/components/Courses/AddACourse';
import BatchAddCourses from '@/components/Courses/BatchAddCourses';
import CourseInfoPage from '@/components/Courses/CourseInfoPage';
import DeleteCourse from '@/components/Courses/DeleteCourse';
import { CourseContext } from '@/components/graph/CourseCtx';
import Graph from '@/components/graph/Graph';
import Lines from '@/components/graph/Lines';
import {
  ClassLocations,
  CourseInformation,
  GQLCoursePreReq,
  LineType,
  Location,
  termIdInterface,
} from '@/components/interface';
import ExpandPanel from '@/components/utils/ExpandPanel';
import PanZoomCanvas from '@/components/utils/PanZoomCanvas';
import { generateConnectionLines, preReq } from '@/components/utils/preReqUtils';
import { getCurrentTermId, getTermDistance } from '@/components/utils/termUtils';

function ControlPanel({
  setOverlay,
  preReq,
  reloadCourses,
}: {
  setOverlay: (arg0: overlayInterface) => void;
  preReq: { isHidden: boolean; changeSatus: () => void };
  reloadCourses: () => void;
}) {
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
      <button className="cursor-pointer" onClick={preReq.changeSatus}>
        <LuMinus className="inline-block" /> {preReq.isHidden ? 'Show' : 'Hide'} Prereqs
      </button>
      <button className="cursor-pointer" onClick={reloadCourses}>
        <LuRefreshCcw className="inline-block mr-1" />
        Reload Courses
      </button>
      <button className="cursor-pointer">
        <LuShare className="inline-block mr-1" />
        Export
      </button>
    </div>
  );
}

type ClassPanelInterface = {
  isHiddenMap: RefObject<Map<number, Map<number, boolean>>>;
  updateHiddenMap: (courseIds: number[], value: boolean) => void;
  courseDict: Map<number, string>;
  classPanelUpdate: number; //for the useEffect
};

function ClassPanel({
  isHiddenMap,
  updateHiddenMap,
  courseDict,
  classPanelUpdate,
}: ClassPanelInterface) {
  const internalIsHiddenMap = useMemo(() => {
    const newVal = new Map<string, [number[], boolean]>();
    const all: [number[], boolean] = [[], true];
    Array.from(isHiddenMap.current.entries()).forEach(([courseId, termMap]) => {
      const code = courseDict.get(courseId) || '';
      const firstNonLetter = code.search(/[^a-zA-Z]/);
      const striped = firstNonLetter === -1 ? code : code.slice(0, firstNonLetter);

      if (!newVal.has(striped)) newVal.set(striped, [[], true]);

      const cgHidden = newVal.get(striped)!;
      cgHidden[0].push(courseId);

      Array.from(termMap.entries()).forEach(([_, value]) => {
        cgHidden[1] = cgHidden[1] && value;
      });
      all[0].push(courseId);
      all[1] = all[1] && cgHidden[1];
    });
    newVal.set('all', all);
    return newVal;
  }, [classPanelUpdate]);

  return (
    <div className="py-1">
      {Array.from(internalIsHiddenMap.entries()).map(([cg, [courseIds, value]]) => (
        <label key={cg} className="flex gap-1 items-center pl-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!value}
            className="rounded-full accent-green-500"
            onChange={() => updateHiddenMap(courseIds, !value)}
          />
          {cg.toUpperCase()}
        </label>
      ))}
    </div>
  );
}

function isLocEqual(loc1: Location | undefined, loc2: Location) {
  if (!loc1) return false;
  return (
    loc1.height === loc2.height &&
    loc1.left === loc2.left &&
    loc1.top === loc2.top &&
    loc1.width === loc1.width
  );
}

type overlayInterface = 'none' | 'add_single' | 'add_batch' | 'delete_indiv' | 'course_info';

export default function GraphPage() {
  // TODO: add at the top left corner + - and reload (for prereqs) buttons
  //       the user can choose which course prereqs to see
  const [overlay, setOverlay] = useState<overlayInterface>('none');
  const [showPreReq, setShowPreReq] = useState<boolean>(true);
  const [connections, setConnections] = useState<LineType[]>([]);
  const [courseDict, setCourseDict] = useState<Map<number, string>>(new Map());
  const colourMap = useRef<Map<string, { bg: string; text: string }>>(new Map()); // map for course colours
  const gqlCourseSections = useRef<GQLCoursePreReq[] | null>(null);

  const [overlayedCourseInfo, setOverlayedCourseInfo] = useState<CourseInformation | undefined>(
    undefined,
  );
  const courseHiddenStatus = useRef<Map<number, Map<number, boolean>>>(new Map()); // courseId: termId: boolean
  const [classPanelVersion, setClassPanelVersion] = useState<number>(0);

  const [_1, setVersion] = useState<number>(0); // version for locations and GQLCoursePreReq
  const [update, setUpdate] = useState<number>(0); // update for the graph's courses
  const [updatePanRef, setUpdatePanRef] = useState<boolean>(true); // update Pan
  const [updateLocation, setUpdateLocation] = useState<number>(0);

  const pathRef = useRef<termIdInterface[]>([]);
  const locations = useRef<ClassLocations>(new Map()); // courseId: termId: Location

  function updateCourse() {
    setOverlay('none');
    setUpdate((v) => v + 1);
  }

  useEffect(() => {
    // If there are no course sections or no locations, exit early
    if (!gqlCourseSections.current || !locations.current.size) return;

    // Generate connection lines for prerequisites and update the connections state
    setConnections(
      generateConnectionLines(preReq(gqlCourseSections.current, courseDict), locations.current),
    );

    // Clear the current hidden status map for courses
    const newCourseHiddenStatus: Map<number, Map<number, boolean>> = new Map();
    gqlCourseSections.current.forEach(({ id: courseId }) => {
      newCourseHiddenStatus.set(courseId, new Map());
    });
    newCourseHiddenStatus.forEach((currentValues, courseId) => {
      locations.current.get(courseId)!.forEach((_, termId) => {
        if (!courseHiddenStatus.current.get(courseId)?.has(termId)) {
          currentValues.set(termId, false);
        } else {
          currentValues.set(termId, courseHiddenStatus.current.get(courseId)!.get(termId)!);
        }
      });
      newCourseHiddenStatus.set(courseId, currentValues);
    });
    courseHiddenStatus.current = newCourseHiddenStatus;
    setClassPanelVersion((v) => v + 1);
    setUpdateLocation((v) => v + 1);
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
          overlayedCourseInfo &&
          gqlCourseSections.current && (
            <CourseInfoPage
              close={closeFn}
              courseInfo={{
                ...overlayedCourseInfo,
                ...gqlCourseSections.current.find((sec) => sec.id == overlayedCourseInfo.courseId)!,
              }}
            />
          )
        );
      default:
        return undefined;
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
        <CourseContext.Provider
          value={{
            courseDict,
            colourMap,
            isHidden: (termId, courseId) =>
              courseHiddenStatus.current.get(courseId)?.get(termId) || false,

            updateLocation: updateLocation,
            deleteCourse: (courseInfo) => {
              setOverlayedCourseInfo(courseInfo);
              setOverlay('delete_indiv');
            },
            viewCourse: (courseInfo) => {
              setOverlayedCourseInfo(courseInfo);
              setOverlay('course_info');
            },
            setIsHidden: (termId, courseId, value) => {
              if (!courseHiddenStatus.current.has(courseId)) {
                courseHiddenStatus.current.set(courseId, new Map());
              }
              const course = courseHiddenStatus.current.get(courseId)!;
              if (!course.has(courseId)) course.set(termId, value);
              setClassPanelVersion((v) => v + 1);
            },
            setCourseDict,
            setLocation: (loc, termId, courseId) => {
              const newLocs = locations.current;
              if (!newLocs.has(courseId)) {
                newLocs.set(courseId, new Map());
              }
              const course = newLocs.get(courseId)!;
              if (!isLocEqual(course.get(termId), loc)) {
                course.set(termId, loc);
                setVersion((v) => v + 1);
              }
            },
          }}
        >
          <Graph
            pathRef={pathRef}
            getUpdated={update}
            updatePan={() => setUpdatePanRef(false)}
            setCourseInformations={(courseInfo) => {
              gqlCourseSections.current = courseInfo;
              setVersion((v) => v + 1);
            }}
            setCourseDict={setCourseDict}
          />
          {showPreReq ? (
            /* {connections.map(([start,end],i)=>(
                <div key={i}>
                    <div className="aspect-square w-2 z-20 rounded-full bg-amber-900 absolute" style={{left:start.x,top:start.y}}/>
                    <div className="aspect-square w-2 z-20 rounded-full bg-amber-900 absolute" style={{left:end.x,top:end.y}}/>
                </div>
            ))} */
            <Lines connections={connections} hiddenStatus={courseHiddenStatus.current} />
          ) : (
            ''
          )}
        </CourseContext.Provider>
      </PanZoomCanvas>
      <div className="fixed left-6 bottom-5">
        <ExpandPanel>
          <ControlPanel
            setOverlay={setOverlay}
            preReq={{
              isHidden: !showPreReq,
              changeSatus: () => setShowPreReq((v) => !v),
            }}
            reloadCourses={() => {
              setUpdate((v) => v + 1);
            }}
          />
        </ExpandPanel>
      </div>
      <div className="fixed right-6 bottom-5">
        <ExpandPanel>
          <ClassPanel
            isHiddenMap={courseHiddenStatus}
            updateHiddenMap={(courseIds, value) => {
              courseIds.forEach((courseId) => {
                const course = courseHiddenStatus.current.get(courseId)!;
                course.forEach((_, termId) => {
                  course.set(termId, value);
                });
              });
              setClassPanelVersion((v) => v + 1);
            }}
            courseDict={courseDict}
            classPanelUpdate={classPanelVersion}
          />
        </ExpandPanel>
      </div>
    </section>
  );
}
