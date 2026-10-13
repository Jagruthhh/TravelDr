'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient, ApiClientError } from '../lib';
import { Provider, GetProvidersQuery } from '../types/api';
import ProviderCard from './ProviderCard';

// Pre-configured metadata for filters matching backend database records
export const CITIES = [
  { id: '', name: 'All Destinations' },
  { id: '88c7335b-9973-435d-bbf9-60a1b1caa6ee', name: 'Hyderabad, India' },
  { id: 'fd4def02-c1af-4907-a440-de91dcb13085', name: 'Goa, India' },
];

export const LANGUAGES = [
  { code: '', label: 'All Languages' },
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'te', label: 'Telugu' },
  { code: 'ru', label: 'Russian' },
  { code: 'kok', label: 'Konkani' },
];

export const SPECIALTIES = [
  { id: '', name: 'All Specialties' },
  { id: '0c400d27-27cd-451d-bf74-2f846f36899a', name: 'Dermatology & Skin' },
  { id: 'ae4f3927-d837-45fc-a9b6-ef2c73611e30', name: 'General Practice / GP' },
  { id: '19014e36-f8ca-4359-8ded-8ac7ee12f7c7', name: 'Emergency Medicine' },
  { id: 'd1fc44fe-fcce-4381-812b-6e6e43041eb4', name: 'Pediatrics' },
  { id: '140eb201-0f33-428b-a724-7da6e13504c7', name: 'Orthopedics & Sports' },
  { id: '43e715f0-9089-4464-b590-2c3373ac2d16', name: 'Cardiology' },
  { id: '8b66575b-aae9-4c56-a7a4-64796cf486b8', name: 'Ophthalmology (Eyes)' },
  { id: '82364b4c-900f-445e-8840-fe9611adc78d', name: 'Dentistry' },
];

export interface ProviderSearchProps {
  initialCity?: string;
  initialLanguage?: string;
  initialSpecialty?: string;
  initialVerifiedOnly?: boolean;
}

