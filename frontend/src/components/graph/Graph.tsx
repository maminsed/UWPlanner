import { AllCourseInformation } from './CourseClass';
import Semester from './Semester';

export default function Graph({ allCourses }: { allCourses: AllCourseInformation }) {
  // TODO:
  //       do something with the centering

  function canSwapRight(i: number) {
    if (i < 0 || i + 1 >= allCourses.path.length) return false;
    const currSem = allCourses.getTermsInfo({ position: i })?.termName.toLowerCase();
    const nextSem = allCourses.getTermsInfo({ position: i + 1 })?.termName.toLowerCase();
    if (!currSem || !nextSem) return false;
    return currSem.includes('wt') || currSem == 'off' || nextSem.includes('wt') || nextSem == 'off';
  }

  return (
    <div className="flex gap-6 p-8">
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
