export default function HomePage() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 mb-4">
        <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
        Mobile-First Healthcare Concierge
      </div>
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        FixMyItch
      </h1>
      <p className="mt-2 max-w-md text-sm sm:text-base text-slate-500 dark:text-slate-400">
        Transparent dermatology, emergency helpline, and verified clinics for international travelers.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <a
          href="/providers"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-teal-500/20 hover:from-teal-500 hover:to-teal-600 active:scale-95 transition-all"
        >
          <span>Find Doctors & Clinics</span>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </a>
      </div>
    </div>
  );
}
