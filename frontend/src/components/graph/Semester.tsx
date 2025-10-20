import clsx from 'clsx';

import { getCurrentTermId } from '../utils/termUtils';

import Course from './Course';

type SemesterInterface = {
  semester: string;
  termId: number;
  class_lst: number[];
};

export default function Semester({ semester, termId, class_lst }: SemesterInterface) {
  return (
    <div className="flex flex-col text-xl gap-6 items-center">
      <div
        className={clsx(
          'px-6 py-2 rounded-3xl bg-white shadow-xs mb-3 w-full font-semibold text-center text-lg whitespace-nowrap',
          termId == getCurrentTermId() && 'ring ring-dark-green',
        )}
      >
        {semester}
      </div>
      {class_lst.map((courseId, i) => (
        <Course key={i} courseId={courseId} termId={termId} />
      ))}
    </div>
  );
}
