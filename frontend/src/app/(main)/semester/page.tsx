import ClassSchedule from "@/components/semester/ClassSchedule";
import Link from "next/link";

export default function SemesterPage() {
    return (
        <section className="flex flex-col items-center mt-10">
            <h2 className="text-2xl lg:text-4xl text-slate-800 text-center">Semester Planner</h2>
            <ClassSchedule />
            {/* <Warnings /> */}

            <p>Ready to plan your entire degree? checkout <Link href="/graph" className="text-cyan-800">The Graph</Link></p>
        </section>
    )
}
