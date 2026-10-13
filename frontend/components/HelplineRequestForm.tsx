'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { z } from 'zod';
import { apiClient, ApiClientError } from '../lib';
import {
  HelplineUrgency,
  HelplineCaseStatus,
  HelplineCaseResponse,
  HelplineCasePriority,
} from '../types/api';

// ─── Zod Validation Schema ───────────────────────────────────────────────────

export const helplineRequestSchema = z.object({
  travelerName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(80, 'Full name cannot exceed 80 characters'),
  contactNumber: z
    .string()
    .min(7, 'Phone number must be at least 7 digits')
    .regex(
      /^\+?[0-9\s\-()]{7,20}$/,
      'Please enter a valid international phone number with country code (e.g. +91 98490 12345)',
    ),
  email: z
    .string()
    .email('Please enter a valid email address')
    .optional()
    .or(z.literal('')),
  cityId: z.string().min(1, 'Please select your destination city'),
  preferredLanguageCode: z
    .string()
    .min(2, 'Please select your preferred language for callback'),
  urgency: z.nativeEnum(HelplineUrgency, {
    message: 'Please select an urgency level',
  }),
  subject: z
    .string()
    .min(5, 'Subject headline must be at least 5 characters')
    .max(120, 'Subject headline cannot exceed 120 characters'),
  initialDescription: z
    .string()
    .min(10, 'Please describe your symptoms or medical need (minimum 10 characters)')
    .max(1000, 'Description cannot exceed 1000 characters'),
});

export type HelplineRequestFormValues = z.infer<typeof helplineRequestSchema>;

const CITIES = [
  { id: '88c7335b-9973-435d-bbf9-60a1b1caa6ee', name: 'Hyderabad, India' },
  { id: 'fd4def02-c1af-4907-a440-de91dcb13085', name: 'Goa, India' },
];

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'Hindi (हिन्दी)', flag: '🇮🇳' },
  { code: 'te', label: 'Telugu (తెలుగు)', flag: '🇮🇳' },
  { code: 'ru', label: 'Russian (Русский)', flag: '🇷🇺' },
  { code: 'kok', label: 'Konkani (कोंकणी)', flag: '🇮🇳' },
];

const URGENCY_LEVELS = [
  {
    value: HelplineUrgency.EMERGENCY,
    label: 'Emergency (Immediate)',
    description: 'Acute trauma, severe anaphylaxis, chest pain, or rapid deterioration.',
    sla: '2 min response',
    color: 'rose',
  },
  {
    value: HelplineUrgency.URGENT,
    label: 'Urgent Medical Attention',
    description: 'Spreading rash, intense itching, fever, or painful skin infection.',
    sla: '10 min response',
    color: 'amber',
  },
  {
    value: HelplineUrgency.ROUTINE,
    label: 'Routine Consultation',
    description: 'Non-emergency doctor appointment, medication refill, or second opinion.',
    sla: '30 min response',
    color: 'teal',
  },
];

export interface HelplineRequestFormProps {
  onSuccess?: (createdCase: HelplineCaseResponse) => void;
  defaultCityId?: string;
  defaultUrgency?: HelplineUrgency;
}

