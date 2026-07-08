import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | EuroScout Pro",
  description: "How EuroScout Pro handles account, profile, messaging and recruitment data."
};

const sections = [
  {
    title: "Data We Collect",
    body: "EuroScout Pro collects account details, profile information, club and player content, messages, call booking data, profile view analytics, article links and usage events needed to operate the recruitment network."
  },
  {
    title: "How We Use Data",
    body: "We use this data to create public profiles, connect players and clubs, support messaging and video calls, show analytics, prevent abuse, verify club access and improve platform reliability."
  },
  {
    title: "Public Profile Data",
    body: "Players, clubs and journalists choose what profile content is public. Public pages may be viewed, shared, indexed and used by other platform members for recruitment or editorial discovery."
  },
  {
    title: "Private Platform Data",
    body: "Messages, call requests, staff invites, admin notes, reports and account settings are treated as private operational data and are only shown to authorised users or administrators."
  },
  {
    title: "Third-Party Services",
    body: "EuroScout Pro uses infrastructure providers such as Supabase, Vercel, Daily and Stripe to provide authentication, hosting, storage, video calls and payments."
  },
  {
    title: "Retention And Deletion",
    body: "Users can request account or content deletion. Some operational records may be retained where needed for security, abuse prevention, billing, audit logs or legal obligations."
  }
];

export default function PrivacyPage() {
  return (
    <main className="app-surface">
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        <p className="eyebrow">Legal</p>
        <h1 className="mt-3 text-4xl font-black tracking-normal text-slate-950 dark:text-white md:text-5xl">Privacy Policy</h1>
        <p className="mt-5 max-w-3xl text-lg font-semibold leading-8 text-slate-600 dark:text-slate-300">
          This policy explains the core data practices for EuroScout Pro. It should be reviewed by counsel before public launch.
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
