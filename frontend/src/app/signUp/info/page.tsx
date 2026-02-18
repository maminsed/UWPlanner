'use client';
import clsx from 'clsx';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LuCircleMinus, LuCirclePlus } from 'react-icons/lu';

import HoverEffect from '@/components/HoverEffect';
import { defaultSelectedProgram } from '@/components/utils/constants';
import GroupedDropDown from '@/components/utils/GroupedDropDown';
import {
  getCurrentTermId,
  getTermId,
  getTermSeason,
  termOperation,
} from '@/components/utils/termUtils';
import { useApi } from '@/lib/useApi';

type programOptionType = {
  groupName: string;
  id: number;
  name: string;
};

interface RestStatusType {
  coop: boolean | undefined;
  sequenceId: number | undefined;
  started_term_id: number | undefined;
}

export type SequenceOptionsType = {
  legend: Record<string, string>;
  seqGroups: {
    programName: string;
    sequences: {
      id: number;
      name: string;
      appliesTo: string;
      plan: string[];
    }[];
  }[];
}[];

const URLS = ['programs?only_majors=true', 'programs', 'sequences'];
const HEADINGS = [
  { main: 'Select your major(s)', sub: '' },
  { main: 'Select the rest of your program(s)', sub: 'Any minor/specialization/option/...' },
  { main: 'Fill out the additional information', sub: '' },
];

