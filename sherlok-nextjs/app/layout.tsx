import type { Metadata } from "next";
import { Cormorant_Garamond, Geist, Geist_Mono } from "next/font/google";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dossierSerif = Cormorant_Garamond({
  variable: "--font-dossier-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: "Sherlok | AI Multi-Agent Investigation Workspace",
    template: "%s | Sherlok",
  },
  description:
    "Sherlok is a code-first AI multi-agent workspace for evidence-led fictional mystery investigations and human-reviewed verdicts.",
  keywords: [
    "Sherlok",
    "Sherlok AI",
    "Sherlok code",
    "Sherlok codes",
    "multi-agent AI",
    "AI detective",
    "evidence-led investigation",
    "AI investigation workspace",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Sherlok",
    title: "Sherlok | AI Multi-Agent Investigation Workspace",
    description:
      "A code-first AI multi-agent workspace for evidence-led fictional mystery investigations and human-reviewed verdicts.",
  },
  twitter: {
    card: "summary",
    title: "Sherlok | AI Multi-Agent Investigation Workspace",
    description:
      "A code-first AI multi-agent workspace for evidence-led fictional mystery investigations and human-reviewed verdicts.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${dossierSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
