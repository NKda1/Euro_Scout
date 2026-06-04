import { removePlayerPhotoAction, uploadPlayerPhotoAction } from "@/app/actions/media";

const fileClass = "h-11 w-full rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-sm font-semibold text-white file:mr-3 file:rounded-md file:border-0 file:bg-red-600 file:px-3 file:py-1.5 file:text-xs file:font-black file:text-white focus:border-red-500 focus:outline-none";

export default function PlayerPhotoManager({ photoUrls }: { photoUrls: string[] }) {
  return (
    <section className="rounded-lg border border-white/10 bg-[#1a1a1a] p-6">
      <p className="text-sm font-black uppercase text-red-500">Pictures</p>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[0, 1, 2, 3, 4].map((slot) => {
          const photo = photoUrls[slot];

          return (
            <div key={photo ?? slot} className="relative flex aspect-[4/5] items-end overflow-hidden rounded-lg border border-dashed border-white/15 bg-[#111] bg-cover bg-center p-3 text-xs font-black uppercase text-white/35" style={photo ? { backgroundImage: `linear-gradient(180deg, transparent, rgba(0,0,0,.78)), url(${photo})` } : undefined}>
              {photo ? (
                <form action={removePlayerPhotoAction} className="absolute right-2 top-2">
                  <input type="hidden" name="photo_url" value={photo} />
                  <button className="flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-xs text-white transition hover:bg-red-600" title="Remove picture">
                    x
                  </button>
                </form>
              ) : (
                `Photo ${slot + 1}`
              )}
            </div>
          );
        })}
      </div>

      {photoUrls.length < 5 ? (
        <form action={uploadPlayerPhotoAction} className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input name="photo" type="file" accept="image/png,image/jpeg,image/webp,image/gif" required className={fileClass} />
          <button className="h-11 rounded-lg bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700">
            Upload picture
          </button>
        </form>
      ) : (
        <p className="mt-4 text-sm font-semibold text-white/45">Maximum of 5 profile pictures reached.</p>
      )}
    </section>
  );
}
