"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { routes } from "@/constants/routes";

const heroFrames = [
  { src: "/images/euroscout-hero-line.jpeg", position: "center 42%" },
  { src: "/images/euroscout-hero-tackle.jpeg", position: "center 46%" },
  { src: "/images/E_S1.png", position: "center 28%" },
  { src: "/images/E_S2.png", position: "center 40%" },
  { src: "/images/E_S3.png", position: "center 40%" },
  { src: "/images/E_S4.png", position: "center 40%" }
];

const playerSignupHref = `/auth/sign-up?next=${encodeURIComponent("/welcome?role=player")}`;
const clubSignupHref = `/auth/sign-up?next=${encodeURIComponent("/welcome?role=club")}`;

export default function HeroSection() {
  const panes = useMemo(
    () => [
      {
        eyebrow: "European Football Opportunities",
        title: "Find your next football opportunity in Europe.",
        description:
          "Verified club needs, available players and recruiting contacts—without searching through dozens of leagues and social accounts."
      },
      {
        eyebrow: "Player Discovery",
        title: "Find players with film, metrics and real recruiting context.",
        description:
          "Browse athlete profiles with position data, measurements, film links, profile health, availability and club interest pathways built for faster evaluation."
      },
      {
        eyebrow: "Club Recruiting",
        title: "Track clubs, roster needs and active recruitment intent.",
        description:
          "Club pages show verified staff, roster needs, media, messaging preferences and call-request tools so players and scouts know where opportunity is live."
      },
      {
        eyebrow: "Marketplace Workflow",
        title: "Move from discovery to message, call and decision.",
        description:
          "Messaging, watchlists, express interest, video call bookings, notifications and premium analytics keep the recruiting journey organised end to end."
      }
    ],
    []
  );
  const [activePaneIndex, setActivePaneIndex] = useState(0);
  const [showSecondaryFrames, setShowSecondaryFrames] = useState(false);
  const activePane = panes[activePaneIndex];

  useEffect(() => {
    const rotation = window.setInterval(() => {
      setActivePaneIndex((current) => (current + 1) % panes.length);
    }, 6500);

    return () => window.clearInterval(rotation);
  }, [panes.length]);

  return (
    <section className="border-b border-slate-200 bg-white dark:border-white/10 dark:bg-[#090909]">
      <div className="relative isolate min-h-[min(500px,calc(100svh-7rem))] overflow-hidden bg-slate-950 sm:min-h-[min(560px,calc(100svh-7rem))]">
        {heroFrames.map((frame, index) =>
          index === 0 || showSecondaryFrames ? (
            <div key={frame.src} className={`hero-cinematic-frame hero-cinematic-frame-${index + 1}`}>
              <Image
                src={frame.src}
                alt=""
                fill
                sizes="100vw"
                quality={72}
                priority={index === 0}
                className="object-cover"
                style={{ objectPosition: frame.position }}
                onLoad={index === 0 ? () => setShowSecondaryFrames(true) : undefined}
              />
            </div>
          ) : null
        )}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,.94)_0%,rgba(2,6,23,.76)_48%,rgba(2,6,23,.42)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-950 to-transparent" />
        <div className="relative mx-auto flex min-h-[min(500px,calc(100svh-7rem))] max-w-[92rem] items-end px-4 pb-8 pt-20 sm:min-h-[min(560px,calc(100svh-7rem))] sm:px-6 sm:pb-10 lg:px-8">
          <div className="max-w-2xl">
            <div key={activePane.title} className="hero-copy-rotation">
              <p className="text-xs font-black uppercase text-red-300">{activePane.eyebrow}</p>
              <h1 className="mt-3 text-[1.36rem] font-black leading-[1.08] text-white sm:text-[1.8rem] lg:text-[2.17rem]">
                {activePane.title}
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-200 sm:text-base">
                {activePane.description}
              </p>
            </div>
            <div className="mt-5 flex flex-wrap gap-3 sm:mt-7">
              <Link href={routes.players} className="inline-flex h-10 items-center bg-red-600 px-4 text-sm font-black text-white transition hover:bg-red-700 sm:h-11 sm:px-5">
                I&apos;m looking for players
              </Link>
              <Link href={routes.teams} className="inline-flex h-10 items-center border border-white/20 bg-white/10 px-4 text-sm font-black text-white transition hover:border-red-300/60 hover:bg-white/15 sm:h-11 sm:px-5">
                I&apos;m looking for a team
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-black">
              <Link href={playerSignupHref} className="text-white underline decoration-red-500 decoration-2 underline-offset-4 transition hover:text-red-200">
                Create Player Profile
              </Link>
              <Link href={clubSignupHref} className="text-white underline decoration-red-500 decoration-2 underline-offset-4 transition hover:text-red-200">
                Claim Your Club
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3 sm:mt-8 sm:max-w-xl">
              {[
                { value: "10", label: "Indexed leagues", href: routes.leagues },
                { value: "87", label: "Mapped teams", href: routes.teams },
                { value: "11", label: "Active countries", href: "" }
              ].map((item) => {
                const content = (
                  <>
                    <p className="text-2xl font-black text-white">{item.value}</p>
                    <p className="mt-1 text-[10px] font-black uppercase text-slate-300">{item.label}</p>
                  </>
                );

                return item.href ? (
                  <Link key={item.label} href={item.href} className="border-l border-red-400/70 pl-4 transition hover:border-red-300">
                    {content}
                  </Link>
                ) : (
                  <div key={item.label} className="border-l border-red-400/70 pl-4">
                    {content}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
