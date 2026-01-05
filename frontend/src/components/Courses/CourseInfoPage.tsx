'use client';
import clsx from 'clsx';
import { useState } from 'react';
import { LuTrash2, LuX } from 'react-icons/lu';

import { AllCourseInformation } from '../graph/CourseClass';
import { CourseInformation, Requirement } from '../interface';
import { URL_RESOURCES } from '../utils/constants';
import { getTermSeason } from '../utils/termUtils';

import { GetReqIcon } from './utils';

type CourseInfoPageProps = {
  close: () => void;
  updatePage?: () => void;
  deleteCourse: (info: { courseId: number; termId: number }) => void;
  allCourses: AllCourseInformation;
  courseId: number;
  termId: number;
};

function Percentage({ value }: { value: number }) {
  return (
    <div className="w-full max-w-50 rounded-md h-4 border border-dark-green overflow-clip">
      <div
        className={clsx('h-full', value < 0.4 ? 'bg-red-900' : 'bg-dark-green')}
        style={{ width: `${value * 100}%` }}
      />
    </div>
  );
}

function ShowReqs({ requirement }: { requirement: Requirement }) {
  const textBroken = [];
  let start = 0;
  let i = 0;
  for (const link of requirement.relatedLinks) {
    const end = requirement.conditionText.indexOf(link.value, start);
    const substr = requirement.conditionText.substring(start, end);
    if (substr) {
      textBroken.push(<span key={i}>{substr[0].toUpperCase() + substr.substring(1)}</span>);
    }
    textBroken.push(
      <a href={link.url} target="_blank" key={i + 1} className="underline" rel="noreferrer">
        {link.value}
      </a>,
    );
    start = end + link.value.length;
    i += 2;
  }
  const substr = requirement.conditionText.substring(start);
  if (substr != '') {
    textBroken.push(<span key={i}>{substr[0].toUpperCase() + substr.substring(1)}</span>);
  }

  return (
    <li>
      <span
        className={clsx(requirement.conditionedOn == 'final' ? 'font-normal' : 'font-semibold')}
      >
        <GetReqIcon reqsMet={requirement.met} />
        {...textBroken}
      </span>
      <ul className="ml-5 list-inside">
        {requirement.appliesTo.map((req, id) => (
          <div key={id}>
            <ShowReqs requirement={req} />
          </div>
        ))}
      </ul>
    </li>
  );
}

