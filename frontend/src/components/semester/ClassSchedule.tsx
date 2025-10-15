'use client';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { Fragment } from 'react';
import { BiImport } from 'react-icons/bi';
import { IoIosInformationCircleOutline } from 'react-icons/io';
import { LuChevronLeft, LuChevronRight, LuMaximize2, LuPlus, LuShare2 } from 'react-icons/lu';

import AddACourse from '../Courses/AddACourse';
import BatchAddCourses from '../Courses/BatchAddCourses';
import HoverEffect from '../HoverEffect';
import { DaysOfWeek, GQLCourseSection } from '../interface';
import RightSide from '../utils/RightSide';
import { getCurrentTermId, getTermName, termOperation } from '../utils/termUtils';

import { useApi } from '@/lib/useApi';
import useGQL from '@/lib/useGQL';

type ClassInterface = {
  sectionId: number;
  startSeconds: number;
  endSeconds: number;
  startDate: string;
  endDate: string;
  days: DaysOfWeek[];
  code: string;
  classNumber: number;
  courseId: number;
  title: string;
  type: string;
  prof: string;
  location: string;
};

function translateSecToHour(time: number, checkBoxes: [string, boolean][][]) {
  const min = Math.floor((time % 3600) / 60);
  const hour = Math.floor(time / 3600);
  const AM_PM = getVal('AM/PM', checkBoxes);
  return `${AM_PM ? hour % 12 : hour}:${min}${min < 10 ? '0' : ''}${AM_PM && hour > 12 ? 'PM' : ''}`;
}

function getVal(value: string, checkBoxes: [string, boolean][][]) {
  for (let r = 0; r < checkBoxes.length; ++r) {
    for (let c = 0; c < checkBoxes[r].length; ++c) {
      if (checkBoxes[r][c][0].toLocaleLowerCase() == value.toLocaleLowerCase()) {
        return checkBoxes[r][c][1];
      }
    }
  }
  return true;
}

function Class({
  startSeconds,
  endSeconds,
  days,
  code,
  courseId,
  classNumber,
  type,
  title,
  prof,
  location,
  checkBoxes,
  dayMap,
  top,
  height,
}: ClassInterface & {
  checkBoxes: [string, boolean][][];
  dayMap: DayMapInterface;
  top: number;
  height: number;
}) {
  const dayLeft = { M: '100%/6', T: '200%/6', W: '300%/6', Th: '400%/6', F: '500%/6' };

  function countOccurance(day: keyof DayMapInterface): [number, number] {
    // #overlap,ith overlap
    let count = 0;
    let ith = 0;
    dayMap[day].forEach((section) => {
      if (hasOverlap([startSeconds, endSeconds], [section[0], section[1]])) {
        if (section[2] === courseId) ith = count;
        ++count;
      }
    });
    return [count, ith];
  }

  return (
    <Fragment>
      {days.map((day) => {
        const [count, ith] = countOccurance(day);
        const width = 6 * count;
        const offset = `${100 * ith}%/${width}`;

        return (
          <div
            key={day}
            className="absolute bg-cyan-500/50 rounded-md text-sm leading-[120%] z-20 pl-1 overflow-y-auto overflow-x-hidden scroller"
            style={{
              left: `calc(${dayLeft[day]} + ${offset})`,
              top: `calc(${top} * var(--spacing))`,
              height: `calc(${height} * var(--spacing)`,
              width: `calc(100%/${width})`,
            }}
          >
            {getVal('course code', checkBoxes) && <p className="pt-1">{code}</p>}
            {getVal('course title', checkBoxes) && <p>{title}</p>}
            <p>{classNumber}</p>
            <p>{type}</p>
            <p>
              {translateSecToHour(startSeconds, checkBoxes)}-
              {translateSecToHour(endSeconds, checkBoxes)}
            </p>
            <p>{location}</p>
            <p>{prof}</p>
            <div className="flex justify-end pr-[3%]">
              <LuMaximize2 className="right-2.5 my-1 cursor-pointer" />
            </div>
          </div>
        );
      })}
    </Fragment>
  );
}

