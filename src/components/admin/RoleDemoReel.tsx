"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { UserRole } from "@/lib/auth";

interface DemoStep {
  label: string;
  title: string;
  copy: string;
  metric: string;
  action: string;
}

type DemoRole = Exclude<UserRole, "admin">;

const demoSteps: Record<DemoRole, DemoStep[]> = {
  player: [
    {
      label: "Start",
      title: "Choose Player",
      copy: "The player starts with identity, country, city and a short bio that feels quick instead of heavy.",
      metric: "2 min",
      action: "Build identity"
    },
    {
      label: "Profile",
      title: "Add Football Details",
      copy: "Position, nationality, measurements and playing pathway become the first discovery signals.",
      metric: "5 fields",
      action: "Add position"
    },
    {
      label: "Proof",
      title: "Film And Career",
      copy: "The dashboard pushes players toward film, career history and photos after onboarding.",
      metric: "Next step",
      action: "Add film"
    },
    {
      label: "Launch",
      title: "Publish And Respond",
      copy: "Once live, players can see club interest, reply to messages and understand what recruiters are doing next.",
      metric: "Interest",
      action: "Reply"
    }
  ],
  club: [
    {
      label: "Start",
      title: "Choose Coach / Club",
      copy: "A coach or club representative starts by connecting to the team they represent.",
      metric: "Club flow",
      action: "Find club"
    },
    {
      label: "Connect",
      title: "Claim Or Join",
      copy: "Existing teams can be claimed or joined, while missing teams can be requested with country and city.",
      metric: "Verified",
      action: "Claim club"
    },
    {
      label: "Recruit",
      title: "Watchlists And Interest",
      copy: "After onboarding, clubs can build recruitment watchlists, express interest and start conversations with players.",
      metric: "3 prospects",
      action: "Express interest"
    },
    {
      label: "Trust",
      title: "Message Recruits",
      copy: "Logo, photos, videos and verification status support the real outcome: trusted club-to-player messaging.",
      metric: "2 unread",
      action: "Message"
    }
  ],
  journalist: [
    {
      label: "Start",
      title: "Choose Journalist",
      copy: "Journalists get a lighter first pass focused on identity and public byline quality.",
      metric: "Fast path",
      action: "Set byline"
    },
    {
      label: "Profile",
      title: "Short Bio",
      copy: "The bio explains coverage area, experience and football focus without a separate headline field.",
      metric: "Bio",
      action: "Write intro"
    },
    {
      label: "Publish",
      title: "First Article",
      copy: "The dashboard guides journalists toward submitting their first article link.",
      metric: "News",
      action: "Add story"
    },
    {
      label: "Reach",
      title: "Appear In News",
      copy: "Published articles sit alongside EuroScout news and league intelligence surfaces.",
      metric: "Live feed",
      action: "Review"
    }
  ],
  fan: [
    {
      label: "Start",
      title: "Choose Fan",
      copy: "Fans get the shortest flow: identity, location and visibility.",
      metric: "Simple",
      action: "Create account"
    },
    {
      label: "Explore",
      title: "Browse Players",
      copy: "The dashboard sends fans toward player discovery and public club profiles.",
      metric: "Directory",
      action: "Browse"
    },
    {
      label: "Learn",
      title: "Follow Clubs",
      copy: "Club and league pages help fans understand the European American football landscape.",
      metric: "Markets",
      action: "Open clubs"
    },
    {
      label: "Return",
      title: "Read News",
      copy: "The news surface gives fans a reason to come back between profile updates.",
      metric: "News",
      action: "Read"
    }
  ]
};

const roleLabel: Record<DemoRole, string> = {
  player: "Player",
  club: "Coach / Club",
  journalist: "Journalist",
  fan: "Fan"
};

