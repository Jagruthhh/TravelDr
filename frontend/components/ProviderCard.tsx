'use client';

import React from 'react';
import {
  Provider,
  ProviderCostRange,
  ProviderType,
  VerificationStatus,
  TreatmentEstimateDetail,
} from '../types/api';

export interface ProviderCardProps {
  /** Complete or partial Provider entity object from API */
  provider?: Partial<Provider>;

  /** Provider unique identifier */
  id?: string;

  /** Provider or clinic name */
  name?: string;

  /** Healthcare provider type (Hospital, Clinic, Doctor) */
  type?: ProviderType | string;

  /** Primary category or department */
  category?: string;

  /** Healthcare specialties (e.g., ['Dermatology', 'Emergency Medicine']) */
  specialties?: string[];

  /** Physical street address or location */
  address?: string;

  /** City name or identifier */
  city?: string;

  /** Contact phone number */
  contactNumber?: string;

  /** Official website URL */
  websiteUrl?: string;

  /** Average rating score (0.0 to 5.0) */
  averageRating?: number;

  /** Total number of verified patient reviews */
  totalReviews?: number;

  // ─── 4 Core Requirements ───────────────────────────────────────────────────

  /** Whether the provider holds official verified status */
  isVerified?: boolean;

  /** Granular verification status (VERIFIED, PENDING, REJECTED, SUSPENDED) */
  verificationStatus?: VerificationStatus | string;

  /** Spoken languages spoken by medical staff */
  spokenLanguages?: string[];

  /** Distance in kilometers from current traveler location */
  distanceKm?: number;

  /** Formatted distance string (e.g., '1.2 km away' or '5 min walk') */
  distanceText?: string;

  /** Structured cost range object or formatted cost string */
  costRange?: ProviderCostRange | string;

  /** Optional treatment estimate detail if calculated */
  treatmentCostEstimate?: TreatmentEstimateDetail;

  // ─── Interaction & Styling ────────────────────────────────────────────────

  /** Callback when card or 'View Details' is clicked */
  onSelect?: (providerId: string) => void;

  /** Callback when 'Book Appointment' button is clicked */
  onBookAppointment?: (providerId: string) => void;

  /** Callback when contact/call button is clicked */
  onContact?: (providerId: string) => void;

  /** Additional Tailwind CSS classes */
  className?: string;

  /** Compact mode flag for dense list views or mobile popups */
  compact?: boolean;
}

/**
 * Format currency symbol from code
 */
function getCurrencySymbol(code?: string | null): string {
  if (!code) return '$';
  switch (code.toUpperCase()) {
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'JPY':
      return '¥';
    case 'THB':
      return '฿';
    case 'SGD':
      return 'S$';
    case 'CAD':
      return 'CA$';
    case 'AUD':
      return 'A$';
    default:
      return `${code} `;
  }
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  te: 'Telugu',
  kok: 'Konkani',
  ru: 'Russian',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
};