export default function HelplineRequestForm({
  onSuccess,
  defaultCityId = '88c7335b-9973-435d-bbf9-60a1b1caa6ee',
  defaultUrgency = HelplineUrgency.URGENT,
}: HelplineRequestFormProps) {
  // ─── Form State ────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState<HelplineRequestFormValues>({
    travelerName: '',
    contactNumber: '',
    email: '',
    cityId: defaultCityId,
    preferredLanguageCode: 'en',
    urgency: defaultUrgency,
    subject: '',
    initialDescription: '',
  });

  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof HelplineRequestFormValues, string>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // ─── Confirmation Screen State ─────────────────────────────────────────────
  const [confirmedCase, setConfirmedCase] =
    useState<HelplineCaseResponse | null>(null);
  const [copiedId, setCopiedId] = useState<boolean>(false);

  // ─── Validation Handler ────────────────────────────────────────────────────
  const validateField = (
    name: keyof HelplineRequestFormValues,
    value: any,
  ) => {
    try {
      helplineRequestSchema.shape[name].parse(value);
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        setFormErrors((prev) => ({
          ...prev,
          [name]: err.issues[0]?.message,
        }));
      }
    }
  };

  const handleInputChange = (
    field: keyof HelplineRequestFormValues,
    value: any,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    validateField(field, value);
  };

  // ─── Submit Handler ────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    // Full Zod validation
    const result = helplineRequestSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof HelplineRequestFormValues, string>> =
        {};
      for (const issue of result.error.issues) {
        const path = issue.path[0] as keyof HelplineRequestFormValues;
        if (!fieldErrors[path]) {
          fieldErrors[path] = issue.message;
        }
      }
      setFormErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const travelerId = `traveler-${Date.now().toString().slice(-6)}`;
      const payload = {
        travelerId,
        cityId: formData.cityId,
        subject: formData.subject,
        initialDescription: `${formData.initialDescription} [Traveler: ${formData.travelerName}, Phone: ${formData.contactNumber}${formData.email ? `, Email: ${formData.email}` : ''}]`,
        preferredLanguageCode: formData.preferredLanguageCode,
        urgency: formData.urgency,
        autoAssign: true,
      };

      const response = await apiClient.createCase(payload);
      setConfirmedCase(response);
      if (onSuccess) {
        onSuccess(response);
      }
    } catch (err: any) {
      console.error('Failed to submit helpline request:', err);
      if (err instanceof ApiClientError) {
        setServerError(err.message || `Server error (${err.status})`);
      } else if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError('Unable to connect to emergency dispatch server. Please call emergency hotline directly.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCaseId = () => {
    if (confirmedCase?.id) {
      navigator.clipboard.writeText(confirmedCase.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  // ─── CONFIRMATION SCREEN ───────────────────────────────────────────────────
  if (confirmedCase) {
    const isEmergency = confirmedCase.urgency === HelplineUrgency.EMERGENCY;

    return (
      <div
        data-testid="helpline-confirmation-screen"
        className="w-full max-w-2xl mx-auto rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-10 shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        {/* Success Icon & Header */}
        <div className="text-center mb-8">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-lg shadow-teal-500/25 mb-4 animate-bounce">
            <svg
              className="h-10 w-10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 ring-1 ring-emerald-500/30 mb-2">
            Case Logged & Dispatched
          </span>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Medical Concierge Activated
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
            An English-speaking healthcare coordinator has been assigned to your case and is reviewing your symptoms.
          </p>
        </div>

        {/* Case Reference Card */}
        <div className="rounded-2xl border border-teal-200/80 bg-teal-50/60 p-4.5 dark:border-teal-900/60 dark:bg-teal-950/30 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-teal-800 dark:text-teal-300">
                Case Tracking ID
              </span>
              <div className="font-mono text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                {confirmedCase.id}
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyCaseId}
              className="inline-flex items-center gap-1.5 rounded-xl border border-teal-300 bg-white px-3 py-1.5 text-xs font-semibold text-teal-800 shadow-2xs hover:bg-teal-50 dark:border-teal-800 dark:bg-slate-800 dark:text-teal-200"
            >
              {copiedId ? (
                <>
                  <span className="text-emerald-600">✓</span>
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  <span>Copy ID</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Case Metadata Details */}
        <div className="space-y-3.5 border-y border-slate-100 py-5 dark:border-slate-800 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 dark:text-slate-400">Current Status:</span>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-teal-100 px-2.5 py-0.5 text-xs font-bold text-teal-800 dark:bg-teal-900/60 dark:text-teal-200">
              <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
              {confirmedCase.status}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500 dark:text-slate-400">Urgency Level:</span>
            <span
              className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-bold ${
                isEmergency
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
              }`}
            >
              {confirmedCase.urgency}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500 dark:text-slate-400">Priority Tier:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {confirmedCase.priority || HelplineCasePriority.HIGH}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500 dark:text-slate-400">Subject:</span>
            <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[260px]">
              {confirmedCase.subject}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500 dark:text-slate-400">Expected Response:</span>
            <span className="font-bold text-teal-700 dark:text-teal-300">
              {isEmergency ? 'Immediate (< 2 mins)' : 'Within 5–10 minutes'}
            </span>
          </div>
        </div>

        {/* Immediate Next Steps Advice */}
        <div className="my-6 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/40 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
            What happens next:
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Keep your phone line open for incoming calls from the emergency desk.</li>
            <li>Have your passport details and travel insurance policy number accessible.</li>
            <li>If you experience acute breathing difficulty or severe trauma, call local emergency services (108/112 in India) immediately.</li>
          </ul>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/cases"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-600 to-teal-500 py-3 text-sm font-bold text-white shadow-md shadow-teal-500/25 hover:from-teal-500 hover:to-teal-600 active:scale-95 transition-all text-center"
          >
            <span>View in Agent Dashboard</span>
            <span>→</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              setConfirmedCase(null);
              setFormData({
                travelerName: '',
                contactNumber: '',
                email: '',
                cityId: defaultCityId,
                preferredLanguageCode: 'en',
                urgency: defaultUrgency,
                subject: '',
                initialDescription: '',
              });
            }}
            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 text-center"
          >
            Open Another Case
          </button>
        </div>
      </div>
    );
  }

  // ─── HELPLINE REQUEST FORM ─────────────────────────────────────────────────
  return (
    <div
      data-testid="helpline-request-form"
      className="w-full max-w-2xl mx-auto rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-10 shadow-xl dark:border-slate-800 dark:bg-slate-900"
    >
      {/* Form Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-500/30 dark:bg-rose-950/60 dark:text-rose-300 mb-3">
          <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
          <span>24/7 International Medical Assistance</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Helpline Case Intake
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Request emergency assistance, English-speaking doctor dispatch, or hospital coordination while abroad.
        </p>
      </div>

      {serverError && (
        <div
          data-testid="form-server-error"
          className="mb-6 rounded-2xl border border-rose-300 bg-rose-50/80 p-4 text-xs font-semibold text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300 flex items-start gap-2.5"
        >
          <span className="text-rose-600 text-base">⚠️</span>
          <div className="flex-1">{serverError}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* ─── SECTION 1: Traveler Details ─────────────────────────────────── */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            1. Traveler Contact Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label
                htmlFor="field-traveler-name"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
              >
                Full Name *
              </label>
              <input
                id="field-traveler-name"
                data-testid="input-traveler-name"
                type="text"
                value={formData.travelerName}
                onChange={(e) => handleInputChange('travelerName', e.target.value)}
                placeholder="e.g. Sarah Jenkins"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs transition-colors focus:outline-none dark:bg-slate-800 dark:text-white ${
                  formErrors.travelerName
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                    : 'border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700'
                }`}
              />
              {formErrors.travelerName && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                  {formErrors.travelerName}
                </p>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label
                htmlFor="field-contact-number"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
              >
                Phone Number (with Country Code) *
              </label>
              <input
                id="field-contact-number"
                data-testid="input-contact-number"
                type="tel"
                value={formData.contactNumber}
                onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                placeholder="+44 7911 123456"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs transition-colors focus:outline-none dark:bg-slate-800 dark:text-white ${
                  formErrors.contactNumber
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                    : 'border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700'
                }`}
              />
              {formErrors.contactNumber && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                  {formErrors.contactNumber}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Email Address */}
            <div>
              <label
                htmlFor="field-email"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
              >
                Email Address (Optional)
              </label>
              <input
                id="field-email"
                data-testid="input-email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="sarah@example.com"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs transition-colors focus:outline-none dark:bg-slate-800 dark:text-white ${
                  formErrors.email
                    ? 'border-rose-400 focus:border-rose-500'
                    : 'border-slate-300 focus:border-teal-500 dark:border-slate-700'
                }`}
              />
              {formErrors.email && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                  {formErrors.email}
                </p>
              )}
            </div>

            {/* Destination City */}
            <div>
              <label
                htmlFor="field-city"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
              >
                Current Location / City *
              </label>
              <select
                id="field-city"
                data-testid="select-city"
                value={formData.cityId}
                onChange={(e) => handleInputChange('cityId', e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {CITIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ─── SECTION 2: Urgency Selection ─────────────────────────────────── */}
        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            2. Urgency Level *
          </h2>

          <div className="grid grid-cols-1 gap-2.5" data-testid="urgency-options">
            {URGENCY_LEVELS.map((lvl) => {
              const isSelected = formData.urgency === lvl.value;
              return (
                <label
                  key={lvl.value}
                  className={`flex cursor-pointer items-start justify-between rounded-2xl border p-3.5 transition-all select-none ${
                    isSelected
                      ? lvl.color === 'rose'
                        ? 'border-rose-500/70 bg-rose-50/70 dark:border-rose-500/50 dark:bg-rose-950/40 ring-1 ring-rose-500/30'
                        : lvl.color === 'amber'
                        ? 'border-amber-500/70 bg-amber-50/70 dark:border-amber-500/50 dark:bg-amber-950/40 ring-1 ring-amber-500/30'
                        : 'border-teal-500/70 bg-teal-50/70 dark:border-teal-500/50 dark:bg-teal-950/40 ring-1 ring-teal-500/30'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-850 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="urgency"
                      value={lvl.value}
                      checked={isSelected}
                      onChange={() => handleInputChange('urgency', lvl.value)}
                      className="mt-1 h-4 w-4 text-teal-600 focus:ring-teal-500"
                    />
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">
                        {lvl.label}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {lvl.description}
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {lvl.sla}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* ─── SECTION 3: Medical Need & Language ───────────────────────────── */}
        <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            3. Medical Symptoms & Case Details
          </h2>

          {/* Preferred Language */}
          <div>
            <label
              htmlFor="field-language"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
            >
              Preferred Language for Agent Assistance *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {LANGUAGES.map((lang) => {
                const isSelected = formData.preferredLanguageCode === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleInputChange('preferredLanguageCode', lang.code)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 px-2 text-xs font-semibold transition-all ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50 text-teal-800 ring-1 ring-teal-500/30 dark:bg-teal-950 dark:text-teal-200'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span className="truncate">{lang.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label
              htmlFor="field-subject"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
            >
              Primary Complaint / Subject *
            </label>
            <input
              id="field-subject"
              data-testid="input-subject"
              type="text"
              value={formData.subject}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              placeholder="e.g. Severe itchy rash on torso spreading after beach visit"
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs transition-colors focus:outline-none dark:bg-slate-800 dark:text-white ${
                formErrors.subject
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700'
              }`}
            />
            {formErrors.subject && (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                {formErrors.subject}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="field-description"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
            >
              Detailed Symptoms & History *
            </label>
            <textarea
              id="field-description"
              data-testid="input-description"
              rows={3}
              value={formData.initialDescription}
              onChange={(e) => handleInputChange('initialDescription', e.target.value)}
              placeholder="Describe when symptoms started, any fever, allergies, known insect bites, or existing medications..."
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs transition-colors focus:outline-none dark:bg-slate-800 dark:text-white ${
                formErrors.initialDescription
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700'
              }`}
            />
            {formErrors.initialDescription && (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                {formErrors.initialDescription}
              </p>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            data-testid="submit-helpline-request-btn"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-600 to-teal-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-500/25 transition-all hover:from-teal-500 hover:to-teal-600 hover:shadow-xl hover:shadow-teal-500/35 active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10" strokeWidth="4" className="opacity-25" />
                  <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" className="opacity-75" />
                </svg>
                <span>Dispatching Concierge Agent...</span>
              </>
            ) : (
              <>
                <span>Submit Helpline Request</span>
                <span>→</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