export default function RoleDemoReel({
  role,
  ctaHref,
  ctaLabel = "Open form preview"
}: {
  role: DemoRole;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  const steps = useMemo(() => demoSteps[role], [role]);
  const [active, setActive] = useState(0);
  const activeStep = steps[active];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % steps.length);
    }, 4200);

    return () => window.clearInterval(timer);
  }, [steps.length]);

  return (
    <div className="grid min-h-[680px] overflow-hidden border border-slate-200 bg-white text-slate-950 dark:border-white/10 dark:bg-[#090909] dark:text-white xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="border-b border-slate-200 bg-slate-50 p-6 dark:border-white/10 dark:bg-[#111] lg:border-b-0 lg:border-r">
        <p className="text-xs font-black uppercase text-red-600 dark:text-red-400">Guided demo</p>
        <h1 className="mt-2 text-3xl font-black">{roleLabel[role]} first pass</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-400">
          A short product-tour walkthrough of what this account type sees, does and gets nudged toward after sign-up.
        </p>

        <div className="mt-7 space-y-2">
          {steps.map((step, index) => (
            <button
              key={step.title}
              type="button"
              onClick={() => setActive(index)}
              className={`w-full border p-4 text-left transition ${
                index === active
                  ? "border-red-500 bg-red-600 text-white"
                  : "border-slate-200 bg-white text-slate-950 hover:border-red-300 dark:border-white/10 dark:bg-black/20 dark:text-white"
              }`}
            >
              <span className={`text-[11px] font-black uppercase ${index === active ? "text-red-100" : "text-red-600 dark:text-red-400"}`}>{step.label}</span>
              <span className="mt-1 block text-sm font-black">{step.title}</span>
            </button>
          ))}
        </div>

        <Link href={ctaHref ?? `/onboarding?preview=1&role=${role}`} className="mt-6 inline-flex h-11 w-full items-center justify-center bg-red-600 px-4 text-sm font-black text-white transition hover:bg-red-700">
          {ctaLabel}
        </Link>
      </aside>

      <section className="relative isolate flex min-h-[680px] items-center justify-center overflow-hidden bg-slate-950 p-5 text-white sm:p-8">
        <div className="absolute inset-0 bg-[url('/images/euroscout-hero-line.jpeg')] bg-cover bg-center opacity-20" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(2,6,23,.96),rgba(127,29,29,.58))]" />

        <div className="relative z-10 grid w-full max-w-[98rem] gap-6 2xl:grid-cols-[minmax(780px,1fr)_320px] 2xl:items-center">
          <div>
            <MockProductScreen role={role} active={active} />
            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              {steps.map((step, index) => (
                <button
                  key={step.title}
                  type="button"
                  onClick={() => setActive(index)}
                  aria-label={`Show ${step.title}`}
                  className="h-2 overflow-hidden bg-white/15"
                >
                  <span
                    className="block h-full bg-red-500 transition-all duration-500"
                    style={{ width: index < active ? "100%" : index === active ? "72%" : "0%" }}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="border border-white/15 bg-white/10 p-5 backdrop-blur 2xl:self-center">
            <p className="text-xs font-black uppercase text-red-200">{activeStep.label}</p>
            <h2 className="mt-2 text-3xl font-black">{activeStep.title}</h2>
            <p className="mt-4 text-sm font-semibold leading-6 text-slate-200">{activeStep.copy}</p>
            <div className="mt-6 border border-white/10 bg-black/25 p-4">
              <p className="text-xs font-black uppercase text-red-200">Signal</p>
              <p className="mt-2 text-3xl font-black">{activeStep.metric}</p>
              <p className="mt-1 text-sm font-semibold text-slate-300">{activeStep.action}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function MockProductScreen({ role, active }: { role: DemoRole; active: number }) {
  return (
    <div className="overflow-hidden border border-white/15 bg-white text-slate-950 shadow-2xl shadow-black/30">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-red-500" />
          <span className="h-3 w-3 rounded-full bg-slate-300" />
          <span className="h-3 w-3 rounded-full bg-slate-300" />
        </div>
        <span className="text-xs font-black uppercase text-slate-500">EuroScout onboarding preview</span>
      </div>
      <div className="min-h-[500px] bg-slate-100 p-4 sm:p-6 lg:p-8">
        {role === "player" && <PlayerScene active={active} />}
        {role === "club" && <ClubScene active={active} />}
        {role === "journalist" && <JournalistScene active={active} />}
        {role === "fan" && <FanScene active={active} />}
      </div>
    </div>
  );
}

function PlayerScene({ active }: { active: number }) {
  if (active === 0) {
    return (
      <SceneGrid title="Build your player profile" tag="Step 1">
        <Panel className="sm:col-span-2">
          <Field label="Display name" value="Zion Clarke" complete />
          <Field label="Country" value="United Kingdom" complete />
          <Field label="City" value="London" complete />
          <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-black uppercase text-slate-500">Short bio</p>
            <p className="mt-2 text-sm font-bold text-slate-800">Explosive DB looking for European senior opportunities and verified film review.</p>
          </div>
        </Panel>
        <Readiness percent={25} items={["Identity added", "Bio drafted", "Football details next"]} />
      </SceneGrid>
    );
  }

  if (active === 1) {
    return (
      <SceneGrid title="Add discovery signals" tag="Step 2">
        <Panel>
          <Field label="Primary position" value="Defensive Back" complete />
          <Field label="Height" value="6'1&quot;" complete />
          <Field label="Weight" value="88 kg" complete />
        </Panel>
        <Panel>
          <p className="text-xs font-black uppercase text-red-600">Player card preview</p>
          <div className="mt-4 flex gap-3">
            <Avatar initials="ZC" />
            <div>
              <p className="text-lg font-black">Zion Clarke</p>
              <p className="text-sm font-bold text-slate-500">DB - United Kingdom</p>
              <div className="mt-3 flex gap-2">
                <Badge>6 ft 1</Badge>
                <Badge>88kg</Badge>
              </div>
            </div>
          </div>
        </Panel>
        <Readiness percent={55} items={["Position complete", "Measurements live", "Film still needed"]} />
      </SceneGrid>
    );
  }

  if (active === 2) {
    return (
      <SceneGrid title="Upload proof" tag="Step 3">
        <Panel className="sm:col-span-2">
          <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
            <div className="flex aspect-video items-center justify-center bg-slate-950 text-white">
              <span className="text-4xl font-black">Play</span>
            </div>
            <div>
              <p className="text-sm font-black">2026 highlight reel.mp4</p>
              <Progress value={78} label="Uploading film" />
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <MiniTile label="Games" value="8" />
                <MiniTile label="Photos" value="3 / 4" />
                <MiniTile label="Clips" value="12" />
              </div>
            </div>
          </div>
        </Panel>
        <Readiness percent={78} items={["Film uploading", "Career timeline started", "One photo slot open"]} />
      </SceneGrid>
    );
  }

  return (
    <SceneGrid title="Publish and respond" tag="Step 4">
      <Panel>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xl font-black">Profile readiness</p>
            <p className="mt-1 text-sm font-bold text-slate-500">Clubs see stronger profiles first.</p>
          </div>
          <span className="bg-emerald-100 px-3 py-2 text-sm font-black text-emerald-700">92%</span>
        </div>
        <Progress value={92} label="Ready to publish" />
        <button className="mt-5 h-11 bg-red-600 px-5 text-sm font-black text-white">Publish profile</button>
      </Panel>
      <Panel>
        <p className="text-xs font-black uppercase text-red-600">Club interest</p>
        <InterestCard club="Berlin Rebels" status="Interested" />
        <InterestCard club="Madrid Bravos" status="Watchlist" />
      </Panel>
      <Panel>
        <p className="text-xs font-black uppercase text-red-600">Messages</p>
        <MessageBubble sender="Berlin Rebels" text="Can we schedule a call this week?" />
        <MessageBubble sender="You" text="Yes, I am available Thursday." mine />
      </Panel>
    </SceneGrid>
  );
}

function ClubScene({ active }: { active: number }) {
  if (active === 0) {
    return (
      <SceneGrid title="Connect to your club" tag="Step 1">
        <Panel className="sm:col-span-2">
          <Field label="Account type" value="Coach / Club" complete />
          <Field label="Country" value="Germany" complete />
          <Field label="City" value="Berlin" complete />
        </Panel>
        <Panel>
          <p className="text-xs font-black uppercase text-red-600">Suggested match</p>
          <p className="mt-3 text-lg font-black">Berlin Rebels</p>
          <p className="text-sm font-bold text-slate-500">GFL - Germany</p>
        </Panel>
      </SceneGrid>
    );
  }

  if (active === 1) {
    return (
      <SceneGrid title="Claim or request access" tag="Step 2">
        <Panel className="sm:col-span-2">
          <div className="flex items-center justify-between gap-3 border border-slate-200 p-4">
            <div>
              <p className="font-black">Berlin Rebels</p>
              <p className="text-sm font-bold text-slate-500">Claim pending admin review</p>
            </div>
            <span className="bg-amber-100 px-3 py-2 text-xs font-black text-amber-700">Pending</span>
          </div>
          <Progress value={50} label="Verification review" />
        </Panel>
        <Readiness percent={50} items={["Club selected", "Claim submitted", "Admin review next"]} />
      </SceneGrid>
    );
  }

  if (active === 2) {
    return (
      <SceneGrid title="Recruit with intent" tag="Step 3">
        <Panel>
          <p className="text-xs font-black uppercase text-red-600">Roster needs</p>
          <Need position="QB" priority="High" />
          <Need position="OL" priority="High" />
          <Need position="DB" priority="Medium" />
        </Panel>
        <Panel>
          <p className="text-xs font-black uppercase text-red-600">Recruitment watchlist</p>
          <PlayerRow name="M. Harris" meta="QB - USA" action="Interested" />
          <PlayerRow name="Z. Clarke" meta="DB - UK" action="Express" />
          <PlayerRow name="E. Novak" meta="OL - Czechia" action="Saved" />
        </Panel>
        <Panel>
          <p className="text-xs font-black uppercase text-red-600">Express interest</p>
          <p className="mt-3 text-lg font-black">Zion Clarke</p>
          <p className="text-sm font-bold text-slate-500">DB - United Kingdom</p>
          <button className="mt-4 h-10 w-full bg-red-600 text-sm font-black text-white">Express interest</button>
        </Panel>
      </SceneGrid>
    );
  }

  return (
    <SceneGrid title="Message recruits" tag="Step 4">
      <Panel>
        <p className="text-xs font-black uppercase text-red-600">Club media</p>
        <div className="mt-4 grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="flex aspect-square items-center justify-center bg-slate-200 text-sm font-black text-slate-500">
              Photo {item}
            </div>
          ))}
        </div>
        <button className="mt-5 h-11 bg-red-600 px-5 text-sm font-black text-white">Update club profile</button>
      </Panel>
      <Panel className="sm:col-span-2">
        <p className="text-xs font-black uppercase text-red-600">Recruitment messages</p>
        <MessageBubble sender="Berlin Rebels" text="We liked your senior film. Are you open to Germany?" />
        <MessageBubble sender="Zion Clarke" text="Yes, send me the role and contract details." mine />
        <MessageBubble sender="Berlin Rebels" text="Added you to our DB priority watchlist." />
      </Panel>
    </SceneGrid>
  );
}