export default function Info() {
  const [order, setOrder] = useState<number>(0);
  const [selectedPrograms, setSelectedPrograms] = useState<programOptionType[]>([
    defaultSelectedProgram,
  ]);
  const currentSem = getCurrentTermId();
  const starting_term_id_options = [...Array(40)].map((_, idx) =>
    getTermSeason(termOperation(currentSem, idx - 20)),
  );
  const [programOptions, setProgramOptions] = useState<programOptionType[]>([]);
  const [sequenceOptions, setSequenceOptions] = useState<SequenceOptionsType>([]);
  const [restStatus, setRestStatus] = useState<RestStatusType>({
    coop: undefined,
    started_term_id: undefined,
    sequenceId: undefined,
  });
  const [startedTermSearchPhrase, setStartedTermSearchPhrase] = useState<string>();

  const stage = ['major', 'program', 'all'][order];
  const urlEnding = URLS[order];

  const backend = useApi();
  const router = useRouter();
  const [message, setMessage] = useState<undefined | string>(undefined);

  useEffect(() => {
    async function gettingData() {
      try {
        const res = await backend(`${process.env.NEXT_PUBLIC_API_URL}/update_info/${urlEnding}`, {
          method: 'GET',
        });

        const response = await (res as Response).json().catch(() => {});
        if (!res.ok) {
          console.error('Error in Resposne');
          console.info(response);
          return;
        }
        if (stage !== 'all') {
          const PO: programOptionType[] = [];
          response['availablePrograms'].forEach(
            (ap: { groupName: string; programs: { id: number; name: string }[] }) => {
              ap.programs.forEach((program) => {
                PO.push({ ...program, groupName: ap.groupName });
              });
            },
          );
          const enroledIds: programOptionType[] = response['enroledIds'];
          if (!enroledIds.length) enroledIds.push(defaultSelectedProgram);
          setProgramOptions(PO);
          setSelectedPrograms(enroledIds);
        } else {
          setSequenceOptions(response);
        }
      } catch (err) {
        console.error('Error: ');
        console.info(err);
      }
    }

    gettingData();
  }, [order]);

  async function handleNext() {
    setMessage('loading...');
    const programIds = selectedPrograms.map((programOption) => programOption.id);
    if (stage !== 'all' && programIds.find((val) => val == -1)) {
      setMessage('Please select all the program fields or remove them');
      return;
    } else if (
      stage === 'all' &&
      (restStatus.coop === undefined ||
        restStatus.sequenceId === undefined ||
        restStatus.started_term_id == undefined)
    ) {
      setMessage('Please select coop and at least one sequence');
      return;
    }
    const res = await backend(`${process.env.NEXT_PUBLIC_API_URL}/update_info/${urlEnding}`, {
      method: 'POST',
      body: JSON.stringify(
        stage === 'all'
          ? { ...restStatus, sequence_id: restStatus.sequenceId }
          : { programIds: programIds },
      ),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await (res as Response).json().catch(() => {});
    if (res.ok) {
      if (order === URLS.length - 1) {
        router.push('/semester');
        return;
      }
      setOrder(order + 1);
      setMessage(undefined);
    } else {
      setMessage(response.message || 'error occured');
    }
  }

  function handleAdd() {
    setSelectedPrograms((pis) => [...pis, defaultSelectedProgram]);
  }

  function handleRemove(idx: number) {
    setSelectedPrograms((pis) => pis.filter((_, i) => idx !== i));
  }

  function updateSelectFunction(termSeason: string) {
    setRestStatus((v) => ({ ...v, started_term_id: getTermId(termSeason) as number }));
    setStartedTermSearchPhrase(undefined);
  }

  function updateInputFunction(searchPhrase: string) {
    setStartedTermSearchPhrase(searchPhrase);
  }

  return (
    <main>
      <h2 className="md:mt-15 px-3 mt-5 text-center md:text-2xl text-xl font-semibold">
        Just a few more questions to know you better
      </h2>

      <div className="mx-auto w-fit max-w-[96%] mt-20 px-8 py-5 rounded-lg bg-[#DAEBE3] shadow-[0px_0px_57.4px_0px_rgba(0,0,0,0.4)]">
        <h5 className="text-xl font-medium text-center mt-2">{HEADINGS[order].main}</h5>
        <h5 className="text-base font-light text-center text-dark-green/80">
          {HEADINGS[order].sub}
        </h5>
        {stage !== 'all' ? (
          <>
            <div className="mb-8"></div>
            {/* Programs */}
            {selectedPrograms.map((sp, idx) => {
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
                <div key={idx} className="flex mt-2 items-center gap-2 justify-center">
                  <GroupedDropDown<programOptionType>
                    currentValue={sp}
                    placeholder="start typing..."
                    options={filteredPrograms}
                    updateInputFunction={(value) => {
                      setSelectedPrograms(
                        selectedPrograms.map((sp_hat, idx_hat) =>
                          idx_hat === idx ? { ...defaultSelectedProgram, name: value } : sp_hat,
                        ),
                      );
                    }}
                    updateSelectFunction={(value) => {
                      setSelectedPrograms(
                        selectedPrograms.map((sp_hat, idx_hat) =>
                          idx_hat === idx ? value : sp_hat,
                        ),
                      );
                    }}
                    valueFunction={(pt) => pt.name}
                    grouped={true}
                    getGroup={(pt) => pt.groupName}
                    hover={true}
                    getHover={(pt) => pt.name}
                  />
                  {(selectedPrograms.length !== 1 || stage == 'programs') && (
                    <LuCircleMinus className="cursor-pointer" onClick={() => handleRemove(idx)} />
                  )}
                </div>
              );
            })}
            <button className="mt-4 cursor-pointer" onClick={handleAdd}>
              <LuCirclePlus />
            </button>
          </>
        ) : (
          <div className="mb-4">
            <h4 className="text-lg font-medium mt-2">Coop:</h4>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={restStatus.coop === true}
                  name="coop"
                  onChange={() => setRestStatus((prev) => ({ ...prev, coop: true }))}
                />
                Yes
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={restStatus.coop === false}
                  name="coop"
                  onChange={() => setRestStatus((prev) => ({ ...prev, coop: false }))}
                />
                No
              </label>
            </div>

            <h4 className="text-lg font-medium mt-2">Started Term:</h4>
            <GroupedDropDown<string>
              updateInputFunction={updateInputFunction}
              updateSelectFunction={updateSelectFunction}
              currentValue={
                startedTermSearchPhrase === undefined
                  ? getTermSeason(restStatus.started_term_id || currentSem)
                  : startedTermSearchPhrase
              }
              options={
                startedTermSearchPhrase === undefined
                  ? starting_term_id_options
                  : starting_term_id_options.filter((termSesaon) =>
                      termSesaon.toLowerCase().includes(startedTermSearchPhrase.toLowerCase()),
                    )
              }
              valueFunction={(v) => v}
              size="sm"
            />

            <h4 className="text-lg font-medium mt-2">Sequence:</h4>
            <SequenceChoosing
              sequenceOptions={sequenceOptions}
              sequenceId={restStatus.sequenceId}
              setSequenceId={(sequenceId) => setRestStatus({ ...restStatus, sequenceId })}
            />
          </div>
        )}
        <button
          className="mt-1 text-center w-full bg-dark-green text-light-green rounded-sm py-1 cursor-pointer hover:bg-dark-green/95 active:bg-[#204044] duration-300 ease-in"
          onClick={handleNext}
          disabled={message == 'loading...'}
        >
          Next
        </button>
        {message && <p className="text-red-500 mt-1">{message}</p>}
      </div>

      {/* Background */}
      <div className="h-[50vh] md:h-fit w-dvw fixed left-0 bottom-0 overflow-x-hidden z-[-1]">
        <Image
          src="/background.svg"
          width="1000"
          height="500"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'bottom',
          }}
          alt="background"
        />
      </div>
    </main>
  );
}

