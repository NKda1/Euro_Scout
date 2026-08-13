import type { ReactNode } from "react";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  children: ReactNode;
}

export default function AuthShell({ eyebrow, title, children }: AuthShellProps) {
  const points = [
    ["🌍", "Discover leagues and teams across 11+ countries"],
    ["🔍", "Scout, player and coach profiles in one network"],
    ["🎬", "Film links, market tiers and transfer availability"]
  ] as const;

  return (
    <main className="relative isolate min-h-[calc(100vh-4rem)] overflow-hidden border-t border-slate-200 bg-white text-slate-950 dark:border-white/10 dark:bg-slate-950 dark:text-white">
      <div className="absolute inset-0 hidden dark:block">
        <div className="hero-cinematic-frame hero-cinematic-frame-1" />
        <div className="hero-cinematic-frame hero-cinematic-frame-2" />
        <div className="hero-cinematic-frame hero-cinematic-frame-3" />
        <div className="hero-cinematic-frame hero-cinematic-frame-4" />
        <div className="hero-cinematic-frame hero-cinematic-frame-5" />
        <div className="hero-cinematic-frame hero-cinematic-frame-6" />
      </div>
      <div className="absolute inset-0 hidden dark:block bg-[linear-gradient(90deg,rgba(2,6,23,.97)_0%,rgba(2,6,23,.82)_54%,rgba(2,6,23,.62)_100%)]" />
      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-12">
          <div className="border-l-4 border-red-600 pl-5">
            <p className="text-xs font-black uppercase text-red-600 dark:text-red-400">{eyebrow}</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">{title}</h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-slate-600 dark:text-slate-200">
              Build your scouting identity, connect with European football talent and track the market from one premium platform.
            </p>
            <div className="mt-7 space-y-3">
              {points.map(([emoji, text]) => (
                <div key={text} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-slate-200 bg-slate-50 text-base dark:border-white/10 dark:bg-white/10">{emoji}</span>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-100">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-slate-200 bg-white p-6 shadow-lg dark:border-white/10 dark:bg-[#111]/95 dark:shadow-2xl dark:shadow-black/30 sm:p-8">
            {children}
          </div>
        </div>
      </section>
    </main>
  );
}
