'use client';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { LuTrash2, LuX } from 'react-icons/lu';

import { CourseInformation, GQLCoursePreReq, Requirement } from '../interface';
import { getTermName } from '../utils/termUtils';

import useGQL from '@/lib/useGQL';

type CourseInfoPageProps = {
  close: () => void;
  updatePage?: () => void;
  courseInfo: CourseInformation & GQLCoursePreReq;
};

type SectionInterface = {
  class_number: number;
  enrollment_capacity: number;
  enrollment_total: number;
  term_id: number;
};

type detailedInfoType = {
  code: string;
  id: number;
  name: string;
  description?: string;
  rating: {
    easy?: number;
    liked?: number;
    useful?: number;
    filled_count?: number;
  };
  sections: SectionInterface[];
} & GQLCoursePreReq;

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
    <li className="list-disc list-inside">
      <span
        className={clsx(requirement.conditionedOn == 'final' ? 'font-normal' : 'font-semibold')}
      >
        {...textBroken}
      </span>
      <ul className="ml-5">
        {requirement.appliesTo.map((req, id) => (
          <div key={id}>
            <ShowReqs requirement={req} />
          </div>
        ))}
      </ul>
    </li>
  );
}

function NormalVersion({ detailedInfo }: { detailedInfo: detailedInfoType }) {
  const subHeaderClsx = 'text-lg md:text-xl mt-6 text-gray-950';
  const pClsx = 'text-md text-zinc-900 font-light';
  const liClsx = 'list-disc list-inside';

  return (
    <div>
      <h2 className="text-2xl text-center">{detailedInfo!.code.toUpperCase()}</h2>

      <h3 className={clsx(subHeaderClsx, 'mt-4!')}>Course Name: </h3>
      <p className={pClsx}>{detailedInfo.name}</p>

      <h3 className={subHeaderClsx}>Course Description: </h3>
      <p className={pClsx}>{detailedInfo.description || 'No description'}</p>

      {detailedInfo?.courseInfo['cross-listed courses'] && (
        <div>
          <h3 className={subHeaderClsx}>cross-listed courses: </h3>
          <ul>
            {detailedInfo.courseInfo['cross-listed courses'].map(({ value, url }, index) => (
              <li key={index}>
                <a href={url}>{value}</a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {detailedInfo.courseInfo.prerequisites && (
        <div>
          <h3 className={subHeaderClsx}>Prerequisites: </h3>
          <ul className="ml-2">
            <ShowReqs requirement={detailedInfo.courseInfo.prerequisites} />
          </ul>
        </div>
      )}

      {detailedInfo.courseInfo.antirequisites && (
        <div>
          <h3 className={subHeaderClsx}>Antirequisites: </h3>
          <ul className="ml-2">
            <ShowReqs requirement={detailedInfo.courseInfo.antirequisites} />
          </ul>
        </div>
      )}

      {detailedInfo.courseInfo.corequisites && (
        <div>
          <h3 className={subHeaderClsx}>Corequisites: </h3>
          <ul className="ml-2">
            <ShowReqs requirement={detailedInfo.courseInfo.corequisites} />
          </ul>
        </div>
      )}

      <h3 className={subHeaderClsx}>Current Offerings: </h3>
      <ul className={pClsx}>
        {detailedInfo.sections.map((sec) => (
          <li className={liClsx} key={sec.term_id}>
            {getTermName(sec.term_id)}
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
            Liked{' '}
            {detailedInfo.rating.liked ? `(${Math.round(detailedInfo.rating.liked * 100)}%)` : ''}
            :{' '}
          </span>
          {detailedInfo.rating.liked ? <Percentage value={detailedInfo.rating.liked} /> : 'no info'}
        </div>
        <div
          className={clsx(
            liClsx,
            'flex items-center justify-between max-w-80 text-nowrap text-sm md:text-base w-full gap-2',
          )}
        >
          <span>
            Easy{' '}
            {detailedInfo.rating.easy ? `(${Math.round(detailedInfo.rating.easy * 100)}%)` : ''}
            :{' '}
          </span>
          {detailedInfo.rating.easy ? <Percentage value={detailedInfo.rating.easy} /> : 'no info'}
        </div>
        <div
          className={clsx(
            liClsx,
            'flex items-center justify-between max-w-80 text-nowrap text-sm md:text-base w-full gap-2',
          )}
        >
          <span>
            Usefull
            {detailedInfo.rating.useful
              ? ` (${Math.round(detailedInfo.rating.useful * 100)}%)`
              : ''}
            :
          </span>
          {detailedInfo.rating.liked ? <Percentage value={detailedInfo.rating.liked} /> : 'no info'}
        </div>
        <div className={clsx(liClsx, 'text-nowrap text-sm md:text-base font-normal text-zinc-700')}>
          {detailedInfo.rating.filled_count || 0} Ratings
        </div>
      </ul>

      <p className="mt-6 font-normal text-[0.9rem] text-red-600">
        Confirm all details with the official Undergraduate Calendar
      </p>
      <h3 className={clsx(subHeaderClsx, '!mt-0')}>Related Links: </h3>
      <ul className={pClsx}>
        <li className={liClsx}>
          <a
            className="underline"
            target="_blank"
            href={`https://uwflow.com/course/${detailedInfo.name}`}
            rel="noreferrer"
          >
            UWFLOW
          </a>
        </li>
        <li className={liClsx}>
          <a className="underline" target="_blank" href={detailedInfo.url} rel="noreferrer">
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

export default function CourseInfoPage({ close, courseInfo }: CourseInfoPageProps) {
  //TODO: get the actual prereqs from the correct websites
  //      get as much links as you can
  //      delete functionality
  const gql = useGQL();
  const [detailedInfo, setDetailedInfo] = useState<detailedInfoType>();
  const [status, setStatus] = useState<'Loading' | 'error' | 'idle'>('Loading');
  const [message, setMessage] = useState<string>('Loading...');

  useEffect(() => {
    async function initialSetup() {
      const GQL_QUERY = `
        query Course($course_id: Int!) {
          course(limit: 1, where: { id: { _eq: $course_id } }) {
              code
              id
              description
              name
              rating {
                  easy
                  liked
                  useful
                  filled_count
              }
              sections(distinct_on: [term_id]) {
                  enrollment_capacity
                  enrollment_total
                  section_name
                  term_id
                  class_number
              }
          }
      }
      `;
      const response = await gql(GQL_QUERY, { course_id: courseInfo.courseId });
      if (!response?.data?.course?.length) {
        setStatus('error');
        setMessage('error in recieving course information');
        console.info(response);
      } else {
        const data: detailedInfoType = response.data.course[0];
        data.sections = data.sections.sort((a, b) => b.term_id - a.term_id);
        setDetailedInfo({ ...data, ...courseInfo });
        setStatus('idle');
        setMessage('');
      }
    }

    initialSetup();
  }, []);

  if (status === 'idle' && !detailedInfo) {
    setStatus('error');
    setMessage('error occured');
  }

  return (
    <div className="bg-white py-4 px-4 rounded-xl shadow-2xl shadow-dark-green/10 max-w-180 w-[95%] max-h-[calc(100%-45*var(--spacing))] overflow-y-auto scroller overflow-x-clip">
      <div className="bg-white flex gap-1 px-1 rounded-md sticky top-0 right-0 justify-end max-w-max ml-auto">
        <a
          target="_blank"
          href={`https://uwflow.com/course/${courseInfo.courseName}`}
          rel="noreferrer"
        >
          FLOW
        </a>
        <LuTrash2 className="w-4 font-semibold h-auto cursor-pointer text-red-900" />
        <LuX className="w-4 font-semibold h-auto cursor-pointer" onClick={close} />
      </div>
      {status === 'idle' ? (
        <NormalVersion detailedInfo={detailedInfo!} />
      ) : status === 'Loading' ? (
        <LoadingVersion />
      ) : (
        ''
      )}
      {message.length ? (
        <p className={clsx(status === 'error' && 'text-red-600', 'text-center mt-4')}>{message}</p>
      ) : (
        ''
      )}
    </div>
  );
}
