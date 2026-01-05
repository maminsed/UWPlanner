import clsx from 'clsx';

export default function RightSide({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  // Just a class that has stuff on the right side
  return (
    <div className={clsx('flex justify-end gap-2 items-center', className)} {...props}>
      {children}
    </div>
  );
}
