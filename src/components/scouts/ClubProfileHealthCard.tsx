interface ClubProfileHealthCardProps {
  hasBio: boolean;
  hasWebsite: boolean;
  photoCount: number;
  hasVideo: boolean;
  isVerified: boolean;
}

const MAX_CLUB_PHOTOS = 4;

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
    ["Photos", `${photoCount} / ${MAX_CLUB_PHOTOS}`, photoCount >= MAX_CLUB_PHOTOS ? "good" : photoCount > 0 ? "neutral" : "bad"],
    ["Website", hasWebsite ? "Added" : "Missing", hasWebsite ? "good" : "bad"],
    ["Verified", isVerified ? "Yes" : "Pending", isVerified ? "good" : "neutral"]
  ];

  return (
    <section className="border border-slate-200 bg-white p-7 dark:border-white/10 dark:bg-[#1a1a1a]">
      <p className="text-xs font-black uppercase text-red-600 dark:text-red-400">Profile Health</p>
      <div className="mt-5">
        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="font-bold text-slate-500 dark:text-white/55">Completeness</span>
          <span className="font-black text-slate-950 dark:text-white">{completeness}%</span>
        </div>
        <div className="mb-5 h-2 overflow-hidden bg-slate-200 dark:bg-white/10">
          <div className="h-full bg-red-500" style={{ width: `${completeness}%` }} />
        </div>
      </div>
      <div className="space-y-3">
        {rows.map(([label, value, status]) => (
          label === "Completeness" ? null :
          <div
            key={label}
            className="flex items-center justify-between text-sm"
          >
            <span className="font-bold text-slate-500 dark:text-white/55">{label}</span>
            <span
              className={`font-black ${
                status === "good"
                  ? "text-emerald-400"
                  : status === "bad"
                    ? "text-slate-400 dark:text-white/30"
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
