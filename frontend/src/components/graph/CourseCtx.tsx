import { createContext, useContext } from 'react';

import { CourseInformation, Location } from '../interface';

type CourseCtx = {
  isHidden: (termId: number, courseId: number) => boolean;

  courseDict: Map<number, string>;
  deleteCourse: (courseInformation: CourseInformation) => void;
  viewCourse: (courseInformation: CourseInformation) => void;
  setIsHidden: (termId: number, courseId: number, value: boolean) => void;

  setCourseDict: React.Dispatch<Map<number, string>>;
  setLocation: (courseLocation: Location, termId: number, courseId: number) => void;
};

export const CourseContext = createContext<CourseCtx>({
  // Course Informatoin
  courseDict: new Map(),
  isHidden: () => false,
  // Cuorse Operations
  setCourseDict: () => {},
  deleteCourse: () => {},
  viewCourse: () => {},
  setLocation: () => {},
  setIsHidden: () => {},
});

export const useCourseCtx = () => useContext(CourseContext);
