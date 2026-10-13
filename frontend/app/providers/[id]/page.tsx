import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ProviderDetail } from '@/components';

export const metadata: Metadata = {
  title: 'Healthcare Provider Details | FixMyItch',
  description:
    'View published treatment price tables, verified clinical certifications, spoken languages, and patient reviews. Request immediate 24/7 medical callback.',
};

export async function generateStaticParams() {
  return [
    { id: 'd4584078-c1e1-4658-8925-d221c0b90d00' },
    { id: '9febc24e-1e4e-45bc-b67f-4c26e23b449e' },
  ];
}

function DetailPageSkeleton() {
  return (
    <div className="w-full animate-pulse space-y-8 py-6">
      <div className="h-6 w-36 rounded-lg bg-slate-200 dark:bg-slate-800" />
      <div className="h-52 w-full rounded-3xl bg-slate-200 dark:bg-slate-800" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800/60" />
          <div className="h-48 rounded-2xl bg-slate-100 dark:bg-slate-800/60" />
        </div>
        <div className="h-80 rounded-2xl bg-slate-100 dark:bg-slate-800/60" />
      </div>
    </div>
  );
}

async function ProviderContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProviderDetail providerId={id} />;
}

export default function ProviderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Suspense fallback={<DetailPageSkeleton />}>
        <ProviderContent params={params} />
      </Suspense>
    </div>
  );
}
