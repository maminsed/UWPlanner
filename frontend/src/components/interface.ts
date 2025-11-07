export type termIdInterface = {
  value: number;
  display: string;
};

export type Pair = {
  x: number;
  y: number;
};

export type LineType = {
  startLoc: Pair;
  endLoc: Pair;
  startCourse: CourseInformation;
  endCourse: CourseInformation;
};

export type Location = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type CourseInformation = {
  termName?: string;
  courseName?: string;
  termId: number;
  courseId: number;
};

type LinkType = {
  value: string;
  url: string;
  linkType: 'courses' | 'programs' | 'external';
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

export type GQLCoursePreReq = {
  id: number;
  code: string;
  name: string;
  url: string;
  courseInfo: {
    prerequisites?: Requirement;
    antirequisites?: Requirement;
    corequisites?: Requirement;
    'cross-listed courses'?: LinkType[];
  };
};

export type ClassLocations = Map<number, Map<number, Location>>; // CourseId, termId, Location

export type DaysOfWeek = 'M' | 'T' | 'W' | 'Th' | 'F';

export type GQLMeeting = {
  days: DaysOfWeek[];
  end_date: string | null;
  end_seconds: number | null;
  location: string | null;
  prof_id: string | null;
  start_date: string | null;
  start_seconds: number | null;
};

export type GQLCourse = {
  code: string;
  name: string;
};

export type GQLCourseSection = {
  class_number: number;
  course_id: number;
  id: number;
  section_name: string;
  term_id: number;
  course: GQLCourse;
  meetings: GQLMeeting[];
};
