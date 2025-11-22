'use client';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { LuChevronDown, LuChevronUp } from 'react-icons/lu';

export default function ExpandPanel({
  children,
  addCloseFunction,
}: React.HTMLAttributes<HTMLDivElement> & { addCloseFunction?: (arg0: () => void) => void }) {
  const [on, setOn] = useState<boolean>(false);

  useEffect(() => {
    if (addCloseFunction !== undefined) {
      addCloseFunction(() => setOn(false));
    }
  }, []);
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
          'transition-height duration-300 min-w-50',
          on ? 'max-h-40 overflow-y-auto scroller' : 'max-h-0 overflow-y-hidden',
        )}
      >
        {children}
      </div>
    </div>
  );
}
