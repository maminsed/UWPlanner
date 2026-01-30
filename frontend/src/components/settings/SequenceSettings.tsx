'use client';
import clsx from 'clsx';
import { Fragment, useEffect, useState } from 'react';
import { LuPencil } from 'react-icons/lu';
import { MdArrowBackIosNew } from 'react-icons/md';

import GroupedDropDown from '../utils/GroupedDropDown';
import { getCurrentTermId, getTermId, getTermSeason, termOperation } from '../utils/termUtils';

import { useApi } from '@/lib/useApi';

function groupK<T>(path: T[], k: number = 3): T[][] {
  const res: T[][] = [];
  for (let j = 0; j < path.length; ++j) {
    if (j % k == 0) {
      res.push([]);
    }
    res[res.length - 1].push(path[j]);
  }
  return res;
}

export function SequenceSettings() {
  // TODO: There is a fake save button on this page. You should implement it.
  // There are a lot of fake buttons on this page. Fix them.
  const backend = useApi();
  const currentSem = getCurrentTermId();
  const starting_term_id_options = [...Array(40)].map((_, idx) =>
    getTermSeason(termOperation(currentSem, idx - 20)),
  );
  const [seqName, setSeqName] = useState<string>('');
  const [startedTermId, setStartedTermId] = useState<number>(0);
  const [startedTermSearchPhrase, setStartedTermSearchPhrase] = useState<string>();
  const [gradTerm, setGradTerm] = useState<string>('');
  const [coop, setCoop] = useState<boolean>(false);
  const [path, setPath] = useState<{ name: string }[]>([]);

  const [state, setState] = useState<'idle' | 'error' | 'changes_pending' | 'loading'>('idle');
  const [message, setMessage] = useState<string>('');

  async function handleInitial() {
    setState('loading');
    const res = await backend(`${process.env.NEXT_PUBLIC_API_URL}/update_info/user_seqs`);
    const response = await res.json().catch(() => {});
    if (!res.ok) {
      console.error('error occured - please reload');
      setState('error');
    } else {
      setSeqName(response.sequence_name);
      setCoop(response.coop);
      setStartedTermId(response.started_term_id);
      setPath(response.path);
      setState('idle');
    }
  }

  useEffect(() => {
    handleInitial();
  }, []);
  useEffect(() => {
    setGradTerm(getTermSeason(termOperation(startedTermId, path.length)));
  }, [startedTermId]);

  async function handleSubmit() {
    if (state != 'changes_pending') return;
    if (startedTermSearchPhrase !== undefined) {
      setState('error');
      setMessage('Please select Started Term first');
      return;
    }
    setState('loading');
    try {
      const res = await backend(`${process.env.NEXT_PUBLIC_API_URL}/update_info/sequences`, {
        method: 'POST',
        body: JSON.stringify({
          coop: coop,
          sequence_path: path.map((v) => v.name),
          started_term_id: startedTermId,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const response = await res.json().catch(() => {});
      if (!res.ok) {
        setState('error');
        setMessage(response?.message || 'error occured');
      } else {
        setState('idle');
        setMessage('Changes saved');
      }
    } catch (err) {
      setState('error');
      setMessage('error occured while submitting');
    }
  }

  function updateSelectFunction(termSeason: string) {
    setStartedTermId(getTermId(termSeason) as number);
    setStartedTermSearchPhrase(undefined);
    if (state === 'error') setMessage('');
    setState('changes_pending');
  }

  function updateInputFunction(searchPhrase: string) {
    setStartedTermSearchPhrase(searchPhrase);
    // setStartedTermId(-1);
    if (state === 'error') setMessage('');
    setState('changes_pending');
  }

  return (
    <div id="courses">
      <h2 className="text-xl font-medium text-palette-rich-teal mt-10">Sequence</h2>
      <p className="mb-8">View and manage your sequence-related settings.</p>
      <div className="max-w-80 mb-10 gap-3 flex flex-col">
        {/*<div className="flex flex-row justify-between">
          <p className="text-lg">Current Semester</p>
           <select
            className="border-1 rounded-md min-w-20"
            value={currentSem}
          >
            {path.map((sem, i) => (
              <option key={i} value={i}>
                {sem}
              </option>
            ))}
          </select> 
        </div>*/}
        <div className="flex flex-row justify-between">
          <p className="text-lg">Current Semester</p>
          <p>{getTermSeason(currentSem)}</p>
        </div>

        <div className="flex flex-row justify-between">
          <p className="text-lg">Sequence Name</p>
          <div className="flex felx-row gap-1 items-center">
            <p>{seqName}</p>
            <LuPencil className="cursor-pointer hover:text-slate-600" />
          </div>
        </div>

        <div className="flex flex-row justify-between items-center">
          <p className="text-lg">Started Term</p>
          <GroupedDropDown<string>
            updateInputFunction={updateInputFunction}
            updateSelectFunction={updateSelectFunction}
            currentValue={
              startedTermSearchPhrase === undefined
                ? getTermSeason(startedTermId)
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
        </div>

        <div className="flex flex-row justify-between">
          <p className="text-lg">Graduation Term</p>
          <p>{gradTerm}</p>
        </div>

        <div className="flex flex-row justify-between">
          <p className="text-lg">Coop?</p>
          <input
            type="checkbox"
            className="w-4 rounded-full accent-dark-green "
            checked={coop}
            onChange={(e) => {
              setCoop(e.target.checked);
              if (state === 'error') setMessage('');
              setState('changes_pending');
            }}
          />
        </div>

        <div>
          <p className="text-lg">Path</p>
          {groupK<{ name: string }>(path).map((group, index) => (
            <div
              className="flex flex-row justify-start gap-4 align-middle mt-2 max-w-60"
              key={index}
            >
              {group.map(({ name: sem }, j) => (
                <Fragment key={j}>
                  <div
                    className={clsx(
                      'w-11 aspect-square rounded-lg text-light-green text-center leading-11 font-semibold',
                      termOperation(startedTermId, 3 * index + j) !== currentSem
                        ? 'bg-dark-green'
                        : 'bg-green-400',
                    )}
                  >
                    {sem}
                  </div>
                  {j != group.length - 1 ? (
                    <MdArrowBackIosNew className="w-5 h-auto rotate-180" />
                  ) : (
                    ''
                  )}
                </Fragment>
              ))}
            </div>
          ))}
        </div>
      </div>
      {message.length ? <p className={clsx(state == 'error' && 'text-red-500')}>{message}</p> : ''}
      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        <button
          style={
            state === 'idle' || state === 'loading'
              ? {
                  backgroundColor: '#aba5a561',
                  color: 'oklch(55.2% 0.016 285.938)',
                  borderWidth: '0',
                  cursor: 'not-allowed',
                }
              : {}
          }
          className="p-1 rounded-md font-medium cursor-pointer border border-gray-500 text-settings-text px-3 hover:bg-dark-green hover:text-light-green duration-150"
          disabled={state === 'idle' || state === 'loading'}
          onClick={() => {
            if (state !== 'idle') handleInitial();
            setState('idle');
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={state != 'changes_pending'}
          style={
            state != 'changes_pending'
              ? {
                  backgroundColor: '#aba5a561',
                  color: 'oklch(55.2% 0.016 285.938)',
                  borderWidth: '0',
                  cursor: 'not-allowed',
                }
              : {}
          }
          className="p-1 rounded-md font-medium cursor-pointer bg-dark-green text-white duration-150 px-3 hover:bg-[#2c464a]"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
