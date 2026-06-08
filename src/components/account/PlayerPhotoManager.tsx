import PlayerPhotoGallery from "@/components/players/PlayerPhotoGallery";

const fileClass = "h-11 w-full rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-sm font-semibold text-white file:mr-3 file:rounded-md file:border-0 file:bg-red-600 file:px-3 file:py-1.5 file:text-xs file:font-black file:text-white focus:border-red-500 focus:outline-none";
const MAX_PLAYER_PHOTOS = 4;

export default function PlayerPhotoManager({ photoUrls }: { photoUrls: string[] }) {
  return (
    <section className="rounded-lg border border-white/10 bg-[#1a1a1a] p-6">
      <p className="text-sm font-black uppercase text-red-500">Pictures</p>
      <PlayerPhotoGallery photoUrls={photoUrls} canRemove />

      {photoUrls.length < MAX_PLAYER_PHOTOS ? (
        <form action="/api/account/player-photos/upload" method="post" encType="multipart/form-data" className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input name="photo" type="file" accept="image/png,image/jpeg,image/webp,image/gif" required className={fileClass} />
          <button className="h-11 rounded-lg bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700">
            Upload picture
          </button>
        </form>
      ) : (
        <p className="mt-4 text-sm font-semibold text-white/45">Maximum of 4 profile pictures reached.</p>
      )}
    </section>
  );
}
