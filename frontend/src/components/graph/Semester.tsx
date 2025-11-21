'use client';
import clsx from 'clsx';
import { useState } from 'react';
import { LuArrowLeft, LuSettings, LuArrowRight, LuCirclePlus, LuDelete } from 'react-icons/lu';

import HoverEffect from '../HoverEffect';
import { getCurrentTermId, getTermDistance, termOperation } from '../utils/termUtils';

import Course from './Course';
import { AllCourseInformation } from './CourseClass';
import { useCourseCtx } from './CourseCtx';

type SemesterInterface = {
  termId: number;
  allCourses: AllCourseInformation;
  canSwapRight: boolean;
  canSwapLeft: boolean;
};

export default function Semester({
  termId,
  allCourses,
  canSwapRight,
  canSwapLeft,
}: SemesterInterface) {
  const [settingOpen, setSettingOpen] = useState<boolean>(false);
  const term = allCourses.getTermsInfo({ termId: termId })!;
  const { deleteCourse, addToTerm } = useCourseCtx();
  const distanceToStart = getTermDistance(allCourses.startingTermId, termId);

  // TODO: add a delete and + button at the buttom of each semester
  return (
    <div
      className="flex flex-col text-xl items-center group"
      onMouseLeave={() => setSettingOpen(false)}
      style={{ gap: `${20 * 1.4 * allCourses.scale}px` }}
    >
      <div
        className={clsx(
          'px-6 py-2 rounded-3xl bg-white shadow-xs w-full font-semibold text-center text-lg whitespace-nowrap',
          termId == getCurrentTermId() && 'ring ring-dark-green',
          distanceToStart % 2 == 0 ? '' : 'mb-5',
        )}
      >
        {term.termName} - {term.termSeason}
      </div>
      {term.courseIds.map((courseId, i) => (
        <Course key={i} courseId={courseId} termId={termId} allCourses={allCourses} />
      ))}
      <div className="flex flex-col items-center gap-2 opacity-5 group-hover:opacity-100 transition-opacity duration-500">
        <LuSettings
          className="w-7 h-auto aspect-square backdrop-blur-md hover:animate-spin hover:[animation-iteration-count:1] bg-sky-300/30 cursor-pointer rounded-full p-[0.6rem] box-content"
          onClick={() => setSettingOpen(!settingOpen)}
        />
        <div
          className={clsx(
            'bg-sky-300/30 rounded-md flex gap-1 px-2 transition-all items-stretch align-middle',
            settingOpen ? 'max-h-30' : 'max-h-0 overflow-clip',
          )}
        >
          {canSwapRight ? (
            <button
              className="cursor-pointer h-fit"
              onClick={async () => await allCourses.swapSemesters(termId, termOperation(termId, 1))}
            >
              <HoverEffect hover="Swap Right">
                <LuArrowRight className="inline-block w-5 hover:text-teal-500 duration-300 h-auto" />
              </HoverEffect>
              {/* Swap Right */}
            </button>
          ) : (
            ''
          )}
          {canSwapLeft ? (
            <button
              className="cursor-pointer h-fit"
              onClick={async () =>
                await allCourses.swapSemesters(termId, termOperation(termId, -1))
              }
            >
              <HoverEffect hover="Swap Left">
                <LuArrowLeft className="inline-block w-5 hover:text-teal-500 duration-300 h-auto" />
              </HoverEffect>
              {/* Swap Left */}
            </button>
          ) : (
            ''
          )}
          <button
            onClick={() =>
              deleteCourse({
                groupOfCourses: term.courseIds.map((courseId) => ({ courseId, termId })),
              })
            }
            className="cursor-pointer h-fit"
          >
            <HoverEffect hover="Delete Courses">
              <LuDelete className="inline-block w-5 hover:text-teal-500 duration-300 h-auto" />
            </HoverEffect>
            {/* Delete All */}
          </button>
          <button onClick={() => addToTerm(termId)} className="cursor-pointer h-fit">
            <HoverEffect hover="Add a course">
              <LuCirclePlus className="inline-block w-5 hover:text-teal-500 duration-300 h-auto ml-[0.01rem]" />
            </HoverEffect>
            {/* Add */}
          </button>
        </div>
      </div>
    </div>
  );
}
