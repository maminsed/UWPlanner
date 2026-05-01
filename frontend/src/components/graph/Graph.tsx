import { AllCourseInformation } from './CourseClass';
import Semester from './Semester';

export default function Graph({ allCourses }: { allCourses: AllCourseInformation }) {
  function canSwapRight(i: number) {
    if (i < 0 || i + 1 >= allCourses.path.length) return false;
    return true;
  }

  return (
    <div className="flex p-8" style={{ gap: `${20 * allCourses.scale}px` }}>
      {allCourses.path.map(({ termId }, i) => {
        return (
          <Semester
            key={i}
            termId={termId}
            allCourses={allCourses}
            canSwapRight={canSwapRight(i)}
            canSwapLeft={canSwapRight(i - 1)}
          />
        );
      })}
    </div>
  );
}
