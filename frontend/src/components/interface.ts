export type termIdInterface = {
  value: number;
  display: string;
};

export type Pair = {
  x: number;
  y: number;
};

export type Location = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type CourseInformation = {
  termName: string;
  courseName: string;
  termId: number;
  courseId: number;
};

export type GQLCoursePreReq = {
  id: number;
  code: string;
  prereqs: string;
  coreqs: string;
  antireqs: string;
  prerequisites: {
    prerequisite_id: number;
    is_corequisite: boolean;
  }[];
};

export type ClassLocations = Map<number, Map<number, Location>>;

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
