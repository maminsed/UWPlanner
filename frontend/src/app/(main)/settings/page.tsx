"use client";

import { useState } from "react";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { PublicProfileForm } from "@/components/settings/PublicProfileForm";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { DiscussionsSettings } from "@/components/settings/DiscussionsSettings";
import { CoursesSettings } from "@/components/settings/CoursesSettings";
import { ReportingSettings } from "@/components/settings/ReportingSettings";

export default function SettingsPage() {
    const [activeSection, setActiveSection] = useState("Account");

    const renderSection = () => {
        switch (activeSection) {
            case "Account":
                return <PublicProfileForm />;
            case "Security":
                return <SecuritySettings />;
            case "Discussions":
                return <DiscussionsSettings />;
            case "Courses":
                return <CoursesSettings />;
            case "Reporting":
                return <ReportingSettings />;
            default:
                return <PublicProfileForm />;
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-palette-rich-teal">
                Settings
            </h1>
            <p className="text-gray-500">
                Manage your account settings and preferences.
            </p>
            <SettingsNav
                activeSection={activeSection}
                setActiveSection={setActiveSection}
            />
            <div>{renderSection()}</div>
        </div>
    );
}
