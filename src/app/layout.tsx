import "./globals.css";
import "@/styles/map.css";
import type { Metadata } from "next";
import { ReactNode } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageTransition from "@/components/layout/PageTransition";
import NavHistoryButtons from "@/components/layout/NavHistoryButtons";

export const metadata: Metadata = {
  metadataBase: new URL("https://euroscout.pro"),
  title: {
    default: "EuroScout Pro",
    template: "%s"
  },
  description: "Premium European American football league and team intelligence.",
  icons: {
    icon: [
      { url: "/images/Euro_Scout_Logo%202.png", type: "image/png" }
    ],
    shortcut: "/images/Euro_Scout_Logo%202.png",
    apple: [
      { url: "/images/Euro_Scout_Logo%202.png", type: "image/png" }
    ]
  },
  openGraph: {
    title: "EuroScout Pro",
    description: "Premium European American football league and team intelligence.",
    type: "website"
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
        <Footer />
      </body>
    </html>
  );
}
