'use client';
import clsx from 'clsx';
import { Fragment, useRef, useState } from 'react';

import HoverEffect from '../HoverEffect';

interface GroupedDropDownProps<T> {
  updateInputFunction: (value: string) => void; // Called when typing in input
  updateSelectFunction: (value: T) => void; // Called when clicking/entering on the options
  valueFunction: (value: T) => string;
  currentValue?: T;
  placeholder?: string;
  options: T[];
  className?: string;
  // If it is grouped: Make sure they are ordered.
  // e.g. first they are all group1, then they are all group2
  grouped?: boolean;
  getGroup?: (value: T) => string;
  // TODO:
  hover?: boolean;
  getHover?: (value: T) => string;
  size?: 'sm' | 'md' | 'lg';
}

const widthMapping = {
  sm: 'max-w-[10vw]',
  md: 'max-w-[40vw]',
  lg: 'max-w-[90vw]',
};

export default function GroupedDropDown<T>({
  updateInputFunction,
  updateSelectFunction,
  valueFunction,
  currentValue,
  options,
  placeholder = '',
  className,
  grouped = false,
  getGroup = () => '',
  hover = false,
  getHover = () => '',
  size = 'lg',
}: GroupedDropDownProps<T>) {
  // TODO: make it so that when they click on it, the dropdown shows up
  //       add the option to choose if they want the dropDown to be over stuff or not.
  const [close, setClose] = useState<boolean>(true);
  const ref = useRef<HTMLDivElement>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  function handleKeyDown(e: React.KeyboardEvent) {
    const size = options.length;
    if (size === 0) return;
    let indexValue = highlightedIndex;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((indexValue + 1) % options.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (indexValue <= 0) indexValue = options.length;
      setHighlightedIndex(indexValue - 1);
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (indexValue !== -1) {
        updateSelectFunction(options[indexValue]);
        setClose(true);
      }
    } else {
      setClose(false);
    }
  }
  let currGroup = '';
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
      <div className={clsx('relative w-75', widthMapping[size])}>
        <input
          className="border-1 rounded-sm block w-full py-2 pl-1 pr-2 focus:outline-none focus:shadow-2xs focus:shadow-dark-green duration-75"
          value={currentValue ? valueFunction(currentValue) : ''}
          onChange={(e) => {
            setHighlightedIndex(-1);
            updateInputFunction(e.currentTarget.value);
          }}
          onKeyDown={(e) => handleKeyDown(e)}
          placeholder={placeholder}
          onClick={() => setClose(false)}
        />
      </div>
      {!close && (
        <div
          className={clsx(
            'bg-teal-800 text-light-green py-1 rounded-sm mt-1 scroller max-h-30 overflow-x-clip overflow-y-auto w-75',
            widthMapping[size],
          )}
        >
          {options.map((o, k) => {
            const optionGroup = getGroup(o);
            const group =
              grouped && optionGroup !== currGroup ? (
                <div
                  className={clsx(
                    'font-medium text-lime-300/90 truncate px-1 w-75',
                    widthMapping[size],
                  )}
                >
                  {optionGroup}
                </div>
              ) : (
                <></>
              );
            currGroup = optionGroup;
            return (
              <Fragment key={`${getGroup(o)}-${valueFunction(o)}`}>
                {group}
                <div
                  className={clsx(
                    'cursor-pointer hover:bg-teal-700 truncate px-1 w-75',
                    highlightedIndex === k && 'bg-teal-600',
                    widthMapping[size],
                  )}
                  onClick={() => {
                    updateSelectFunction(o);
                    setClose(true);
                  }}
                  ref={(el) => {
                    if (highlightedIndex === k && el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                  }}
                >
                  {hover ? (
                    <HoverEffect hover={getHover(o)} outerClass="w-full" pClass="w-full">
                      {valueFunction(o)}
                    </HoverEffect>
                  ) : (
                    valueFunction(o)
                  )}
                </div>
              </Fragment>
            );
          })}
          {options.length === 0 && (
            <div className="cursor-pointer hover:bg-teal-700 truncate px-1 "> No results </div>
          )}
        </div>
      )}
    </div>
  );
}
