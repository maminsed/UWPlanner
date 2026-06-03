import {
  BKCourseInfo,
  CourseInformation,
  CourseTermInfo,
  Location,
  TermInformation,
  UWFCourseInfo,
  LineType,
  ClassInterface,
  GQLCourseSection,
} from '../interface';
import { generateRandomColours } from '../utils/colour';
import { generateConnectionLines, totalRequirementStatus } from '../utils/preReqUtils';
import { getTermSeason, termOperation, isTermWithoutSection } from '../utils/termUtils';

import { appLogger } from '@/lib/logger';
import { useApi } from '@/lib/useApi';
import useGQL from '@/lib/useGQL';

export class AllCourseInformation {
  // user Info
  startingTermId: number = 0;
  // maps and sets
  courseIds: Set<number> = new Set();
  courseInfoMap: Map<number, CourseInformation> = new Map();
  path: TermInformation[] = [];
  #colourMap: Map<string, { bg: string; text: string; line: string }> = new Map(); // CS: {bg: yellow, text: blue}
  #connectingIds: [number, number][] = [];
  #connectionLines: LineType[] = [];
  //Update functions
  #updateCourseVisibility: () => void;
  #updateCourseLocations: () => void;
  #updatePanRef: () => void;
  #updateGraph: () => void = () => {};
  // hooks
  #gql: ReturnType<typeof useGQL>;
  #backend: ReturnType<typeof useApi>;
  //general state variables
  #ReqsOnCount = 0;
  scale = 1;
  // degree information:
  #studentDegrees: { name: string; url: string }[] = [];

  // schedule information:
  scheduleClasses: ClassInterface[] = [];
  noMeetingSections: {
    id: number;
    code: string;
    name: string;
    sectionName: string;
    courseId: number;
  }[] = [];
  missingCourses: { id: number; code: string; name: string }[] = [];
  sectionsUnavailableForTerm = false;

  // initializers:
  constructor(
    updateCourseVisibility: () => void = () => {},
    updateCourseLocations: () => void = () => {},
    updatePanRef: () => void = () => {},
    gql: ReturnType<typeof useGQL>,
    backend: ReturnType<typeof useApi>,
  ) {
    this.#updateCourseVisibility = updateCourseVisibility;
    this.#updateCourseLocations = updateCourseLocations;
    this.#updatePanRef = updatePanRef;
    this.#gql = gql;
    this.#backend = backend;
  }

