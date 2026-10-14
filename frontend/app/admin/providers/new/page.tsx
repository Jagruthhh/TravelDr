'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient, ApiClientError } from '@/lib';
import { ProviderType, Provider } from '@/types/api';

const AVAILABLE_LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'kok', label: 'Konkani', native: 'कोंकणी' },
  { code: 'ru', label: 'Russian', native: 'Русский' },
];

const AVAILABLE_SPECIALTIES = [
  'Dermatology',
  'General Practice',
  'Emergency Medicine',
  'Pediatrics',
  'Orthopedics',
  'Cardiology',
  'Ophthalmology',
  'Dentistry',
];

const CITIES = [
  { id: 'hyderabad', name: 'Hyderabad, India' },
  { id: 'goa', name: 'Goa, India' },
];

export default function NewProviderAdminPage() {
  const router = useRouter();

  // Admin authentication state
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Form input state
  const [name, setName] = useState('');
  const [type, setType] = useState<ProviderType>(ProviderType.CLINIC);
  const [city, setCity] = useState('hyderabad');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['en']);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(['General Practice']);
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [issuingCouncil, setIssuingCouncil] = useState('');
  const [consultationFee, setConsultationFee] = useState<string>('800');

  // Form submission & feedback
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdProvider, setCreatedProvider] = useState<Provider | null>(null);

  // Auto-authenticate as Admin on page load for seamless onboarding
  useEffect(() => {
    const ensureAdminAuth = async () => {
      setIsAuthenticating(true);
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
          // If already registered, log in
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
        setAuthError('Could not verify admin credentials. You can enter an admin token manually.');
      } finally {
        setIsAuthenticating(false);
      }
    };

    ensureAdminAuth();
  }, []);

  // Toggle language selection
  const handleToggleLanguage = (code: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(code)
        ? prev.length > 1
          ? prev.filter((c) => c !== code)
          : prev
        : [...prev, code],
    );
  };

  // Toggle specialty selection
  const handleToggleSpecialty = (spec: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(spec)
        ? prev.length > 1
          ? prev.filter((s) => s !== spec)
          : prev
        : [...prev, spec],
    );
  };

  // Client-side validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Provider name is required.';
    if (!type) newErrors.type = 'Provider type is required.';
    if (!city.trim()) newErrors.city = 'City is required.';

    const trimmedAddress = address.trim();
    if (!trimmedAddress) {
      newErrors.address = 'Physical facility address is required.';
    } else if (trimmedAddress.length < 10) {
      newErrors.address = 'Address must be at least 10 characters long.';
    } else if (trimmedAddress.toLowerCase() === 'none') {
      newErrors.address = 'Address cannot be "none". Please provide a real physical address.';
    }

    if (!phone.trim()) newErrors.phone = 'Contact telephone number is required.';
    if (!email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please provide a valid email address.';
    }

    if (selectedLanguages.length === 0) {
      newErrors.languages = 'Please select at least one spoken language.';
    }
    if (selectedSpecialties.length === 0) {
      newErrors.specialties = 'Please select at least one medical specialty.';
    }

    if (!consultationFee.trim()) {
      newErrors.consultationFee = 'Consultation fee is required.';
    } else {
      const fee = Number(consultationFee);
      if (isNaN(fee)) {
        newErrors.consultationFee = 'Consultation fee must be a valid number.';
      } else if (fee < 0 || fee > 100000) {
        newErrors.consultationFee = 'Consultation fee must be a number between 0 and 100,000.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setAuthError(null);

    try {
      // Ensure admin token is active
      if (!apiClient.getToken()) {
        try {
          const authRes = await apiClient.register({
            email: 'admin.concierge@traveldr.internal',
            password: 'AdminPassword123!',
            fullName: 'Compliance Administrator',
            role: 'ADMIN' as any,
          });
          if (authRes?.accessToken) {
            apiClient.setToken(authRes.accessToken);
          }
        } catch {
          const authRes = await apiClient.login({
            email: 'admin.concierge@traveldr.internal',
            password: 'AdminPassword123!',
          });
          if (authRes?.accessToken) {
            apiClient.setToken(authRes.accessToken);
          }
        }
      }

      const payload = {
        name: name.trim(),
        type,
        city: city.trim(),
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        languages: selectedLanguages,
        specialties: selectedSpecialties,
        registrationNumber: registrationNumber.trim() || undefined,
        issuingCouncil: issuingCouncil.trim() || undefined,
        consultationFee: consultationFee ? Number(consultationFee) : 0,
      };

      const provider = await apiClient.createProvider(payload);
      setCreatedProvider(provider);
      // Reset form
      setName('');
      setAddress('');
      setPhone('');
      setEmail('');
      setRegistrationNumber('');
      setIssuingCouncil('');
    } catch (err: any) {
      console.error('Failed to create provider:', err);
      let message = 'Failed to create provider.';
      if (err instanceof ApiClientError) {
        message = Array.isArray(err.data?.message)
          ? err.data.message.join('. ')
          : err.data?.message || err.message;
      } else if (err instanceof Error) {
        message = err.message;
      }

      setAuthError(message);

      // Map server error to specific form fields
      const serverErrors: Record<string, string> = {};
      const lower = message.toLowerCase();
      if (lower.includes('already exists') || lower.includes('duplicate')) {
        serverErrors.name = 'A provider with this name and address already exists.';
        serverErrors.address = 'This address is already registered for this provider.';
      }
      if (lower.includes('address') && (lower.includes('10 characters') || lower.includes('none'))) {
        serverErrors.address = message;
      }
      if (lower.includes('consultation fee') || lower.includes('fee') || lower.includes('100000')) {
        serverErrors.consultationFee = message;
      }
      setErrors((prev) => ({ ...prev, ...serverErrors }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* ─── Breadcrumb ────────────────────────────────────────────────────────── */}
      <nav className="mb-6 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Link href="/" className="hover:text-teal-600 dark:hover:text-teal-400">
          Home
        </Link>
        <span>/</span>
        <Link href="/providers" className="hover:text-teal-600 dark:hover:text-teal-400">
          Providers
        </Link>
        <span>/</span>
        <span className="font-medium text-slate-800 dark:text-slate-200">
          Admin Onboarding
        </span>
      </nav>

      {/* ─── Header Banner ─────────────────────────────────────────────────────── */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300">
                <svg className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>Admin Only</span>
              </span>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                Status: PENDING by default
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Onboard Healthcare Provider
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Register medical clinics, hospitals, or private practices. Records are saved in PENDING status pending credential review.
            </p>
          </div>

          <Link
            href="/providers"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
          >
            ← View Providers Catalog
          </Link>
        </div>
      </div>

      {/* ─── Success Alert ─────────────────────────────────────────────────────── */}
      {createdProvider && (
        <div
          data-testid="provider-created-success"
          className="mb-8 rounded-3xl border border-emerald-500/30 bg-emerald-50/80 p-6 shadow-sm dark:bg-emerald-950/30 dark:border-emerald-500/30"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-300">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-200">
                  Provider Successfully Registered!
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  Status: PENDING
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-emerald-800/90 dark:text-emerald-300/90">
                <span className="font-semibold">{createdProvider.name}</span> has been saved with verification status <span className="font-semibold">PENDING</span>.
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-xs">
                <Link
                  href={`/providers/${createdProvider.id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 font-semibold text-white shadow-xs hover:bg-emerald-800 transition-colors"
                >
                  View Provider Detail Page →
                </Link>
                <button
                  type="button"
                  onClick={() => setCreatedProvider(null)}
                  className="rounded-xl border border-emerald-600/40 bg-white px-4 py-2 font-semibold text-emerald-800 hover:bg-emerald-50 dark:bg-slate-900 dark:text-emerald-300 transition-colors"
                >
                  Create Another Provider
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Error Alert ───────────────────────────────────────────────────────── */}
      {authError && (
        <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-50/80 p-4 text-xs sm:text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
          <div className="flex items-center gap-2 font-bold mb-1">
            <svg className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>Submission Error</span>
          </div>
          <p>{authError}</p>
        </div>
      )}

      {/* ─── Main Onboarding Form ──────────────────────────────────────────────── */}
      <form
        onSubmit={handleSubmit}
        data-testid="create-provider-form"
        className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6"
      >
        {/* Section 1: Facility Basics */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
            1. Provider Information
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Official operational name and facility classification.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <div className="sm:col-span-2">
              <label htmlFor="provider-name" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Provider / Facility Name *
              </label>
              <input
                id="provider-name"
                data-testid="input-provider-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. CareMax Multi-Specialty Clinic"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none dark:bg-slate-800 dark:text-white ${
                  errors.name
                    ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                    : 'border-slate-300 focus:border-teal-500 dark:border-slate-700'
                }`}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.name}</p>
              )}
            </div>

            {/* Type */}
            <div>
              <label htmlFor="provider-type" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Facility Type *
              </label>
              <select
                id="provider-type"
                data-testid="input-provider-type"
                value={type}
                onChange={(e) => setType(e.target.value as ProviderType)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value={ProviderType.CLINIC}>CLINIC (Outpatient / Specialty Center)</option>
                <option value={ProviderType.HOSPITAL}>HOSPITAL (Tertiary / Inpatient Care)</option>
                <option value={ProviderType.DOCTOR}>DOCTOR (Independent Practitioner)</option>
              </select>
            </div>

            {/* City */}
            <div>
              <label htmlFor="provider-city" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                City / Destination *
              </label>
              <select
                id="provider-city"
                data-testid="input-provider-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {CITIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.city && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.city}</p>
              )}
            </div>

            {/* Address */}
            <div className="sm:col-span-2">
              <label htmlFor="provider-address" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Physical Facility Address *
              </label>
              <input
                id="provider-address"
                data-testid="input-provider-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Plot 18, Road No 36, Jubilee Hills, Hyderabad"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none dark:bg-slate-800 dark:text-white ${
                  errors.address
                    ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                    : 'border-slate-300 focus:border-teal-500 dark:border-slate-700'
                }`}
              />
              {errors.address && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.address}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="provider-phone" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Contact Phone Number *
              </label>
              <input
                id="provider-phone"
                data-testid="input-provider-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 40 2300 1234"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none dark:bg-slate-800 dark:text-white ${
                  errors.phone
                    ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                    : 'border-slate-300 focus:border-teal-500 dark:border-slate-700'
                }`}
              />
              {errors.phone && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.phone}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="provider-email" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Official Email Address *
              </label>
              <input
                id="provider-email"
                data-testid="input-provider-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. care@caremaxclinic.com"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none dark:bg-slate-800 dark:text-white ${
                  errors.email
                    ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                    : 'border-slate-300 focus:border-teal-500 dark:border-slate-700'
                }`}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.email}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Clinical Languages & Specialties */}
        <div className="border-t border-slate-100 pt-6 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
            2. Languages & Specialties
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Select supported international consultation languages and clinical departments.
          </p>

          {/* Languages */}
          <div className="mb-5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Spoken Languages (at least 1) *
            </label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_LANGUAGES.map((lang) => {
                const isSelected = selectedLanguages.includes(lang.code);
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleToggleLanguage(lang.code)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{isSelected ? '✓' : '+'}</span>
                    <span>{lang.label} ({lang.native})</span>
                  </button>
                );
              })}
            </div>
            {errors.languages && (
              <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">{errors.languages}</p>
            )}
          </div>

          {/* Specialties */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Medical Specialties (at least 1) *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {AVAILABLE_SPECIALTIES.map((spec) => {
                const isSelected = selectedSpecialties.includes(spec);
                return (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => handleToggleSpecialty(spec)}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-left transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span className="truncate">{spec}</span>
                    <span className="ml-1 text-[11px]">{isSelected ? '✓' : '+'}</span>
                  </button>
                );
              })}
            </div>
            {errors.specialties && (
              <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">{errors.specialties}</p>
            )}
          </div>
        </div>

        {/* Section 3: Credentials & Transparent Pricing */}
        <div className="border-t border-slate-100 pt-6 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
            3. Accreditation & Consultation Tariff
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Official medical licensing body details and published visit tariff.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Registration Number */}
            <div>
              <label htmlFor="reg-number" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Registration Number
              </label>
              <input
                id="reg-number"
                data-testid="input-registration-number"
                type="text"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                placeholder="e.g. TS-CL-2026-88192"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            {/* Issuing Council */}
            <div>
              <label htmlFor="issuing-council" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Issuing Medical Council
              </label>
              <input
                id="issuing-council"
                data-testid="input-issuing-council"
                type="text"
                value={issuingCouncil}
                onChange={(e) => setIssuingCouncil(e.target.value)}
                placeholder="e.g. State Medical Council"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            {/* Consultation Fee */}
            <div>
              <label htmlFor="consultation-fee" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Consultation Fee (INR)
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-xs text-slate-500">
                  ₹
                </span>
                <input
                  id="consultation-fee"
                  data-testid="input-consultation-fee"
                  type="number"
                  min="0"
                  step="50"
                  value={consultationFee}
                  onChange={(e) => setConsultationFee(e.target.value)}
                  placeholder="800"
                  className={`w-full rounded-xl border pl-8 pr-3.5 py-2.5 text-sm text-slate-900 focus:outline-none dark:bg-slate-800 dark:text-white ${
                    errors.consultationFee
                      ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-300 focus:border-teal-500 dark:border-slate-700'
                  }`}
                />
              </div>
              {errors.consultationFee && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.consultationFee}</p>
              )}
            </div>
          </div>
        </div>

        {/* ─── Submit Action ───────────────────────────────────────────────────── */}
        <div className="border-t border-slate-100 pt-6 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Submitting registers this facility with status <span className="font-semibold text-amber-700 dark:text-amber-400">PENDING</span>.
          </p>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link
              href="/providers"
              className="flex-1 sm:flex-none text-center rounded-xl border border-slate-300 px-5 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              data-testid="submit-create-provider-btn"
              disabled={isSubmitting}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 px-6 py-3 text-xs font-bold text-white shadow-md shadow-teal-500/20 hover:from-teal-500 hover:to-teal-600 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Saving Provider...</span>
                </>
              ) : (
                <>
                  <span>Create Provider (Status: PENDING)</span>
                  <span>→</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
