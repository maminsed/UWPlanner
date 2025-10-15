import { LuTrash2, LuX } from 'react-icons/lu';

import { CourseInformation } from '../interface';
import RightSide from '../utils/RightSide';

type CourseInfoPageProps = {
  close: () => void;
  updatePage?: () => void;
  courseInfo: CourseInformation;
};

export default function CourseInfoPage({ close, courseInfo }: CourseInfoPageProps) {
  const subHeaderClsx = 'text-xl mt-4 text-gray-950';
  const pClsx = 'text-md text-zinc-900 font-light';
  const liClsx = 'list-disc list-inside';

  return (
    <div className="bg-white py-4 px-4 rounded-xl shadow-2xl shadow-dark-green/10 max-w-180 w-[95%] max-h-[calc(100%-45*var(--spacing))] overflow-y-auto scroller">
      <RightSide className="!mb-1 !mr-0">
        <LuTrash2 className="w-4 font-semibold h-auto cursor-pointer text-red-900" />
        <LuX className="w-4 font-semibold h-auto cursor-pointer" onClick={close} />
      </RightSide>
      <h2 className="text-2xl text-center">CS136</h2>

      <h3 className={subHeaderClsx}>Course Name: </h3>
      <p className={pClsx}>Computer and Sciencing in the age of stone</p>

      <h3 className={subHeaderClsx}>Course Description: </h3>
      <p className={pClsx}>
        Introduction to object-oriented programming and to tools and techniques for software
        development. Designing, coding, debugging, testing, and documenting medium-sized programs:
        reading specifications and designing software to implement them; selecting appropriate data
        structures and control structures; writing reusable code; reusing existing code; basic
        performance issues; debuggers; test suites.
      </p>

      <h3 className={subHeaderClsx}>Prerequisites: </h3>
      <ul className={pClsx}>
        <li className={liClsx}>ello</li>
      </ul>

      <h3 className={subHeaderClsx}>Corequisites: </h3>
      <ul className={pClsx}>
        <li className={liClsx}>ello</li>
      </ul>

      <h3 className={subHeaderClsx}>Antirequisites: </h3>
      <ul className={pClsx}>
        <li className={liClsx}>ello</li>
      </ul>

      <h3 className={subHeaderClsx}>Offerings: </h3>
      <ul className={pClsx}>
        <li className={liClsx}>ello</li>
      </ul>

      <h3 className={subHeaderClsx}>UWFLOW Info: </h3>
      <ul className={pClsx}>
        <li className={liClsx}>ello</li>
      </ul>

      <h3 className={subHeaderClsx}>Related Links: </h3>
      <ul className={pClsx}>
        <li className={liClsx}>ello</li>
      </ul>
    </div>
  );
}
