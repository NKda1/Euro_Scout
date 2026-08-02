"use client";

import { CheckCircle2, ImagePlus, LoaderCircle, Replace, Trash2, UploadCloud, Video } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { ClubMediaRow } from "@/components/scouts/ClubMediaSection";

const MAX_PHOTOS = 4;

function hostname(value: string) {
  try { return new URL(value).hostname; } catch { return "Existing club video"; }
}

function uploadPhoto(formData: FormData, onProgress: (value: number) => void) {
  return new Promise<ClubMediaRow>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/api/account/club-media");
    request.responseType = "json";
    request.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100)); };
    request.onload = () => request.status >= 200 && request.status < 300 && request.response?.media ? resolve(request.response.media as ClubMediaRow) : reject(new Error(request.response?.error ?? "Upload failed."));
    request.onerror = () => reject(new Error("Network unavailable. Reconnect and try the upload again."));
    request.send(formData);
  });
}

export default function ClubMediaManager({ teamId, initialMedia }: { teamId: string; initialMedia: ClubMediaRow[] }) {
  const [items, setItems] = useState(initialMedia);
  const [progress, setProgress] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingVideo, setEditingVideo] = useState(false);
  const fileInputs = useRef<Array<HTMLInputElement | null>>([]);
  const video = items.find((item) => item.media_type === "video") ?? null;
  const photosBySlot = useMemo(() => {
    const slots = new Map<number, ClubMediaRow>();
    items
      .filter((item) => item.media_type === "photo")
      .sort((a, b) => a.display_order - b.display_order)
      .forEach((photo) => { if (!slots.has(photo.display_order)) slots.set(photo.display_order, photo); });
    return slots;
  }, [items]);

  function photoAt(slot: number) { return photosBySlot.get(slot) ?? null; }
  function updateItem(media: ClubMediaRow) { setItems((current) => current.some((item) => item.id === media.id) ? current.map((item) => item.id === media.id ? media : item) : [...current, media]); }

  async function handlePhoto(file: File | undefined, slot: number, existing: ClubMediaRow | null) {
    if (!file || busy) return;
    if (file.size > 7 * 1024 * 1024) { setError("Club images must be 7 MB or smaller."); return; }
    setError(""); setSuccess(""); setBusy(`photo-${slot}`); setProgress((current) => ({ ...current, [slot]: 1 }));
    const body = new FormData(); body.set("kind", "photo"); body.set("team_id", teamId); body.set("display_order", String(slot)); body.set("file", file); if (existing) body.set("media_id", existing.id);
    try {
      const media = await uploadPhoto(body, (value) => setProgress((current) => ({ ...current, [slot]: value })));
      updateItem(media); setSuccess(existing ? `Photo ${slot + 1} replaced.` : `Photo ${slot + 1} uploaded.`);
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "Upload failed."); }
    finally { setBusy(null); setProgress((current) => ({ ...current, [slot]: 0 })); if (fileInputs.current[slot]) fileInputs.current[slot]!.value = ""; }
  }

  async function remove(media: ClubMediaRow) {
    if (busy) return;
    setBusy(media.id); setError(""); setSuccess("");
    const response = await fetch("/api/account/club-media", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teamId, mediaId: media.id }) }).catch(() => null);
    const result = response ? await response.json().catch(() => null) : null;
    if (!response?.ok) setError(result?.error ?? "Network unavailable. The item was not removed.");
    else { setItems((current) => current.filter((item) => item.id !== media.id)); setSuccess("Club media removed."); }
    setBusy(null);
  }

  async function saveVideo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const formData = new FormData(event.currentTarget);
    setBusy("video"); setError(""); setSuccess(""); formData.set("kind", "video"); formData.set("team_id", teamId); if (video) formData.set("media_id", video.id);
    const response = await fetch("/api/account/club-media", { method: "POST", body: formData }).catch(() => null);
    const result = response ? await response.json().catch(() => null) : null;
    if (!response?.ok || !result?.media) setError(result?.error ?? "The video could not be saved.");
    else { updateItem(result.media as ClubMediaRow); setEditingVideo(false); setSuccess(video ? "Club video replaced." : "Club video added."); }
    setBusy(null);
  }

  return (
    <div className="space-y-4">
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200" role="alert">{error}</p> : null}
      {success ? <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200" role="status"><CheckCircle2 className="h-4 w-4" aria-hidden />{success}</p> : null}

      <section className="rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-black/20">
        <div className="flex items-center gap-3">
          <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-black/30">
            <Video className="h-6 w-6 text-slate-400" aria-hidden />
          </div>
          <div className="min-w-0 flex-1"><p className="text-sm font-black text-slate-950 dark:text-white">Club video</p><p className="truncate text-xs font-semibold text-slate-500 dark:text-white/40">{video?.label || (video ? hostname(video.url) : "No video uploaded")}</p></div>
          <button type="button" disabled={Boolean(busy)} onClick={() => setEditingVideo((value) => !value)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 px-3 text-xs font-black text-slate-700 hover:border-red-400 hover:text-red-700 disabled:opacity-50 dark:border-white/15 dark:text-white"><Replace className="h-3.5 w-3.5" />{video ? "Replace" : "Add"}</button>
          {video ? <button type="button" onClick={() => void remove(video)} disabled={Boolean(busy)} aria-label="Remove club video" className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-600 hover:text-white disabled:opacity-50"><Trash2 className="h-4 w-4" /></button> : null}
        </div>
        {editingVideo ? <form onSubmit={saveVideo} className="mt-3 grid gap-2 border-t border-slate-100 pt-3 dark:border-white/10 sm:grid-cols-[1fr_1fr_auto]"><input name="label" defaultValue={video?.label ?? ""} placeholder="Video label" className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold dark:border-white/15 dark:bg-black/30 dark:text-white" /><input name="url" type="url" required defaultValue={video?.url ?? ""} placeholder="YouTube, Vimeo or Hudl URL" className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold dark:border-white/15 dark:bg-black/30 dark:text-white" /><button disabled={Boolean(busy)} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-xs font-black text-white disabled:opacity-60">{busy === "video" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Save</button></form> : null}
      </section>

      <div className="grid gap-2 sm:grid-cols-2">
        {Array.from({ length: MAX_PHOTOS }).map((_, slot) => {
          const photo = photoAt(slot); const uploading = busy === `photo-${slot}`; const percent = progress[slot] ?? 0;
          return <div key={slot} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void handlePhoto(event.dataTransfer.files[0], slot, photo); }} className="flex min-w-0 items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 dark:border-white/15 dark:bg-black/20">
            <div className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white dark:bg-white/5">
              {photo ? (
                // Club media URLs can use customer-controlled storage origins.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.url} alt={`Club photo ${slot + 1}`} className="h-full w-full object-cover" />
              ) : <ImagePlus className="h-5 w-5 text-slate-400" />}
            </div>
            <div className="min-w-0 flex-1"><p className="text-xs font-black text-slate-900 dark:text-white">Photo {slot + 1}</p><p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500 dark:text-white/40">{photo?.original_filename || (photo ? "Existing club photo" : "Drop image or choose file")}</p>{uploading ? <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"><div className="h-full bg-red-600 transition-all" style={{ width: `${percent}%` }} /></div> : null}</div>
            <input ref={(node) => { fileInputs.current[slot] = node; }} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={(event) => void handlePhoto(event.target.files?.[0], slot, photo)} />
            <button type="button" disabled={Boolean(busy)} onClick={() => fileInputs.current[slot]?.click()} aria-label={`${photo ? "Replace" : "Upload"} photo ${slot + 1}`} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:border-red-400 hover:text-red-700 disabled:opacity-50 dark:border-white/15 dark:text-white">{uploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}</button>
            {photo ? <button type="button" disabled={Boolean(busy)} onClick={() => void remove(photo)} aria-label={`Remove photo ${slot + 1}`} className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-600 hover:text-white disabled:opacity-50"><Trash2 className="h-4 w-4" /></button> : null}
          </div>;
        })}
      </div>
      <p className="text-xs font-semibold text-slate-500 dark:text-white/35">Images: JPG, PNG, WebP or GIF up to 7 MB. Changes appear immediately without reloading the page.</p>
    </div>
  );
}
