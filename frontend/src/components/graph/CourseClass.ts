import {
  BKCourseInfo,
  CourseInformation,
  CourseTermInfo,
  Location,
  TermInformation,
  UWFCourseInfo,
} from '../interface';
import { generateRandomColours } from '../utils/colour';
import { totalRequirementStatus } from '../utils/preReqUtils';
import { getTermSeason, termOperation } from '../utils/termUtils';

import { useApi } from '@/lib/useApi';
import useGQL from '@/lib/useGQL';

export class AllCourseInformation {
  // user Info
  #startingTermId: number;
  // maps and sets
  courseIds: Set<number>;
  courseInfoMap: Map<number, CourseInformation>;
  path: TermInformation[];
  #colourMap: Map<string, { bg: string; text: string }>; // CS: {bg: yellow, text: blue}
  //Update functions
  #updateCourseVisibility: () => void;
  #updateCourseLocations: () => void;
  #updatePanRef: () => void;
  // hooks
  #gql: ReturnType<typeof useGQL>;
  #backend: ReturnType<typeof useApi>;

  // initializers:
  constructor(
    updateCourseVisibility: () => void,
    updateCourseLocations: () => void,
    updatePanRef: () => void,
    gql: ReturnType<typeof useGQL>,
    backend: ReturnType<typeof useApi>,
  ) {
    this.courseIds = new Set();
    this.courseInfoMap = new Map();
    this.#startingTermId = 0;
    this.path = [];
    this.#colourMap = new Map();
    this.#updateCourseVisibility = updateCourseVisibility;
    this.#updateCourseLocations = updateCourseLocations;
    this.#updatePanRef = updatePanRef;
    this.#gql = gql;
    this.#backend = backend;
  }

