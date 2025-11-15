//term

export type termIdInterface = {
  value: number;
  display: string;
};

//Location
export type Pair = {
  x: number;
  y: number;
};

export type LineType = {
  startLoc: Pair;
  endLoc: Pair;
  startCourse: { courseId: number; termId: number };
  endCourse: { courseId: number; termId: number };
};

export type Location = {
  left: number;
  top: number;
  width: number;
  height: number;
};

//CourseClass:
export type CourseTermInfo = {
  location?: Location;
  visible: boolean;
  allReqsMet?: boolean;
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
  met?: boolean;
};

export type UWFCourseInfo = {
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

export type BKCourseInfo = {
  url: string; // e.g uwaterloo.ca./academi...
  courseInfo: {
    prerequisites?: Requirement;
    antirequisites?: Requirement;
    corequisites?: Requirement;
    'cross-listed courses'?: LinkType[];
  };
};

export type CourseInformation = {
  termInfo: Map<number, CourseTermInfo>; // termId: CourseTermInfo
  bgColour: string;
  textColour: string;
} & BKCourseInfo &
  UWFCourseInfo;

export type TermInformation = {
  termId: number; //e.g. 1255
  termName: string; //e.g. 1A
  termSeason: string; //e.g. Fall 2025
  courseIds: number[]; //courseId[]
};

//Semester:
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
