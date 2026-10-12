'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <h2 className="text-2xl font-bold font-mono text-emerald-400">Application Error</h2>
        <p className="text-slate-400 mt-2 text-sm">An unexpected error occurred.</p>
        <button
          onClick={() => reset()}
          className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm text-white font-medium transition-colors cursor-pointer"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