function OnlineClass({
  code,
  type,
  title,
  startDate,
  classNumber,
  endDate,
  first = false,
  checkBoxes,
}: ClassInterface & { first?: boolean; checkBoxes: [string, boolean][][] }) {
  return (
    <div className="flex flex-row px-2 py-1 items-center min-w-132 relative">
      {getVal('course code', checkBoxes) && (
        <div className="flex-1 min-w-20 flex items-center gap-1 cursor-pointer">
          {code} <IoIosInformationCircleOutline className="min-w-4" />
        </div>
      )}
      {getVal('course title', checkBoxes) && <div className="flex-2 min-w-40">{title}</div>}
      <div className="flex-2 min-w-16">{type}</div>
      <div className="flex-2 min-w-16">{classNumber}</div>
      <div className="flex-1 min-w-20 text-sm sm:text-[1rem]">{startDate}</div>
      <div className="flex-1 min-w-20 text-sm sm:text-[1rem]">{endDate}</div>
      {!first && <div className="absolute right-4 left-4 top-0 border-t-1" />}
    </div>
  );
}

function getMonday(today = new Date()) {
  const day = today.getDay();

  let diff = day - 1;
  if (day === 0) diff = -1;
  if (day === 6) diff = -2;
  today.setDate(today.getDate() - diff);
  const newD = new Date(today);
  return newD;
}

function hasOverlap([start1, end1]: [number, number], [start2, end2]: [number, number]) {
  return !(start1 >= end2 || end1 <= start2);
}

type DayMapInterface = {
  M: [number, number, number][]; //start,end,course_id
  T: [number, number, number][];
  W: [number, number, number][];
  Th: [number, number, number][];
  F: [number, number, number][];
  Tot: [number, number][];
};

