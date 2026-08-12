"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PlayerPhotoGallery from "@/components/players/PlayerPhotoGallery";

const MAX_PLAYER_PHOTOS = 4;

export default function PlayerPhotoManager({ photoUrls }: { photoUrls: string[] }) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Ref-based lock prevents race conditions when state updates are batched.
  const busyRef = useRef(false);
  const router = useRouter();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile(file);
  }

  function uploadFile(file: File) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setProgress(0);
    setError(null);

    // Clear the input immediately so a re-render never re-triggers onChange.
    if (fileInputRef.current) fileInputRef.current.value = "";

    const formData = new FormData();
    formData.append("photo", file);

    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
    };
    xhr.onload = () => {
      // Route returns a 303 redirect; after following it the final URL carries ?error= or ?notice=
      const finalUrl = new URL(xhr.responseURL || window.location.href, window.location.origin);
      const err = finalUrl.searchParams.get("error");
      if (err) {
        setError(decodeURIComponent(err));
      } else {
        router.refresh();
      }
      busyRef.current = false;
      setBusy(false);
      setProgress(0);
    };
    xhr.onerror = () => {
      setError("Upload failed. Please check your connection and try again.");
      busyRef.current = false;
      setBusy(false);
      setProgress(0);
    };
    xhr.open("POST", "/api/account/player-photos/upload");
    xhr.send(formData);
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/20">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-950 dark:text-white">Profile gallery</p>
          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-white/40">This is how action photos appear on your public profile.</p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-500 dark:bg-white/10 dark:text-white/45">{photoUrls.length}/{MAX_PLAYER_PHOTOS}</span>
      </div>
      <PlayerPhotoGallery photoUrls={photoUrls} canRemove />

      {photoUrls.length < MAX_PLAYER_PHOTOS ? (
        <div className="mt-4 space-y-2">
          {error ? (
            <p className="border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </p>
          ) : null}

          {busy ? (
            <div className="space-y-1.5">
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                <div className="h-full bg-red-500 transition-all duration-150" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-white/40">Uploading… {progress}%</p>
            </div>
          ) : null}

          <label className={`flex cursor-pointer items-center justify-center gap-2 h-10 w-full border px-4 text-sm font-black transition ${busy ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/25" : "border-red-300 bg-red-600 text-white hover:bg-red-700"}`}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={busy}
              onChange={handleFileChange}
              className="sr-only"
            />
            {busy ? "Uploading…" : "Add photo"}
          </label>
        </div>
      ) : (
        <p className="mt-4 text-sm font-semibold text-slate-500 dark:text-white/45">Maximum of 4 profile pictures reached.</p>
      )}
    </section>
  );
}

