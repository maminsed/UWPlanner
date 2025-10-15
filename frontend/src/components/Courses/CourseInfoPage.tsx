import { CourseInformation } from '../interface';

type CourseInfoPageProps = {
  close: () => void;
  updatePage?: () => void;
  courseInfo: CourseInformation;
};

export default function CourseInfoPage({ close, courseInfo }: CourseInfoPageProps) {
  return (
    <div className="bg-white p-10" onClick={close}>
      HI UWU
    </div>
  );
}
