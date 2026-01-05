import Link from 'next/link';
import { IoIosInformationCircleOutline } from 'react-icons/io';

import Footer from '@/components/Footer';
import ClassSchedule from '@/components/semester/ClassSchedule';

export default function SemesterPage() {
  //TODO:   add checks for reqs
  //        fix the fuck you haha...
  return (
    <section className="flex flex-col items-center mt-10 px-2">
      <h2 className="text-2xl lg:text-4xl text-slate-800 text-center">Semester Planner</h2>
      <ClassSchedule />
      {/* <Warnings /> */}
      <div className="flex flex-col items-start gap-4 w-[96vw] max-w-180">
        <div className="bg-[#87CB6E]/90 px-5 py-2 rounded-md flex items-center gap-8">
          <IoIosInformationCircleOutline className="w-5 h-auto" />
          Fuck you haha!!
        </div>
      </div>

      {/* Advanced Options */}
      <div className="flex items-start gap-4 w-[96vw] max-w-160 my-10 justify-around">
        <div className="px-10 py-2 border-1 cursor-pointer">Prerequisite Check</div>
        <div className="px-10 py-2 border-1 cursor-pointer">AI check schedule</div>
      </div>

      <p className="mb-15 text-center">
        Ready to plan your entire degree? checkout{' '}
        <Link href="/graph" className="text-cyan-500 underline">
          The Graph
        </Link>
      </p>
      <Footer />
    </section>
  );
}
