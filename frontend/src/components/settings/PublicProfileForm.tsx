'use client';

import { clsx } from 'clsx';
import { useRouter } from 'next/navigation';
import { useState, useEffect, Fragment } from 'react';
import { FiPlusCircle, FiXCircle } from 'react-icons/fi';
import { LuCamera, LuUser } from 'react-icons/lu';

import { defaultSelectedProgram } from '../utils/constants';
import DropDown2 from '../utils/DropDown2';
import { capitilize } from '../utils/textUtils';

import type { InputHTMLAttributes } from 'react';

import { useAuth } from '@/app/AuthProvider';
import { useApi } from '@/lib/useApi';

type programOptionType = {
  groupName: string;
  id: number;
  name: string;
  programType: string;
};

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

const statusOrdering = {
  error: 1,
  changes_pending: 2,
  loading: 3,
  idle: 4,
};

export function PublicProfileForm() {
  //TODO: Confirm email change behvaiour
  //      update what you want to do with Profile Picture

  //user data
  const [username, setUsername] = useState<string>('');
  const [prevEmail, setPrevEmail] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const { profilePicture, setProfilePicture } = useAuth();

  const [selectedPrograms, setSelectedPrograms] = useState<programOptionType[]>([
    defaultSelectedProgram,
  ]);
  const [programOptions, setProgramOptions] = useState<programOptionType[]>([]);

  const backend = useApi();
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'idle' | 'changes_pending' | 'error'>('loading');
  const [message, setMessage] = useState<string | undefined>(undefined);
  const { username: oldUserName, setUsername: setOldUserName, setAccess, setExp } = useAuth();

  async function fetchingUserInfo(): Promise<[typeof state, string]> {
    try {
      const res = await backend(`${process.env.NEXT_PUBLIC_API_URL}/update_info/user_info`);
      if (!res.ok) {
        return ['error', 'Error Occured - reload the page'];
      } else {
        const response = await (res as Response).json();
        setUsername(response.username);
        setEmail(response.email);
        setPrevEmail(response.email);
        setBio(response.bio);
        return ['idle', ''];
      }
    } catch (err) {
      return ['error', 'Error occured while fetching userInfo'];
    }
  }

  async function fetchingUserPrograms(): Promise<[typeof state, string]> {
    try {
      const res = await backend(`${process.env.NEXT_PUBLIC_API_URL}/update_info/programs`, {
        method: 'GET',
      });

      const response = await (res as Response).json().catch(() => {});
      if (!res.ok) return ['error', 'Error Occured - reload the page'];
      const PO: programOptionType[] = [];
      response['availablePrograms'].forEach(
        (ap: {
          groupName: string;
          programs: { id: number; name: string; programType: string }[];
        }) => {
          ap.programs.forEach((program) => {
            PO.push({ ...program, groupName: ap.groupName });
          });
        },
      );
      const enroledIds: programOptionType[] = response['enroledIds'];
      if (!enroledIds.length) enroledIds.push(defaultSelectedProgram);
      setProgramOptions(PO);
      setSelectedPrograms(enroledIds);
      return ['idle', ''];
    } catch (err) {
      return ['error', 'Error Occured - reload the page'];
    }
  }

  async function initialSetup() {
    const responses = await Promise.all([fetchingUserInfo(), fetchingUserPrograms()]);
    responses.sort((a, b) => statusOrdering[a[0]] - statusOrdering[b[0]]);
    setState(responses[0][0]);
    setMessage(responses[0][1]);
  }

  useEffect(() => {
    initialSetup();
  }, []);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (state === 'changes_pending' || state === 'loading') {
        e.preventDefault();
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state]);

  async function handleUserInfoSubmit(): Promise<[typeof state, string]> {
    try {
      if (state == 'changes_pending') {
        const res = await backend(
          `${process.env.NEXT_PUBLIC_API_URL}/update_info/update_user_info`,
          {
            method: 'POST',
            body: JSON.stringify({
              username: username,
              email: email,
              bio: bio,
            }),
            headers: {
              'Content-Type': 'application/json',
            },
          },
        );
        const response = await res.json().catch(() => {});
        if (!res.ok) {
          return ['error', response.message || 'error occured. please check your information'];
        } else {
          // Checking if the username changed:
          if (oldUserName != username) {
            setAccess(response.Access_Token.token);
            setExp(response.Access_Token.exp);
            setOldUserName(response.username);
          }
          if (prevEmail != email) {
            router.push('/verify');
          }
          return ['idle', ''];
        }
      }
      return ['idle', ''];
    } catch (err) {
      return ['error', 'error occured'];
    }
  }

  async function handleProgramsSubmit(): Promise<[typeof state, string]> {
    if (
      selectedPrograms.find(
        (program) =>
          program.programType === defaultSelectedProgram.programType ||
          program.id == defaultSelectedProgram.id ||
          program.groupName == defaultSelectedProgram.groupName,
      )
    ) {
      return ['error', "Please don't leave any program empty or unselecetd"];
    }
    try {
      const res = await backend(`${process.env.NEXT_PUBLIC_API_URL}/update_info/programs`, {
        method: 'POST',
        body: JSON.stringify({
          programIds: selectedPrograms.map(({ id }) => id),
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const response = await res.json().catch(() => {});
      if (!res.ok) {
        return ['error', response.message || 'error occured'];
      }
      return ['idle', ''];
    } catch (err) {
      return ['error', 'error occured'];
    }
  }

  async function handleSubmit() {
    setState('error');
    setMessage(undefined);
    const responses = await Promise.all([handleUserInfoSubmit(), handleProgramsSubmit()]);
    responses.sort((a, b) => statusOrdering[a[0]] - statusOrdering[b[0]]);
    setState(responses[0][0]);
    setMessage(responses[0][1]);
    if (responses[0][0] !== 'error') await initialSetup();
  }

  //TODO: do something about this.
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
      setState('changes_pending');
      reader.readAsDataURL(file);
    }
  };

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    setVal: (newval: string) => void,
  ) {
    if (state === 'error') setMessage('');
    setState('changes_pending');
    setVal(e.target.value);
  }

  function handleProgramRemove(idx: number) {
    if (state === 'error') setMessage('');
    setState('changes_pending');
    setSelectedPrograms((pis) => pis.filter((_, i) => idx !== i));
  }

  function handlePorgramAdd(programType: string = defaultSelectedProgram.programType) {
    if (state === 'error') setMessage('');
    setState('changes_pending');
    setSelectedPrograms((pis) => [...pis, { ...defaultSelectedProgram, programType }]);
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
              {(() => {
                const programTypeMap = new Map<string, (programOptionType & { idx: number })[]>();
                let majorCounter = 0;
                selectedPrograms.forEach((program, idx) => {
                  if (!programTypeMap.has(program.programType)) {
                    programTypeMap.set(program.programType, []);
                  }
                  if (
                    program.programType.includes('major') ||
                    program.programType.includes('degree')
                  )
                    ++majorCounter;
                  programTypeMap.get(program.programType)!.push({ ...program, idx });
                });
                return Array.from(programTypeMap.entries()).map(([programType, programs]) => (
                  <Fragment key={programs[0].idx}>
                    <label className="block text-sm font-medium">{capitilize(programType)}</label>
                    {programs.map((sp) => {
                      const splitSP = sp.name.toLowerCase().replace(/\s+/g, ' ').split(' ');
                      const filteredPrograms = programOptions.filter((program) => {
                        if (sp.id !== -1) return program.id === sp.id;
                        const splitP = program.name.toLowerCase().split(' ');
                        let spI = 0;
                        let pI = 0;
                        while (pI < splitP.length && spI < splitSP.length) {
                          const spWord = splitSP[spI];
                          const pWord = splitP[pI];
                          if (pWord.includes(spWord)) {
                            ++spI;
                          }
                          ++pI;
                        }
                        return spI === splitSP.length;
                      });
                      return (
                        <div key={sp.idx} className="flex mt-2 items-center gap-2 justify-start">
                          <DropDown2<programOptionType>
                            currentValue={sp}
                            placeholder="start typing..."
                            options={filteredPrograms}
                            updateInputFunction={(value) => {
                              setSelectedPrograms(
                                selectedPrograms.map((sp_hat, idx_hat) =>
                                  idx_hat === sp.idx
                                    ? { ...defaultSelectedProgram, name: value, programType }
                                    : sp_hat,
                                ),
                              );
                            }}
                            updateSelectFunction={(value) => {
                              setSelectedPrograms(
                                selectedPrograms.map((sp_hat, idx_hat) =>
                                  idx_hat === sp.idx ? value : sp_hat,
                                ),
                              );
                              if (state == 'error') setMessage('');
                              setState('changes_pending');
                            }}
                            valueFunction={(pt) => pt.name}
                            grouped={true}
                            getGroup={(pt) => pt.groupName}
                            hover={true}
                            getHover={(pt) => pt.name}
                          />
                          {(majorCounter !== 1 ||
                            !(programType.includes('major') || programType.includes('degree'))) && (
                            <button
                              onClick={() => handleProgramRemove(sp.idx)}
                              className="text-red-500 hover:text-red-700 hover:cursor-pointer"
                            >
                              <FiXCircle size={20} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                    <Button
                      onClick={() => handlePorgramAdd(programType)}
                      className="text-dark-green flex items-center gap-2"
                    >
                      <FiPlusCircle size={20} />
                    </Button>
                  </Fragment>
                ));
              })()}
              <Button
                onClick={() => handlePorgramAdd()}
                className="text-dark-green flex items-center gap-2"
              >
                <FiPlusCircle size={16} />
              </Button>
            </div>
          </div>
        </div>
      </div>
      <p className={clsx('mt-4 mb-3', state === 'error' && 'text-red-600')}>{message}</p>
      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        <Button
          style={
            state == 'changes_pending'
              ? {}
              : {
                  backgroundColor: '#aba5a561',
                  color: 'oklch(55.2% 0.016 285.938)',
                  borderWidth: '0',
                  cursor: 'not-allowed',
                }
          }
          className="border border-gray-500 text-settings-text px-3 hover:bg-dark-green hover:text-light-green duration-150"
          disabled={state != 'changes_pending'}
          onClick={() => {
            if (state == 'changes_pending' || state == 'error') initialSetup();
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={state != 'changes_pending'}
          style={
            state == 'changes_pending'
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
          {state === 'changes_pending'
            ? 'Save Changes'
            : state === 'idle'
              ? 'No Changes'
              : state === 'loading'
                ? 'Loading'
                : 'Error Occured'}
        </Button>
      </div>
    </div>
  );
}
