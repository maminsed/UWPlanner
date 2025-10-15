'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { FiPlusCircle, FiXCircle } from 'react-icons/fi';
import { LuCamera, LuUser } from 'react-icons/lu';

import DropDown from '../DropDown';

import type { InputHTMLAttributes } from 'react';

import { useAuth } from '@/app/AuthProvider';
import { useApi } from '@/lib/useApi';

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
  <button {...props} className={`p-1 rounded-md font-medium cursor-pointer ${className}`}>
    {children}
  </button>
);

type OptionType = [string, [string, string, number][]][];

export function PublicProfileForm() {
  //TODO: update what you want to do with Profile Picture
  //user data
  const { profilePicture, setProfilePicture } = useAuth();
  const [username, setUsername] = useState<string>('');
  const [prevEmail, setPrevEmail] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [links, setLinks] = useState<string[]>(['']);

  const [majors, setMajors] = useState<([string, string, number] | undefined)[]>([]);
  const [minors, setMinors] = useState<([string, string, number] | undefined)[]>([]);
  const [specs, setSpecs] = useState<([string, string, number] | undefined)[]>([]);

  const backend = useApi();
  const router = useRouter();
  const [loadingState, setLoadingState] = useState<string>('No Changes');
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [majorOptions, setMajorOptions] = useState<OptionType>([]);
  const [minorOptions, setMinorOptions] = useState<OptionType>([]);
  const [specOptions, setSpecOptions] = useState<OptionType>([]);
  const { username: oldUserName, setUsername: setOldUserName, setAccess, setExp } = useAuth();

  const addField =
    <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, fields: T[], added: T) =>
    () => {
      setLoadingState('Save Changes');
      setter([...fields, added]);
    };

  const removeField =
    <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, fields: T[], index: number) =>
    () => {
      setLoadingState('Save Changes');
      setter(fields.filter((_, i) => i !== index));
    };

  async function initializeOptions() {
    const lists = ['majors', 'minors', 'specializations'];
    for (let i = 0; i < 3; ++i) {
      try {
        const res = await backend(`${process.env.NEXT_PUBLIC_API_URL}/update_info/${lists[i]}`, {
          method: 'GET',
        });

        const response = await res.json().catch(() => {});
        if (!res.ok) {
          console.error('Error in Resposne');
          console.info(response);
          return;
        }
        if (i == 0) setMajorOptions(response.data);
        else if (i == 1) setMinorOptions(response.data);
        else setSpecOptions(response.data);
      } catch (err) {
        console.error('Error: ');
        console.info(err);
      }
    }
  }

  async function initialSetup() {
    try {
      const res = await backend(`${process.env.NEXT_PUBLIC_API_URL}/update_info/get_user_info`);

      if (!res.ok) {
        console.error('Error Occured - reload the page');
      } else {
        const response = await (res as Response).json();
        setUsername(response.username);
        setEmail(response.email);
        setPrevEmail(response.email);
        setBio(response.bio);
        setMajors(response.majors);
        setMinors(response.minors);
        setSpecs(response.specializations);
        setLinks(response.links);
        initializeOptions();
      }
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    initialSetup();
  }, []);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (loadingState == 'Save Changes') {
        e.preventDefault();
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [loadingState]);

  async function handleSubmit() {
    setErrorMessage(undefined);
    try {
      if (loadingState == 'Save Changes') {
        setLoadingState('Loading...');
        const res = await backend(`${process.env.NEXT_PUBLIC_API_URL}/update_info/update_all`, {
          method: 'POST',
          body: JSON.stringify({
            username: username,
            email: email,
            bio: bio,
            profilePicture: profilePicture,
            links: links,
            majors: majors,
            minors: minors,
            specializations: specs,
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const response = await res.json().catch(() => {});
        if (!res.ok) {
          if (response.message) {
            setErrorMessage(response.message);
          } else {
            alert('error occured, please check your information and try again');
          }
        } else {
          setLoadingState('Changes Saved');
          // Checking if the username changed:
          if (oldUserName != username) {
            setAccess(response.Access_Token.token);
            setExp(response.Access_Token.exp);
            setOldUserName(response.username);
          }
          if (prevEmail != email) {
            router.push('/verify');
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const acceptedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!acceptedImageTypes.includes(file.type)) {
        alert('Please upload a valid image file (JPEG, PNG, GIF, or WEBP).');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicture(reader.result as string);
      };
      setLoadingState('Save Changes');
      reader.readAsDataURL(file);
    }
  };

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    setVal: (newval: string) => void,
  ) {
    setLoadingState('Save Changes');
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
          <div className="gap-4 flex flex-col max-w-80">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium mb-1 sm:max-w-80 sm:min-w-70"
              >
                Username
              </label>
              <Input
                id="username"
                type="text"
                placeholder="example-name"
                onChange={(e) => handleChange(e, setUsername)}
                value={username}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="example@gmail.com"
                onChange={(e) => handleChange(e, setEmail)}
                value={email}
              />
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium mb-1">
                Bio
              </label>
              <Textarea
                id="bio"
                placeholder="Tell me about yourself..."
                onChange={(e) => handleChange(e, setBio)}
                value={bio}
              />
            </div>
          </div>

          <div className="md:col-span-1 py-4 flex flex-col items-center space-y-4">
            <div className="relative">
              {
                // profilePicture ? (
                //     <img
                //         className="rounded-full h-32 w-32 object-cover"
                //         src={profilePicture}
                //         alt="Profile"
                //     />
                // ) :

                <div className="h-32 w-32 rounded-full bg-gray-700 flex items-center justify-center">
                  <LuUser className="h-16 w-16 text-white" />
                </div>
              }
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

      {/* links Section */}
      <div className="grid grid-cols-1 gap-2 py-8">
        <div className="sm:col-span-1">
          <h3 className="text-lg font-medium">links</h3>
          {/* <p className="mt-1 text-sm text-gray-500">
                        Add your link media links.
                    </p> */}
        </div>
        <div className="md:col-span-2 space-y-3 mt-2">
          {links.map((link, index) => (
            <div key={index} className="flex items-center gap-2 max-w-80">
              <Input
                type="url"
                placeholder="https://example.com"
                value={link}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const newlinks = [...links];
                  newlinks[index] = e.target.value;
                  setLoadingState('Save Changes');
                  setLinks(newlinks);
                }}
              />
              {links.length > 1 && (
                <button
                  onClick={removeField(setLinks, links, index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <FiXCircle size={20} />
                </button>
              )}
            </div>
          ))}
          <Button
            onClick={addField<string>(setLinks, links, '')}
            className="text-dark-green hover:text-blue-500 duration-150 flex py-3 items-center gap-2"
          >
            <FiPlusCircle size={20} /> Add Link
          </Button>
        </div>
      </div>

      {/* Academics Section */}
      <div className="grid grid-cols-1 gap-6 py-4">
        <div className="md:col-span-1">
          <h3 id="academics" className="text-lg font-medium">
            Academics
          </h3>
          {/* <p className="mt-1 text-sm text-gray-500">
                        Specify your academic details.
                    </p> */}
        </div>
        <div className="md:col-span-2">
          <div className="grid grid-cols-1 gap-6 max-w-80">
            <div className="space-y-2">
              <label className="block text-sm font-medium">Major</label>
              {majors.map((major, index) => (
                <div key={index} className="flex items-center gap-2">
                  <DropDown
                    options={majorOptions}
                    classes={{
                      mainDiv: 'flex-1 min-w-0',
                      searchBar: 'w-full border-1 py-2 pl-2 border-gray-300',
                      optionBox: 'w-full border-1 border-dark-green',
                    }}
                    selectedValue={major}
                    setSelectedValue={(e) => {
                      setLoadingState('Save Changes');
                      const newMajors = [...majors];
                      newMajors[index] = e;
                      setMajors(newMajors);
                    }}
                  />
                  {majors.length > 1 && (
                    <button
                      onClick={removeField(setMajors, majors, index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <FiXCircle size={20} />
                    </button>
                  )}
                </div>
              ))}
              <Button
                onClick={addField<[string, string, number] | undefined>(
                  setMajors,
                  majors,
                  undefined,
                )}
                className="text-dark-green flex items-center gap-2"
              >
                <FiPlusCircle size={20} />
              </Button>
            </div>
            <div className="space-y-2 max-w-80">
              <label className="block text-sm font-medium">Minor</label>
              {minors.map((minor, index) => (
                <div key={index} className="flex items-center gap-2 max-w-80 w-full">
                  <DropDown
                    options={minorOptions}
                    classes={{
                      mainDiv: 'flex-1 min-w-0',
                      searchBar: 'w-full border-1 py-2 pl-2 border-gray-300',
                      optionBox: 'w-full border-1 border-dark-green',
                    }}
                    selectedValue={minor}
                    setSelectedValue={(e) => {
                      setLoadingState('Save Changes');
                      const newMinors = [...minors];
                      newMinors[index] = e;
                      setMinors(newMinors);
                    }}
                  />
                  <button
                    onClick={removeField(setMinors, minors, index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <FiXCircle size={20} />
                  </button>
                </div>
              ))}
              <Button
                onClick={addField(setMinors, minors, undefined)}
                className="text-dark-green flex items-center gap-2"
              >
                <FiPlusCircle size={20} />
              </Button>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">Specialization</label>
              {specs.map((spec, index) => (
                <div key={index} className="flex items-center gap-2">
                  <DropDown
                    options={specOptions}
                    classes={{
                      mainDiv: 'flex-1 min-w-0',
                      searchBar: 'w-full border-1 py-2 pl-2 border-gray-300',
                      optionBox: 'w-full border-1 border-dark-green',
                    }}
                    selectedValue={spec}
                    setSelectedValue={(e) => {
                      setLoadingState('Save Changes');
                      const newSpecs = [...specs];
                      newSpecs[index] = e;
                      setSpecs(newSpecs);
                    }}
                  />
                  <button
                    onClick={removeField(setSpecs, specs, index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <FiXCircle size={20} />
                  </button>
                </div>
              ))}
              <Button
                onClick={addField(setSpecs, specs, undefined)}
                className="text-dark-green flex items-center gap-2"
              >
                <FiPlusCircle size={20} />
              </Button>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-4 mb-3 text-red-600">{errorMessage}</p>
      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        <Button
          style={
            loadingState == 'Save Changes'
              ? {}
              : {
                  backgroundColor: '#aba5a561',
                  color: 'oklch(55.2% 0.016 285.938)',
                  borderWidth: '0',
                  cursor: 'not-allowed',
                }
          }
          className="border border-gray-500 text-settings-text px-3 hover:bg-dark-green hover:text-light-green duration-150"
          disabled={loadingState != 'Save Changes'}
          onClick={() => {
            if (loadingState == 'Save Changes') initialSetup();
            setLoadingState('No Changes');
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loadingState != 'Save Changes'}
          style={
            loadingState == 'Save Changes'
              ? {}
              : {
                  backgroundColor: '#aba5a561',
                  color: 'oklch(55.2% 0.016 285.938)',
                  borderColor: 'oklch(70.4% 0.04 256.788)',
                  cursor: 'not-allowed',
                }
          }
          className="bg-dark-green text-white duration-150 px-3 hover:bg-[#2c464a]"
        >
          {loadingState}
        </Button>
      </div>
    </div>
  );
}
