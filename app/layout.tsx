
import "./globals.css";

import type { Metadata } from "next";

import { Inter } from "next/font/google";

import AppHeader from "../components/navigation/AppHeader";

/*
 * ============================================================
 * AUTIVOYA — ROOT LAYOUT
 * ============================================================
 *
 * Global layout for the Autivoya platform.
 *
 * Preserves:
 * - Inter font
 * - Global CSS
 * - AppHeader navigation
 * - All existing pages and application functionality
 * ============================================================
 */

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

/*
 * ============================================================
 * SITE METADATA
 * ============================================================
 */

export const metadata: Metadata = {
  title: {
    default: "Autivoya | Every Journey Is Unique",
    template: "%s | Autivoya",
  },

  description:
    "Autivoya helps families navigate autism with personalized guidance, trusted resources, and a step-by-step roadmap. Every journey is unique. Every step matters.",

  applicationName: "Autivoya",

  keywords: [
    "Autivoya",
    "autism",
    "autism resources",
    "autism family support",
    "autism journey",
    "autism navigator",
    "early intervention",
    "IEP",
    "special education",
    "autism therapy",
    "family roadmap",
    "personalized autism guidance",
  ],

  openGraph: {
    type: "website",
    siteName: "Autivoya",
    title: "Autivoya | Every Journey Is Unique",
    description:
      "Personalized autism guidance, trusted resources, and step-by-step support for every family's unique journey.",
  },

  robots: {
    index: true,
    follow: true,
  },
};

/*
 * ============================================================
 * ROOT LAYOUT
 * ============================================================
 */

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppHeader />

        {children}
      </body>
    </html>
  );
}
