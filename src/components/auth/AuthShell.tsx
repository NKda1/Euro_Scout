import type { ReactNode } from "react";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  children: ReactNode;
}

export default function AuthShell({ eyebrow, title, children }: AuthShellProps) {
  return (
    <main className="min-h-[calc(100vh-8rem)] bg-gradient-to-br from-white via-red-50/40 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <section className="mx-auto flex max-w-6xl items-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-red-600">{eyebrow}</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">{title}</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300">
              Create a secure EuroScout Pro account, build your profile, and connect with the people moving European football forward.
            </p>
          </div>
          <div className="rounded-3xl glass-card p-6 sm:p-8">{children}</div>
        </div>
      </section>
    </main>
  );
}
