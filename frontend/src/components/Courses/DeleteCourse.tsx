import { LuX } from 'react-icons/lu';

import { AllCourseInformation } from '../graph/CourseClass';
import RightSide from '../utils/RightSide';
import { getCurrentTermId, getTermSeason } from '../utils/termUtils';

import { useApi } from '@/lib/useApi';

type DeleteCourseInterface = {
  courses: {
    courseId: number;
    termId: number;
  }[];
  allCourses: AllCourseInformation;
  close: () => void;
  updatePage: () => void;
};

export default function DeleteCourse({
  close,
  updatePage,
  courses,
  allCourses,
}: DeleteCourseInterface) {
  //TODO: disable when loading
  const backend = useApi();

  async function handleDelete() {
    const res = await backend(`${process.env.NEXT_PUBLIC_API_URL}/courses/delete_single`, {
      method: 'POST',
      headers: {
        'Content-type': 'application/json',
      },
      body: JSON.stringify({
        courses: courses,
        current_term: getCurrentTermId(),
      }),
    });
    const response = await res.json().catch(() => {});
    if (!res.ok) {
      console.error('error occured in deleting');
      console.info(response);
    } else {
      updatePage();
    }
  }

  return (
    <div className="px-6 py-2 max-w-[96%] bg-white rounded-xl shadow-2xl shadow-dark-green/10">
      <RightSide className="!mb-1 !mr-0">
        <LuX className="w-4 font-semibold h-auto cursor-pointer" onClick={close} />
      </RightSide>
      <h2 className="text-lg font-semibold ">Are you sure about deleting the following courses?</h2>
      {courses.map(({ courseId, termId }, key) => (
        <li className="text-sm mt-2 md:mt-0 list-inside list-disc" key={key}>
          All sections of{' '}
          <b>{allCourses.getCourseInfoId(courseId)?.code.toUpperCase() || 'the course'}</b> from the{' '}
          <b>
            {allCourses.getTermsInfo({ termId })?.termName || ''}-{getTermSeason(termId)}
          </b>{' '}
          semester
        </li>
      ))}
      <RightSide className="mt-4">
        <button className="px-2 border rounded-sm cursor-pointer" onClick={close}>
          Cancel
        </button>
        <button
          className="px-2 bg-red-700 text-white rounded-sm cursor-pointer"
          onClick={handleDelete}
        >
          Delete
        </button>
      </RightSide>
    </div>
  );
}
