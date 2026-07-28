import "./globals.css";
import "@/styles/map.css";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { ReactNode } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageTransition from "@/components/layout/PageTransition";
import NavHistoryButtons from "@/components/layout/NavHistoryButtons";
import PushNotificationPrompt from "@/components/layout/PushNotificationPrompt";

export const metadata: Metadata = {
  metadataBase: new URL("https://euroscoutpro.com"),
  applicationName: "EuroScout Pro",
  title: {
    default: "EuroScout Pro",
    template: "%s | EuroScout Pro"
  },
  description:
    "EuroScout Pro connects American football players, clubs and coaches across Europe with profiles, film, messaging, league directories and recruiting analytics.",
  keywords: [
    "EuroScout Pro",
    "European American football",
    "American football recruiting",
    "football players Europe",
    "football clubs Europe",
    "football scouting"
  ],
  alternates: {
    canonical: "/"
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" }
    ],
    shortcut: "/favicon-32x32.png",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
    ]
  },
  openGraph: {
    title: "EuroScout Pro",
    description:
      "Profiles, film, call booking, messaging, league directories and recruiting analytics for American football across Europe.",
    url: "https://euroscoutpro.com",
    siteName: "EuroScout Pro",
    type: "website",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "EuroScout Pro logo"
      }
    ]
  },
  twitter: {
    card: "summary",
    title: "EuroScout Pro",
    description:
      "European American football recruiting intelligence for players, clubs, coaches and journalists.",
    images: ["/icon-512.png"]
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const themeScript = `
    try {
      const stored = localStorage.getItem("euroscout-theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (stored === "dark" || (!stored && prefersDark)) {
        document.documentElement.classList.add("dark");
      }
    } catch {}
  `;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Navbar />
        <NavHistoryButtons />
        <PageTransition>{children}</PageTransition>
        <PushNotificationPrompt />
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
