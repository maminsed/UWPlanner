'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LuCircleMinus, LuCirclePlus } from 'react-icons/lu';

import { SequenceChoosing, SequenceOptionsType } from '@/components/settings/SequenceChoosing';
import { defaultSelectedProgram } from '@/components/utils/constants';
import GroupedDropDown from '@/components/utils/GroupedDropDown';
import {
  getCurrentTermId,
  getTermId,
  getTermSeason,
  termOperation,
} from '@/components/utils/termUtils';
import { appLogger } from '@/lib/logger';
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
          appLogger.error('Failed to load signup info options', {
            status: res.status,
            code: response?.code,
          });
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
        appLogger.error('Failed to load signup info options', {
          error: err instanceof Error ? err.message : String(err),
        });
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
      setMessage(response?.message || 'error occured');
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
                  {(selectedPrograms.length !== 1 || stage == 'program') && (
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
