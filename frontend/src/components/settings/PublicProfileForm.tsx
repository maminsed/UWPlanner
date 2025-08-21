"use client";

import { useState } from "react";
import type { InputHTMLAttributes } from "react";
import { useAuth } from "@/app/AuthProvider";
import { FiPlusCircle, FiXCircle } from "react-icons/fi";
import { LuCamera, LuUser } from "react-icons/lu";

import { api } from "@/lib/useApi";

const Input = (props: InputHTMLAttributes<HTMLInputElement>) => (
    <input
        {...props}
        className="w-full p-2 py-1 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-dark-green outline-none"
    />
);

const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea
        {...props}
        className="w-full p-2 border rounded-md bg-transparent border-gray-300 text-settings-text focus:ring-2 focus:ring-dark-green outline-none"
        rows={4}
    />
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    className?: string;
}

const Button = ({ children, className, ...props }: ButtonProps) => (
    <button
        {...props}
        className={`p-1 rounded-md font-medium cursor-pointer ${className}`}
    >
        {children}
    </button>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    children: React.ReactNode;
}

const Select = ({ children, ...props }: SelectProps) => (
    <select
        {...props}
        className="w-full p-2 border border-gray-300 rounded-md bg-transparent text-settings-text focus:ring-2 focus:ring-dark-green outline-none"
    >
        {children}
    </select>
);

