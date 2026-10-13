import type { Metadata } from 'next';
import { AgentDashboard } from '@/components';

export const metadata: Metadata = {
  title: 'Helpline Agent Dashboard | FixMyItch',
  description:
    'Helpline concierge desk: track and manage cases by status (New, Assigned, Recommended, Resolved, Closed).',
};

export default function CasesDashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <AgentDashboard />
    </div>
  );
}