function JournalistScene({ active }: { active: number }) {
  if (active === 0) {
    return (
      <SceneGrid title="Create your byline" tag="Step 1">
        <Panel className="sm:col-span-2">
          <Field label="Display name" value="Maya Bennett" complete />
          <Field label="Country" value="France" complete />
          <Field label="City" value="Paris" complete />
        </Panel>
        <Panel>
          <Avatar initials="MB" />
          <p className="mt-3 text-lg font-black">Maya Bennett</p>
          <p className="text-sm font-bold text-slate-500">Journalist profile</p>
        </Panel>
      </SceneGrid>
    );
  }

  if (active === 1) {
    return (
      <SceneGrid title="Say what you cover" tag="Step 2">
        <Panel className="sm:col-span-2">
          <p className="text-xs font-black uppercase text-red-600">Short bio</p>
          <p className="mt-3 rounded border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-800">
            Covering European American football, player movement and club development across France and Germany.
          </p>
        </Panel>
        <Readiness percent={60} items={["Byline ready", "Bio complete", "First article next"]} />
      </SceneGrid>
    );
  }

  if (active === 2) {
    return (
      <SceneGrid title="Submit your first story" tag="Step 3">
        <Panel className="sm:col-span-2">
          <Field label="Article title" value="Three prospects rising before camp" complete />
          <Field label="Source link" value="euroscout.news/prospects" complete />
          <Progress value={84} label="Editorial readiness" />
        </Panel>
        <Panel>
          <p className="text-xs font-black uppercase text-red-600">Status</p>
          <p className="mt-3 text-2xl font-black">Draft saved</p>
        </Panel>
      </SceneGrid>
    );
  }

  return (
    <SceneGrid title="Appear in news" tag="Step 4">
      <Panel className="sm:col-span-2">
        <NewsRow title="Three prospects rising before camp" source="Maya Bennett" />
        <NewsRow title="Club notes from the GFL combine" source="EuroScout Desk" />
        <NewsRow title="Recruitment windows to watch" source="Maya Bennett" />
      </Panel>
      <Readiness percent={94} items={["Article reviewed", "Byline visible", "News feed ready"]} />
    </SceneGrid>
  );
}

