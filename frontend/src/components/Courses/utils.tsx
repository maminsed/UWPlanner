import clsx from 'clsx';
import { LuCircleCheck, LuCircleDashed, LuCircleX } from 'react-icons/lu';

export function GetReqIcon({
  met,
  size = 'sm',
  className,
}: {
  met: boolean | undefined;
  size?: 'lg' | 'md' | 'sm';
  className?: string;
}) {
  switch (met) {
    case undefined:
      return (
        <LuCircleDashed
          className={clsx(
            'text-gray-600 inline-block mr-1',
            size == 'lg' && 'w-5',
            size == 'md' && 'w-4',
            size == 'sm' && 'w-3',
            className,
          )}
        />
      );
    case true:
      return (
        <LuCircleCheck
          className={clsx(
            'text-green-600 inline-block mr-1',
            size == 'lg' && 'w-5',
            size == 'md' && 'w-4',
            size == 'sm' && 'w-3',
            className,
          )}
        />
      );
    case false:
      return (
        <LuCircleX
          className={clsx(
            'text-red-600 inline-block mr-1',
            size == 'lg' && 'w-5',
            size == 'md' && 'w-4',
            size == 'sm' && 'w-3',
            className,
          )}
        />
      );
  }
}
