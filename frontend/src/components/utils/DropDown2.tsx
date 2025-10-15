'use client';
import clsx from 'clsx';
import { useRef, useState } from 'react';

interface DropDown2Props<T> {
  updateInputFunction: (value: string) => void;
  updateSelectFunction: (value: T) => void;
  valueFunction: (value: T) => string;
  currentValue?: T;
  placeholder?: string;
  options: T[];
  className?: string;
}

export default function DropDown2<T>({
  updateInputFunction,
  updateSelectFunction,
  valueFunction,
  currentValue,
  options,
  placeholder = '',
  className,
}: DropDown2Props<T>) {
  const [close, setClose] = useState<boolean>(true);
  const ref = useRef<HTMLDivElement>(null);
  const [highlitedIndex, setHighlitedIndex] = useState<number>(0);

  function handleKeyDown(e: React.KeyboardEvent) {
    const size = options.length;
    if (size == 0) return;
    let indexValue = highlitedIndex;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlitedIndex((indexValue + 1) % options.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (indexValue <= 0) indexValue = options.length;
      setHighlitedIndex(indexValue - 1);
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (indexValue != -1) {
        updateSelectFunction(options[indexValue]);
        setClose(true);
      }
    } else {
      setClose(false);
    }
  }

  return (
    <div
      ref={ref}
      className={className}
      tabIndex={-1}
      onBlur={(e) => {
        if (!ref.current?.contains(e.relatedTarget)) {
          setClose(true);
        }
      }}
    >
      <div className="relative">
        <input
          className="border-1 rounded-sm  block w-full py-2 pl-1 pr-2 focus:outline-none focus:shadow-2xs focus:shadow-dark-green duration-75"
          value={currentValue ? valueFunction(currentValue) : ''}
          onChange={(e) => {
            setHighlitedIndex(-1);
            updateInputFunction(e.currentTarget.value);
          }}
          onKeyDown={(e) => handleKeyDown(e)}
          placeholder={placeholder}
        />
      </div>
      {!close && (
        <div className="bg-teal-800 text-light-green py-1 rounded-sm mt-1 w-[90vw] max-w-75 scroller max-h-30 overflow-x-clip overflow-y-auto">
          {options.map((o, k) => (
            <div
              className={clsx(
                'cursor-pointer w-[92vw] max-w-75 hover:bg-teal-700 truncate px-1',
                highlitedIndex === k && 'bg-teal-600',
              )}
              onClick={() => {
                updateSelectFunction(o);
                setClose(true);
              }}
              key={k}
              ref={(el) => {
                if (highlitedIndex === k && el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
              }}
            >
              {valueFunction(o)}
            </div>
          ))}
          {options.length == 0 && (
            <div className="cursor-pointer hover:bg-teal-700 truncate px-1 "> No results </div>
          )}
        </div>
      )}
    </div>
  );
}
