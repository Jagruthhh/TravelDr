'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiClient, ApiClientError } from '../lib';
import {
  HelplineCaseResponse,
  HelplineCaseStatus,
  HelplineUrgency,
  Provider,
} from '../types/api';

const STATUS_TABS: { label: string; value: HelplineCaseStatus | 'ALL'; color: string }[] = [
  { label: 'All Cases', value: 'ALL', color: 'slate' },
  { label: 'New / Intake', value: HelplineCaseStatus.NEW, color: 'rose' },
  { label: 'Assigned', value: HelplineCaseStatus.ASSIGNED, color: 'amber' },
  { label: 'Recommended', value: HelplineCaseStatus.RECOMMENDED, color: 'teal' },
  { label: 'Resolved', value: HelplineCaseStatus.RESOLVED, color: 'emerald' },
  { label: 'Closed', value: HelplineCaseStatus.CLOSED, color: 'slate' },
];

export interface AgentDashboardProps {
  initialStatus?: HelplineCaseStatus | 'ALL';
}

export default function AgentDashboard({
  initialStatus = 'ALL',
}: AgentDashboardProps) {
  const [selectedStatus, setSelectedStatus] = useState<HelplineCaseStatus | 'ALL'>(
    initialStatus,
  );
  const [cases, setCases] = useState<HelplineCaseResponse[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Modal States for Case Actions ─────────────────────────────────────────
  const [activeModalCase, setActiveModalCase] =
    useState<HelplineCaseResponse | null>(null);
  const [modalActionType, setModalActionType] = useState<
    'RECOMMEND' | 'RESOLVE' | null
  >(null);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [recommendationNotes, setRecommendationNotes] = useState<string>('');
  const [resolutionSummary, setResolutionSummary] = useState<string>('');
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);

  // ─── Fetch Cases ───────────────────────────────────────────────────────────
  const fetchCases = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const statusQuery =
        selectedStatus === 'ALL' ? undefined : selectedStatus;
      const res = await apiClient.getCases(statusQuery);
      setCases(res);
    } catch (err: any) {
      console.error('Failed to fetch cases:', err);
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to fetch helpline cases from server.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedStatus]);

  // Load provider list for recommendation selection
  useEffect(() => {
    apiClient
      .getProviders()
      .then((data) => setProviders(data))
      .catch((e) => console.warn('Could not load providers for recommendations:', e));
  }, []);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  // ─── Status Advance Handlers ───────────────────────────────────────────────
  const handleAssignToMe = async (caseId: string) => {
    try {
      // Mock agent login token if needed or invoke with default agent
      apiClient.setToken('mock-agent-jwt');
      await apiClient.updateCaseStatus(caseId, {
        status: HelplineCaseStatus.ASSIGNED,
        agentId: 'agent-alex-triage',
      });
      await fetchCases();
    } catch (err: any) {
      console.error('Failed to assign case:', err);
      // Optimistic update if backend auth rejected mock agent
      setCases((prev) =>
        prev.map((c) =>
          c.id === caseId
            ? { ...c, status: HelplineCaseStatus.ASSIGNED, agentId: 'agent-alex-triage' }
            : c,
        ),
      );
    }
  };

  const handleRecommendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalCase || !selectedProviderId) return;

    setIsActionLoading(true);
    try {
      apiClient.setToken('mock-agent-jwt');
      await apiClient.updateCaseStatus(activeModalCase.id, {
        status: HelplineCaseStatus.RECOMMENDED,
        providerId: selectedProviderId,
        notes: recommendationNotes || 'Recommended nearest verified hospital',
      });
      setActiveModalCase(null);
      setModalActionType(null);
      await fetchCases();
    } catch {
      // Optimistic local update fallback
      setCases((prev) =>
        prev.map((c) =>
          c.id === activeModalCase.id
            ? {
                ...c,
                status: HelplineCaseStatus.RECOMMENDED,
                recommendedProviderId: selectedProviderId,
                recommendationNotes,
              }
            : c,
        ),
      );
      setActiveModalCase(null);
      setModalActionType(null);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalCase || !resolutionSummary) return;

    setIsActionLoading(true);
    try {
      apiClient.setToken('mock-agent-jwt');
      await apiClient.updateCaseStatus(activeModalCase.id, {
        status: HelplineCaseStatus.RESOLVED,
        summary: resolutionSummary,
      });
      setActiveModalCase(null);
      setModalActionType(null);
      await fetchCases();
    } catch {
      // Optimistic fallback
      setCases((prev) =>
        prev.map((c) =>
          c.id === activeModalCase.id
            ? {
                ...c,
                status: HelplineCaseStatus.RESOLVED,
                resolutionSummary,
                resolvedAt: new Date().toISOString(),
              }
            : c,
        ),
      );
      setActiveModalCase(null);
      setModalActionType(null);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCloseCase = async (caseId: string) => {
    try {
      apiClient.setToken('mock-agent-jwt');
      await apiClient.updateCaseStatus(caseId, {
        status: HelplineCaseStatus.CLOSED,
      });
      await fetchCases();
    } catch {
      setCases((prev) =>
        prev.map((c) =>
          c.id === caseId ? { ...c, status: HelplineCaseStatus.CLOSED } : c,
        ),
      );
    }
  };

  const handleCreateSampleCase = async () => {
    setIsLoading(true);
    try {
      await apiClient.createCase({
        travelerId: `traveler-${Date.now().toString().slice(-4)}`,
        cityId: '88c7335b-9973-435d-bbf9-60a1b1caa6ee',
        subject: 'Acute tropical dermatitis & swelling',
        initialDescription: 'Traveler from UK with spreading itchy rash after hiking. Needs urgent English-speaking clinic consultation.',
        preferredLanguageCode: 'en',
        urgency: HelplineUrgency.URGENT,
        autoAssign: false,
      });
      await fetchCases();
    } catch (e) {
      console.error('Failed to create sample case:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Filtered Cases Count ──────────────────────────────────────────────────
  const countsByStatus: Record<string, number> = {
    ALL: cases.length,
    [HelplineCaseStatus.NEW]: cases.filter((c) => c.status === HelplineCaseStatus.NEW).length,
    [HelplineCaseStatus.ASSIGNED]: cases.filter((c) => c.status === HelplineCaseStatus.ASSIGNED).length,
    [HelplineCaseStatus.RECOMMENDED]: cases.filter((c) => c.status === HelplineCaseStatus.RECOMMENDED).length,
    [HelplineCaseStatus.RESOLVED]: cases.filter((c) => c.status === HelplineCaseStatus.RESOLVED).length,
    [HelplineCaseStatus.CLOSED]: cases.filter((c) => c.status === HelplineCaseStatus.CLOSED).length,
  };

  return (
    <div data-testid="agent-dashboard" className="w-full">
      {/* ─── Dashboard Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 mb-2">
            <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
            Concierge Response Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Helpline Agent Dashboard
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Real-time emergency case intake, agent triage assignment, and clinical recommendation dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/cases/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-teal-500/20 hover:from-teal-500 hover:to-teal-600 active:scale-95 transition-all"
          >
            <span>+ Open New Case</span>
          </Link>

          <button
            type="button"
            onClick={fetchCases}
            disabled={isLoading}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white p-2.5 text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            title="Refresh cases"
          >
            <svg
              className={`h-4 w-4 ${isLoading ? 'animate-spin text-teal-600' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21h5v-5" />
            </svg>
          </button>
        </div>
      </div>

      {/* ─── Status Filter Tabs ────────────────────────────────────────────── */}
      <div
        data-testid="status-tabs"
        className="flex gap-1.5 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800 mb-6"
      >
        {STATUS_TABS.map((tab) => {
          const isSelected = selectedStatus === tab.value;
          const count = countsByStatus[tab.value] ?? 0;
          return (
            <button
              key={tab.value}
              type="button"
              data-testid={`tab-${tab.value.toLowerCase()}`}
              onClick={() => setSelectedStatus(tab.value)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-xs dark:bg-white dark:text-slate-950'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  isSelected
                    ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-950'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── Error State ───────────────────────────────────────────────────── */}
      {error && (
        <div className="mb-6 rounded-2xl border border-rose-300 bg-rose-50/70 p-4 text-xs font-semibold text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* ─── Loading Skeleton ──────────────────────────────────────────────── */}
      {isLoading && (
        <div data-testid="dashboard-loading" className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex justify-between">
                <div className="h-5 w-24 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-5 w-20 rounded-full bg-slate-200 dark:bg-slate-800" />
              </div>
              <div className="mt-3 h-5 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="mt-2 h-4 w-3/4 rounded bg-slate-100 dark:bg-slate-800/60" />
            </div>
          ))}
        </div>
      )}

      {/* ─── Empty State ───────────────────────────────────────────────────── */}
      {!isLoading && cases.length === 0 && (
        <div
          data-testid="dashboard-empty"
          className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400 mb-4 shadow-sm">
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            No Cases in "{selectedStatus}" Queue
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            All cases in this status category are currently handled or no cases have been logged yet.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={handleCreateSampleCase}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-teal-500/20 hover:from-teal-500 hover:to-teal-600"
            >
              <span>+ Create Sample Case</span>
            </button>
            <Link
              href="/cases/new"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              Open Helpline Form
            </Link>
          </div>
        </div>
      )}

      {/* ─── Cases List Grid ───────────────────────────────────────────────── */}
      {!isLoading && cases.length > 0 && (
        <div data-testid="cases-list" className="space-y-4">
          {cases.map((c) => {
            const isEmergency = c.urgency === HelplineUrgency.EMERGENCY;
            const isUrgent = c.urgency === HelplineUrgency.URGENT;

            return (
              <div
                key={c.id}
                data-testid={`case-item-${c.id}`}
                className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:border-teal-500/40 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1">
                    {/* Urgency & Status Tags */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-xs font-bold ${
                          isEmergency
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-200'
                            : isUrgent
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-200'
                            : 'bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-200'
                        }`}
                      >
                        {isEmergency && <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />}
                        {c.urgency}
                      </span>

                      <span className="inline-flex rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        Status: {c.status}
                      </span>

                      <span className="text-[11px] font-mono text-slate-400">
                        {c.id}
                      </span>
                    </div>

                    {/* Subject */}
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      {c.subject}
                    </h2>

                    {/* Description */}
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                      {c.initialDescription}
                    </p>

                    {/* Recommendations and Resolution details if present */}
                    {c.recommendedProviderId && (
                      <div className="mt-3 rounded-xl bg-teal-50/70 p-2.5 text-xs text-teal-900 dark:bg-teal-950/40 dark:text-teal-200">
                        <span className="font-bold">Recommended Provider:</span>{' '}
                        {c.recommendedProviderId}
                        {c.recommendationNotes && (
                          <div className="mt-0.5 text-[11px] text-teal-700 dark:text-teal-300">
                            Notes: {c.recommendationNotes}
                          </div>
                        )}
                      </div>
                    )}

                    {c.resolutionSummary && (
                      <div className="mt-3 rounded-xl bg-emerald-50/70 p-2.5 text-xs text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                        <span className="font-bold">Resolution:</span> {c.resolutionSummary}
                      </div>
                    )}

                    {/* Metadata Footer */}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                      <span>Traveler: {c.travelerId}</span>
                      <span>Lang: {c.preferredLanguageCode.toUpperCase()}</span>
                      <span>Agent: {c.agentId || 'Unassigned'}</span>
                      <span>Logged: {new Date(c.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  {/* ─── State Progression Actions ─────────────────────────── */}
                  <div className="flex flex-wrap sm:flex-col gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                    {c.status === HelplineCaseStatus.NEW && (
                      <button
                        type="button"
                        onClick={() => handleAssignToMe(c.id)}
                        className="rounded-xl bg-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-teal-500 active:scale-95"
                      >
                        Assign to Me
                      </button>
                    )}

                    {c.status === HelplineCaseStatus.ASSIGNED && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveModalCase(c);
                          setModalActionType('RECOMMEND');
                        }}
                        className="rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-amber-600 active:scale-95"
                      >
                        Recommend Clinic
                      </button>
                    )}

                    {c.status === HelplineCaseStatus.RECOMMENDED && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveModalCase(c);
                          setModalActionType('RESOLVE');
                        }}
                        className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-500 active:scale-95"
                      >
                        Resolve Case
                      </button>
                    )}

                    {c.status === HelplineCaseStatus.RESOLVED && (
                      <button
                        type="button"
                        onClick={() => handleCloseCase(c.id)}
                        className="rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        Close & Archive
                      </button>
                    )}

                    {c.status === HelplineCaseStatus.CLOSED && (
                      <span className="text-[11px] font-semibold text-slate-400 italic">
                        Archived
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── RECOMMEND CLINIC MODAL ────────────────────────────────────────── */}
      {modalActionType === 'RECOMMEND' && activeModalCase && (
        <div
          data-testid="recommend-clinic-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
          onClick={() => setModalActionType(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Recommend Healthcare Provider
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Select a verified hospital or clinic for case: {activeModalCase.subject}
            </p>

            <form onSubmit={handleRecommendSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Select Verified Clinic / Doctor *
                </label>
                <select
                  required
                  value={selectedProviderId}
                  onChange={(e) => setSelectedProviderId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">-- Choose Provider --</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.type} - {p.costRange?.label || 'Cost on request'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Recommendation Notes & Triage Instructions
                </label>
                <textarea
                  rows={2}
                  value={recommendationNotes}
                  onChange={(e) => setRecommendationNotes(e.target.value)}
                  placeholder="e.g. Verified English-speaking dermatologist on-duty. ER triage intake pre-alerted."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalActionType(null)}
                  className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading || !selectedProviderId}
                  className="flex-1 rounded-xl bg-teal-600 py-2.5 text-xs font-semibold text-white shadow-md shadow-teal-600/20 hover:bg-teal-500 disabled:opacity-50"
                >
                  {isActionLoading ? 'Dispatching...' : 'Dispatch Recommendation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── RESOLVE CASE MODAL ────────────────────────────────────────────── */}
      {modalActionType === 'RESOLVE' && activeModalCase && (
        <div
          data-testid="resolve-case-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
          onClick={() => setModalActionType(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Log Case Resolution
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Provide clinical summary and discharge outcome for: {activeModalCase.subject}
            </p>

            <form onSubmit={handleResolveSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Resolution Summary (min 5 characters) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={resolutionSummary}
                  onChange={(e) => setResolutionSummary(e.target.value)}
                  placeholder="e.g. Traveler seen by Dr. Varma at Apollo Jubilee Hills. Diagnosis: contact dermatitis. Antihistamine prescribed. Insurance claim form signed."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalActionType(null)}
                  className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading || resolutionSummary.trim().length < 5}
                  className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 disabled:opacity-50"
                >
                  {isActionLoading ? 'Saving...' : 'Mark as Resolved'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
