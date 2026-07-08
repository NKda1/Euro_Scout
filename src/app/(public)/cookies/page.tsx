import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy | EuroScout Pro",
  description: "Cookie and local storage usage for EuroScout Pro."
};

const sections = [
  {
    title: "Essential Cookies",
    body: "EuroScout Pro uses essential cookies for authentication sessions, security and account access. The platform cannot operate correctly without these."
  },
  {
    title: "Local Preferences",
    body: "The site may store interface preferences such as light or dark mode in the browser so the experience remains consistent between visits."
  },
  {
    title: "Analytics And Product Signals",
    body: "The platform records operational analytics such as profile views, film clicks, article opens, messages and call booking activity to help users understand engagement."
  },
  {
    title: "Payment And Video Providers",
    body: "Stripe and Daily may use their own cookies or browser storage when users access checkout or video call experiences."
  }
];

export default function CookiePolicyPage() {
  return (
    <main className="app-surface">
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        <p className="eyebrow">Legal</p>
        <h1 className="mt-3 text-4xl font-black tracking-normal text-slate-950 dark:text-white md:text-5xl">Cookie Policy</h1>
        <p className="mt-5 max-w-3xl text-lg font-semibold leading-8 text-slate-600 dark:text-slate-300">
          This page explains the browser storage used by EuroScout Pro and connected services.
        </p>
        <div className="mt-10 grid gap-4">
          {sections.map((section) => (
            <article key={section.title} className="border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-[#111]">
              <h2 className="text-xl font-black text-slate-950 dark:text-white">{section.title}</h2>
              <p className="mt-3 font-semibold leading-7 text-slate-600 dark:text-slate-300">{section.body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