export default function ProviderSearch({
  initialCity = '',
  initialLanguage = '',
  initialSpecialty = '',
  initialVerifiedOnly = false,
}: ProviderSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // ─── Filter State ────────────────────────────────────────────────────────────
  const [city, setCity] = useState<string>(
    () => searchParams.get('city') || initialCity,
  );
  const [language, setLanguage] = useState<string>(
    () => searchParams.get('language') || initialLanguage,
  );
  const [specialty, setSpecialty] = useState<string>(
    () => searchParams.get('specialty') || initialSpecialty,
  );
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(() => {
    const param = searchParams.get('verifiedOnly');
    return param !== null ? param === 'true' : initialVerifiedOnly;
  });

  // ─── Data & Loading States ───────────────────────────────────────────────────
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  // ─── API Query Execution ─────────────────────────────────────────────────────
  const fetchProviders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const queryParams: GetProvidersQuery = {};
      if (city) queryParams.city = city;
      if (language) queryParams.language = language;
      if (specialty) queryParams.specialty = specialty;
      if (verifiedOnly) queryParams.verifiedOnly = true;

      // Invoking typed API Client method
      const results = await apiClient.getProviders(queryParams);
      setProviders(results);
    } catch (err: any) {
      console.error('Failed to fetch providers:', err);
      if (err instanceof ApiClientError) {
        setError(err.message || `API error (${err.status})`);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to connect to healthcare network. Please check your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [city, language, specialty, verifiedOnly]);

  // Sync URL query parameters
  useEffect(() => {
    startTransition(() => {
      const params = new URLSearchParams();
      if (city) params.set('city', city);
      if (language) params.set('language', language);
      if (specialty) params.set('specialty', specialty);
      if (verifiedOnly) params.set('verifiedOnly', 'true');

      const queryStr = params.toString();
      const targetUrl = queryStr ? `/providers?${queryStr}` : '/providers';
      window.history.replaceState(null, '', targetUrl);
    });

    fetchProviders();
  }, [city, language, specialty, verifiedOnly, fetchProviders]);

  // ─── Filter Reset ────────────────────────────────────────────────────────────
  const handleResetFilters = () => {
    setCity('');
    setLanguage('');
    setSpecialty('');
    setVerifiedOnly(false);
  };

  const hasActiveFilters = Boolean(city || language || specialty || verifiedOnly);

  // Selected filter labels for chips
  const activeCityName = CITIES.find((c) => c.id === city)?.name;
  const activeLangName = LANGUAGES.find((l) => l.code === language)?.label;
  const activeSpecName = SPECIALTIES.find((s) => s.id === specialty)?.name;

  return (
    <div className="w-full">
      {/* ─── Hero Header & Search Title ────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 px-6 py-10 sm:px-10 sm:py-14 text-white shadow-xl mb-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(20,184,166,0.15),transparent_70%)] pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-500/20 px-3 py-1 text-xs font-semibold text-teal-300 ring-1 ring-teal-500/30 backdrop-blur-sm mb-4">
            <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
            Verified Medical Directory
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            Find Trusted Doctors & Clinics Abroad
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
            Search vetted hospitals, English-speaking dermatologists, and primary care doctors with transparent costs in international destinations.
          </p>
        </div>
      </div>

      {/* ─── Filter Control Panel ─────────────────────────────────────────── */}
      <div
        data-testid="search-filters-panel"
        className="glass-surface sticky top-20 z-30 mb-8 rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-lg shadow-slate-200/40 dark:border-slate-800 dark:shadow-slate-950/40"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {/* 1. City Filter */}
          <div>
            <label
              htmlFor="filter-city"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Destination City
            </label>
            <div className="relative">
              <select
                id="filter-city"
                data-testid="filter-city-select"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs transition-colors focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                {CITIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* 2. Language Filter */}
          <div>
            <label
              htmlFor="filter-language"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Spoken Language
            </label>
            <div className="relative">
              <select
                id="filter-language"
                data-testid="filter-language-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs transition-colors focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* 3. Specialty Filter */}
          <div>
            <label
              htmlFor="filter-specialty"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Medical Specialty
            </label>
            <div className="relative">
              <select
                id="filter-specialty"
                data-testid="filter-specialty-select"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs transition-colors focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                {SPECIALTIES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* 4. Verified-Only Toggle */}
          <div className="flex flex-col justify-end">
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Provider Status
            </span>
            <label
              data-testid="filter-verified-toggle"
              className={`flex h-[42px] cursor-pointer items-center justify-between rounded-xl border px-3.5 transition-all select-none ${
                verifiedOnly
                  ? 'border-emerald-500/50 bg-emerald-50/70 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-500/40'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg
                  className={`h-4 w-4 ${
                    verifiedOnly ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                  }`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
                <span className="text-xs font-semibold">Verified Only</span>
              </div>
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
            </label>
          </div>
        </div>

        {/* Active Filter Chips & Clear Action */}
        {hasActiveFilters && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
              Active filters:
            </span>

            {city && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">
                City: {activeCityName}
                <button
                  type="button"
                  onClick={() => setCity('')}
                  className="rounded-full hover:bg-teal-200/50 p-0.5"
                >
                  ✕
                </button>
              </span>
            )}

            {language && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">
                Lang: {activeLangName}
                <button
                  type="button"
                  onClick={() => setLanguage('')}
                  className="rounded-full hover:bg-teal-200/50 p-0.5"
                >
                  ✕
                </button>
              </span>
            )}

            {specialty && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">
                Specialty: {activeSpecName}
                <button
                  type="button"
                  onClick={() => setSpecialty('')}
                  className="rounded-full hover:bg-teal-200/50 p-0.5"
                >
                  ✕
                </button>
              </span>
            )}

            {verifiedOnly && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                Verified Only
                <button
                  type="button"
                  onClick={() => setVerifiedOnly(false)}
                  className="rounded-full hover:bg-emerald-200/50 p-0.5"
                >
                  ✕
                </button>
              </span>
            )}

            <button
              type="button"
              data-testid="reset-filters-btn"
              onClick={handleResetFilters}
              className="ml-auto text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 underline underline-offset-2"
            >
              Reset all
            </button>
          </div>
        )}
      </div>

      {/* ─── Results Header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Available Healthcare Providers
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isLoading
              ? 'Searching network...'
              : `Found ${providers.length} ${providers.length === 1 ? 'provider' : 'providers'}`}
          </p>
        </div>

        <button
          type="button"
          data-testid="refresh-results-btn"
          onClick={fetchProviders}
          disabled={isLoading}
          aria-label="Refresh search results"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <svg
            className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-teal-600' : ''}`}
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
          <span>Refresh</span>
        </button>
      </div>

      {/* ─── 1. LOADING STATE ──────────────────────────────────────────────── */}
      {isLoading && (
        <div
          data-testid="search-loading-state"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="animate-pulse rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <div className="h-5 w-16 rounded-md bg-slate-200 dark:bg-slate-800" />
                <div className="h-5 w-20 rounded-full bg-slate-200 dark:bg-slate-800" />
              </div>
              <div className="mt-4 h-6 w-3/4 rounded-md bg-slate-200 dark:bg-slate-800" />
              <div className="mt-2 h-4 w-1/2 rounded-md bg-slate-100 dark:bg-slate-800/60" />
              <div className="mt-4 flex gap-2">
                <div className="h-4 w-14 rounded-md bg-slate-100 dark:bg-slate-800/60" />
                <div className="h-4 w-14 rounded-md bg-slate-100 dark:bg-slate-800/60" />
              </div>
              <div className="mt-6 border-t border-slate-100 pt-3 dark:border-slate-800 flex justify-between items-center">
                <div className="h-6 w-24 rounded-md bg-slate-200 dark:bg-slate-800" />
                <div className="h-8 w-20 rounded-xl bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── 2. ERROR STATE ────────────────────────────────────────────────── */}
      {!isLoading && error && (
        <div
          data-testid="search-error-state"
          className="rounded-2xl border border-rose-200 bg-rose-50/70 p-6 sm:p-8 text-center dark:border-rose-900/60 dark:bg-rose-950/30"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400 mb-4 shadow-sm">
            <svg
              className="h-7 w-7"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-rose-900 dark:text-rose-200">
            Search Request Failed
          </h3>
          <p className="mt-1 text-sm text-rose-700 dark:text-rose-300 max-w-md mx-auto">
            {error}
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              type="button"
              data-testid="retry-search-btn"
              onClick={fetchProviders}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-rose-600/20 hover:bg-rose-700 active:scale-95 transition-all"
            >
              <span>Retry Search</span>
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="rounded-xl border border-rose-300 bg-white px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-300"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* ─── 3. EMPTY STATE ────────────────────────────────────────────────── */}
      {!isLoading && !error && providers.length === 0 && (
        <div
          data-testid="search-empty-state"
          className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-14 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400 mb-4 shadow-sm">
            <svg
              className="h-8 w-8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </div>
          <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            No Healthcare Providers Found
          </h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            We couldn't find any clinic or doctor matching your selected filters. Try broadening your criteria or resetting filters.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              data-testid="empty-reset-filters-btn"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-teal-500/20 hover:from-teal-500 hover:to-teal-600 active:scale-95 transition-all"
            >
              <span>Reset All Filters</span>
            </button>
            {verifiedOnly && (
              <button
                type="button"
                onClick={() => setVerifiedOnly(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Include Unverified Providers
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── 4. RESULTS GRID (SUCCESS STATE) ───────────────────────────────── */}
      {!isLoading && !error && providers.length > 0 && (
        <div
          data-testid="search-results-grid"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {providers.map((p) => (
            <ProviderCard
              key={p.id}
              provider={p}
              onSelect={() => setSelectedProvider(p)}
              onBookAppointment={() => setSelectedProvider(p)}
            />
          ))}
        </div>
      )}

      {/* ─── Provider Detail Modal / Quick View ────────────────────────────── */}
      {selectedProvider && (
        <div
          data-testid="provider-detail-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          onClick={() => setSelectedProvider(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-semibold uppercase text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                  {selectedProvider.type}
                </span>
                <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                  {selectedProvider.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {selectedProvider.address}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProvider(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Verification:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {selectedProvider.isVerified ? 'Official Verified Partner' : 'Verification In Review'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Contact Phone:</span>
                <a
                  href={`tel:${selectedProvider.contactNumber}`}
                  className="font-semibold text-teal-600 hover:underline"
                >
                  {selectedProvider.contactNumber}
                </a>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Rating:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  ★ {selectedProvider.averageRating.toFixed(1)} ({selectedProvider.totalReviews} reviews)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cost Estimate:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedProvider.costRange?.label || 'Price on request'}
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Link
                href={`/providers/${selectedProvider.id}`}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-teal-50 py-2.5 text-xs font-bold text-teal-800 hover:bg-teal-100 dark:bg-teal-950/60 dark:text-teal-300 transition-colors"
              >
                <span>View Price Table & Reviews</span>
                <span>→</span>
              </Link>
              <a
                href={`tel:${selectedProvider.contactNumber}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Call Clinic
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
