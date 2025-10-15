'use client';
import { RefObject, useEffect, useState } from 'react';

import { ClassLocations, CourseInformation, GQLCoursePreReq, termIdInterface } from '../interface';
import { getTermName, termOperation } from '../utils/termUtils';

import Semester from './Semester';

import { useApi } from '@/lib/useApi';
import useGQL from '@/lib/useGQL';

type GraphInterface = {
  pathRef: RefObject<termIdInterface[]>;
  getUpdated: number;
  updatePan: () => void;
  locations: RefObject<ClassLocations>;
  updatePreReqs: () => void;
  deleteCourse: (courseInfo: CourseInformation) => void;
  setCourseInformations: (arg0: GQLCoursePreReq[]) => void;
  viewCourse: (ci: CourseInformation) => void;
};

export default function Graph({
  pathRef,
  getUpdated,
  updatePan,
  locations,
  updatePreReqs,
  deleteCourse,
  setCourseInformations,
  viewCourse,
}: GraphInterface) {
  // TODO:
  //       get the prerequisite chain
  //       do something with the centering
  const backend = useApi();
  const gql = useGQL();
  const [path, setPath] = useState<[string, number[]][]>([]);
  const [startedTerm, setStartedTerm] = useState<number>(0);
  const [courseDict, setCourseDict] = useState<Map<number, string>>(new Map());

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
          semester[1].forEach((course) => {
            if (!course_ids.has(course)) course_ids.add(course);
          });
          const currTerm = termOperation(response.started_term_id, i);
          termIds.push({ value: currTerm, display: `${semester[0]} - ${getTermName(currTerm)}` });
        });
        pathRef.current = termIds;
        updatePan();

        const GQL_QUERY = `
                    query Course($course_ids: [Int!]!) {
                        course(where: { id: { _in: $course_ids } }) {
                            code
                            id
                            name
                            coreqs
                            prereqs
                            antireqs
                            prerequisites {
                                prerequisite_id
                                is_corequisite
                            }
                        }
                    }
                `;

        const gql_response = await gql(GQL_QUERY, { course_ids: Array.from(course_ids) });
        const newMap = new Map<number, string>();
        gql_response?.data?.course.forEach((course: GQLCoursePreReq) => {
          newMap.set(course.id, course.code);
        });
        setCourseInformations(gql_response.data.course);
        setCourseDict(newMap);
      }
    }

    initialSetup();
  }, [getUpdated]);

  return (
    <div className="flex gap-6 p-8">
      {path.map((semester, i) => {
        const termId = termOperation(startedTerm, i);
        const termName = `${getTermName(termOperation(startedTerm, i))} - ${semester[0]}`;
        return (
          <Semester
            key={i}
            semester={termName}
            termId={termId}
            class_lst={semester[1]}
            course_dict={courseDict}
            locations={locations}
            updatePreReqs={updatePreReqs}
            deleteCourse={(courseId, courseName) =>
              deleteCourse({ courseId, courseName, termId, termName })
            }
            viewCourse={viewCourse}
          />
        );
      })}
    </div>
  );
}