export default function ClassSchedule() {
  // TODO: option to choose from available courses what to display - Fix the downloading of scheudle into a google calendar - colour coding courses - send alerats and stuff to upstream so that it can display
  // There is an issue with when the user is in compact and they decide to hide tutorial or something
  const dateBoxClass = clsx(
    'bg-[#CAEDF2] text-center flex-1 h-16 flex flex-col justify-center text-sm md:text-lg',
  );
  const normalBoxClass = clsx('bg-white flex-1 text-sm xs:text-base');
  const lineVertClass = 'border-r-1 border-[#6EC0CB]';
  const lineHorMidClass = 'absolute w-[85%] right-4 border-b-1 border-[#6EC0CB]/50 border-dashed';
  const lineHorFullClass = 'absolute w-[85%] right-4 border-b-1 border-[#6EC0CB]/80';
  const [classes, setClasses] = useState<ClassInterface[]>([]);
  const [mondayDate, setMondayDate] = useState<Date>(() => getMonday());
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const [checkBoxes, setCheckBoxes] = useState<[string, boolean][][]>([
    [
      ['Course Code', true],
      ['AM/PM', false],
      ['Lectures', true],
      ['Final Week', false],
    ],
    [
      ['Course Title', true],
      ['Tutorials', true],
      ['Tests', true],
      ['Compress', true],
    ],
  ]);
  const [singleOverLay, setsingleOverLay] = useState<boolean>(false);
  const [termId, setTermId] = useState<number>(getCurrentTermId);
  const [startedTerm, setstartedTerm] = useState<number>(getCurrentTermId);
  const [updateCond, setUpdateCond] = useState<number>(0);
  const [path, setPath] = useState<string[]>([]);
  const [batchOverLay, setBatchOverLay] = useState<boolean>(false);

  const [dayMap, setDayMap] = useState<DayMapInterface>({
    M: [],
    T: [],
    W: [],
    Th: [],
    F: [],
    Tot: [],
  });
  const backend = useApi();
  const gql = useGQL();
  useEffect(() => {
    async function initialSetup() {
      const res = await backend(`${process.env.NEXT_PUBLIC_API_URL}/courses/get_user_sections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          term_id: termId,
        }),
      });
      if (!res?.ok) {
        console.error('error!');
      } else {
        const response = await res.json().catch(() => {});
        const sections = response.sections;
        setstartedTerm(response.start_sem || 0);
        setPath(response.path || []);
        if (!response.path) {
          alert('Please get a sequence first in settings or Graph');
          console.error('User with no sequence is here?');
        }
        if (!sections || sections.length === 0) {
          setClasses([]);
          handleOptions(1, 3, true);
          return;
        }

        const GQL_QUERY = `
                    query Course_section($sections: [Int!]!, $termId: Int!) {
                            course_section(
                            where: {
                                class_number: { _in: $sections }
                                term_id: { _eq: $termId }
                            }
                        ) {
                            class_number
                            course_id
                            id
                            section_name
                            term_id
                            course {
                                code
                                name
                            }
                            meetings {
                                days
                                end_date
                                end_seconds
                                location
                                prof_id
                                start_date
                                start_seconds
                            }
                        }
                    }
                `;
        const gql_response = await gql(GQL_QUERY, { sections, termId });
        const data: ClassInterface[] = [];
        gql_response?.data?.course_section.forEach((section: GQLCourseSection): void => {
          section.meetings.forEach((meeting) => {
            const prevSection = data[data.length - 1];
            const newSection = {
              sectionId: section.id,
              startSeconds: meeting.start_seconds || 0,
              endSeconds: meeting.end_seconds || 0,
              startDate: meeting.start_date || '',
              endDate: meeting.end_date || '',
              classNumber: section.class_number,
              days: meeting.days,
              code: section.course.code.toUpperCase() || '',
              courseId: section.course_id,
              title: section.course.name || '',
              type: section.section_name || '',
              location: meeting.location || '',
              prof: meeting.prof_id || '',
            };
            if (JSON.stringify(prevSection) != JSON.stringify(newSection)) {
              data.push(newSection);
            }
          });
        });
        setClasses(data as ClassInterface[]);
      }
    }

    initialSetup();
  }, [termId, updateCond]);

  useEffect(() => {
    function updateDayMap() {
      const res: DayMapInterface = { M: [], T: [], W: [], Th: [], F: [], Tot: [] };

      classes.forEach((section) => {
        if (inWeek(section.startDate, section.endDate)) {
          section.days.forEach((day) => {
            res[day].push([section.startSeconds, section.endSeconds, section.courseId]);
            res['Tot'].push([section.startSeconds, section.endSeconds]);
          });
        }
      });

      Object.keys(res).forEach((day) => {
        const dayKey = day as keyof DayMapInterface;
        res[dayKey].sort(([s1, e1, _1], [s2, e2, _2]) => s1 - s2 || e1 - e2);
      });

      if (res['Tot'].length) {
        const tot: [number, number][] = [];
        let [start, end] = res['Tot'][0];
        res['Tot'].forEach((day) => {
          if (hasOverlap([start, end], day)) {
            start = Math.min(start, day[0]);
            end = Math.max(end, day[1]);
          } else {
            tot.push([start, end]);
            start = day[0];
            end = day[1];
          }
        });
        tot.push([start, end]);
        res['Tot'] = tot;
      }

      setDayMap(res);
    }

    updateDayMap();
  }, [classes, mondayDate]);

  function moveTime(diff: number) {
    setMondayDate((prevDate) => {
      const date = new Date(prevDate);
      date.setDate(date.getDate() + diff);
      return date;
    });
  }

  function inWeek(startDate: string, endDate: string) {
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    const startObj = new Date(startYear, startMonth - 1, startDay);

    const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
    const endObj = new Date(endYear, endMonth - 1, endDay);

    const fridayDate = new Date(mondayDate);
    fridayDate.setDate(fridayDate.getDate() + 4);
    return startObj < fridayDate && endObj > mondayDate;
  }

  function selectedClass(course_type: string) {
    const type = course_type.split(' ')[0] as keyof typeof type_map;
    const type_map = { TUT: 'Tutorials', LEC: 'lectures', TST: 'tests' };
    if (type_map[type]) {
      return getVal(type_map[type], checkBoxes);
    }
    return true;
  }

  function loadOnlines() {
    let first = true;
    return (
      <>
        {classes.map((section, i) => {
          if (
            section.startSeconds === section.endSeconds &&
            section.startSeconds === 0 &&
            selectedClass(section.type)
          ) {
            if (first) {
              first = false;
              return <OnlineClass {...section} key={i} first={true} checkBoxes={checkBoxes} />;
            }
            return <OnlineClass {...section} key={i} checkBoxes={checkBoxes} />;
          }
          return null;
        })}
      </>
    );
  }

  function handleOptions(outerI: number, innerI: number, value: boolean | null = null) {
    if (
      checkBoxes[outerI][innerI][0] == 'Final Week' &&
      checkBoxes[outerI][innerI][1] == false &&
      value === null
    ) {
      let res: null | string = null;
      classes.forEach((section) => {
        if (res === null || section.endDate > res) {
          res = section.endDate;
        }
      });
      if (res !== null) {
        const [Year, Month, Day] = (res as string).split('-').map(Number);
        const Obj = new Date(Year, Month - 1, Day);
        setMondayDate(() => getMonday(new Date(Obj)));
      }
    }
    setCheckBoxes((prev) =>
      prev.map((r, rI) =>
        rI != outerI
          ? r
          : r.map((item, c) => (c != innerI ? item : [item[0], value === null ? !item[1] : value])),
      ),
    );
  }

  function updatePage() {
    setUpdateCond(updateCond + 1);
    setsingleOverLay(false);
  }

  function getIthValue(i: number, isSeconds: boolean = false) {
    // Funciton that takes in the ith value and if it's compressed it returns the compressed version, if not it returns the normal version
    if (!getVal('Compress', checkBoxes)) {
      if (isSeconds) i = i / 3600 - 8;
      return i * 20 + 19;
    }
    if (!isSeconds) i = (i + 8) * 3600;
    let res = 19;
    let prevEnd = 8 * 3600;
    for (let j = 0; j < dayMap['Tot'].length; ++j) {
      // If the start is bigger
      if (dayMap['Tot'][j][0] > i) {
        return res + ((i - prevEnd) / 3600) * 10;
      }
      // If the end is bigger
      if (dayMap['Tot'][j][1] > i) {
        return res + ((i - dayMap['Tot'][j][0]) * 20 + (dayMap['Tot'][j][0] - prevEnd) * 10) / 3600;
      }
      // If start and end are smaller
      res +=
        ((dayMap['Tot'][j][1] - dayMap['Tot'][j][0]) / 3600) * 20 +
        ((dayMap['Tot'][j][0] - prevEnd) / 3600) * 10;
      prevEnd = dayMap['Tot'][j][1];
    }
    return res + (isSeconds ? ((i - prevEnd) / 3600) * 10 : 10);
  }

  return (
    <section className="my-5 max-w-[96vw]">
      {singleOverLay && (
        <AddACourse
          close={() => {
            setsingleOverLay(false);
          }}
          updatePage={updatePage}
          termId={termId}
        />
      )}

      {batchOverLay && (
        <BatchAddCourses
          close={() => setBatchOverLay(false)}
          updatePage={() => {}}
          termId={termId}
        />
      )}

      {/* Semester Selector */}
      <div className="w-full flex justify-center">
        <select
          className="border-1 rounded-md px-2 py-1 w-60 max-w-[95%] mb-2"
          value={Math.min(termId, termOperation(startedTerm, path.length))}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            setTermId(Number(e.currentTarget.value));
          }}
        >
          {path.map((p, i) => (
            <option value={termOperation(startedTerm, i)} key={i}>
              {getTermName(termOperation(startedTerm, i))} - {p}
            </option>
          ))}
        </select>
      </div>

      {/* Calendar buttons */}
      <RightSide className="max-w-181 mx-auto mb-4">
        <button
          onClick={() => {
            moveTime(-7);
            handleOptions(0, checkBoxes[0].length - 1, false);
          }}
        >
          <LuChevronLeft className="w-4 md:w-5 h-auto cursor-pointer rounded-full border-1 hover:bg-dark-green/90 hover:text-light-green duration-150 active:bg-dark-green" />
        </button>
        <button
          onClick={() => {
            moveTime(7);
            handleOptions(0, checkBoxes[0].length - 1, false);
          }}
        >
          <LuChevronRight className="w-4 md:w-5 h-auto cursor-pointer rounded-full border-1 hover:bg-dark-green/90 hover:text-light-green duration-150 active:bg-dark-green" />
        </button>
        <button
          onClick={() => {
            setMondayDate(() => getMonday(new Date()));
            handleOptions(0, checkBoxes[0].length - 1, false);
          }}
          className="rounded-lg border-1 px-2 cursor-pointer hover:bg-dark-green/90 hover:text-light-green duration-150 active:bg-dark-green"
        >
          Current Week
        </button>
      </RightSide>

      {/* Calendar */}
      <div className="w-[92vw] overflow-x-auto scroller mx-auto">
        <div className="relative max-w-181 w-[92vw] min-w-120 sm:min-w-0 mx-auto overflow-y-clip">
          {/* Classes */}
          {classes.map((section, i) =>
            inWeek(section.startDate, section.endDate) && selectedClass(section.type) ? (
              <Class
                key={i}
                {...section}
                checkBoxes={checkBoxes}
                dayMap={dayMap}
                top={getIthValue(section.startSeconds, true)}
                height={
                  getIthValue(section.endSeconds, true) - getIthValue(section.startSeconds, true)
                }
              />
            ) : null,
          )}

          {/* lines */}
          {/* Vertical */}
          <div className="flex justify-between absolute top-4 bottom-4 left-0 right-0">
            <div className={clsx(lineVertClass, '!border-r-0')} />
            <div className={lineVertClass} />
            <div className={lineVertClass} />
            <div className={lineVertClass} />
            <div className={lineVertClass} />
            <div className={lineVertClass} />
            <div className={clsx(lineVertClass, '!border-r-0')} />
          </div>

          {/* Horizantal */}
          <div
            className={lineHorFullClass}
            style={{ top: `calc(${getIthValue(0)}*var(--spacing))` }}
          />
          {[...Array(13)].map((_, i) => (
            <Fragment key={i}>
              <div
                className={lineHorMidClass}
                style={{ top: `calc(${getIthValue(i + 0.5)}*var(--spacing))` }}
              />
              <div
                className={lineHorFullClass}
                style={{ top: `calc(${getIthValue(i + 1)}*var(--spacing))` }}
              />
            </Fragment>
          ))}

          {/* Dates: */}
          <div className="flex flex-row">
            <div className={clsx(dateBoxClass, 'rounded-tl-lg')}></div>
            {[...Array(5)].map((_, i) => {
              const date = new Date(mondayDate);
              date.setDate(mondayDate.getDate() + i);

              return (
                <div
                  key={i}
                  className={i == 4 ? clsx(dateBoxClass, 'rounded-tr-lg') : dateBoxClass}
                >
                  {days[i]} {months[date.getMonth()]} {date.getDate()}
                </div>
              );
            })}
          </div>
          {/* The days */}
          <div>
            {[...Array(13)].map((_, i) => (
              <div
                className="flex flex-row"
                style={{ height: `calc(${getIthValue(i + 1) - getIthValue(i)} * var(--spacing))` }}
                key={i}
              >
                <div
                  className={clsx(
                    normalBoxClass,
                    i == 12 && 'rounded-bl-lg',
                    'pl-2 xs:text-center',
                  )}
                >
                  {i + 8}:00
                </div>
                <div className={normalBoxClass}></div>
                <div className={normalBoxClass}></div>
                <div className={normalBoxClass}></div>
                <div className={normalBoxClass}></div>
                <div className={clsx(normalBoxClass, i == 12 && 'rounded-br-lg')}></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Online Classes */}
      <div className="mt-15 mb-4 max-w-181 flex flex-col align-middle mx-auto overflow-x-auto bg-white rounded-b-lg scroller relative [box-shadow:2px_4px_54.2px_0px_#608E9436] rounded-t-lg">
        <div className="bg-dark-green rounded-t-lg text-light-green pl-4 py-0.5 text-lg min-w-132">
          Online Classes
        </div>
        <div className="text-sm sm:text-[1.1rem] gap-0.5 min-w-132 z-20 relative">
          <div className="flex flex-row pl-2 py-2 border-b-1 items-center">
            {getVal('course code', checkBoxes) && <div className="flex-1 min-w-20">Code</div>}
            {getVal('course title', checkBoxes) && (
              <div className="flex-2 min-w-40">Course Title</div>
            )}
            <div className="flex-2 min-w-16">Section Name</div>
            <div className="flex-2 min-w-16">SectionId</div>
            <div className="flex-1 min-w-20">Start Date</div>
            <div className="flex-1 min-w-20">End Date</div>
          </div>
          {loadOnlines()}
        </div>
        <div className="absolute left-0 right-0 top-10 bottom-2 min-w-132 flex flex-row pr-2 z-2">
          {getVal('course code', checkBoxes) && <div className="border-r-1 flex-1 min-w-20" />}
          {getVal('course title', checkBoxes) && <div className="border-r-1 flex-2 min-w-40" />}
          <div className="border-r-1 flex-2 min-w-16" />
          <div className="border-r-1 flex-2 min-w-16" />
          <div className="border-r-1 flex-1 min-w-20" />
          <div className="flex-1 min-w-20" />
        </div>
      </div>

      <RightSide className="mb-5 mx-auto max-w-181">
        <HoverEffect hover="Add Class" onClick={() => setsingleOverLay(true)}>
          <LuPlus className="w-6 h-auto font-semibold cursor-pointer" />
        </HoverEffect>
        <HoverEffect hover="Import Schedule" onClick={() => setBatchOverLay(true)}>
          <BiImport className="w-6 h-auto font-semibold cursor-pointer" />
        </HoverEffect>
        <HoverEffect hover="Export Schedule">
          <LuShare2 className="w-5 h-auto font-semibold cursor-pointer" />
        </HoverEffect>
      </RightSide>

      {/* Options */}
      <div className="mt-10 max-w-181 mx-auto mb-4 overflow-x-auto bg-white rounded-b-lg scroller relative [box-shadow:2px_4px_54.2px_0px_#608E9436] rounded-lg">
        <div className="bg-dark-green rounded-t-lg text-light-green pl-4 py-0.5 text-lg min-w-108">
          Options
        </div>
        <div className="flex flex-col px-4 py-2 min-w-108">
          {checkBoxes.map((options, outerI) => (
            <div className="flex gap-1" key={options[0][0]}>
              {options.map((option, innerI) => (
                <label
                  className="cursor-pointer text-sm sm:text-[1.1rem] min-w-20 flex-1"
                  key={option[0]}
                >
                  <input
                    type="checkbox"
                    disabled={option[0] == '-'}
                    className="mr-1"
                    checked={option[1]}
                    onChange={() => handleOptions(outerI, innerI)}
                  />
                  {option[0]}
                </label>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
