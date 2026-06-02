'use client';

import clsx from 'clsx';

import HoverEffect from '@/components/HoverEffect';

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
          ) : null}
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
                        onClick={() => setSequenceId(item.id, item.name, item.plan)}
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
