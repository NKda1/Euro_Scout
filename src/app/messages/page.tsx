import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";

export const metadata: Metadata = {
  title: "Messages | EuroScout Pro",
  description: "EuroScout Pro conversations."
};

interface MessagesPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  const { error } = await searchParams;

  return (
    <div className="hidden h-full flex-1 flex-col items-center justify-center bg-slate-50/60 dark:bg-black/10 lg:flex">
      {error ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      ) : null}
      <MessageSquare className="h-10 w-10 text-slate-300 dark:text-white/15" />
      <p className="mt-4 text-sm font-black text-slate-500 dark:text-white/35">Select a conversation</p>
      <p className="mt-1 text-xs font-semibold text-slate-400 dark:text-white/25">
        Choose from the list on the left to start reading.
      </p>
    </div>
  );
}
import { countUnreadMessages, getDisplayProfile, profileInitials, type MessageRow } from "@/lib/messaging";