export function PublicProfileForm() {
    const { profilePicture, setProfilePicture } = useAuth();
    const [username, setUsername] = useState<string>("hero");
    const [email, setEmail] = useState<string>("");
    const [bio, setBio] = useState<string>("");
    const [socials, setSocials] = useState<string[]>([""]);
    const [majors, setMajors] = useState<string[]>([""]);
    const [minors, setMinors] = useState<string[]>([""]);
    const [specs, setSpecs] = useState<string[]>([""]);
    const backend = api();

    const [loadingState, setLoadingState] = useState<string>("No Changes");

    const addField = (setter: React.Dispatch<React.SetStateAction<string[]>>, fields: string[]) => () =>
        setter([...fields, ""]);
    const removeField = (setter: React.Dispatch<React.SetStateAction<string[]>>, fields: string[], index: number) => () => {
        if (fields.length > 1) {
            setLoadingState("Save Changes");
            setter(fields.filter((_, i) => i !== index));
        }
    };

    async function handleSubmit() {
        try {
            if (loadingState == "Save Changes") {
                setLoadingState("Loading...")
                const res = await backend(
                    `${process.env.NEXT_PUBLIC_API_URL}/update_info/update_all`,
                    {
                        method: "POST",
                        body: JSON.stringify({
                            "username": username,
                            "email": email,
                            "bio": bio,
                            "profilePicture": profilePicture,
                            "socials": socials,
                            "majors": majors,
                            "minors": minors,
                            "specializations": specs,
                        }),
                        headers: {
                            "Content-Type": "application/json",
                        },
                    }
                );

                if (!res.ok) {
                    alert("error occured, please check your information and try again")
                } else {
                    setLoadingState("Chagnes Saved")
                }
            }
        } catch (err) { 
            console.error(err)
        }
    }

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
            setLoadingState("Save Changes");
            reader.readAsDataURL(file);
        }
    };

    function handleChange(e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>, setVal:(newval:string)=>void) {
        setLoadingState("Save Changes");
        setVal(e.target.value);
    }

    return (
        <div className="space-y-8 md:ml-6" id="public_profile">
            {/* Profile Section */}
            <h2 className="text-xl font-medium text-palette-rich-teal my-2 mt-6 md:mt-4">
                Public Profile
            </h2>
            <div className="grid grid-cols-1 gap-2 py-4">
                <div className="flex flex-col-reverse xs:flex-row xs:gap-8 sm:gap-20 lg:gap-30">

                    <div className="gap-4 flex flex-col">
                        <div>
                            <label
                                htmlFor="username"
                                className="block text-sm font-medium mb-1 sm:w-60 md:w-80"
                            >
                                Username
                            </label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="example-name"
                                onChange={(e)=>handleChange(e, setUsername)}
                                value={username}
                            />
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
                                onChange={(e)=>handleChange(e, setEmail)}
                                value={email}
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="bio"
                                className="block text-sm font-medium mb-1"
                            >
                                Bio
                            </label>
                            <Textarea
                                id="bio"
                                placeholder="Tell me about yourself..."
                                onChange={(e)=>handleChange(e, setBio)}
                                value={bio}
                            />
                        </div>
                    </div>

                    <div className="md:col-span-1 py-4 flex flex-col items-center space-y-4">
                        <div className="relative">
                            {profilePicture ? (
                                <img
                                    className="rounded-full h-32 w-32 object-cover"
                                    src={profilePicture}
                                    alt="Profile"
                                />
                            ) : (
                                <div className="h-32 w-32 rounded-full bg-gray-700 flex items-center justify-center">
                                    <LuUser className="h-16 w-16 text-white" />
                                </div>
                            )}
                            <label
                                htmlFor="profile-picture-upload"
                                className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-white p-2 shadow-md hover:bg-gray-200"
                            >
                                <LuCamera className="h-5 w-5 text-gray-800" />
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

            {/* Socials Section */}
            <div className="grid grid-cols-1 gap-2 py-8">
                <div className="md:col-span-1">
                    <h3 className="text-lg font-medium">Socials</h3>
                    {/* <p className="mt-1 text-sm text-gray-500">
                        Add your social media links.
                    </p> */}
                </div>
                <div className="md:col-span-2 space-y-3 mt-2">
                    {socials.map((social, index) => (
                        <div key={index} className="flex items-center gap-2 max-w-80">
                            <Input
                                type="url"
                                placeholder="https://example.com"
                                value={social}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    const newSocials = [...socials];
                                    newSocials[index] = e.target.value;
                                    setLoadingState("Save Changes");
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
                                    <FiXCircle size={20} />
                                </button>
                            )}
                        </div>
                    ))}
                    <Button
                        onClick={addField(setSocials, socials)}
                        className="text-dark-green hover:text-blue-500 duration-150 flex py-3 items-center gap-2"
                    >
                        <FiPlusCircle size={20} /> Add Social
                    </Button>
                </div>
            </div>

            {/* Academics Section */}
            <div className="grid grid-cols-1 gap-6 py-4">
                <div className="md:col-span-1">
                    <h3 className="text-lg font-medium">Academics</h3>
                    {/* <p className="mt-1 text-sm text-gray-500">
                        Specify your academic details.
                    </p> */}
                </div>
                <div className="md:col-span-2">
                    <div className="grid grid-cols-1 gap-6 max-w-80">
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
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                            const newMajors = [...majors];
                                            newMajors[index] = e.target.value;
                                            setLoadingState("Save Changes");
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
                                            <FiXCircle size={20} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <Button
                                onClick={addField(setMajors, majors)}
                                className="text-dark-green flex items-center gap-2"
                            >
                                <FiPlusCircle size={20} />
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
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                            const newMinors = [...minors];
                                            newMinors[index] = e.target.value;
                                            setLoadingState("Save Changes");
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
                                            <FiXCircle size={20} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <Button
                                onClick={addField(setMinors, minors)}
                                className="text-dark-green flex items-center gap-2"
                            >
                                <FiPlusCircle size={20} />
                            </Button>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium">
                                Specialization
                            </label>
                            {specs.map((spec, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-2"
                                >
                                    <Select
                                        value={spec}
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                            const newSpec = [...specs];
                                            newSpec[index] = e.target.value;
                                            setLoadingState("Save Changes");
                                            setSpecs(newSpec);
                                        }}
                                    >
                                        <option>Select a Specialization</option>
                                        <option>None</option>
                                        {/* TODO: Add minors from DB */}
                                        <option>
                                            Artificial Intelligence
                                        </option>
                                        <option>Data Science</option>
                                    </Select>
                                    {specs.length > 1 && (
                                        <button
                                            onClick={removeField(
                                                setSpecs,
                                                specs,
                                                index
                                            )}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <FiXCircle size={20} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <Button
                                onClick={addField(setSpecs, specs)}
                                className="text-dark-green flex items-center gap-2"
                            >
                                <FiPlusCircle size={20} />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 pt-8">
                <Button style={loadingState == "Save Changes" ? 
                    {} :  
                    {backgroundColor:"#aba5a561", color: "oklch(55.2% 0.016 285.938)", borderWidth:"0", cursor:"not-allowed"}} 
                    className="border border-gray-500 text-settings-text px-3 hover:bg-dark-green hover:text-light-green duration-150">
                    Cancel
                </Button>
                <Button 
                    onClick={handleSubmit} 
                    style={loadingState == "Save Changes" ? 
                    {} :  
                    {backgroundColor:"#aba5a561", color: "oklch(55.2% 0.016 285.938)", borderColor:"oklch(70.4% 0.04 256.788)", cursor:"not-allowed"}} 
                    className="bg-dark-green text-white duration-150 px-3 hover:bg-[#2c464a]">
                    {loadingState}
                </Button>
            </div>
        </div>
    );
}
