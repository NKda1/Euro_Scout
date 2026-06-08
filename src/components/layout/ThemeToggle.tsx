"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

function getInitialTheme() {
  if (typeof window === "undefined") {
    return "light";
  }

  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    const isDark = theme === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    window.localStorage.setItem("euroscout-theme", theme);
  }, [theme]);

  return (
    <button
      type="button"
      onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
      className="grid h-10 w-10 place-items-center border border-slate-200 bg-white text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-white/10 dark:bg-[#111] dark:text-slate-200 dark:hover:border-red-500/45 dark:hover:bg-red-500/10 dark:hover:text-red-300"
      aria-label="Toggle dark mode"
    >
      <Sun className="h-4 w-4 dark:hidden" />
      <Moon className="hidden h-4 w-4 dark:block" />
    </button>
  );
}