function NormalVersion({ course, termId }: { course: CourseInformation; termId: number }) {
  const subHeaderClsx = 'text-lg md:text-xl mt-6 text-gray-950';
  const pClsx = 'text-md text-zinc-900 font-light';
  const liClsx = 'list-disc list-inside';
  const term = course.termInfo.get(termId);
  const reqMet = term?.allReqsMet;

  return (
    <div>
      <h2 className="text-2xl text-center">{course.code.toUpperCase()}</h2>

      <h3 className={clsx(subHeaderClsx, 'mt-4!')}>Course Name: </h3>
      <p className={pClsx}>{course.name}</p>

      <h3 className={subHeaderClsx}>Course Description: </h3>
      <p className={pClsx}>{course.description || 'No description'}</p>

      <h3 className={subHeaderClsx}>Status: </h3>
      <ul className="list-inside list-disc">
        <li className={clsx(reqMet && 'text-green-500', reqMet === false && 'text-red-500')}>
          {reqMet === undefined
            ? 'Loading Requirement Status'
            : `You have ${reqMet ? '' : 'not '}met all your requirements`}
        </li>
        <li className={clsx(term?.termCompatible ? 'text-green-500' : 'text-yellow-500')}>
          This course is usually {term?.termCompatible ? '' : '(not )'}offered in{' '}
          {getTermSeason(termId).split(' ')[0]}
        </li>
      </ul>

      {course.courseInfo.prerequisites && (
        <div>
          <h3 className={subHeaderClsx}>
            Prerequisites: <GetReqIcon reqsMet={course.courseInfo.prerequisites.met} size={'md'} />
          </h3>
          <ul className="ml-2">
            <ShowReqs requirement={course.courseInfo.prerequisites} />
          </ul>
        </div>
      )}

      {course.courseInfo.antirequisites && (
        <div>
          <h3 className={subHeaderClsx}>
            Antirequisites:
            <GetReqIcon reqsMet={course.courseInfo.antirequisites.met} size={'md'} />
          </h3>
          <ul className="ml-2 list-inside">
            <ShowReqs requirement={course.courseInfo.antirequisites} />
          </ul>
        </div>
      )}

      {course.courseInfo.corequisites && (
        <div>
          <h3 className={subHeaderClsx}>
            Corequisites: <GetReqIcon reqsMet={course.courseInfo.corequisites.met} size={'md'} />
          </h3>
          <ul className="ml-2">
            <ShowReqs requirement={course.courseInfo.corequisites} />
          </ul>
        </div>
      )}

      {course.courseInfo['cross-listed courses'] && (
        <div>
          <h3 className={subHeaderClsx}>cross-listed courses: </h3>
          <ul className="list-inside list-disc">
            {course.courseInfo['cross-listed courses'].map(({ value, url }, index) => (
              <li key={index}>
                <a href={url} target="_blank" className="underline" rel="noreferrer">
                  {value}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h3 className={subHeaderClsx}>Current Offerings: </h3>
      <ul className={pClsx}>
        {[...course.sections].map(({ term_id }) => (
          <li className={clsx(liClsx, term_id === termId && 'font-medium')} key={term_id}>
            {getTermSeason(term_id)}
          </li>
        ))}
      </ul>

      <h3 className={subHeaderClsx}>UWFLOW Info: </h3>
      <ul className={clsx(pClsx, 'mt-1')}>
        <div
          className={clsx(
            liClsx,
            'flex items-center justify-between max-w-80 text-nowrap text-sm md:text-base w-full gap-2',
          )}
        >
          <span>
            Liked {course.rating.liked ? `(${Math.round(course.rating.liked * 100)}%)` : ''}:{' '}
          </span>
          {course.rating.liked ? <Percentage value={course.rating.liked} /> : 'no info'}
        </div>
        <div
          className={clsx(
            liClsx,
            'flex items-center justify-between max-w-80 text-nowrap text-sm md:text-base w-full gap-2',
          )}
        >
          <span>
            Easy {course.rating.easy ? `(${Math.round(course.rating.easy * 100)}%)` : ''}:{' '}
          </span>
          {course.rating.easy ? <Percentage value={course.rating.easy} /> : 'no info'}
        </div>
        <div
          className={clsx(
            liClsx,
            'flex items-center justify-between max-w-80 text-nowrap text-sm md:text-base w-full gap-2',
          )}
        >
          <span>
            Usefull
            {course.rating.useful ? ` (${Math.round(course.rating.useful * 100)}%)` : ''}:
          </span>
          {course.rating.liked ? <Percentage value={course.rating.liked} /> : 'no info'}
        </div>
        <div className={clsx(liClsx, 'text-nowrap text-sm md:text-base font-normal text-zinc-700')}>
          {course.rating.filled_count || 0} Ratings
        </div>
      </ul>

      {course.postrequisites && course.postrequisites.length > 0 && (
        <div>
          <h3 className={subHeaderClsx}>Leads to: </h3>
          <ul className="list-inside list-disc">
            {course.postrequisites.map(({ postrequisite: { code, name } }, index) => (
              <li key={index}>
                <a
                  href={URL_RESOURCES.UWFLOW_COURSE(code)}
                  target="_blank"
                  className="underline"
                  rel="noreferrer"
                >
                  {code.toUpperCase()}:
                </a>
                <span> {name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-6 font-normal text-[0.9rem] text-red-600">
        Confirm all details with the official Undergraduate Calendar
      </p>
      <h3 className={clsx(subHeaderClsx, '!mt-0')}>Related Links: </h3>
      <ul className={pClsx}>
        <li className={liClsx}>
          <a
            className="underline"
            target="_blank"
            href={URL_RESOURCES.UWFLOW_COURSE(course.code)}
            rel="noreferrer"
          >
            UWFLOW
          </a>
        </li>
        <li className={liClsx}>
          <a className="underline" target="_blank" href={course.url} rel="noreferrer">
            Undergraduate Calendar
          </a>
        </li>
      </ul>
    </div>
  );
}

function LoadingVersion() {
  return (
    <div className="w-full flex justify-center">
      <div className="loader aspect-square h-10 w-10" />
    </div>
  );
}

export default function CourseInfoPage({
  close,
  allCourses,
  deleteCourse,
  courseId,
  termId,
}: CourseInfoPageProps) {
  //TODO: get as much links as you can
  const [status, setStatus] = useState<'error' | 'idle'>('idle');
  const [message, setMessage] = useState<string>('');

  const course = allCourses.getCourseInfoId(courseId);
  if (status === 'idle' && !course) {
    setStatus('error');
    setMessage('error occured');
  }

  return (
    <div className="bg-white py-4 px-4 rounded-xl shadow-2xl shadow-dark-green/10 max-w-180 w-[95%] max-h-[calc(100%-45*var(--spacing))] overflow-y-auto scroller overflow-x-clip">
      <div className="bg-white flex gap-1 px-1 rounded-md sticky top-0 right-0 justify-end max-w-max ml-auto">
        <a target="_blank" href={`https://uwflow.com/course/${course?.code}`} rel="noreferrer">
          FLOW
        </a>
        <LuTrash2
          className="w-4 font-semibold h-auto cursor-pointer text-red-900"
          onClick={() => deleteCourse({ courseId, termId })}
        />
        <LuX className="w-4 font-semibold h-auto cursor-pointer" onClick={close} />
      </div>
      {status === 'idle' && course ? <NormalVersion course={course} termId={termId} /> : ''}
      {message.length ? (
        <p className={clsx(status === 'error' && 'text-red-600', 'text-center mt-4')}>{message}</p>
      ) : (
        ''
      )}
    </div>
  );
}
