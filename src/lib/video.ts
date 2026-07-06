export type VideoProvider = "youtube" | "vimeo" | "hudl" | "external";

export function normalizeVideoUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

export function detectVideoProvider(url: string): VideoProvider {
  const normalized = normalizeVideoUrl(url).toLowerCase();

  if (normalized.includes("youtube.com") || normalized.includes("youtube-nocookie.com") || normalized.includes("youtu.be")) return "youtube";
  if (normalized.includes("vimeo.com")) return "vimeo";
  if (normalized.includes("hudl.com") || normalized.includes("hudl")) return "hudl";

  return "external";
}

export function getVideoProviderLabel(provider: VideoProvider) {
  const labels: Record<VideoProvider, string> = {
    youtube: "YouTube",
    vimeo: "Vimeo",
    hudl: "Hudl",
    external: "Film Link"
  };

  return labels[provider];
}

export function getEmbeddableVideoUrl(url: string) {
  const normalized = normalizeVideoUrl(url);

  const youtube = normalized.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{11})/);
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;

  const vimeo = normalized.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;

  return null;
}

export function getPreviewEmbedUrl(url: string) {
  const normalized = normalizeVideoUrl(url);

  const youtube = normalized.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{11})/);
  if (youtube) {
    const videoId = youtube[1];
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1&controls=0&rel=0&modestbranding=1&loop=1&playlist=${videoId}`;
  }

  const vimeo = normalized.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1&muted=1&background=1&playsinline=1`;

  return null;
}

export function getVideoThumbnailUrl(url: string) {
  const normalized = normalizeVideoUrl(url);
  const youtube = normalized.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{11})/);

  if (youtube) return `https://img.youtube.com/vi/${youtube[1]}/hqdefault.jpg`;

  return null;
}
