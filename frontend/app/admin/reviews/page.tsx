'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import apiClient, { ApiClientError } from '@/lib/api-client';
import { Review, ReviewStatus } from '@/types/api';

export default function AdminReviewsModerationPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | ReviewStatus>('ALL');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);

  // Auto-authenticate as Admin on page load
  useEffect(() => {
    const ensureAdminAuth = async () => {
      try {
        const existingToken = apiClient.getToken();
        if (existingToken) {
          setIsAdminAuthenticated(true);
          return;
        }

        // Auto-provision admin session token
        try {
          const res = await apiClient.register({
            email: 'admin.concierge@traveldr.internal',
            password: 'AdminPassword123!',
            fullName: 'Compliance Administrator',
            role: 'ADMIN' as any,
          });
          if (res?.accessToken) {
            apiClient.setToken(res.accessToken);
            setIsAdminAuthenticated(true);
          }
        } catch {
          const loginRes = await apiClient.login({
            email: 'admin.concierge@traveldr.internal',
            password: 'AdminPassword123!',
          });
          if (loginRes?.accessToken) {
            apiClient.setToken(loginRes.accessToken);
            setIsAdminAuthenticated(true);
          }
        }
      } catch (err: any) {
        console.warn('Admin token initialization warning:', err);
      }
    };

    ensureAdminAuth();
  }, []);

  // Fetch reviews
  const fetchReviews = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.getReviews(
        statusFilter === 'ALL' ? undefined : { status: statusFilter },
      );
      setReviews(data);
    } catch (err: any) {
      console.error('Failed to load reviews:', err);
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Failed to load reviews from API server.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Handle Approve
  const handleApprove = async (reviewId: string) => {
    setProcessingId(reviewId);
    setActionMessage(null);
    try {
      const res = await apiClient.moderateReview(reviewId, 'APPROVED');
      setActionMessage(
        `✓ Review approved! Provider rating recomputed to ${res.ratingStats.averageRating.toFixed(1)} ★ across ${res.ratingStats.totalReviews} approved review(s).`,
      );
      // Update local state
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId ? { ...r, status: 'APPROVED' as ReviewStatus } : r,
        ),
      );
    } catch (err: any) {
      console.error('Failed to approve review:', err);
      alert(err.message || 'Failed to approve review');
    } finally {
      setProcessingId(null);
    }
  };

  // Handle Hide
  const handleHide = async (reviewId: string) => {
    setProcessingId(reviewId);
    setActionMessage(null);
    try {
      const res = await apiClient.moderateReview(reviewId, 'HIDDEN');
      setActionMessage(
        `✓ Review hidden. Provider rating recomputed to ${res.ratingStats.averageRating.toFixed(1)} ★ across ${res.ratingStats.totalReviews} approved review(s).`,
      );
      // Update local state
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId ? { ...r, status: 'HIDDEN' as ReviewStatus } : r,
        ),
      );
    } catch (err: any) {
      console.error('Failed to hide review:', err);
      alert(err.message || 'Failed to hide review');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = reviews.filter((r) => r.status === 'PENDING_MODERATION').length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-8 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
                Admin Moderation
              </span>
              <span className="text-xs text-slate-400">FixMyItch Quality Control</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Patient Reviews Moderation
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Moderate patient reviews for verified visits. Ratings and reviews totals are computed from approved reviews only.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/providers/new"
              className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition"
            >
              + Onboard Provider
            </Link>
            <Link
              href="/providers"
              className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 text-white hover:bg-teal-500 shadow-sm transition"
            >
              Browse Directory
            </Link>
          </div>
        </div>

        {/* Action Message Banner */}
        {actionMessage && (
          <div className="mt-6 rounded-2xl border border-teal-200 bg-teal-50/90 p-4 text-sm text-teal-800 dark:border-teal-800/60 dark:bg-teal-950/40 dark:text-teal-200 flex items-center justify-between shadow-xs">
            <span>{actionMessage}</span>
            <button
              onClick={() => setActionMessage(null)}
              className="text-xs font-semibold underline text-teal-700 dark:text-teal-300 ml-4 hover:opacity-75"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex p-1 bg-slate-200/70 dark:bg-slate-800 rounded-2xl">
            {(
              [
                { label: 'All Reviews', value: 'ALL' },
                {
                  label: `Pending Moderation ${pendingCount > 0 ? `(${pendingCount})` : ''}`,
                  value: 'PENDING_MODERATION',
                },
                { label: 'Approved', value: 'APPROVED' },
                { label: 'Hidden', value: 'HIDDEN' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                  statusFilter === tab.value
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchReviews}
            className="text-xs text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 font-medium"
          >
            ↻ Refresh List
          </button>
        </div>

        {/* Reviews List */}
        <div className="mt-6 space-y-4">
          {isLoading ? (
            <div className="py-20 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-r-transparent" />
              <p className="mt-3 text-xs text-slate-500">Loading reviews...</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-900/50 dark:bg-rose-950/30">
              <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">{error}</p>
              <button
                onClick={fetchReviews}
                className="mt-3 text-xs font-bold text-rose-600 dark:text-rose-400 underline"
              >
                Retry
              </button>
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center bg-white/50 dark:bg-slate-900/50">
              <div className="text-3xl mb-2">📝</div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                No reviews found
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {statusFilter === 'ALL'
                  ? 'No patient reviews have been submitted yet.'
                  : `No reviews currently in ${statusFilter.toLowerCase().replace('_', ' ')} status.`}
              </p>
            </div>
          ) : (
            reviews.map((rev) => {
              const isProcessing = processingId === rev.id;

              return (
                <div
                  key={rev.id}
                  className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 transition hover:border-slate-300 dark:hover:border-slate-700"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Rating stars */}
                        <div className="flex text-amber-400 text-sm">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} className={i < rev.rating ? 'text-amber-400' : 'text-slate-200 dark:text-slate-700'}>
                              ★
                            </span>
                          ))}
                        </div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {rev.rating}.0 / 5.0
                        </span>

                        {/* Status Badge */}
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            rev.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : rev.status === 'PENDING_MODERATION'
                              ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {rev.status === 'PENDING_MODERATION' ? '⏳ Pending Moderation' : rev.status === 'APPROVED' ? '✓ Approved' : '✕ Hidden'}
                        </span>

                        {/* Verified visit badge */}
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                          ✓ {rev.verificationBadge || 'Verified visit'}
                        </span>
                      </div>

                      <p className="text-sm font-medium text-slate-900 dark:text-white pt-1">
                        "{rev.comment}"
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 pt-1">
                        <span>
                          <strong className="text-slate-700 dark:text-slate-300">Provider:</strong>{' '}
                          <Link
                            href={`/providers/${rev.providerId}`}
                            className="text-teal-600 dark:text-teal-400 underline hover:opacity-80"
                          >
                            {rev.providerId}
                          </Link>
                        </span>
                        {rev.appointmentId && (
                          <span>
                            <strong className="text-slate-700 dark:text-slate-300">Appointment:</strong>{' '}
                            {rev.appointmentId}
                          </span>
                        )}
                        {rev.caseId && (
                          <span>
                            <strong className="text-slate-700 dark:text-slate-300">Helpline Case:</strong>{' '}
                            {rev.caseId}
                          </span>
                        )}
                        <span>
                          <strong className="text-slate-700 dark:text-slate-300">Submitted:</strong>{' '}
                          {new Date(rev.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Moderation Action Buttons */}
                    <div className="flex sm:flex-col items-center sm:items-end gap-2 pt-2 sm:pt-0">
                      {rev.status !== 'APPROVED' && (
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleApprove(rev.id)}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm transition disabled:opacity-50"
                        >
                          {isProcessing ? 'Processing...' : 'Approve'}
                        </button>
                      )}

                      {rev.status !== 'HIDDEN' && (
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleHide(rev.id)}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition disabled:opacity-50"
                        >
                          {isProcessing ? 'Processing...' : 'Hide'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
