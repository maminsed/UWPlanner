import { LuX } from 'react-icons/lu';

import { CourseInformation } from '../interface';
import RightSide from '../utils/RightSide';
import { getCurrentTermId } from '../utils/termUtils';

import { useApi } from '@/lib/useApi';

type DeleteCourseInterface = {
  courseInfo: CourseInformation;
  close: () => void;
  updatePage: () => void;
};

export default function DeleteCourse({
  close,
  updatePage,
  courseInfo: { termId, termName, courseId, courseName },
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
        term_id: termId,
        course_id: courseId,
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
    <div className="px-6 py-2 max-w-[96%] bg-white rounded-md">
      <RightSide className="!mb-1 !mr-0">
        <LuX className="w-4 font-semibold h-auto cursor-pointer" onClick={close} />
      </RightSide>
      <h2 className="text-lg font-semibold ">Are you sure about deleting this course?</h2>
      <p className="text-sm mt-2 md:mt-0">
        It will delete all sections of <b>{courseName}</b> from the <b>{termName}</b> semester
      </p>
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
