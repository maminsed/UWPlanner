import clsx from 'clsx';
import { LuCircleCheck, LuCircleDashed, LuCircleX } from 'react-icons/lu';
import { PiWarning } from 'react-icons/pi';

export function GetReqIcon({
  reqsMet,
  termCompatible,
  size = 'sm',
  className,
}: {
  reqsMet?: boolean;
  termCompatible?: boolean;
  size?: 'lg' | 'md' | 'sm';
  className?: string;
}) {
  if (termCompatible === false && reqsMet) {
    return (
      <PiWarning
        className={clsx(
          'text-yellow-600 inline-block mr-1',
          size == 'lg' && 'w-5',
          size == 'md' && 'w-4',
          size == 'sm' && 'w-3',
          className,
        )}
      />
    );
  }

  switch (reqsMet) {
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
  }
}
