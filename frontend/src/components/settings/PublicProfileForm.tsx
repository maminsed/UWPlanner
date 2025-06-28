"use client";

import { useState } from "react";
import { PlusCircle, XCircle, Camera, User } from "lucide-react";
import { useAuth } from "@/app/AuthProvider";

// Re-creating basic UI components with styling inspired by the image
// We'll use these directly in the form for now.

const Input = (props: any) => (
    <input
        {...props}
        className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
    />
);

const Textarea = (props: any) => (
    <textarea
        {...props}
        className="w-full p-2 border rounded-md bg-transparent text-settings-text focus:ring-2 focus:ring-blue-500 outline-none"
        rows={4}
    />
);

const Button = ({ children, className, ...props }: any) => (
    <button
        {...props}
        className={`px-4 py-2 rounded-md font-semibold ${className}`}
    >
        {children}
    </button>
);

const Select = ({ children, ...props }: any) => (
    <select
        {...props}
        className="w-full p-2 border rounded-md bg-transparent text-settings-text focus:ring-2 focus:ring-blue-500 outline-none"
    >
        {children}
    </select>
);

export function PublicProfileForm() {
    const { profilePicture, setProfilePicture } = useAuth();
    const [socials, setSocials] = useState([""]);
    const [majors, setMajors] = useState([""]);
    const [minors, setMinors] = useState([""]);

    const addField = (setter: any, fields: any) => () =>
        setter([...fields, ""]);
    const removeField = (setter: any, fields: any, index: any) => () => {
        if (fields.length > 1) {
            setter(fields.filter((_: any, i: any) => i !== index));
        }
    };

    const handleProfilePictureChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const acceptedImageTypes = [
                "image/jpeg",
                "image/png",
                "image/gif",
                "image/webp",
            ];
            if (!acceptedImageTypes.includes(file.type)) {
                alert(
                    "Please upload a valid image file (JPEG, PNG, GIF, or WEBP)."
                );
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePicture(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="space-y-8 divide-y divide-gray-200">
            {/* Profile Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-4">
                <div className="md:col-span-1">
                    <h3 className="text-lg font-bold">Profile</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Set your account details.
                    </p>
                </div>
                <div className="md:col-span-2">
                    <div className="flex flex-row gap-8">
                        <div className="md:col-span-2 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label
                                        htmlFor="name"
                                        className="block text-sm font-medium mb-1"
                                    >
                                        Name
                                    </label>
                                    <Input id="name" placeholder="John" />
                                </div>
                                <div>
                                    <label
                                        htmlFor="surname"
                                        className="block text-sm font-medium mb-1"
                                    >
                                        Surname
                                    </label>
                                    <Input id="surname" placeholder="Doe" />
                                </div>
                            </div>
                            <div>
                                <label
                                    htmlFor="email"
                                    className="block text-sm font-medium mb-1"
                                >
                                    Email
                                </label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="example@gmail.com"
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    Email cannot be changed.
                                </p>
                            </div>
                        </div>

                        <div className="md:col-span-1 flex flex-col justify-center items-center space-y-4">
                            <div className="relative">
                                {profilePicture ? (
                                    <img
                                        className="rounded-full h-32 w-32 object-cover"
                                        src={profilePicture}
                                        alt="Profile"
                                    />
                                ) : (
                                    <div className="h-32 w-32 rounded-full bg-gray-700 flex items-center justify-center">
                                        <User className="h-16 w-16 text-white" />
                                    </div>
                                )}
                                <label
                                    htmlFor="profile-picture-upload"
                                    className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-white p-2 shadow-md hover:bg-gray-200"
                                >
                                    <Camera className="h-5 w-5 text-gray-800" />
                                    <input
                                        id="profile-picture-upload"
                                        name="profile-picture-upload"
                                        type="file"
                                        className="sr-only"
                                        onChange={handleProfilePictureChange}
                                        accept="image/png, image/jpeg, image/gif, image/webp"
                                    />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Socials Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-4">
                <div className="md:col-span-1">
                    <h3 className="text-lg font-bold">Socials</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Add your social media links.
                    </p>
                </div>
                <div className="md:col-span-2 space-y-4">
                    {socials.map((social, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <Input
                                placeholder="https://example.com"
                                value={social}
                                onChange={(e: any) => {
                                    const newSocials = [...socials];
                                    newSocials[index] = e.target.value;
                                    setSocials(newSocials);
                                }}
                            />
                            {socials.length > 1 && (
                                <button
                                    onClick={removeField(
                                        setSocials,
                                        socials,
                                        index
                                    )}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    <XCircle size={20} />
                                </button>
                            )}
                        </div>
                    ))}
                    <Button
                        onClick={addField(setSocials, socials)}
                        className="text-blue-400 hover:text-blue-500 flex items-center gap-2"
                    >
                        <PlusCircle size={20} /> Add Social
                    </Button>
                </div>
            </div>

            {/* Academics Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-4">
                <div className="md:col-span-1">
                    <h3 className="text-lg font-bold">Academics</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Specify your academic details.
                    </p>
                </div>
                <div className="md:col-span-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium">
                                Major
                            </label>
                            {majors.map((major, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-2"
                                >
                                    <Select
                                        value={major}
                                        onChange={(e: any) => {
                                            const newMajors = [...majors];
                                            newMajors[index] = e.target.value;
                                            setMajors(newMajors);
                                        }}
                                    >
                                        {/* These would be populated from an API */}
                                        <option>Select a Major</option>
                                        <option>Computer Science</option>
                                        <option>Software Engineering</option>
                                    </Select>
                                    {majors.length > 1 && (
                                        <button
                                            onClick={removeField(
                                                setMajors,
                                                majors,
                                                index
                                            )}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <XCircle size={20} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <Button
                                onClick={addField(setMajors, majors)}
                                className="text-blue-400 hover:text-blue-500 flex items-center gap-2"
                            >
                                <PlusCircle size={20} /> Add Major
                            </Button>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium">
                                Minor
                            </label>
                            {minors.map((minor, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-2"
                                >
                                    <Select
                                        value={minor}
                                        onChange={(e: any) => {
                                            const newMinors = [...minors];
                                            newMinors[index] = e.target.value;
                                            setMinors(newMinors);
                                        }}
                                    >
                                        <option>Select a Minor</option>
                                        <option>None</option>
                                        {/* TODO: Add minors from DB */}
                                        <option>
                                            Combinatorics and Optimization
                                        </option>
                                        <option>Statistics</option>
                                    </Select>
                                    {minors.length > 1 && (
                                        <button
                                            onClick={removeField(
                                                setMinors,
                                                minors,
                                                index
                                            )}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <XCircle size={20} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <Button
                                onClick={addField(setMinors, minors)}
                                className="text-blue-400 hover:text-blue-500 flex items-center gap-2"
                            >
                                <PlusCircle size={20} /> Add Minor
                            </Button>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium">
                                Specialization
                            </label>
                            <Select>
                                <option>Select a Specialization</option>
                                <option>None</option>
                                {/* TODO: Add specializations from DB */}
                                <option>Artificial Intelligence</option>
                                <option>Human-Computer Interaction</option>
                            </Select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 pt-8">
                <Button className="bg-transparent border border-gray-500 text-settings-text hover:bg-gray-700">
                    Cancel
                </Button>
                <Button className="bg-blue-600 text-white hover:bg-blue-700">
                    Save Changes
                </Button>
            </div>
        </div>
    );
}
