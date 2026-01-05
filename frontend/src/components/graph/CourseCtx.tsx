import { createContext, useContext } from 'react';
type CourseCtx = {
  updateLocation: number;
  deleteCourse: (info: {
    courseId?: number;
    termId?: number;
    groupOfCourses?: { termId: number; courseId: number }[];
  }) => void;
  addToTerm: (termId: number) => void;
  viewCourse: (courseId: number, termId: number) => void;
};

export const CourseContext = createContext<CourseCtx>({
  updateLocation: -1,
  // Cuorse Operations
  deleteCourse: () => {},
  addToTerm: () => {},
  viewCourse: () => {},
});

export const useCourseCtx = () => useContext(CourseContext);
