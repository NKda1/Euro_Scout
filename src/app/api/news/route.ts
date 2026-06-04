import { type NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export interface NewsArticle {
  title: string;
  url: string;
  date: string;
  source: "AFLE" | "EFA";
  sourceUrl: string;
  image?: string;
}

type WPPost = {
  id: number;
  title: { rendered: string };
  link: string;
  date: string;
  featured_media: number;
};

type WPMedia = { id: number; source_url: string };

async function fetchWPNews(
  base: string,
  source: "AFLE" | "EFA",
  sourceUrl: string,
  limit = 10
): Promise<NewsArticle[]> {
  // Step 1: fetch posts
  const postsRes = await fetch(
    `${base}/wp-json/wp/v2/posts?per_page=${limit}&_fields=id,title,link,date,featured_media`,
    { next: { revalidate: 3600 }, headers: { "User-Agent": "EuroScout/1.0" }, signal: AbortSignal.timeout(8000) }
  );
  if (!postsRes.ok) return [];
  const posts = (await postsRes.json()) as WPPost[];

  // Step 2: batch fetch media for posts that have a featured image
  const mediaIds = posts.map((p) => p.featured_media).filter((id) => id > 0);
  const mediaMap: Record<number, string> = {};
  if (mediaIds.length > 0) {
    try {
      const mediaRes = await fetch(
        `${base}/wp-json/wp/v2/media?include=${mediaIds.join(",")}&_fields=id,source_url`,
        { next: { revalidate: 3600 }, headers: { "User-Agent": "EuroScout/1.0" }, signal: AbortSignal.timeout(8000) }
      );
      if (mediaRes.ok) {
        const media = (await mediaRes.json()) as WPMedia[];
        for (const m of media) mediaMap[m.id] = m.source_url;
      }
    } catch {
      // images optional — continue without them
    }
  }

  return posts.map((p) => ({
    title: p.title.rendered
      .replace(/&#8211;/g, "\u2013")
      .replace(/&#8217;/g, "\u2019")
      .replace(/&amp;/g, "&")
      .replace(/&nbsp;/g, " ")
      .trim(),
    url: p.link,
    date: p.date ? new Date(p.date).toLocaleDateString("en-GB") : "",
    source,
    sourceUrl,
    image: mediaMap[p.featured_media] ?? undefined
  }));
}

// ─── AFLE (via leaguepress.eu WordPress) ─────────────────────────────────────
async function fetchAFLENews(): Promise<NewsArticle[]> {
  try {
    return await fetchWPNews("https://leaguepress.eu", "AFLE", "https://leaguepress.eu", 10);
  } catch {
    return [];
  }
}

// ─── EFA (WordPress) ─────────────────────────────────────────────────────────
async function fetchEFANews(): Promise<NewsArticle[]> {
  try {
    return await fetchWPNews("https://efafootball.com", "EFA", "https://efafootball.com/news/", 10);
  } catch {
    return [];
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  // 20 requests per IP per minute — generous for a cached endpoint
  const ip = getClientIp(request);
  const { allowed, remaining, resetAt } = rateLimit(`news:${ip}`, 20, 60_000);

  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
          "X-RateLimit-Limit": "20",
          "X-RateLimit-Remaining": "0"
        }
      }
    );
  }

  const [afle, efa] = await Promise.all([fetchAFLENews(), fetchEFANews()]);

  // Interleave sources so the feed feels mixed
  const merged: NewsArticle[] = [];
  const maxLen = Math.max(afle.length, efa.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < afle.length) merged.push(afle[i]);
    if (i < efa.length) merged.push(efa[i]);
  }

  return NextResponse.json(merged.slice(0, 20), {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=300",
      "X-RateLimit-Limit": "20",
      "X-RateLimit-Remaining": String(remaining)
    }
  });
}
