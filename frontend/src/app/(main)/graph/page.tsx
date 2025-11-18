'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { IoSwapHorizontalOutline } from 'react-icons/io5';
import { LuCheckCheck, LuImport, LuMinus, LuPlus, LuRefreshCcw, LuShare } from 'react-icons/lu';

import AddACourse from '@/components/Courses/AddACourse';
import BatchAddCourses from '@/components/Courses/BatchAddCourses';
import CourseInfoPage from '@/components/Courses/CourseInfoPage';
import DeleteCourse from '@/components/Courses/DeleteCourse';
import { AllCourseInformation } from '@/components/graph/CourseClass';
import { CourseContext } from '@/components/graph/CourseCtx';
import Graph from '@/components/graph/Graph';
import Lines from '@/components/graph/Lines';
import ExpandPanel from '@/components/utils/ExpandPanel';
import PanZoomCanvas from '@/components/utils/PanZoomCanvas';
import { useApi } from '@/lib/useApi';
import useGQL from '@/lib/useGQL';

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
      <button
        className="cursor-pointer"
        onClick={() =>
          setOverlay({ overlayType: 'add_single', overlayCourseId: 0, overlayTermId: 0 })
        }
      >
        <LuPlus className="inline-block" /> Add a course
      </button>
      <button
        className="cursor-pointer"
        onClick={() =>
          setOverlay({ overlayType: 'add_batch', overlayCourseId: 0, overlayTermId: 0 })
        }
      >
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
  allCourses: AllCourseInformation;
  updateClassPanelCourses: number;
};

function ClassPanel({ allCourses, updateClassPanelCourses }: ClassPanelInterface) {
  const internalVisbilityMap = useMemo(() => {
    const newMap = new Map<string, [number[], boolean]>(); // Map<CS, [courseIds,isHidden]>
    const all: [number[], boolean] = [[], true];
    allCourses.courseInfoMap.values().forEach(({ code, id: courseId, termInfo }) => {
      const firstNonLetter = code.search(/[^a-zA-Z]/);
      const striped = firstNonLetter === -1 ? code : code.slice(0, firstNonLetter);

      if (!newMap.has(striped)) newMap.set(striped, [[], true]);

      const cgHidden = newMap.get(striped)!;
      cgHidden[0].push(courseId);

      termInfo.values().forEach(({ visible }) => {
        cgHidden[1] = cgHidden[1] && visible;
      });
      all[0].push(courseId);
      all[1] = all[1] && cgHidden[1];
    });
    newMap.set('all', all);
    return newMap;
  }, [updateClassPanelCourses]);

  return (
    <div className="py-1">
      {Array.from(internalVisbilityMap.entries()).map(([cg, [courseIds, value]]) => (
        <label key={cg} className="flex gap-1 items-center pl-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value}
            className="rounded-full accent-green-500"
            onChange={() => allCourses.setVisibilityGrouped(courseIds, !value)}
          />
          {cg.toUpperCase()}
        </label>
      ))}
    </div>
  );
}

type overlayInterface = {
  overlayType: 'none' | 'add_single' | 'add_batch' | 'delete_indiv' | 'course_info';
  overlayCourseId: number;
  overlayTermId: number;
  groupOfCourses?: {
    termId: number;
    courseId: number;
  }[];
};

