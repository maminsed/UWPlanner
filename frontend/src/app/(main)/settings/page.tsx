
import { PublicProfileForm } from "@/components/settings/PublicProfileForm";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { DiscussionsSettings } from "@/components/settings/DiscussionsSettings";
import { SequenceSettings } from "@/components/settings/SequenceSettings";
import { ReportingSettings } from "@/components/settings/ReportingSettings";
import Link from "next/link";

export default function SettingsPage() {

    const settingSections = [
        { name: "Account" },
        { name: "Security" },
        { name: "Discussions" },
        { name: "Courses" },
        { name: "Reporting" },
    ];

    const renderSection = (section:string, key:number) => {
        switch (section) {
            case "Account":
                return <PublicProfileForm key={key}/>;
            case "Security":
                return <SecuritySettings key={key}/>;
            case "Discussions":
                return <DiscussionsSettings key={key}/>;
            case "Courses":
                return <SequenceSettings key={key}/>;
            case "Reporting":
                return <ReportingSettings key={key}/>;
            default:
                return <PublicProfileForm key={key}/>;
        }
    };

    return (
        <div className="px-2 flex gap-3">
            <section className="hidden sm:block shrink-0 text-[15px] box-content mb-30 py-3 pr-4 md:px-6 lg:pl-8 border-r-dark-green border-r-2">
                <div className="flex flex-col gap-1 sticky top-0 pt-2">
                    <Link href="#public_profile" >Public Profile</Link>
                    <Link href="#academics" >Academics</Link>
                    <Link href="#security" >Security</Link>
                    <Link href="#discussions" >My Discussions</Link>
                    <Link href="#sequence" >Sequence</Link>
                    <Link href="#report" >Report an Issue</Link>
                </div>
            </section>
            <div className="mr-3 md:mr-5">
                {/* <p className="text-gray-500">
                    Manage your account settings and preferences.
                </p> */}
                {settingSections.map((section,idx)=>renderSection(section.name, idx))}
            </div>
        </div>
    );
}