function FanScene({ active }: { active: number }) {
  if (active === 0) {
    return (
      <SceneGrid title="Fast account setup" tag="Step 1">
        <Panel className="sm:col-span-2">
          <Field label="Display name" value="Alex Morgan" complete />
          <Field label="Country" value="Spain" complete />
          <Field label="City" value="Madrid" complete />
        </Panel>
        <Readiness percent={70} items={["Identity complete", "Explore players", "Read news"]} />
      </SceneGrid>
    );
  }

  if (active === 1) {
    return (
      <SceneGrid title="Browse the player market" tag="Step 2">
        <Panel className="sm:col-span-2">
          <PlayerRow name="Zion Clarke" meta="DB - United Kingdom" action="View" />
          <PlayerRow name="Mateo Ruiz" meta="WR - Spain" action="View" />
          <PlayerRow name="Jonas Weber" meta="LB - Germany" action="View" />
        </Panel>
        <Panel>
          <p className="text-xs font-black uppercase text-red-600">Filters</p>
          <Badge>Position</Badge>
          <Badge>Country</Badge>
          <Badge>League</Badge>
        </Panel>
      </SceneGrid>
    );
  }

  if (active === 2) {
    return (
      <SceneGrid title="Explore clubs" tag="Step 3">
        <Panel>
          <p className="text-xs font-black uppercase text-red-600">Club profile</p>
          <p className="mt-3 text-xl font-black">Madrid Bravos</p>
          <p className="text-sm font-bold text-slate-500">ELF - Spain</p>
        </Panel>
        <Panel>
          <p className="text-xs font-black uppercase text-red-600">Market view</p>
          <MiniTile label="Players" value="42" />
          <MiniTile label="Open needs" value="6" />
        </Panel>
        <Readiness percent={85} items={["Club pages", "League context", "Player links"]} />
      </SceneGrid>
    );
  }

  return (
    <SceneGrid title="Return for updates" tag="Step 4">
      <Panel className="sm:col-span-2">
        <NewsRow title="European prospects to watch this week" source="EuroScout News" />
        <NewsRow title="New club profiles published" source="Platform update" />
        <NewsRow title="Campus to Pro tracker opens" source="EuroScout Pro" />
      </Panel>
      <Readiness percent={100} items={["Directory ready", "Club pages ready", "News ready"]} />
    </SceneGrid>
  );
}