  async init() {
    await this.#extractPath();
    // Fetch UWF course info (includes id, code, name, rating, and sections)
    const uwfResponse = await this.#extractFromUWF();

    // Build an array of course codes to request BK requirements in bulk
    const courseCodes = uwfResponse.map((course) => course.code);

    // Kick off BK request concurrently while we compute colours/other mappings
    const bkResponsePromise = this.#extractFromBK(courseCodes);
    const bkDegreePromise = this.#getDegreefromBK();

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
      const colour = this.#colourMap.get(striped);
      return colour!;
    });

    // Await the backend response (requirements / links)
    const bkResponse = await bkResponsePromise;
    await bkDegreePromise;

    // Merge UWF + BK info and initialise termInfo for each course
    uwfResponse.forEach((course, index) => {
      this.courseInfoMap.set(course.id, {
        ...course,
        ...bkResponse[course.code]!, // BK info keyed by course code
        colour: colours[index]!,
        termInfo: new Map(), // populated below based on this.path
      });
    });

    // For each term in the student's path, mark the course as visible in that term
    this.path.forEach(({ termId, courseIds }) => {
      courseIds.map((courseId) => {
        const courseInfo = this.courseInfoMap.get(courseId)!;
        // Set term presence; visible defaults to true here
        courseInfo.termInfo.set(termId, { visible: true, reqsOn: false });
      });
    });
    this.#calculateReqStatus();

    this.#updateCourseVisibility();
    this.#updateCourseLocations();
    this.#updatePanRef();
  }

  async initSchedule(termId: number) {
    this.scheduleClasses = [];
    this.noMeetingSections = [];
    this.missingCourses = [];
    this.sectionsUnavailableForTerm = isTermWithoutSection(termId);

    const res = await this.#backend(
      `${process.env.NEXT_PUBLIC_API_URL}/courses/get_user_sections`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term_id: termId }),
      },
    );

    if (!res?.ok) {
      appLogger.error('Failed to fetch user sections', { status: res?.status });
      return;
    }

    const response = (await res.json().catch(() => ({}))) as {
      sections?: number[];
      courses?: number[];
    };
    const sections: number[] = this.sectionsUnavailableForTerm ? [] : response.sections || [];
    const course_ids: number[] = response.courses || [];

    let fetchedData: ClassInterface[] = [];
    let noMeetingData: {
      id: number;
      code: string;
      name: string;
      sectionName: string;
      courseId: number;
    }[] = [];

    if (sections.length > 0) {
      const { classesData, noMeeting } = await this.#getGqlClassInformation(sections, termId);
      fetchedData = classesData;
      noMeetingData = noMeeting;
    }

    this.scheduleClasses = fetchedData;
    this.noMeetingSections = noMeetingData;

    const scheduledCourseIds = new Set([
      ...fetchedData.map((c) => c.courseId),
      ...noMeetingData.map((c) => c.courseId),
    ]);
    const missingCourseIds = course_ids.filter((id) => !scheduledCourseIds.has(id));

    if (missingCourseIds.length > 0) {
      this.missingCourses = await this.#getGQLCourseInfo(missingCourseIds);
    } else {
      this.missingCourses = [];
    }
  }

  async #getGqlClassInformation(sections: number[], termId: number) {
    const GQL_QUERY = `
      query Course_section($sections: [Int!]!, $termId: Int!) {
        course_section(where: { class_number: { _in: $sections }, term_id: { _eq: $termId } }) {
          class_number
          course_id
          id
          section_name
          term_id
          course { code name }
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
    const gql_response = await this.#gql(GQL_QUERY, { sections, termId });
    const data: ClassInterface[] = [];
    const noMeetingData: {
      id: number;
      code: string;
      name: string;
      sectionName: string;
      courseId: number;
    }[] = [];

    gql_response?.data?.course_section.forEach((section: GQLCourseSection) => {
      if (!section.meetings || section.meetings.length === 0) {
        noMeetingData.push({
          id: section.id,
          code: section.course.code,
          name: section.course.name,
          sectionName: section.section_name,
          courseId: section.course_id,
        });
      } else {
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
          if (JSON.stringify(prevSection) !== JSON.stringify(newSection)) {
            data.push(newSection);
          }
        });
      }
    });
    return { classesData: data, noMeeting: noMeetingData };
  }

  async #getGQLCourseInfo(course_ids: number[]) {
    if (course_ids.length === 0) return [];
    const GQL_QUERY = `
      query Courses($course_ids: [Int!]!) {
        course(where: { id: { _in: $course_ids } }) {
          id
          code
          name
        }
      }
    `;
    const res = await this.#gql(GQL_QUERY, { course_ids });
    return (res?.data?.course || []) as { id: number; code: string; name: string }[];
  }

  async #extractPath() {
    try {
      const res = await this.#backend(
        `${process.env.NEXT_PUBLIC_API_URL}/update_info/get_user_seq?include_courses=true`,
      );
      if (!res.ok) throw new Error('error occured while retreiving student information');
      const response = await res.json().catch(() => {});

      const studentPath: [string, number[]][] = response.path;
      this.startingTermId = response.started_term_id;

      let currTerm = this.startingTermId;
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
      appLogger.error('Failed to extract user path', {
        error: err instanceof Error ? err.message : String(err),
      });
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
          postrequisites {
            is_corequisite
            postrequisite {
                code
                name
                id
            }
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
      appLogger.error('Failed to extract course data from GraphQL', {
        error: err instanceof Error ? err.message : String(err),
      });
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
      appLogger.error('Failed to extract course requirements from backend', {
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  async #getDegreefromBK() {
    try {
      const res = await this.#backend(
        `${process.env.NEXT_PUBLIC_API_URL}/update_info/get_degree_info`,
      );
      if (!res.ok) {
        throw new Error('Error in backend for fetching programs');
      }
      this.#studentDegrees = (await res.json().catch(() => {})).programs;
    } catch (err) {
      appLogger.error('Failed to extract degree data from backend', {
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  async #calculateReqStatus() {
    this.#connectingIds = [];
    for (const courseId of this.courseInfoMap.keys()) {
      const course = this.courseInfoMap.get(courseId)!;
      let dependentCourses = undefined;
      for (const [termId, term] of course.termInfo.entries()) {
        const res = totalRequirementStatus(
          course.courseInfo,
          termId,
          courseId,
          this,
          this.#studentDegrees,
        );
        if (dependentCourses === undefined) dependentCourses = res;
        term.termCompatible = course.sections.some(({ term_id }) => term_id % 10 === termId % 10);
      }
      dependentCourses?.forEach((preReqId) => {
        this.#connectingIds.push([preReqId, courseId]);
      });
    }
  }

  async generateConnectionLines() {
    this.#connectionLines = generateConnectionLines(this.#connectingIds, this);
    this.#updateCourseVisibility();
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

  getConnectionLines() {
    return this.#connectionLines;
  }

  getAllCourseLocations(courseId: number) {
    return this.courseInfoMap.get(courseId)?.termInfo || new Map<number, CourseTermInfo>();
  }

  getReqsOn(courseId: number, termId: number) {
    return (
      (this.#ReqsOnCount && this.courseInfoMap.get(courseId)?.termInfo.get(termId)?.reqsOn) || false
    );
  }

  setReqsOn(courseId: number, termId: number, value?: boolean) {
    const course = this.courseInfoMap.get(courseId)?.termInfo.get(termId);
    if (!course) return;
    value = (value === undefined ? !course.reqsOn : value) as boolean;
    if (value != course.reqsOn) {
      if (this.#ReqsOnCount == 0 && value) {
        this.setVisibilityGrouped(Array.from(this.courseIds), false);
      }
      this.#ReqsOnCount += value ? 1 : -1;
    }
    course.reqsOn = value;
    course.visible = value;

    this.#updateCourseVisibility();
  }

  getVisibility(courseId: number, termId: number) {
    return this.courseInfoMap.get(courseId)?.termInfo.get(termId)?.visible || false;
  }

  #setReqOnWhileSettingVisibility(termInfo: CourseTermInfo) {
    termInfo.reqsOn = false;
    if (this.#ReqsOnCount) {
      this.#ReqsOnCount = 0;
      for (const course of this.courseInfoMap.values()) {
        for (const term of course.termInfo.values()) {
          if (term.reqsOn) term.reqsOn = false;
        }
      }
    }
  }

  setVisibilityGrouped(courseIds: number[], value: boolean) {
    for (const courseId of courseIds) {
      const course = this.courseInfoMap.get(courseId);
      if (course) {
        course.termInfo.forEach((termInfo) => {
          termInfo.visible = value;
          this.#setReqOnWhileSettingVisibility(termInfo);
        });
      }
    }
    this.#updateCourseVisibility();
  }

  setVisibility(courseId: number, termId: number, value?: boolean) {
    const course = this.courseInfoMap.get(courseId)?.termInfo.get(termId);
    if (course) {
      course.visible = value === undefined ? !course.visible : value;
      this.#setReqOnWhileSettingVisibility(course);
    } else {
      throw new Error('course does not exist');
    }
    this.#updateCourseVisibility();
  }

  setScale(scale: number) {
    if (this.scale === scale) return;
    this.scale = scale;
    this.#updateCourseLocations();
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
    const course = this.courseInfoMap.get(courseId)?.termInfo.get(termId);
    if (course && !this.#locationsEqual(loc, course.location)) {
      course.location = loc;
      let updated = false;
      this.#connectionLines.forEach((connection) => {
        const { startCourse, endCourse } = connection;
        if (startCourse.courseId == courseId && startCourse.termId == termId) {
          updated = true;
          connection.startLoc = {
            x: loc.left + loc.width,
            y: loc.top + loc.height / 2,
          };
        } else if (endCourse.courseId == courseId && endCourse.termId == termId) {
          updated = true;
          connection.endLoc = {
            x: loc.left,
            y: loc.top + loc.height / 2,
          };
        }
      });
      this.#updateCourseVisibility();
    } else if (!course) {
      appLogger.error('Course term info does not exist', { courseId, termId });
    }
  }

  setUpdateGraph(updateFn: () => void) {
    this.#updateGraph = updateFn;
  }

  //general functions
  async updateAllCourses() {
    //TODO: improve this with more efficient version
    this.courseIds = new Set();
    this.courseInfoMap = new Map();
    this.#colourMap = new Map();
    this.#ReqsOnCount = 0;
    this.scale = 1;
    await this.init();
    this.#updateCourseLocations();
  }

  async swapSemesters(termId1: number, termId2: number): Promise<boolean> {
    const res = await this.#backend(`${process.env.NEXT_PUBLIC_API_URL}/update_info/update_terms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ termId1, termId2 }),
    });

    if (!res.ok) {
      appLogger.error('Failed to swap semesters', { status: res.status });
      return false;
    }
    const term1 = this.path.find((term) => term.termId == termId1);
    const term2 = this.path.find((term) => term.termId == termId2);
    if (!term1 || !term2) {
      await this.updateAllCourses();
      return true;
    }

    const term1Ids = term1.courseIds;
    term1.courseIds = term2.courseIds;
    term2.courseIds = term1Ids;

    this.#setToTerm(term2.courseIds, termId1, termId2);
    this.#setToTerm(term1.courseIds, termId2, termId1);

    if (term1.termName.startsWith('WT') !== term2.termName.startsWith('WT')) {
      const term1Name = term1.termName;
      term1.termName = term2.termName;
      term2.termName = term1Name;
    }
    this.#calculateReqStatus();
    this.#updateGraph();

    this.#updateCourseLocations();
    this.#updateCourseVisibility();

    await new Promise((resolve) =>
      setTimeout(() => {
        resolve(0);
      }, 200),
    );
    this.generateConnectionLines();
    this.#updateCourseVisibility();
    return true;
  }

  #setToTerm(courses: number[], prevTermId: number, newTermId: number) {
    for (const courseId of courses) {
      const course = this.getCourseInfoId(courseId);
      if (!course) continue;
      course.termInfo.set(newTermId, { visible: true, reqsOn: false });
      course.termInfo.delete(prevTermId);
    }
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
