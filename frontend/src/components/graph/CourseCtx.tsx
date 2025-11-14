import { createContext, useContext } from 'react';
type CourseCtx = {
  updateLocation: number;
  deleteCourse: (courseId: number, termId: number) => void;
  viewCourse: (courseId: number, termId: number) => void;
};

export const CourseContext = createContext<CourseCtx>({
  updateLocation: -1,
  // Cuorse Operations
  deleteCourse: () => {},
  viewCourse: () => {},
});

export const useCourseCtx = () => useContext(CourseContext);
