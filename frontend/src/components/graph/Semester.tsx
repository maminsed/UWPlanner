import clsx from 'clsx';
import { useState } from 'react';
import { LuSettings } from 'react-icons/lu';

import { getCurrentTermId } from '../utils/termUtils';

import Course from './Course';


type SemesterInterface = {
  semester: string;
  termId: number;
  class_lst: number[];
  canSwapRight: boolean;
  canSwapLeft: boolean;
};

export default function Semester({
  semester,
  termId,
  class_lst,
  canSwapRight,
  canSwapLeft,
}: SemesterInterface) {
  const [settingOpen, setSettingOpen] = useState<boolean>(false);

  // TODO: add a delete and + button at the buttom of each semester
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
      <div className="flex flex-col items-center gap-2">
        <LuSettings
          className="w-7 h-auto aspect-square backdrop-blur-md hover:animate-spin bg-sky-300/30 cursor-pointer rounded-full p-[0.6rem] box-content"
          onClick={() => setSettingOpen(!settingOpen)}
        />
        <div
          className={clsx(
            'bg-sky-300/30 rounded-md flex flex-col px-2 transition-all duration-700 overflow-clip',
            settingOpen ? 'max-h-30' : 'max-h-0',
          )}
        >
          {canSwapRight ? <button className="mt-1 cursor-pointer">Swap Right</button> : ''}
          {canSwapLeft ? <button className="cursor-pointer">Swap Left</button> : ''}
          <button className="mb-1 cursor-pointer">Delete All</button>
        </div>
      </div>
    </div>
  );
}
