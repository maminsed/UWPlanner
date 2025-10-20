'use client';
import { clsx } from 'clsx';
import { useLayoutEffect, useRef } from 'react';
import { LuEye, LuEyeOff, LuMoveDiagonal, LuTrash2 } from 'react-icons/lu';

import { CourseInformation } from '../interface';
import { generateRandomColours } from '../utils/colour';

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
    colourMap,
  } = useCourseCtx();

  useLayoutEffect(() => {
    const item = ref.current;
    if (!item) return;
    const update = () => {
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

  const firstNonLetter = courseName.search(/[^a-zA-Z]/);
  const striped = firstNonLetter === -1 ? courseName : courseName.slice(0, firstNonLetter);

  if (!colourMap.current.has(striped)) {
    colourMap.current.set(striped, generateRandomColours());
  }
  const bg = colourMap.current.get(striped)!.bg;
  const text = colourMap.current.get(striped)!.text;
  return (
    <div
      ref={ref}
      className={clsx('rounded-r-xl text-dark-green', hiddenStat ? 'opacity-40' : '')}
      style={{
        backgroundColor: bg,
        color: text,
      }}
    >
      <div className="w-full h-full flex items-center relative">
        <div className="h-full w-2" style={{ background: text }} />
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
        <span className="py-5 px-1 min-w-25" style={{ color: text }}>
          {courseName.toUpperCase()}
        </span>
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
