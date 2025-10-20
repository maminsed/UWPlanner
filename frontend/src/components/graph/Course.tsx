'use client';
import { clsx } from 'clsx';
import { useLayoutEffect, useRef } from 'react';
import { LuEye, LuEyeOff, LuMoveDiagonal, LuTrash2 } from 'react-icons/lu';

import { CourseInformation } from '../interface';

import { useCourseCtx } from './CourseCtx';

type CourseInterface = {
  courseId: number;
  termId: number;
};

export default function Course({ courseId, termId }: CourseInterface) {
  const ref = useRef<HTMLDivElement | null>(null);
  const {
    setLocation,
    isHidden,
    setIsHidden,
    viewCourse,
    deleteCourse,
    courseDict,
    updateLocation,
  } = useCourseCtx();

  useLayoutEffect(() => {
    const item = ref.current;
    if (!item) return;
    const update = () => {
      console.log('HI');
      setLocation(
        {
          left: item!.offsetLeft,
          top: item!.offsetTop,
          width: item!.offsetWidth,
          height: item!.offsetHeight,
        },
        termId,
        courseId,
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

  const hiddenStat = isHidden(termId, courseId);
  const courseName = courseDict.get(courseId) || '';
  const courseInfo: CourseInformation = { courseId, termId, courseName };
  return (
    <div
      ref={ref}
      className={clsx(
        'rounded-r-xl bg-[#8AD5DF]/70 text-dark-green',
        hiddenStat ? 'opacity-40' : '',
      )}
    >
      <div className="w-full h-full flex items-center relative">
        <div className="bg-dark-green h-full w-2" />
        <div className="flex flex-col justify-between h-full py-1 pl-1">
          <LuMoveDiagonal
            onClick={() => viewCourse(courseInfo)}
            className="h-auto w-[0.9rem] hover:text-teal-950 cursor-pointer duration-150"
          />
          <LuTrash2
            onClick={() => deleteCourse(courseInfo)}
            className="h-auto w-[0.9rem] text-red-950 hover:text-red-700 cursor-pointer duration-150"
          />
        </div>
        <span className="py-5 px-1 min-w-25">{courseName.toUpperCase()}</span>
        {!hiddenStat ? (
          <LuEye
            onClick={() => setIsHidden(termId, courseId, true)}
            className="h-auto w-[0.9rem] absolute top-1 right-2 hover:text-teal-950 cursor-pointer duration-150"
          />
        ) : (
          <LuEyeOff
            onClick={() => setIsHidden(termId, courseId, false)}
            className="h-auto w-[0.9rem] absolute top-1 right-2 hover:text-teal-950 cursor-pointer duration-150"
          />
        )}
        <div className="mr-2 border-1 rounded-full h-1.5 aspect-square" />
      </div>
    </div>
  );
}
