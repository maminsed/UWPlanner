'use client';
import clsx from 'clsx';
import { useState } from 'react';
import { LuChevronDown, LuChevronUp } from 'react-icons/lu';

export default function ExpandPanel({ children }: React.HTMLAttributes<HTMLDivElement>) {
  const [on, setOn] = useState<boolean>(false);

  return (
    <div className="bg-[#063238] text-light-green rounded-md py-1">
      <button
        className="flex justify-between items-center cursor-pointer w-full px-2"
        onClick={() => setOn(!on)}
      >
        <span>Expand</span>
        {on ? <LuChevronDown /> : <LuChevronUp />}
      </button>
      <div
        className={clsx(
          'overflow-y-hidden transition-height duration-300 min-w-50',
          on ? 'max-h-50 overflow-y-auto' : 'max-h-0',
        )}
      >
        {children}
      </div>
    </div>
  );
}
