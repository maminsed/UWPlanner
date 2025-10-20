import { CourseInformation, LineType } from '../interface';

type LinesProps = {
  connections: LineType[];
  hiddenStatus: Map<number, Map<number, boolean>>;
};

export default function Lines({ connections, hiddenStatus }: LinesProps) {
  function isHidden(termId: number, courseId: number) {
    return !hiddenStatus.has(courseId) || hiddenStatus.get(courseId)!.get(termId);
  }

  function getColour(end: CourseInformation) {
    if (isHidden(end.termId, end.courseId)) {
      return '#34d9ef61';
    }
    return '#349EEF';
  }

  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="absolute top-0 left-0 w-full h-full -z-1">
      {connections.map(({ startLoc, endLoc, endCourse }, i) => {
        const width = endLoc.x - startLoc.x;
        return (
          <path
            key={i}
            d={`M ${startLoc.x} ${startLoc.y} C ${startLoc.x + width * 0.5} ${startLoc.y} ${endLoc.x - width * 0.5} ${endLoc.y} ${endLoc.x} ${endLoc.y}`}
            stroke={getColour(endCourse)}
            strokeWidth="3"
            fill="none"
          />
        );
      })}
    </svg>
  );
}
