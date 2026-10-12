import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 text-center">
      <h2 className="text-2xl font-bold font-mono text-emerald-400">404 - Page Not Found</h2>
      <p className="text-slate-400 mt-2 text-sm">The requested resource could not be found.</p>
      <Link 
        href="/" 
        className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm text-white font-medium transition-colors"
      >
        Return to EcoArbor Studio
      </Link>
    </div>
  );
}
