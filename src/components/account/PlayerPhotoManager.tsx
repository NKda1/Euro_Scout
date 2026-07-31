import PlayerPhotoGallery from "@/components/players/PlayerPhotoGallery";
import MediaFileInput from "@/components/account/MediaFileInput";

const MAX_PLAYER_PHOTOS = 4;

export default function PlayerPhotoManager({ photoUrls }: { photoUrls: string[] }) {
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
        <form action="/api/account/player-photos/upload" method="post" encType="multipart/form-data" className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <MediaFileInput name="photo" label="Gallery photo" shape="landscape" />
          <button className="h-10 rounded-lg bg-red-600 px-4 text-sm font-black text-white transition hover:bg-red-700">
            Add photo
          </button>
        </form>
      ) : (
        <p className="mt-4 text-sm font-semibold text-slate-500 dark:text-white/45">Maximum of 4 profile pictures reached.</p>
      )}
    </section>
  );
}
