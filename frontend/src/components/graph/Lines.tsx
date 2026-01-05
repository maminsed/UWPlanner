import { LineType } from '../interface';

import { AllCourseInformation } from './CourseClass';

type LinesProps = {
  connections: LineType[];
  allCourses: AllCourseInformation;
};

type CourseType = {
  courseId: number;
  termId: number;
};

export default function Lines({ connections, allCourses }: LinesProps) {
  function isHidden(start: CourseType, end: CourseType) {
    const endReqsOn = allCourses.getReqsOn(end.courseId, end.termId);
    const startReqsOn = allCourses.getReqsOn(start.courseId, start.termId);
    if (endReqsOn || startReqsOn) return false;
    return !allCourses.getVisibility(end.courseId, end.termId);
  }

  function getColour(start: CourseType, end: CourseType) {
    if (isHidden(start, end)) {
      return '#34d9ef61';
    }
    return allCourses.getCourseInfoId(end.courseId)?.colour.line || '#349EEF';
  }

  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="absolute top-0 left-0 w-full h-full -z-1">
      {connections.map(({ startLoc, endLoc, endCourse, startCourse }, i) => {
        const width = endLoc.x - startLoc.x;
        return (
          <path
            key={i}
            d={`M ${startLoc.x} ${startLoc.y} C ${startLoc.x + width * 0.5} ${startLoc.y} ${endLoc.x - width * 0.5} ${endLoc.y} ${endLoc.x} ${endLoc.y}`}
            stroke={getColour(startCourse, endCourse)}
            opacity={0.9}
            strokeWidth="3"
            fill="none"
          />
        );
      })}
    </svg>
  );
}
