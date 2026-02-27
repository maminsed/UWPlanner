import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4 text-center">
      <h1 className="text-8xl font-bold text-[var(--foreground)]">400</h1>
      <h2 className="mt-4 text-2xl font-semibold text-[var(--foreground)]">Page Not Found</h2>
      <p className="mt-2 max-w-md text-gray-600">
        Sorry, the page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-lg bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        Go Back Home
      </Link>
    </div>
  );
}