  async init() {
    //TODO: wrap this whole thing in a try catch and if it failing anywhere just send it to a 500 page
    await this.#extractPath();
    // Fetch UWF course info (includes id, code, name, rating, and sections)
    const uwfResponse = await this.#extractFromUWF();

    // Build an array of course codes to request BK requirements in bulk
    const courseCodes = uwfResponse.map((course) => course.code);

    // Kick off BK request concurrently while we compute colours/other mappings
    const bkResponsePromise = this.#extractFromBK(courseCodes);

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
      this.courseInfoMap.set(course.id, {
        ...course,
        ...bkResponse[course.code]!, // BK info keyed by course code
        bgColour: colours[index]!.bg,
        textColour: colours[index]!.text,
        termInfo: new Map(), // populated below based on this.path
      });
    });

    // For each term in the student's path, mark the course as visible in that term
    this.path.forEach(({ termId, courseIds }) => {
      courseIds.map((courseId) => {
        const courseInfo = this.courseInfoMap.get(courseId)!;
        // Set term presence; visible defaults to true here
        courseInfo.termInfo.set(termId, { visible: true });
      });
    });
    this.#calculateReqStatus();

    this.#updateCourseVisibility();
    this.#updateCourseLocations();
    this.#updatePanRef();
  }

  async #extractPath() {
    try {
      const res = await this.#backend(
        `${process.env.NEXT_PUBLIC_API_URL}/update_info/get_user_seq?include_courses=true`,
      );
      if (!res.ok) throw new Error('error occured while retreiving student information');
      const response = await res.json().catch(() => {});

      const studentPath: [string, number[]][] = response.path;
      this.#startingTermId = response.started_term_id;

      let currTerm = this.#startingTermId;
      this.path = studentPath.map(([termName, courseIds]) => {
        const termId = currTerm;
        currTerm = termOperation(termId, 1);
        return {
          termId,
          termSeason: getTermSeason(termId),
          termName,
          courseIds,
        };
      });
      this.courseIds = new Set();
      studentPath.forEach(([, courseIds]) =>
        courseIds.forEach((courseId) => this.courseIds.add(courseId)),
      );
    } catch (err) {
      console.error(`error in #extractPath: ${err}`);
      throw err;
    }
  }

  async #extractFromUWF(): Promise<(UWFCourseInfo & { sections: { termId: number }[] })[]> {
    if (!this.courseIds.size) return [];

    const GQL_QUERY = `
        query Course($course_ids: [Int!]) {
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
    try {
      const response = await this.#gql(GQL_QUERY, { course_ids: Array.from(this.courseIds) });
      if (!response?.data?.course) {
        throw new Error('could not get information from GQL');
      }
      return response.data.course;
    } catch (err) {
      console.error(`error occured in #extractFromUWF: ${err}`);
      throw err;
    }
  }

  async #extractFromBK(courseCodes: string[]) {
    try {
      const res = await this.#backend(
        `${process.env.NEXT_PUBLIC_API_URL}/update_info/get_course_reqs`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ course_codes: courseCodes }),
        },
      );
      if (!res.ok) {
        throw new Error('Error in backend for fetching requirements');
      }
      const course_reqs: Record<string, BKCourseInfo> = (await res.json().catch(() => {})).courses;
      return course_reqs;
    } catch (err) {
      console.error(`error occured in #extractFromBk: ${err}`);
      throw err;
    }
  }

  async #calculateReqStatus() {
    for (const courseId of this.courseInfoMap.keys()) {
      const course = this.courseInfoMap.get(courseId)!;
      for (const termId of course.termInfo.keys()) {
        totalRequirementStatus(course.courseInfo, termId, courseId, this);
      }
    }
  }

  // getters and setters
  getCourseInfoId(courseId: number) {
    return this.courseInfoMap.get(courseId);
  }

  getCourseInfoCode(courseCode: string) {
    const course = [...this.courseInfoMap.entries()].find(
      ([, course]) => course.code === courseCode,
    );
    return course ? course[1] : undefined;
  }

  getTermsInfo(term: { termId?: number; termName?: string; position?: number }) {
    const { termId, termName, position } = term;
    if (termId === undefined && termName === undefined && position === undefined) {
      throw new Error('neither termId nor termName provided');
    }
    if (position !== undefined) return this.path[position];
    return this.path.find((term) => term.termId === termId || term.termName === termName);
  }

  getPath() {
    return this.path;
  }

  getVisibility(courseId: number, termId: number) {
    return this.courseInfoMap.get(courseId)?.termInfo.get(termId)?.visible;
  }

  getAllCourseLocations(courseId: number) {
    return this.courseInfoMap.get(courseId)?.termInfo || new Map<number, CourseTermInfo>();
  }

  setVisibilityGrouped(courseIds: number[], value: boolean) {
    for (const courseId of courseIds) {
      const course = this.courseInfoMap.get(courseId);
      if (course) course.termInfo.forEach((termInfo) => (termInfo.visible = value));
    }
    this.#updateCourseVisibility();
  }

  setVisibility(courseId: number, termId: number, value?: boolean) {
    // console.log('debug: updated')
    const course = this.courseInfoMap.get(courseId)?.termInfo.get(termId);
    if (course) {
      course.visible = value === undefined ? !course.visible : value;
    } else {
      throw new Error('course does not exist');
    }
    this.#updateCourseVisibility();
  }

  #locationsEqual(loc1: Location, loc2?: Location) {
    if (!loc2) return false;
    return (
      loc1.height === loc2.height &&
      loc1.top === loc2.top &&
      loc1.left === loc2.left &&
      loc1.width === loc2.width
    );
  }

  setLocation(loc: Location, courseId: number, termId: number) {
    // console.log('debug: updated')
    const course = this.courseInfoMap.get(courseId)?.termInfo.get(termId);
    if (course && !this.#locationsEqual(loc, course.location)) {
      course.location = loc;
    } else if (!course) {
      console.error(`course does not exist: ${courseId}`);
    }
  }

  async updateAllCourses() {
    //TODO: improve this with better version
    this.courseIds = new Set();
    this.courseInfoMap = new Map();
    await this.init();
    this.#updateCourseLocations();
  }

  /* 
  addCourses(courseId:number,termId:number) {
    const courseExists = this.courseInfoMap.get(courseId)?.termInfo.has(termId) || false;
    if (courseExists) return;
    this.courseIds.add(courseId);
    this.courseInfoMap = new Map();
    const term = this.path.find((term) => term.termId === termId)!;
    term.courseIds.push(courseId);
    
    this.init();
    this.#updateCourseVisibility();
  }
  */
  /*
  removeCoruse(courseId: number, termId: number) {
    const courseExists = this.courseInfoMap.get(courseId)?.termInfo.has(termId) || false;
    if (!courseExists) throw new Error('Course did not exist');
    const course = this.courseInfoMap.get(courseId)!;
    if (course.termInfo.size == 1) {
      this.courseIds.delete(courseId);
    }
    this.courseInfoMap = new Map();
    const term = this.path.find((term) => term.termId === termId)!;
    term.courseIds = term.courseIds.filter((ci) => courseId != ci);

    this.init();
    this.#updateCourseVisibility();
  }
  */
}