export default function GraphPage() {
  // TODO: add the swaping functionality
  //       add at the top left corner + - and reload (for prereqs) buttons
  //       the user can choose which course prereqs to see
  //       add a report issue button
  //       add the option to increase the distance between courses
  //       add the option to reorder classes
  //       add the checks for program
  // settings:
  const [showPreReq, setShowPreReq] = useState<boolean>(true);
  //versions
  const [coruseVisibilityVersion, setCoruseVisibilityVersion] = useState<number>(0);
  const [courseLocationsVersion, setCourseLocationsVersion] = useState<number>(0);
  //Maybe courseConnectionsVersion?
  const [panRefVersion, setPanRefVersion] = useState<boolean>(true);
  //hooks:
  const gql = useGQL();
  const backend = useApi();

  const [overlay, setOverlayRaw] = useState<overlayInterface>({
    overlayType: 'none',
    overlayCourseId: 0,
    overlayTermId: 0,
  });
  const setOverlay = (val: overlayInterface) => {
    closeAllPanles();
    setOverlayRaw(val);
  };
  const [status, setStatus] = useState<'Loading' | 'idle'>('Loading');
  const expandPanelsCloseFns = useRef<(() => void)[]>([]);

  const allCourses = useRef(
    new AllCourseInformation(
      () => setCoruseVisibilityVersion((v) => v + 1),
      () => setCourseLocationsVersion((v) => v + 1),
      () => setPanRefVersion(false),
      gql,
      backend,
    ),
  );

  function closeAllPanles() {
    expandPanelsCloseFns.current.forEach((closeFn) => closeFn());
  }
  const closeFn = () => {
    setOverlay({ overlayType: 'none', overlayCourseId: 0, overlayTermId: 0 });
  };
  function updateCourse() {
    closeFn();
    //TODO: do something about the efficiency of this
    reloadCourses();
  }

  useEffect(() => {
    async function initialize() {
      await allCourses.current.init();
      // Generate connection lines for prerequisites and update the connections state
      setStatus('idle');
      //TODO: remove
      await new Promise((resolve) =>
        setTimeout(() => {
          resolve(0);
        }, 200),
      );
      await allCourses.current.generateConnectionLines();
    }
    initialize();
  }, []);

  function getOverLay() {
    const termOptions = allCourses.current.getPath().map((termInfo) => ({
      value: termInfo.termId,
      display: `${termInfo.termName} - ${termInfo.termSeason}`,
    }));
    switch (overlay.overlayType) {
      case 'add_single':
        return (
          <AddACourse
            close={closeFn}
            updatePage={updateCourse}
            termId={overlay.overlayTermId > 10 ? overlay.overlayTermId : undefined}
            termOptions={termOptions}
          />
        );
      case 'add_batch':
        return (
          <BatchAddCourses close={closeFn} updatePage={updateCourse} termOptions={termOptions} />
        );
      case 'delete_indiv':
        return (
          <DeleteCourse
            courses={
              overlay.groupOfCourses
                ? overlay.groupOfCourses
                : [
                    {
                      courseId: overlay.overlayCourseId,
                      termId: overlay.overlayTermId,
                    },
                  ]
            }
            allCourses={allCourses.current}
            close={closeFn}
            updatePage={updateCourse}
          />
        );
      case 'course_info':
        return (
          <CourseInfoPage
            close={closeFn}
            allCourses={allCourses.current}
            courseId={overlay.overlayCourseId}
            termId={overlay.overlayTermId}
          />
        );
      default:
        return undefined;
    }
  }

  async function reloadCourses() {
    setStatus('Loading');
    await allCourses.current.updateAllCourses();
    setStatus('idle');
    //TODO: remove
    await new Promise((resolve) =>
      setTimeout(() => {
        resolve(0);
      }, 200),
    );
    await allCourses.current.generateConnectionLines();
  }

  return (
    <section>
      {overlay.overlayType != 'none' && (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-light-green/40 z-1 flex justify-center items-center">
          {getOverLay()}
        </div>
      )}
      <PanZoomCanvas updatePan={panRefVersion}>
        <CourseContext.Provider
          value={{
            updateLocation: courseLocationsVersion,
            deleteCourse: ({ courseId, termId, groupOfCourses }) => {
              setOverlay({
                overlayType: 'delete_indiv',
                overlayCourseId: courseId || 0,
                overlayTermId: termId || 0,
                groupOfCourses,
              });
            },
            addToTerm: (termId) => {
              setOverlay({
                overlayType: 'add_single',
                overlayCourseId: 0,
                overlayTermId: termId,
              });
            },
            viewCourse: (courseId, termId) => {
              setOverlay({
                overlayType: 'course_info',
                overlayCourseId: courseId,
                overlayTermId: termId,
              });
            },
          }}
        >
          {status !== 'Loading' && (
            <>
              <Graph allCourses={allCourses.current} />
              {showPreReq ? (
                <Lines
                  connections={allCourses.current.getConnectionLines()}
                  allCourses={allCourses.current}
                />
              ) : (
                ''
              )}
            </>
          )}
        </CourseContext.Provider>
      </PanZoomCanvas>
      <div className="fixed left-6 bottom-5">
        <ExpandPanel addCloseFunction={(fn) => expandPanelsCloseFns.current.push(fn)}>
          <ControlPanel
            setOverlay={setOverlay}
            preReq={{
              isHidden: !showPreReq,
              changeSatus: () => setShowPreReq((v) => !v),
            }}
            reloadCourses={reloadCourses}
          />
        </ExpandPanel>
      </div>
      <div className="fixed right-6 bottom-5">
        <ExpandPanel addCloseFunction={(fn) => expandPanelsCloseFns.current.push(fn)}>
          <ClassPanel
            allCourses={allCourses.current}
            updateClassPanelCourses={coruseVisibilityVersion}
          />
        </ExpandPanel>
      </div>
    </section>
  );
}
