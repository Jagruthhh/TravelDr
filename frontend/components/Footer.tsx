import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full border-t border-slate-200/80 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/80 transition-colors">
      {/* Emergency Hotline Banner */}
      <div className="bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 text-white py-3 px-4 text-xs font-medium">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-white animate-pulse" />
            <span className="font-semibold uppercase tracking-wider">
              Emergency Dispatch Active:
            </span>
            <span>Hyderabad Ambulance: 108 / +91-40-23607777</span>
            <span className="hidden sm:inline">|</span>
            <span className="hidden sm:inline">Goa Coastal Emergency: 108 / +91-832-2458725</span>
          </div>
          <Link
            href="/cases/new"
            className="underline underline-offset-2 hover:text-rose-100 font-bold"
          >
            Call Support Desk &rarr;
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white font-bold text-sm">
                +
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                FixMyItch
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 max-w-sm">
              International traveler healthcare concierge connecting tourists and digital
              nomads with verified clinics, English-speaking dermatologists, and transparent
              upfront medical tariffs in India.
            </p>
            <div className="flex items-center gap-3 pt-2 text-xs font-semibold text-teal-700 dark:text-teal-400">
              <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-1 dark:bg-teal-950/50">
                ✓ Verified Medical Licenses
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-1 dark:bg-teal-950/50">
                ✓ No Hidden Fees
              </span>
            </div>
          </div>

          {/* Column: Care Services */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Medical Services
            </h3>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/providers" className="hover:text-teal-600 dark:hover:text-teal-400">
                  Find Dermatologists
                </Link>
              </li>
              <li>
                <Link href="/providers?type=HOSPITAL" className="hover:text-teal-600 dark:hover:text-teal-400">
                  24/7 Hospital Care
                </Link>
              </li>
              <li>
                <Link href="/estimates" className="hover:text-teal-600 dark:hover:text-teal-400">
                  Cost Estimator
                </Link>
              </li>
              <li>
                <Link href="/cases" className="hover:text-teal-600 dark:hover:text-teal-400">
                  Helpline Case Status
                </Link>
              </li>
            </ul>
          </div>

          {/* Column: Destinations */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Destination Hubs
            </h3>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/providers?city=hyd" className="hover:text-teal-600 dark:hover:text-teal-400">
                  Hyderabad (Jubilee & Hitec)
                </Link>
              </li>
              <li>
                <Link href="/providers?city=goa" className="hover:text-teal-600 dark:hover:text-teal-400">
                  Goa (Calangute, Panaji, Margao)
                </Link>
              </li>
              <li>
                <span className="text-xs text-slate-400">Bangalore (Coming Soon)</span>
              </li>
              <li>
                <span className="text-xs text-slate-400">Kerala (Coming Soon)</span>
              </li>
            </ul>
          </div>

          {/* Column: Trust & Support */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Traveler Safety
            </h3>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/languages" className="hover:text-teal-600 dark:hover:text-teal-400">
                  Multilingual Doctors
                </Link>
              </li>
              <li>
                <Link href="/auth/register" className="hover:text-teal-600 dark:hover:text-teal-400">
                  Traveler Registration
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-teal-600 dark:hover:text-teal-400">
                  Patient Data Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-teal-600 dark:hover:text-teal-400">
                  Terms of Concierge
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Credits & Copyright */}
        <div className="mt-10 border-t border-slate-200/80 pt-6 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <p>© 2026 FixMyItch (TravelDoc). All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>Powered by TravelDoc Healthcare Architecture</span>
            <span>•</span>
            <span className="text-teal-600 dark:text-teal-400 font-semibold">ISO 27001 & HIPAA Compliant</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
