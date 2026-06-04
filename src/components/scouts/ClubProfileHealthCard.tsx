interface ClubProfileHealthCardProps {
  hasBio: boolean;
  hasWebsite: boolean;
  photoCount: number;
  hasVideo: boolean;
  isVerified: boolean;
}

export default function ClubProfileHealthCard({
  hasBio,
  hasWebsite,
  photoCount,
  hasVideo,
  isVerified
}: ClubProfileHealthCardProps) {
  const score = [hasBio, hasWebsite, hasVideo, photoCount > 0, isVerified].filter(Boolean).length;
  const completeness = Math.round((score / 5) * 100);

  type HealthRow = [label: string, value: string, status: "good" | "bad" | "neutral"];

  const rows: HealthRow[] = [
    ["Completeness", `${completeness}%`, completeness >= 80 ? "good" : completeness >= 40 ? "neutral" : "bad"],
    ["Team Video", hasVideo ? "Added" : "Missing", hasVideo ? "good" : "bad"],
    ["Photos", `${photoCount} / 3`, photoCount >= 3 ? "good" : photoCount > 0 ? "neutral" : "bad"],
    ["Website", hasWebsite ? "Added" : "Missing", hasWebsite ? "good" : "bad"],
    ["Verified", isVerified ? "Yes" : "Pending", isVerified ? "good" : "neutral"]
  ];

  return (
    <section className="rounded-[1.75rem] border border-white/70 bg-white/78 p-6 shadow-xl shadow-slate-950/10 backdrop-blur-2xl dark:border-white/10 dark:bg-white/10">
      <p className="eyebrow-red">Profile Health</p>
      <div className="mt-5 space-y-4">
        {rows.map(([label, value, status]) => (
          <div
            key={label}
            className="flex items-center justify-between border-b border-slate-200 pb-3 text-sm last:border-b-0 last:pb-0 dark:border-white/10"
          >
            <span className="font-bold text-slate-500 dark:text-slate-400">{label}</span>
            <span
              className={`font-black ${
                status === "good"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : status === "bad"
                    ? "text-slate-400"
                    : "text-slate-950 dark:text-white"
              }`}
            >
              {value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
