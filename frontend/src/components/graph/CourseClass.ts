import { Location } from '../interface';
import { generateRandomColours } from '../utils/colour';
import { getTermSeason, termOperation } from '../utils/termUtils';

import { useApi } from '@/lib/useApi';
import useGQL from '@/lib/useGQL';

type CourseLocation = {
  location?: Location;
  visible: boolean;
};

type LinkType = {
  value: string;
  url: string;
  linkType: 'courses' | 'programs' | 'external' | 'course';
};

export type Requirement = {
  conditionText: string;
  conditionedOn:
    | 'any'
    | 'two'
    | 'three'
    | 'four'
    | 'all'
    | 'not_all'
    | 'not_any'
    | 'final'
    | 'unclassified';
  conditionStatus: 'complete' | 'currently_enrolled' | 'both' | 'none';
  relatedLinks: LinkType[];
  appliesTo: Requirement[];
};

type UWFCourseInfo = {
  id: number;
  code: string; // e.g. CS135
  name: string; // e.g. Functional Programming
  description?: string; // e.g. in this course we...
  rating: {
    easy?: number; //less than 1
    liked?: number; //less than 1
    useful?: number; //less than 1
    filled_count?: number;
  };
};

type BKCourseInfo = {
  url: string; // e.g uwaterloo.ca./academi...
  courseInfo: {
    prerequisites?: Requirement;
    antirequisites?: Requirement;
    corequisites?: Requirement;
    'cross-listed courses'?: LinkType[];
  };
};

type CourseInformation = {
  termInfo: Map<number, CourseLocation>; // termId: CourseLocation
  bgColour: string;
  textColour: string;
} & BKCourseInfo &
  UWFCourseInfo;

type TermInformation = {
  termId: number; //e.g. 1255
  termName: string; //e.g. 1A
  termSeason: string; //e.g. Fall 2025
  courseIds: number[]; //courseId[]
};

export class AllCourseInformation {
  #courseIds: number[];
  #courseInfoMap: Map<number, CourseInformation>;
  #path: TermInformation[];
  #startingTermId: number;
  #colourMap: Map<string, { bg: string; text: string }>; // CS: {bg: yellow, text: blue}

  constructor(
    studentPath: [string, number[]][], //[1A, courseId[]][]
    startingTermId: number,
  ) {
    this.#courseIds = [];
    studentPath.forEach(([, courseIds]) => this.#courseIds.push(...courseIds));
    this.#courseInfoMap = new Map();
    this.#startingTermId = startingTermId;
    this.#path = this.#extractPath(studentPath);
    this.#colourMap = new Map();
  }

  async init(gql: ReturnType<typeof useGQL>, backend: ReturnType<typeof useApi>) {
    // Fetch UWF course info (includes id, code, name, rating, and sections)
    const uwfResponse = await this.#extractFromUWF(gql);

    // Build an array of course codes to request BK requirements in bulk
    const courseCodes = uwfResponse.map((course) => course.code);

    // Kick off BK request concurrently while we compute colours/other mappings
    const bkResponsePromise = this.#extractFromBK(courseCodes, backend);

    // Generate or reuse a colour for each course based on its subject prefix.
    // Example: "CS135" => "CS". This keeps all CS courses with the same palette.
    const colours = uwfResponse.map((course) => {
      // find first non-letter to isolate the subject prefix
      const firstNonLetter = course.code.search(/[^a-zA-Z]/);
      const striped = firstNonLetter === -1 ? course.code : course.code.slice(0, firstNonLetter);

      // ensure a consistent colour mapping exists for this subject
      if (!this.#colourMap.has(striped)) {
        this.#colourMap.set(striped, generateRandomColours());
      }
      const bg = this.#colourMap.get(striped)!.bg;
      const text = this.#colourMap.get(striped)!.text;
      return { bg, text };
    });

    // Await the backend response (requirements / links)
    const bkResponse = await bkResponsePromise;

    // Merge UWF + BK info and initialise termInfo for each course
    uwfResponse.forEach((course, index) => {
      this.#courseInfoMap.set(course.id, {
        ...course,
        ...bkResponse[course.code]!, // BK info keyed by course code
        bgColour: colours[index]!.bg,
        textColour: colours[index]!.text,
        termInfo: new Map(), // populated below based on this.#path
      });
    });

    // For each term in the student's path, mark the course as visible in that term
    this.#path.forEach(({ termId, courseIds }) => {
      courseIds.map((courseId) => {
        const courseInfo = this.#courseInfoMap.get(courseId)!;
        // Set term presence; visible defaults to true here
        courseInfo.termInfo.set(termId, { visible: true });
      });
    });
  }

  #extractPath(studentPath: [string, number[]][]) {
    let currTerm = this.#startingTermId;
    return studentPath.map(([termName, courseIds]) => {
      const termId = currTerm;
      currTerm = termOperation(termId, 1);
      return {
        termId,
        termSeason: getTermSeason(termId),
        termName,
        courseIds,
      };
    });
  }

  async #extractFromUWF(
    gql: ReturnType<typeof useGQL>,
  ): Promise<(UWFCourseInfo & { sections: { termId: number }[] })[]> {
    if (!this.#courseIds.length) return [];
    // const gql = useGQL();
    const GQL_QUERY = `
        query Course($course_id: Int!) {
          course(where: { id: { _in: $course_ids } }) {
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
                  term_id
              }
          }
      }
      `;
    const response = await gql(GQL_QUERY, { course_ids: this.#courseIds });
    if (!response?.data?.course) {
      throw new Error('could not get information from GQL');
    }
    return response.data.course;
  }

  async #extractFromBK(courseCodes: string[], backend: ReturnType<typeof useApi>) {
    const res = await backend(`${process.env.NEXT_PUBLIC_API_URL}/update_info/get_course_reqs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course_codes: courseCodes }),
    });
    if (!res.ok) {
      throw new Error('Error in backend for fetching requirements');
    }
    const course_reqs: Record<string, BKCourseInfo> = (await res.json().catch(() => {})).courses;
    return course_reqs;
  }
}
