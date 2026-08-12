"use client";

import { useState } from "react";
import { Clapperboard, Play, Zap } from "lucide-react";
import { detectVideoProvider, getVideoProviderLabel, getVideoThumbnailUrl } from "@/lib/video";

interface VideoLinkComposerProps {
  defaultUrl?: string;
  defaultLabel?: string;
  defaultThumbnailUrl?: string;
  showThumbnailField?: boolean;
  compact?: boolean;
}

const inputClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-red-500 dark:border-white/10 dark:bg-black/35 dark:text-white dark:placeholder:text-white/25";

export default function VideoLinkComposer({
  defaultUrl = "",
  defaultLabel = "",
  defaultThumbnailUrl = "",
  showThumbnailField = false,
  compact = false
}: VideoLinkComposerProps) {
  const [url, setUrl] = useState(defaultUrl);
  const [label, setLabel] = useState(defaultLabel);
  const [thumbnailUrl, setThumbnailUrl] = useState(defaultThumbnailUrl);
  const detectedThumbnail = thumbnailUrl || getVideoThumbnailUrl(url) || "";
  const provider = url ? detectVideoProvider(url) : null;
  const providerLabel = provider ? getVideoProviderLabel(provider) : null;
  const isHudl = provider === "hudl";

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").trim();
    if (!pasted) return;
    // Auto-populate label from provider if label is empty
    if (!label && pasted.includes("hudl.com")) {
      setLabel("Hudl film");
    }
  }

  return (
    <div className={`grid gap-3 ${compact ? "md:grid-cols-[160px_minmax(0,1fr)]" : "md:grid-cols-[220px_minmax(0,1fr)]"}`}>
      <div className="relative aspect-video overflow-hidden rounded-lg border border-slate-200 bg-slate-950 dark:border-white/10">
        {detectedThumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={detectedThumbnail} alt="Video thumbnail preview" className="h-full w-full object-cover opacity-80" />
        ) : isHudl ? (
          // Hudl branded placeholder — no public thumbnail API available
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-[#ff6c0e]/10 text-[#ff6c0e]">
            <Zap className="h-6 w-6" aria-hidden />
            <span className="text-[10px] font-black uppercase tracking-wider">Hudl detected</span>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-white/35">
            <Clapperboard className="h-6 w-6" aria-hidden />
            <span className="text-[10px] font-black uppercase tracking-wider">Video preview</span>
          </div>
        )}
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-950 shadow-lg">
            <Play className="ml-0.5 h-4 w-4 fill-current" aria-hidden />
          </span>
        </span>
        <span className="absolute inset-x-2 bottom-2 truncate rounded bg-black/65 px-2 py-1 text-[10px] font-bold text-white">
          {label || (providerLabel ? `${providerLabel} film` : "How your video will appear")}
        </span>
      </div>
      <div className="grid content-start gap-2">
        <input
          name="label"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Video title, e.g. 2026 highlights"
          className={inputClass}
        />
        <input
          name="url"
          type="url"
          required
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          onPaste={handlePaste}
          placeholder="Paste a Hudl, YouTube or Vimeo URL"
          className={inputClass}
        />
        {isHudl && (
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#ff6c0e]">
            <Zap className="h-3 w-3 shrink-0" aria-hidden />
            Hudl link detected — will auto-embed where supported.
          </p>
        )}
        {showThumbnailField ? (
          <input
            name="thumbnail_url"
            type="url"
            value={thumbnailUrl}
            onChange={(event) => setThumbnailUrl(event.target.value)}
            placeholder="Custom thumbnail URL (optional)"
            className={inputClass}
          />
        ) : null}
        <p className="text-[11px] font-semibold text-slate-500 dark:text-white/35">Paste a link to generate a small public-profile preview.</p>
      </div>
    </div>
  );
}

