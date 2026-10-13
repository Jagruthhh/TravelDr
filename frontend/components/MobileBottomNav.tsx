'use client';

import React from 'react';
import Link from 'next/link';

export default function MobileBottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/90 bg-white/95 px-2 py-1.5 shadow-2xl backdrop-blur-lg dark:border-slate-800/90 dark:bg-slate-950/95 md:hidden"
      aria-label="Mobile Bottom Navigation"
    >
      <div className="mx-auto flex max-w-md items-center justify-around">
        {/* Tab: Find Care */}
        <Link
          href="/providers"
          className="flex flex-col items-center justify-center p-1 text-slate-600 transition-colors hover:text-teal-600 active:scale-95 dark:text-slate-400 dark:hover:text-teal-400"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className="mt-1 text-[10px] font-medium tracking-tight">Doctors</span>
        </Link>

        {/* Tab: Price Estimates */}
        <Link
          href="/estimates"
          className="flex flex-col items-center justify-center p-1 text-slate-600 transition-colors hover:text-teal-600 active:scale-95 dark:text-slate-400 dark:hover:text-teal-400"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
            <line x1="6" y1="15" x2="8" y2="15" />
          </svg>
          <span className="mt-1 text-[10px] font-medium tracking-tight">Prices</span>
        </Link>

        {/* Center Tab: Emergency SOS Action (Elevated Button) */}
        <Link
          href="/cases/new"
          className="group relative -top-3 flex flex-col items-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-rose-600 to-rose-500 text-white shadow-lg shadow-rose-600/30 transition-transform active:scale-90 group-hover:scale-105">
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </div>
          <span className="mt-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
            SOS Help
          </span>
        </Link>

        {/* Tab: Destinations */}
        <Link
          href="/cities"
          className="flex flex-col items-center justify-center p-1 text-slate-600 transition-colors hover:text-teal-600 active:scale-95 dark:text-slate-400 dark:hover:text-teal-400"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span className="mt-1 text-[10px] font-medium tracking-tight">Cities</span>
        </Link>

        {/* Tab: Account / Sign In */}
        <Link
          href="/auth/login"
          className="flex flex-col items-center justify-center p-1 text-slate-600 transition-colors hover:text-teal-600 active:scale-95 dark:text-slate-400 dark:hover:text-teal-400"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span className="mt-1 text-[10px] font-medium tracking-tight">Account</span>
        </Link>
      </div>
    </nav>
  );
}
