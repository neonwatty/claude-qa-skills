import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">
          404
        </h1>
        <h2 className="mt-2 text-lg font-medium text-zinc-600 dark:text-zinc-400">
          Page not found
        </h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          The page you are looking for does not exist.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
