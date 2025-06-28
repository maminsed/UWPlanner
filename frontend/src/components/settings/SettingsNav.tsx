"use client";

const navItems = [
    { name: "Account" },
    { name: "Security" },
    { name: "Discussions" },
    { name: "Courses" },
    { name: "Reporting" },
];

interface SettingsNavProps {
    activeSection: string;
    setActiveSection: (section: string) => void;
}

export function SettingsNav({
    activeSection,
    setActiveSection,
}: SettingsNavProps) {
    return (
        <nav className="flex space-x-4 border-b-2 border-palette-powder-blue pb-4 mb-6">
            {navItems.map((item) => (
                <button
                    key={item.name}
                    onClick={() => setActiveSection(item.name)}
                    className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
                        activeSection === item.name
                            ? "bg-[#111827] text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                >
                    {item.name}
                </button>
            ))}
        </nav>
    );
}