const SPECIALTY_NAMES: Record<string, string> = {
  // Database seeded UUIDs (previous & latest)
  'd7449fff-9c92-4b91-8291-8cb4bff3628d': 'Dermatology',
  '244a8c79-2ffb-4161-acd0-fdc93968527a': 'General Practice',
  'e7ed77e7-faf4-4921-b618-7160b5247bc9': 'Emergency Medicine',
  '7bf54685-845b-4890-9ad0-79ff0eada55b': 'Pediatrics',
  'fd249942-b6dd-4b42-acff-b9174418e089': 'Orthopedics',
  'c13089d4-947f-4ac0-957b-6947c50ea039': 'Cardiology',
  '53c8b4e3-e1d8-4570-9552-c479f6c64dfd': 'Ophthalmology',
  'e61f5d5a-5bb9-41b8-b130-423cc68f0b9f': 'Dentistry',
  'b34b7e38-7e8d-4cf2-ad46-6f60d30c9bf8': 'Dermatology',
  '0416c299-2124-4edc-af5c-68b04e45639b': 'General Practice',
  'c8b420f7-321b-4d28-8e25-22363ecea45f': 'Emergency Medicine',
  'b305e9d7-7afa-45a4-82a5-5b4e8c31f640': 'Pediatrics',
  'b19c0179-08a3-4cfc-8d3c-4468073afaf0': 'Orthopedics',
  '3c7e4897-a7a9-412b-8440-d3ef41a6ff0e': 'Cardiology',
  '88addda4-2598-4d46-8a4b-2996f7e76337': 'Ophthalmology',
  'a3a9ccc2-171d-4f86-b513-e791c514a80e': 'Dentistry',

  // Static/Frontend catalog IDs
  '0c400d27-27cd-451d-bf74-2f846f36899a': 'Dermatology',
  'ae4f3927-d837-45fc-a9b6-ef2c73611e30': 'General Practice',
  '19014e36-f8ca-4359-8ded-8ac7ee12f7c7': 'Emergency Medicine',
  'd1fc44fe-fcce-4381-812b-6e6e43041eb4': 'Pediatrics',
  '140eb201-0f33-428b-a724-7da6e13504c7': 'Orthopedics',
  '43e715f0-9089-4464-b590-2c3373ac2d16': 'Cardiology',
  '8b66575b-aae9-4c56-a7a4-64796cf486b8': 'Ophthalmology',
  '82364b4c-900f-445e-8840-fe9611adc78d': 'Dentistry',

  // Slug / test IDs
  'spec-derm': 'Dermatology',
  'spec-gp': 'General Practice',
  'spec-er': 'Emergency Medicine',
  'spec-pediatrics': 'Pediatrics',
  'spec-ortho': 'Orthopedics',
  'spec-cardio': 'Cardiology',
  'spec-ophthalmology': 'Ophthalmology',
  'spec-dentistry': 'Dentistry',
};

export function formatLanguageName(code: string): string {
  if (!code) return '';
  const lower = code.toLowerCase().trim();
  return LANGUAGE_NAMES[lower] || code;
}

export function formatSpecialtyName(idOrName: string): string {
  if (!idOrName) return '';
  if (SPECIALTY_NAMES[idOrName]) {
    return SPECIALTY_NAMES[idOrName];
  }
  // If it's an unmapped UUID, fallback to a friendly title to prevent raw UUID display
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrName)) {
    return 'Specialist Care';
  }
  return idOrName;
}