interface SequenceChoosingProps {
  sequenceOptions: SequenceOptionsType;
  sequenceId: number | undefined;
  setSequenceId: (seqId: number, seqName: string, sequencePath: string[]) => void;
}

export function SequenceChoosing({
  sequenceOptions,
  sequenceId,
  setSequenceId,
}: SequenceChoosingProps) {
  return (
    <div>
      {sequenceOptions.map((seqGroup, idx) => (
        <div key={idx} className="my-5">
          {/* Legend */}
          {Object.keys(seqGroup.legend).length ? (
            <div className="overflow-x-auto">
              <h5 className="my-1 font-medium text-base">Legend:</h5>
              <table className="table-auto border-collapse border border-gray-400 mb-4 text-sm max-w-full">
                <thead>
                  <tr>
                    <th className="border border-gray-400 px-4 py-2">Key</th>
                    <th className="border border-gray-400 px-4 py-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(seqGroup.legend).map((item, idx) => (
                    <tr key={idx}>
                      <td className="border border-gray-400 px-4 py-2">{item}</td>
                      <td className="border border-gray-400 px-4 py-2">{seqGroup.legend[item]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <></>
          )}
          {seqGroup.seqGroups.map((seqs) => {
            let longest = 0;
            let hasAppliesTo = false;
            let hasName = false;
            seqs.sequences.forEach((seq) => {
              longest = Math.max(longest, seq.plan.length);
              hasAppliesTo = hasAppliesTo || seq.appliesTo !== '';
              hasName = hasName || seq.name !== '';
            });
            const header = [...Array(longest)].map(
              (_, i) => `${i % 3 == 2 ? 'S' : i % 3 == 1 ? 'W' : 'F'}`,
            );
            return (
              <div key={seqs.programName} className="overflow-x-auto scroller">
                <h6 className="mb-1 mt-5 font-medium text-base">{seqs.programName}</h6>
                <table className="table-auto w-full border-collapse border border-gray-400 text-[10px] sm:text-xs max-w-full">
                  <thead>
                    <tr>
                      {hasAppliesTo && (
                        <th className="border border-gray-400 px-2 py-1 truncate">Plan</th>
                      )}
                      {hasName && (
                        <th className="border border-gray-400 text-center py-1 truncate">
                          {hasAppliesTo ? 'S/S' : 'Sequence'}
                        </th>
                      )}
                      {header.map((i, idx) => (
                        <th key={idx} className="border border-gray-400 px-2 py-1 truncate">
                          {i}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {seqs.sequences.map((item, idx) => (
                      <tr
                        key={idx}
                        className={clsx(sequenceId == item.id && 'bg-emerald-300')}
                        onClick={() =>
                          // setRestStatus({ ...restStatus, sequenceId: item.id })
                          setSequenceId(item.id, item.name, item.plan)
                        }
                      >
                        {hasAppliesTo && (
                          <td className="border border-gray-400 px-2 py-1 text-center truncate max-w-25">
                            <HoverEffect hover={item.appliesTo} outerClass="cursor-pointer">
                              {item.appliesTo}
                            </HoverEffect>
                          </td>
                        )}
                        {hasName && (
                          <td className="border border-gray-400 px-2 py-1 text-center truncate">
                            <HoverEffect hover={item.name}>{item.name}</HoverEffect>
                          </td>
                        )}
                        {[...Array(longest)].map((_, idx) => (
                          <td className="border border-gray-400 px-2 py-1 text-center" key={idx}>
                            {item.plan[idx] || ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
