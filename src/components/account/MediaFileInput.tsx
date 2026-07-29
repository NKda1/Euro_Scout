"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Replace, Upload } from "lucide-react";

interface MediaFileInputProps {
  name: string;
  label: string;
  currentUrl?: string | null;
  accept?: string;
  required?: boolean;
  shape?: "square" | "landscape";
  helper?: string;
}

export default function MediaFileInput({
  name,
  label,
  currentUrl,
  accept = "image/png,image/jpeg,image/webp,image/gif",
  required = true,
  shape = "square",
  helper = "PNG, JPG or WebP"
}: MediaFileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState(currentUrl ?? "");
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function selectFile(file?: File) {
    if (!file) return;
    setPreviewUrl((previous) => {
      if (previous.startsWith("blob:")) URL.revokeObjectURL(previous);
      return URL.createObjectURL(file);
    });
    setFileName(file.name);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-[88px_minmax(0,1fr)] sm:items-center">
      <div
        className={`relative overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/5 ${shape === "landscape" ? "aspect-video sm:h-20 sm:w-28" : "h-20 w-20"}`}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt={`${label} preview`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-400 dark:text-white/25">
            <ImagePlus className="h-6 w-6" aria-hidden />
          </div>
        )}
        {fileName ? (
          <span className="absolute inset-x-1 bottom-1 truncate rounded bg-black/65 px-1.5 py-1 text-center text-[9px] font-bold text-white">
            Preview
          </span>
        ) : null}
      </div>
      <div>
        <input
          ref={inputRef}
          name={name}
          type="file"
          accept={accept}
          required={required}
          className="sr-only"
          onChange={(event) => selectFile(event.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex min-h-16 w-full items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 text-left transition hover:border-red-400 hover:bg-red-50/40 dark:border-white/15 dark:bg-black/20 dark:hover:border-red-500/50 dark:hover:bg-red-500/5"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-red-600 shadow-sm dark:bg-white/10 dark:text-red-300">
            {currentUrl ? <Replace className="h-4 w-4" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-black text-slate-900 dark:text-white">
              {fileName || (currentUrl ? `Replace ${label.toLowerCase()}` : `Choose ${label.toLowerCase()}`)}
            </span>
            <span className="mt-0.5 block text-xs font-semibold text-slate-500 dark:text-white/40">{helper} · preview before saving</span>
          </span>
        </button>
      </div>
    </div>
  );
}
