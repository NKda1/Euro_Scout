import { redirect } from "next/navigation";

interface WatchlistDetailPageProps {
  params: Promise<{ watchlistId: string }>;
}

export default async function WatchlistDetailPage({ params }: WatchlistDetailPageProps) {
  const { watchlistId } = await params;
  redirect(`/watchlists?watchlist=${watchlistId}`);
}
