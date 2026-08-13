"use client";

import { useRef, useState } from "react";
import { Clapperboard, ImagePlus, Play, Zap } from "lucide-react";
import { detectVideoProvider, getVideoProviderLabel, getVideoThumbnailUrl } from "@/lib/video";

const HUDL_PLACEHOLDER = "/images/PlaceHolder.PNG";

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
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);

  const autoThumbnail = getVideoThumbnailUrl(url) || "";
  const provider = url ? detectVideoProvider(url) : null;
  const providerLabel = provider ? getVideoProviderLabel(provider) : null;
  const isHudl = provider === "hudl";
  const usingPlaceholder = thumbnailUrl === HUDL_PLACEHOLDER;
  const hasCustomThumb = Boolean(thumbnailUrl) && !usingPlaceholder;
  const previewSrc = thumbnailUrl || autoThumbnail || (isHudl ? HUDL_PLACEHOLDER : "");

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").trim();
    if (!pasted) return;
    if (!label && pasted.includes("hudl.com")) setLabel("Hudl film");
  }

  function handleThumbnailFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || busyRef.current) return;

    busyRef.current = true;
    setUploading(true);
    setUploadError(null);
    if (thumbInputRef.current) thumbInputRef.current.value = "";

    const fd = new FormData();
    fd.append("thumbnail", file);

    fetch("/api/account/film-thumbnail/upload", { method: "POST", body: fd })
      .then((res) => res.json())
      .then((data: { url?: string; error?: string }) => {
        if (data.error) setUploadError(data.error);
        else if (data.url) setThumbnailUrl(data.url);
      })
      .catch(() => setUploadError("Upload failed. Check your connection."))
      .finally(() => {
        busyRef.current = false;
        setUploading(false);
      });
  }

  return (
    <div className={`grid gap-3 ${compact ? "md:grid-cols-[160px_minmax(0,1fr)]" : "md:grid-cols-[220px_minmax(0,1fr)]"}`}>
      {/* Thumbnail preview */}
      <div className="relative aspect-video overflow-hidden rounded-lg border border-slate-200 bg-slate-950 dark:border-white/10">
        {previewSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewSrc} alt="Video thumbnail preview" className="h-full w-full object-cover opacity-80" />
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

      {/* Inputs */}
      <div className="grid content-start gap-2">
        <input
          name="label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Video title, e.g. 2026 highlights"
          className={inputClass}
        />
        <input
          name="url"
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onPaste={handlePaste}
          placeholder="Paste a Hudl, YouTube or Vimeo URL"
          className={inputClass}
        />

        {/* Hidden field carries the resolved thumbnail URL */}
        <input type="hidden" name="thumbnail_url" value={thumbnailUrl} />

        {/* Hudl thumbnail options */}
        {isHudl && (
          <div className="rounded-lg border border-[#ff6c0e]/25 bg-[#ff6c0e]/[0.07] p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-[#ff6c0e]">
              <Zap className="h-3 w-3 shrink-0" aria-hidden />
              Hudl detected — set a thumbnail
            </p>
            <p className="mt-1 text-[11px] font-semibold leading-5 text-white/45">
              Hudl doesn&apos;t share thumbnails externally. Upload a screenshot from your film or use the EuroScout placeholder.
            </p>
            {uploadError && <p className="mt-1.5 text-[11px] font-semibold text-red-400">{uploadError}</p>}
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <label className={`flex cursor-pointer items-center gap-1.5 rounded border px-3 py-1.5 text-[11px] font-black uppercase transition ${uploading ? "cursor-not-allowed border-white/10 text-white/25" : hasCustomThumb ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-300" : "border-white/15 bg-white/5 text-white/55 hover:border-[#ff6c0e]/40 hover:text-[#ff6c0e]"}`}>
                <input
                  ref={thumbInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploading}
                  onChange={handleThumbnailFile}
                  className="sr-only"
                />
                <ImagePlus className="h-3 w-3 shrink-0" aria-hidden />
                {uploading ? "Uploading…" : hasCustomThumb ? "✓ Custom uploaded" : "Upload image"}
              </label>
              <button
                type="button"
                onClick={() => setThumbnailUrl(usingPlaceholder ? "" : HUDL_PLACEHOLDER)}
                className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-[11px] font-black uppercase transition ${usingPlaceholder ? "border-red-500/40 bg-red-500/15 text-red-300" : "border-white/15 bg-white/5 text-white/55 hover:border-red-500/35 hover:text-red-300"}`}
              >
                {usingPlaceholder ? "✓ Using placeholder" : "Use placeholder"}
              </button>
              {thumbnailUrl && (
                <button type="button" onClick={() => setThumbnailUrl("")} className="text-[11px] font-semibold text-white/30 transition hover:text-white/60">
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* Manual URL thumbnail for non-Hudl providers (YouTube auto-detects) */}
        {showThumbnailField && !isHudl && (
          <input
            type="url"
            value={thumbnailUrl}
            onChange={(e) => setThumbnailUrl(e.target.value)}
            placeholder="Custom thumbnail URL (optional)"
            className={inputClass}
          />
        )}

        <p className="text-[11px] font-semibold text-slate-500 dark:text-white/35">Paste a link to generate a public-profile preview.</p>
      </div>
    </div>
  );
}
