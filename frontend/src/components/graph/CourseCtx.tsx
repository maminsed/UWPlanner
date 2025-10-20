import { createContext, useContext } from 'react';

import { CourseInformation, Location } from '../interface';

type CourseCtx = {
  courseDict: Map<number, string>;
  isHidden: (termId: number, courseId: number) => boolean;
  updateLocation: number;

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
  updateLocation: -1,
  // Cuorse Operations
  setCourseDict: () => {},
  deleteCourse: () => {},
  viewCourse: () => {},
  setLocation: () => {},
  setIsHidden: () => {},
});

export const useCourseCtx = () => useContext(CourseContext);
