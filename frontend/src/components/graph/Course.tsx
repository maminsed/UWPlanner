'use client';
import { clsx } from 'clsx';
import { useLayoutEffect, useRef } from 'react';
import { LuEye, LuEyeOff, LuMoveDiagonal, LuTrash2 } from 'react-icons/lu';

import { GetReqIcon } from '../Courses/utils';
import HoverEffect from '../HoverEffect';

import { AllCourseInformation } from './CourseClass';
import { useCourseCtx } from './CourseCtx';

type CourseInterface = {
  courseId: number;
  termId: number;
  allCourses: AllCourseInformation;
};

export default function Course({ courseId, termId, allCourses }: CourseInterface) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { viewCourse, deleteCourse, updateLocation } = useCourseCtx();

  useLayoutEffect(() => {
    const item = ref.current;
    if (!item) return;
    const update = () => {
      allCourses.setLocation(
        {
          left: item!.offsetLeft,
          top: item!.offsetTop,
          width: item!.offsetWidth,
          height: item!.offsetHeight,
        },
        courseId,
        termId,
      );
    };
    update();
    const ro = new ResizeObserver(update);
    // const id = setTimeout(update, 100);

    ro.observe(item);
    return () => {
      ro.disconnect();
      // clearTimeout(id);
    };
  }, [updateLocation]);

  const courseInfo = allCourses.getCourseInfoId(courseId)!;
  const termInfo = courseInfo.termInfo.get(termId)!;
  let hoverMessage = '';
  if (termInfo.allReqsMet === undefined || termInfo.termCompatible === undefined) {
    hoverMessage = 'Loading';
  } else if (!termInfo.allReqsMet) hoverMessage = 'Reqs not met';
  else if (!termInfo.termCompatible) hoverMessage = 'term not compatible';
  else hoverMessage = 'Reqs met';

  return (
    <div
      ref={ref}
      className={clsx('rounded-r-xl text-dark-green', !termInfo.visible ? 'opacity-40' : '')}
      style={{
        backgroundColor: courseInfo.bgColour,
        color: courseInfo.textColour,
      }}
    >
      <div className="w-full h-full flex items-center relative">
        <div className="h-full w-2" style={{ background: courseInfo.textColour }} />
        <div className="flex flex-col justify-between h-full py-1 pl-1">
          <LuMoveDiagonal
            onClick={() => viewCourse(courseId, termId)}
            className="h-auto w-[0.9rem] hover:text-teal-950 cursor-pointer duration-150"
          />
          <LuTrash2
            onClick={() => deleteCourse({ courseId, termId })}
            className="h-auto w-[0.9rem] text-red-950 hover:text-red-700 cursor-pointer duration-150"
          />
        </div>
        <span className="py-5 px-1 min-w-25" style={{ color: courseInfo.textColour }}>
          {courseInfo.code.toUpperCase()}
        </span>
        {termInfo.visible ? (
          <LuEye
            onClick={() => allCourses.setVisibility(courseId, termId, false)}
            className="h-auto w-[0.9rem] absolute top-1 right-2 hover:text-teal-950 cursor-pointer duration-150"
          />
        ) : (
          <LuEyeOff
            onClick={() => allCourses.setVisibility(courseId, termId, true)}
            className="h-auto w-[0.9rem] absolute top-1 right-2 hover:text-teal-950 cursor-pointer duration-150"
          />
        )}
        <div className="absolute bottom-0 right-1 cursor-default">
          <HoverEffect hoverStyle={{ minWidth: '4.5rem' }} hover={hoverMessage}>
            <GetReqIcon termCompatible={termInfo.termCompatible} reqsMet={termInfo.allReqsMet} />
          </HoverEffect>
        </div>
        <div className="mr-2 border-1 rounded-full h-1.5 aspect-square" />
      </div>
    </div>
  );
}
