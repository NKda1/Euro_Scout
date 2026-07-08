import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms Of Service | EuroScout Pro",
  description: "Platform terms for EuroScout Pro accounts, profiles, recruitment messaging and video calls."
};

const sections = [
  {
    title: "Account Responsibility",
    body: "Users are responsible for accurate account information, lawful use of the platform and keeping login credentials secure."
  },
  {
    title: "Recruitment Use",
    body: "EuroScout Pro helps players, clubs, coaches and journalists connect. The platform does not guarantee offers, contracts, roster places, visas or employment outcomes."
  },
  {
    title: "Content Standards",
    body: "Profiles, film links, article links, messages and club content must be truthful, lawful and respectful. Misleading, abusive, unsafe or spam content may be removed."
  },
  {
    title: "Messaging And Calls",
    body: "Users should keep recruitment conversations professional. Video call rooms are intended for platform-related recruitment and negotiation discussions between authorised participants."
  },
  {
    title: "Premium Features",
    body: "Premium features may include enhanced analytics, messaging allowances, visibility tools or club controls. Billing and access remain subject to active subscription status."
  },
  {
    title: "Admin Enforcement",
    body: "EuroScout Pro may moderate profiles, investigate reports, restrict accounts, revoke club claims or remove content to protect users and platform integrity."
  }
];

export default function TermsPage() {
  return (
    <main className="app-surface">
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        <p className="eyebrow">Legal</p>
        <h1 className="mt-3 text-4xl font-black tracking-normal text-slate-950 dark:text-white md:text-5xl">Terms Of Service</h1>
        <p className="mt-5 max-w-3xl text-lg font-semibold leading-8 text-slate-600 dark:text-slate-300">
          These starter terms define the operating rules for the platform and should be legally reviewed before launch.
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
