import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header, Footer, MobileBottomNav } from "../components";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FixMyItch | International Traveler Medical Concierge",
  description: "Instant medical care, verified English-speaking dermatologists, and transparent healthcare tariffs for travelers in India.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 antialiased selection:bg-teal-500 selection:text-white">
        {/* Sticky Mobile-First Header */}
        <Header />

        {/* Main Content Area with mobile bottom padding to clear bottom navigation */}
        <main className="flex-1 w-full pb-16 md:pb-0">
          {children}
        </main>

        {/* Responsive Footer */}
        <Footer />

        {/* Mobile Sticky Bottom Navigation (Hidden on desktop md+) */}
        <MobileBottomNav />
      </body>
    </html>
  );
}
