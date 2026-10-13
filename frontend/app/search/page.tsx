import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ProviderSearch } from '@/components';

export const metadata: Metadata = {
  title: 'Search Healthcare Providers | FixMyItch',
  description:
    'Search verified doctors, dermatology clinics, and emergency hospitals worldwide.',
};

function SearchPageSkeleton() {
  return (
    <div className="w-full animate-pulse py-6">
      <div className="h-44 w-full rounded-3xl bg-slate-200 dark:bg-slate-800 mb-8" />
      <div className="h-28 w-full rounded-2xl bg-slate-100 dark:bg-slate-800/60 mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800/40" />
        ))}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Suspense fallback={<SearchPageSkeleton />}>
        <ProviderSearch />
      </Suspense>
    </div>
  );
}
