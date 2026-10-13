import type { Metadata } from 'next';
import { HelplineRequestForm } from '@/components';

export const metadata: Metadata = {
  title: 'Emergency Helpline Request | FixMyItch Travel Medical Concierge',
  description:
    'Open an urgent medical assistance case abroad. English-speaking doctors, verified clinic intake, and emergency triage support.',
};

export default function NewCasePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <HelplineRequestForm />
    </div>
  );
}
