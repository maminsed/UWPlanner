'use client';
import { RefObject, useEffect, useState } from 'react';

import { GQLCoursePreReq, termIdInterface } from '../interface';
import { getTermSeason, termOperation } from '../utils/termUtils';

import Semester from './Semester';

import { useApi } from '@/lib/useApi';
import useGQL from '@/lib/useGQL';

type GraphInterface = {
  pathRef: RefObject<termIdInterface[]>;
  getUpdated: number;
  updatePan: () => void;
  setCourseInformations: (arg0: GQLCoursePreReq[]) => void;
  setCourseDict: (newMap: Map<number, string>) => void;
};

export default function Graph({
  pathRef,
  getUpdated,
  updatePan,
  setCourseInformations,
  setCourseDict,
}: GraphInterface) {
  // TODO:
  //       do something with the centering
  const backend = useApi();
  const gql = useGQL();
  const [path, setPath] = useState<[string, number[]][]>([]);
  const [startedTerm, setStartedTerm] = useState<number>(0);

  useEffect(() => {
    async function initialSetup() {
      const res = await backend(
        `${process.env.NEXT_PUBLIC_API_URL}/update_info/get_user_seq?include_courses=true`,
      );
      const response = await res.json().catch(() => {});
      if (!res.ok) {
        console.error('error occured - please reload');
      } else {
        setPath(response.path);
        setStartedTerm(response.started_term_id);
        const termIds: termIdInterface[] = [];
        const course_ids = new Set<number>();
        response.path.forEach((semester: [string, number[]], i: number) => {
          // [1A, CourseName]
          semester[1].forEach((course) => {
            if (!course_ids.has(course)) course_ids.add(course);
          });
          const currTerm = termOperation(response.started_term_id, i);
          termIds.push({ value: currTerm, display: `${semester[0]} - ${getTermSeason(currTerm)}` });
        });
        pathRef.current = termIds;
        updatePan();

        // Getting GQL data
        const GQL_QUERY = `
          query Course($course_ids: [Int!]!) {
              course(where: { id: { _in: $course_ids } }) {
                  code
                  id
                  name
              }
          }
      `;

        const gql_response: GQLCoursePreReq[] =
          (await gql(GQL_QUERY, { course_ids: Array.from(course_ids) }))?.data?.course || [];
        const newMap = new Map<number, string>();
        const course_codes: string[] = [];
        gql_response.forEach((course) => {
          newMap.set(course.id, course.code);
          course_codes.push(course.code);
        });

        //Getting Backend Reqs:
        const req_res = await backend(
          `${process.env.NEXT_PUBLIC_API_URL}/update_info/get_course_reqs`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ course_codes: Array.from(course_codes) }),
          },
        );
        if (req_res.ok) {
          const course_reqs = (await req_res.json().catch(() => {})).courses;
          gql_response.forEach((course) => {
            course.courseInfo = course_reqs[course.code]?.courseInfo || {};
            course.url = course_reqs[course.code]?.url || '';
          });
        }

        setCourseInformations(gql_response);
        setCourseDict(newMap);
      }
    }

    initialSetup();
  }, [getUpdated]);

  function canSwapRight(i: number) {
    if (i < 0 || i + 1 >= path.length) return false;
    const currSem = path[i][0].toLowerCase();
    const nextSem = path[i + 1][0].toLowerCase();
    return currSem.includes('wt') || currSem == 'off' || nextSem.includes('wt') || nextSem == 'off';
  }

  return (
    <div className="flex gap-6 p-8">
      {path.map((semester, i) => {
        const termId = termOperation(startedTerm, i);
        const termName = `${getTermSeason(termOperation(startedTerm, i))} - ${semester[0]}`;

        return (
          <Semester
            key={i}
            semester={termName}
            termId={termId}
            class_lst={semester[1]}
            canSwapRight={canSwapRight(i)}
            canSwapLeft={canSwapRight(i - 1)}
          />
        );
      })}
    </div>
  );
}