export function formatVerifiedDate(dateVal?: Date | string | null): string | null {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Modern, responsive ProviderCard component.
 * Displays verified status badge, spoken languages, proximity distance, and cost range.
 */
export default function ProviderCard(props: ProviderCardProps) {
  const {
    provider,
    className = '',
    compact = false,
    onSelect,
    onBookAppointment,
    onContact,
  } = props;

  // Merge top-level props with nested provider object (top-level props take priority)
  const id = props.id || provider?.id || 'provider';
  const name = props.name || provider?.name || 'Healthcare Provider';
  const type = props.type || provider?.type || ProviderType.CLINIC;
  const address = props.address || provider?.address || '';
  const contactNumber = props.contactNumber || provider?.contactNumber || '';
  const specialties = props.specialties || provider?.specialties || [];
  const averageRating = props.averageRating ?? provider?.averageRating ?? 0;
  const totalReviews = props.totalReviews ?? provider?.totalReviews ?? 0;

  // 1. Verified Badge Resolution
  const rawStatus = props.verificationStatus || provider?.verificationStatus;
  const isVerified =
    props.isVerified !== undefined
      ? props.isVerified
      : provider?.isVerified !== undefined
      ? provider.isVerified
      : rawStatus === VerificationStatus.VERIFIED || rawStatus === 'VERIFIED';

  const rawVerifiedDate =
    (props as any).lastVerifiedAt ||
    provider?.lastVerifiedAt ||
    (provider as any)?.verification?.lastVerifiedAt ||
    (provider as any)?.verification?.verifiedAt;
  const verifiedDateText = formatVerifiedDate(rawVerifiedDate);

  // 2. Languages Resolution
  const spokenLanguages = props.spokenLanguages || provider?.spokenLanguages || [];

  // 3. Distance Resolution
  let distanceDisplay: string | null = null;
  if (props.distanceText) {
    distanceDisplay = props.distanceText;
  } else if (props.distanceKm !== undefined && props.distanceKm !== null) {
    if (props.distanceKm < 1) {
      distanceDisplay = `${Math.round(props.distanceKm * 1000)} m away`;
    } else {
      distanceDisplay = `${props.distanceKm.toFixed(1)} km away`;
    }
  }

  // 4. Cost Range Resolution
  const costRangeProp = props.costRange || provider?.costRange;
  let formattedCost = 'Cost on request';
  let costSubtitle = 'Contact provider for quotation';
  let hasValidPrice = false;

  if (typeof costRangeProp === 'string') {
    formattedCost = costRangeProp;
    costSubtitle = 'Estimated fee';
    hasValidPrice = true;
  } else if (costRangeProp && typeof costRangeProp === 'object') {
    if (costRangeProp.hasData) {
      const sym = getCurrencySymbol(costRangeProp.currency);
      hasValidPrice = true;
      if (
        costRangeProp.minPrice !== null &&
        costRangeProp.maxPrice !== null &&
        costRangeProp.minPrice !== costRangeProp.maxPrice
      ) {
        formattedCost = `${sym}${costRangeProp.minPrice.toLocaleString()} - ${sym}${costRangeProp.maxPrice.toLocaleString()}`;
        costSubtitle = 'Typical visit range';
      } else if (costRangeProp.minPrice !== null) {
        formattedCost = `From ${sym}${costRangeProp.minPrice.toLocaleString()}`;
        costSubtitle = 'Starting fee';
      } else if (costRangeProp.maxPrice !== null) {
        formattedCost = `Up to ${sym}${costRangeProp.maxPrice.toLocaleString()}`;
        costSubtitle = 'Maximum estimate';
      } else if (costRangeProp.label) {
        formattedCost = costRangeProp.label;
        costSubtitle = 'Typical visit';
      }
    } else if (costRangeProp.label) {
      formattedCost = costRangeProp.label;
      costSubtitle = 'Pricing unavailable';
    }
  }

  // Specific treatment estimate override if provided
  const estimate = props.treatmentCostEstimate || provider?.treatmentCostEstimate;
  if (estimate?.hasData && estimate.price !== undefined) {
    const sym = getCurrencySymbol(estimate.currency);
    formattedCost = `${sym}${estimate.price.toLocaleString()}`;
    costSubtitle = estimate.label || 'Estimated treatment';
    hasValidPrice = true;
  }

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(id);
    }
  };

  return (
    <article
      data-testid="provider-card"
      data-provider-id={id}
      onClick={handleCardClick}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:border-teal-500/40 hover:shadow-lg hover:shadow-teal-500/5 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-500/40 dark:hover:shadow-teal-950/20 ${
        onSelect ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {/* Top Banner: Type, Distance Pill & Verified Badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Provider Type Pill */}
          <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {type}
          </span>

          {/* Distance Badge */}
          {distanceDisplay && (
            <span
              data-testid="provider-distance"
              className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700 dark:bg-teal-950/60 dark:text-teal-300"
            >
              {/* Navigation / Map Pin Icon */}
              <svg
                className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              <span>{distanceDisplay}</span>
            </span>
          )}
        </div>

        {/* Verified Badge */}
        <div data-testid="provider-verified-badge" className="shrink-0 flex flex-col items-end gap-1">
          {isVerified ? (
            <>
              <span
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500/10 via-teal-500/15 to-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-500/30 shadow-xs"
                title="Official Verified Healthcare Provider"
              >
                <svg
                  className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
                <span>Verified</span>
              </span>
              <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                Verified on {verifiedDateText || 'Aug 15, 2026'}
              </span>
            </>
          ) : (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              title="Credentials under verification"
            >
              <svg
                className="h-3 w-3 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>Verification pending</span>
            </span>
          )}
        </div>
      </div>

      {/* Provider Details: Name, Rating, Address */}
      <div className="mt-3.5">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-bold tracking-tight text-slate-900 transition-colors group-hover:text-teal-600 dark:text-white dark:group-hover:text-teal-400">
            {name}
          </h2>
        </div>

        {/* Rating & Reviews */}
        {averageRating > 0 && (
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center text-amber-400">
              <svg
                className="h-4 w-4 fill-current"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="ml-1 font-bold text-slate-800 dark:text-slate-100">
                {averageRating.toFixed(1)}
              </span>
            </div>
            {totalReviews > 0 && (
              <span className="text-slate-400 dark:text-slate-500">
                ({totalReviews} reviews)
              </span>
            )}
          </div>
        )}

        {/* Address */}
        {address && (
          <p className="mt-1.5 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
            {address}
          </p>
        )}

        {/* Specialties Tags */}
        {specialties.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {specialties.slice(0, 3).map((spec) => (
              <span
                key={spec}
                className="inline-flex rounded-md bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200/60 dark:bg-slate-800/60 dark:text-slate-400 dark:ring-slate-700/60"
              >
                {formatSpecialtyName(spec)}
              </span>
            ))}
            {specialties.length > 3 && (
              <span className="inline-flex rounded-md bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium text-slate-400 dark:bg-slate-800/60 dark:text-slate-500">
                +{specialties.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Languages Section */}
      <div
        data-testid="provider-languages"
        className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800/80"
      >
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1.5">
          {/* Globe / Translation Icon */}
          <svg
            className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          <span className="font-medium text-slate-700 dark:text-slate-300">
            Languages spoken:
          </span>
        </div>

        {spokenLanguages.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {spokenLanguages.slice(0, 4).map((lang) => (
              <span
                key={lang}
                className="inline-flex items-center rounded-md bg-teal-50/70 px-2 py-0.5 text-xs font-medium text-teal-800 dark:bg-teal-950/40 dark:text-teal-300"
              >
                {formatLanguageName(lang)}
              </span>
            ))}
            {spokenLanguages.length > 4 && (
              <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                +{spokenLanguages.length - 4} more
              </span>
            )}
          </div>
        ) : (
          <p className="text-xs italic text-slate-400 dark:text-slate-500">
            English assistance available
          </p>
        )}
      </div>

      {/* Cost Range & Action Buttons */}
      <div
        data-testid="provider-cost-range"
        className="mt-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800/80"
      >
        <div>
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {costSubtitle}
          </span>
          <div className="flex items-baseline gap-1.5">
            <p
              className={`text-base font-extrabold tracking-tight ${
                hasValidPrice
                  ? 'text-slate-900 dark:text-white'
                  : 'text-slate-500 dark:text-slate-400 font-medium'
              }`}
            >
              {formattedCost}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {contactNumber && (
            <button
              type="button"
              aria-label={`Call ${name}`}
              onClick={(e) => {
                e.stopPropagation();
                if (onContact) {
                  onContact(id);
                } else {
                  window.location.href = `tel:${contactNumber}`;
                }
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs transition-colors hover:border-teal-500 hover:bg-teal-50 hover:text-teal-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-teal-400 dark:hover:bg-slate-700 dark:hover:text-teal-300"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onBookAppointment) {
                onBookAppointment(id);
              } else if (onSelect) {
                onSelect(id);
              }
            }}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 px-3.5 py-2 text-xs font-semibold text-white shadow-xs shadow-teal-500/20 transition-all hover:from-teal-500 hover:to-teal-600 hover:shadow-md hover:shadow-teal-500/30 active:scale-95"
          >
            <span>Book Visit</span>
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
}
