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
    <section className="rounded-lg border border-white/10 bg-[#1a1a1a] p-7">
      <p className="text-sm font-black uppercase text-red-500">Profile Health</p>
      <div className="mt-5">
        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="font-bold text-white/55">Completeness</span>
          <span className="font-black text-white">{completeness}%</span>
        </div>
        <div className="mb-5 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-red-500" style={{ width: `${completeness}%` }} />
        </div>
      </div>
      <div className="space-y-3">
        {rows.map(([label, value, status]) => (
          label === "Completeness" ? null :
          <div
            key={label}
            className="flex items-center justify-between text-sm"
          >
            <span className="font-bold text-white/55">{label}</span>
            <span
              className={`font-black ${
                status === "good"
                  ? "text-emerald-400"
                  : status === "bad"
                    ? "text-white/30"
                    : "text-white"
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