function SceneGrid({ title, tag, children }: { title: string; tag: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-red-600">{tag}</p>
          <h3 className="mt-1 text-2xl font-black text-slate-950">{title}</h3>
        </div>
        <span className="bg-slate-950 px-3 py-2 text-xs font-black uppercase text-white">Preview</span>
      </div>
      <div className="grid gap-4 md:grid-cols-3">{children}</div>
    </div>
  );
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`border border-slate-200 bg-white p-4 shadow-sm ${className}`}>{children}</div>;
}

function Field({ label, value, complete }: { label: string; value: string; complete?: boolean }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs font-black uppercase text-slate-500">{label}</p>
        {complete && <span className="text-xs font-black text-emerald-600">Done</span>}
      </div>
      <div className="border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900">{value}</div>
    </div>
  );
}

function Readiness({ percent, items }: { percent: number; items: string[] }) {
  return (
    <Panel>
      <p className="text-xs font-black uppercase text-red-600">Readiness</p>
      <p className="mt-2 text-3xl font-black">{percent}%</p>
      <Progress value={percent} label="Completion" />
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <p key={item} className="text-sm font-bold text-slate-700"><span className="mr-2 text-emerald-600">OK</span>{item}</p>
        ))}
      </div>
    </Panel>
  );
}

function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div className="mt-3">
      <div className="mb-1 flex justify-between text-xs font-black uppercase text-slate-500">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 bg-slate-200">
        <div className="h-full bg-red-600 transition-all duration-500" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function Avatar({ initials }: { initials: string }) {
  return <div className="flex h-14 w-14 items-center justify-center bg-slate-950 text-lg font-black text-white">{initials}</div>;
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="mt-2 mr-2 inline-flex bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{children}</span>;
}

function MiniTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  );
}

function Need({ position, priority }: { position: string; priority: string }) {
  return (
    <div className="mt-3 flex items-center justify-between border border-slate-200 p-3">
      <span className="font-black">{position}</span>
      <span className="text-xs font-black text-red-600">{priority}</span>
    </div>
  );
}

function PlayerRow({ name, meta, action = "View" }: { name: string; meta: string; action?: string }) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border border-slate-200 p-3">
      <div className="min-w-0">
        <p className="font-black">{name}</p>
        <p className="text-sm font-bold text-slate-500">{meta}</p>
      </div>
      <span className="shrink-0 bg-red-50 px-2 py-1 text-xs font-black text-red-600">{action}</span>
    </div>
  );
}

function InterestCard({ club, status }: { club: string; status: string }) {
  return (
    <div className="mt-3 flex items-center justify-between border border-slate-200 p-3">
      <div>
        <p className="font-black">{club}</p>
        <p className="text-sm font-bold text-slate-500">Recruiting update</p>
      </div>
      <span className="bg-emerald-100 px-2 py-1 text-xs font-black text-emerald-700">{status}</span>
    </div>
  );
}

function MessageBubble({ sender, text, mine = false }: { sender: string; text: string; mine?: boolean }) {
  return (
    <div className={`mt-3 max-w-[92%] border p-3 ${mine ? "ml-auto border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
      <p className={`text-xs font-black uppercase ${mine ? "text-red-600" : "text-slate-500"}`}>{sender}</p>
      <p className="mt-1 text-sm font-bold text-slate-800">{text}</p>
    </div>
  );
}

function NewsRow({ title, source }: { title: string; source: string }) {
  return (
    <div className="mb-3 border border-slate-200 p-3 last:mb-0">
      <p className="font-black">{title}</p>
      <p className="mt-1 text-sm font-bold text-slate-500">{source}</p>
    </div>
  );
}
