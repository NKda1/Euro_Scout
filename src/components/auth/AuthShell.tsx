import type { ReactNode } from "react";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  children: ReactNode;
}

export default function AuthShell({ eyebrow, title, children }: AuthShellProps) {
  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-slate-950">
      {/* Cinematic background carousel — same frames as the hero */}
      <div className="hero-cinematic-frame hero-cinematic-frame-1" />
      <div className="hero-cinematic-frame hero-cinematic-frame-2" />
      <div className="hero-cinematic-frame hero-cinematic-frame-3" />
      <div className="hero-cinematic-frame hero-cinematic-frame-4" />
      <div className="hero-cinematic-frame hero-cinematic-frame-5" />
      <div className="hero-cinematic-frame hero-cinematic-frame-6" />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(2,6,23,.97)_0%,rgba(2,6,23,.84)_42%,rgba(2,6,23,.52)_72%,rgba(2,6,23,.76)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(220,38,38,.3),transparent_32rem)]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950 to-transparent" />

      {/* Content */}
      <section className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid w-full gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">

          {/* Left — marketing copy */}
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-red-400">{eyebrow}</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">{title}</h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-300 sm:text-lg">
              Build your scouting identity, connect with European football talent and track the market from one premium platform.
            </p>
            <div className="mt-8 space-y-3">
              {(
                [
                  ["Discover leagues & teams across 11+ countries", "🌍"],
                  ["Scout, player and coach profiles in one network", "🔍"],
                  ["Film links, market tiers and transfer availability", "🎬"]
                ] as [string, string][]
              ).map(([text, icon]) => (
                <div key={text} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-600/20 text-base">{icon}</span>
                  <span className="text-sm font-semibold text-slate-200">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — form card (forced dark so dark: variants apply inside) */}
          <div className="dark">
            <div className="rounded-3xl border border-white/12 bg-slate-900/85 p-6 shadow-2xl shadow-black/50 backdrop-blur-2xl sm:p-8">
              {children}
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}

