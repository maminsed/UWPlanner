'use client';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4 text-center">
      <h1 className="text-8xl font-bold text-[var(--foreground)]">500</h1>
      <h2 className="mt-4 text-2xl font-semibold text-[var(--foreground)]">Something Went Wrong</h2>
      <p className="mt-2 max-w-md text-gray-600">
        An unexpected error occurred. Please try again or contact support if the problem persists.
      </p>
      <button
        onClick={() => reset()}
        className="mt-8 cursor-pointer rounded-lg bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        Try Again
      </button>
    </div>
  );
}
