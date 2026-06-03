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
  /**
   * Creates the course graph data manager and wires in the React update callbacks
   * plus request helpers it needs later.
   *
   * The class itself is not a React component, so every time it mutates graph
   * state it calls one of these callback functions to tell the component tree
   * which part of the UI should be recalculated or re-rendered.
   *
   * @param updateCourseVisibility Triggers re-rendering of visible courses and prerequisite lines.
   * @param updateCourseLocations Triggers recalculation of measured course-card locations.
   * @param updatePanRef Triggers graph pan/viewport setup after initial data is loaded.
   * @param gql GraphQL request function used for course and section information.
   * @param backend Authenticated REST request function used for user-specific planner data.
   */
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

  /**
   * Loads all data needed to draw the planner graph for the current student.
   *
   * The initialization sequence is:
   * 1. Fetch the student's term-by-term path and collect every planned course id.
   * 2. Fetch public course metadata from UWF GraphQL.
   * 3. Fetch backend requirement data and degree/program data from BK in parallel.
   * 4. Assign a stable colour palette per subject prefix, such as all "CS" courses.
   * 5. Merge UWF and BK records into `courseInfoMap`.
   * 6. Populate each course's per-term visibility and requirement state.
   * 7. Calculate requirement compatibility and notify the graph UI to refresh.
   *
   * This method mutates `startingTermId`, `path`, `courseIds`, `courseInfoMap`,
   * `#studentDegrees`, requirement status fields, and update callbacks.
   *
   * @throws Re-throws any backend or GraphQL failure from the extraction helpers.
   */
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

  /**
   * Loads the student's scheduled class meetings for one academic term.
   *
   * The backend stores the user's selected section class numbers. If the term is
   * known to have no section data, this method intentionally skips the section
   * lookup and only reports planned courses as missing from the schedule. For
   * normal terms it resolves selected sections through GraphQL, separates real
   * meeting times from sections with no meeting rows, and then compares those
   * scheduled course ids against the backend's course list to find courses that
   * still need a section assignment.
   *
   * Side effects:
   * - Clears and repopulates `scheduleClasses`.
   * - Clears and repopulates `noMeetingSections`.
   * - Clears and repopulates `missingCourses`.
   * - Updates `sectionsUnavailableForTerm`.
   *
   * @param termId Waterloo numeric term id to load schedule data for.
   */
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

  /**
   * Resolves selected class numbers into schedule-ready meeting records.
   *
   * GraphQL returns one course section with zero or more meeting rows. Sections
   * without meetings are preserved separately so the UI can still show that the
   * student selected a section, even though it cannot be placed on a calendar.
   * Sections with meetings are flattened into `ClassInterface` rows, one per
   * unique meeting. Consecutive duplicate rows are ignored because GraphQL can
   * return repeated meeting records for the same section/time combination.
   *
   * @param sections Class numbers selected by the student for this term.
   * @param termId Waterloo numeric term id used to constrain the section query.
   * @returns Calendar meeting rows plus selected sections that have no meetings.
   */
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

  /**
   * Fetches lightweight course records for ids that exist in the plan but are
   * not represented by any scheduled section.
   *
   * This is used by schedule views to display missing course names/codes without
   * needing to load full requirement metadata again.
   *
   * @param course_ids Course ids that need display metadata.
   * @returns Basic course records containing id, code, and name.
   */
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

  /**
   * Fetches the student's saved academic path and converts it into local term
   * objects used by the graph.
   *
   * The backend returns path entries as term labels plus course ids, while this
   * class also needs concrete term ids and seasons. Starting from
   * `started_term_id`, the method advances one term at a time with
   * `termOperation`, producing the `path` array that drives semester columns.
   * It also rebuilds `courseIds` as a de-duplicated set of every course appearing
   * anywhere in the path.
   *
   * @throws If the backend request fails or the response cannot be used.
   */
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

  /**
   * Fetches public course metadata for every course currently in `courseIds`.
   *
   * UWF GraphQL provides the course identity, description, ratings, available
   * section terms, and postrequisite links. Requirement text is intentionally not
   * loaded here because BK data is fetched separately by course code.
   *
   * @returns UWF course records with distinct section term ids.
   * @throws If the GraphQL response is missing course data or the request fails.
   */
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

  /**
   * Fetches requirement metadata from the backend/BK service for course codes.
   *
   * The backend accepts a batch of course codes and returns a record keyed by
   * code. Those records are later merged into the UWF course objects so graph
   * nodes can expose both public metadata and parsed requirement information.
   *
   * @param courseCodes Course codes such as `CS135` or `MATH137`.
   * @returns Requirement metadata keyed by course code.
   * @throws If the backend request fails or returns a non-OK response.
   */
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

  /**
   * Fetches the student's declared programs/degrees from the backend/BK service.
   *
   * Requirement evaluation can depend on the student's program context, so this
   * method stores the returned program list in `#studentDegrees` before
   * `#calculateReqStatus` runs.
   *
   * @throws If the backend request fails or returns a non-OK response.
   */
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

  /**
   * Recomputes requirement compatibility and prerequisite connection pairs.
   *
   * For each course-term placement, `totalRequirementStatus` updates the nested
   * requirement state on the course and returns ids for courses that should have
   * prerequisite-style lines drawn into the current course. This method stores
   * those pairs in `#connectingIds`; `generateConnectionLines` later turns them
   * into drawable line coordinates once course card locations are known.
   *
   * It also marks `termCompatible` by comparing the course's available section
   * terms against the planned term season. Waterloo term ids share their season
   * in the final digit, so `term_id % 10 === termId % 10` checks whether a course
   * has historically been offered in the same season.
   */
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

  /**
   * Converts prerequisite course-id pairs into drawable connection lines.
   *
   * This should be called after course card DOM locations have been measured.
   * The helper uses `#connectingIds` plus this class's location data to build the
   * `LineType` objects consumed by the graph line renderer, then notifies the UI
   * that visibility-dependent drawing should refresh.
   */
  async generateConnectionLines() {
    this.#connectionLines = generateConnectionLines(this.#connectingIds, this);
    this.#updateCourseVisibility();
  }

  // getters and setters
  /**
   * Looks up the merged course information for a course id.
   *
   * @param courseId UWF course id.
   * @returns Course information if the id is currently loaded.
   */
  getCourseInfoId(courseId: number) {
    return this.courseInfoMap.get(courseId);
  }

  /**
   * Looks up merged course information by exact course code.
   *
   * The current comparison is case-sensitive and expects the same code format
   * stored in `courseInfoMap`, such as `CS135`.
   *
   * @param courseCode Course code to search for.
   * @returns Course information if the code is currently loaded.
   */
  getCourseInfoCode(courseCode: string) {
    const course = [...this.courseInfoMap.entries()].find(
      ([, course]) => course.code === courseCode,
    );
    return course ? course[1] : undefined;
  }

  /**
   * Retrieves one term from the student's path by id, name, or array position.
   *
   * `position` takes precedence because it is an exact index lookup. Otherwise
   * the method searches by matching either `termId` or `termName`.
   *
   * @param term Lookup object containing at least one of `termId`, `termName`, or `position`.
   * @returns The matching term information, or `undefined` if no term matches.
   * @throws If no lookup field is provided.
   */
  getTermsInfo(term: { termId?: number; termName?: string; position?: number }) {
    const { termId, termName, position } = term;
    if (termId === undefined && termName === undefined && position === undefined) {
      throw new Error('neither termId nor termName provided');
    }
    if (position !== undefined) return this.path[position];
    return this.path.find((term) => term.termId === termId || term.termName === termName);
  }

  /**
   * Returns the current ordered academic path.
   *
   * The returned array is the live in-memory path used by the graph; callers
   * should treat it as read-only unless they are deliberately coordinating with
   * this class's mutation methods.
   *
   * @returns Term information in display order.
   */
  getPath() {
    return this.path;
  }

  /**
   * Returns the currently generated prerequisite/corequisite line models.
   *
   * These line objects are based on the latest known card locations. They may be
   * stale until `generateConnectionLines` has run after a layout update.
   *
   * @returns Drawable connection lines for the graph renderer.
   */
  getConnectionLines() {
    return this.#connectionLines;
  }

  /**
   * Returns every term-specific state object for a loaded course.
   *
   * Each entry stores UI visibility, requirement highlighting, compatibility,
   * and measured card location for one term placement of the course.
   *
   * @param courseId UWF course id.
   * @returns The course's term-info map, or an empty map if the course is unknown.
   */
  getAllCourseLocations(courseId: number) {
    return this.courseInfoMap.get(courseId)?.termInfo || new Map<number, CourseTermInfo>();
  }

  /**
   * Checks whether requirement highlighting is active for a specific course-term
   * placement.
   *
   * The global `#ReqsOnCount` guard ensures this only returns true when at least
   * one placement is actively driving requirement mode.
   *
   * @param courseId UWF course id.
   * @param termId Waterloo numeric term id.
   * @returns Whether this placement is currently shown as requirement-active.
   */
  getReqsOn(courseId: number, termId: number) {
    return (
      (this.#ReqsOnCount && this.courseInfoMap.get(courseId)?.termInfo.get(termId)?.reqsOn) || false
    );
  }

  /**
   * Toggles or sets requirement-highlight mode for a specific course placement.
   *
   * When the first placement enters requirement mode, all courses are hidden so
   * the prerequisite/requisite context can be shown selectively. The selected
   * placement is then made visible and marked `reqsOn`. When a placement leaves
   * requirement mode, the global count is decremented so other active placements
   * can keep the graph in requirement mode until they are cleared too.
   *
   * @param courseId UWF course id.
   * @param termId Waterloo numeric term id for the placement.
   * @param value Optional explicit state; omitted means toggle the current value.
   */
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

  /**
   * Returns whether a course placement is currently visible on the graph.
   *
   * @param courseId UWF course id.
   * @param termId Waterloo numeric term id for the placement.
   * @returns Current visibility state, or false if the placement is unknown.
   */
  getVisibility(courseId: number, termId: number) {
    return this.courseInfoMap.get(courseId)?.termInfo.get(termId)?.visible || false;
  }

  /**
   * Clears requirement mode while a visibility change is being applied.
   *
   * Any manual visibility change should leave the graph in normal visibility
   * mode. This helper clears the specific term's `reqsOn` flag, and if global
   * requirement mode is active it resets the global count and removes `reqsOn`
   * from every loaded placement.
   *
   * @param termInfo Term-specific state object currently being changed.
   */
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

  /**
   * Sets visibility for every term placement of a group of courses.
   *
   * This is used for bulk graph actions, such as hiding all loaded courses when
   * entering requirement mode. Every affected placement also clears requirement
   * mode through `#setReqOnWhileSettingVisibility`, then the UI is notified once
   * after the batch mutation completes.
   *
   * @param courseIds Course ids whose placements should be updated.
   * @param value New visibility value for every placement.
   */
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

  /**
   * Toggles or sets visibility for one course placement.
   *
   * A manual visibility change exits requirement mode because the user is now
   * directly controlling what appears on the graph. The method throws for
   * unknown placements so callers catch stale graph state during development.
   *
   * @param courseId UWF course id.
   * @param termId Waterloo numeric term id for the placement.
   * @param value Optional explicit state; omitted means toggle the current value.
   * @throws If the course-term placement is not loaded.
   */
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

  /**
   * Updates the graph zoom scale used by layout calculations.
   *
   * The scale value is stored here so components measuring course card positions
   * can account for zoom. Location recalculation is skipped if the value did not
   * actually change.
   *
   * @param scale New graph scale factor.
   */
  setScale(scale: number) {
    if (this.scale === scale) return;
    this.scale = scale;
    this.#updateCourseLocations();
  }

  /**
   * Compares two measured course-card rectangles.
   *
   * This prevents redundant location writes and line recalculations when a React
   * layout effect reports the same DOM bounds repeatedly.
   *
   * @param loc1 Newly measured location.
   * @param loc2 Previously stored location, if any.
   * @returns True when both rectangles have identical dimensions and position.
   */
  #locationsEqual(loc1: Location, loc2?: Location) {
    if (!loc2) return false;
    return (
      loc1.height === loc2.height &&
      loc1.top === loc2.top &&
      loc1.left === loc2.left &&
      loc1.width === loc2.width
    );
  }

  /**
   * Stores the latest measured location for a course placement and updates any
   * existing connection lines attached to that placement.
   *
   * Course cards connect from the right edge when they are a line's start course
   * and to the left edge when they are a line's end course. When the stored
   * location changes, this method adjusts those line endpoints immediately and
   * then refreshes graph visibility so the line renderer receives the new data.
   *
   * @param loc Measured card rectangle in graph coordinates.
   * @param courseId UWF course id.
   * @param termId Waterloo numeric term id for the placement.
   */
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

  /**
   * Registers the callback used to force a full graph refresh.
   *
   * Most mutations only need visibility or location updates. Semester swaps also
   * change the path/term structure itself, so they call this broader graph
   * update callback after local data is rearranged.
   *
   * @param updateFn Callback supplied by the graph component.
   */
  setUpdateGraph(updateFn: () => void) {
    this.#updateGraph = updateFn;
  }

  //general functions
  /**
   * Reloads all course graph data from the backend and GraphQL services.
   *
   * This resets local course caches, colour assignments, requirement mode, and
   * zoom before running the same initialization flow used on first load. It is a
   * heavier refresh path intended for cases where the saved planner has changed
   * enough that incremental mutation would be error-prone.
   *
   * Side effects include rebuilding `courseIds`, `courseInfoMap`, `#colourMap`,
   * `path`, requirement status, and measured-location refreshes.
   */
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

  /**
   * Swaps the courses assigned to two terms both remotely and locally.
   *
   * The backend is updated first so the saved planner remains the source of
   * truth. If either term is missing locally after the backend succeeds, the
   * method falls back to a full reload. Otherwise it swaps each term's course id
   * list, moves every affected course's `termInfo` entry to the opposite term,
   * swaps work-term labels when needed, recalculates requirement status, and
   * refreshes the graph.
   *
   * After React has a short chance to remeasure moved course cards, connection
   * lines are regenerated so prerequisite lines point to the new positions.
   *
   * @param termId1 First Waterloo numeric term id.
   * @param termId2 Second Waterloo numeric term id.
   * @returns True when the backend swap succeeds, false when it fails.
   */
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

  /**
   * Moves a set of courses from one term id to another in local course state.
   *
   * This updates each course's `termInfo` map after a semester swap. New entries
   * start visible with requirement mode off because the swap itself should leave
   * the graph in its normal viewing state.
   *
   * @param courses Course ids currently associated with the previous term.
   * @param prevTermId Term id to remove from each course's `termInfo`.
   * @param newTermId Term id to add to each course's `termInfo`.
   */
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
