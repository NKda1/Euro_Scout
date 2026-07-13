"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { profileInitials } from "@/lib/messaging";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export interface SidebarItem {
  conversationId: string;
  conversationIds: string[];
  subject: string;
  displayName: string;
  displayRoleLabel: string | null;
  displayAvatar: string | null;
  latestBody: string | null;
  latestSenderName: string | null;
  latestAt: string;
  unreadCount: number;
  isTeamInbox: boolean;
}

export interface SidebarProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

export interface TokenInfo {
  isPremium: boolean;
  tokensRemaining: number;
  tokenLimit: number;
  refreshLabel: string;
}

interface NewMessagePayload {
  id: string;
  conversation_id: string;
  sender_profile_id: string;
  body: string;
  created_at: string;
}

interface ReadStatePayload {
  profile_id: string;
  conversation_id: string;
  last_seen_at: string;
}

interface InboxSidebarProps {
  initialItems: SidebarItem[];
  profiles: SidebarProfile[];
  currentProfileId: string;
  allConversationIds: string[];
  tokenInfo: TokenInfo;
}

function formatSidebarTime(value: string) {
  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(date);
  }
  if (diffDays < 7) {
    return new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(date);
  }
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(date);
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-900 bg-cover bg-center text-xs font-black text-white dark:border-white/10"
      style={
        avatarUrl
          ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.05), rgba(0,0,0,.48)), url(${avatarUrl})` }
          : undefined
      }
    >
      {avatarUrl ? "" : profileInitials(name)}
    </div>
  );
}

export default function InboxSidebar({
  initialItems,
  profiles,
  currentProfileId,
  allConversationIds,
  tokenInfo,
}: InboxSidebarProps) {
  const pathname = usePathname();
  const [items, setItems] = useState<SidebarItem[]>(initialItems);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const profilesById = useMemo(
    () => new Map(profiles.map((p) => [p.id, p])),
    [profiles]
  );

  // Keep a ref of the active conversation ID to avoid stale closures in realtime handler
  const activeConversationIdRef = useRef<string | null>(null);
  const isConversationOpen = pathname !== "/messages" && pathname.startsWith("/messages/");
  const activeConversationId = isConversationOpen ? pathname.split("/messages/")[1]?.split("/")[0] ?? null : null;
  activeConversationIdRef.current = activeConversationId;

  // Sync when server re-renders (e.g. navigation between conversations triggers layout re-fetch)
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  // Realtime subscription
  useEffect(() => {
    const conversationIdSet = new Set(allConversationIds);

    const channel = supabase
      .channel("inbox-sidebar-rt")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as NewMessagePayload;
          if (!conversationIdSet.has(msg.conversation_id)) return;

          const sender = profilesById.get(msg.sender_profile_id);
          const currentActive = activeConversationIdRef.current;

          setItems((prev) => {
            const updated = prev.map((item) => {
              if (!item.conversationIds.includes(msg.conversation_id)) return item;

              const isActiveThread = currentActive !== null && item.conversationIds.includes(currentActive);
              const isOwnMessage = msg.sender_profile_id === currentProfileId;

              return {
                ...item,
                latestBody: msg.body,
                latestSenderName: sender?.display_name ?? "Member",
                latestAt: msg.created_at,
                unreadCount:
                  isActiveThread || isOwnMessage
                    ? item.unreadCount
                    : item.unreadCount + 1,
              };
            });

            return [...updated].sort(
              (a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime()
            );
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversation_participants",
          filter: `profile_id=eq.${currentProfileId}`,
        },
        (payload) => {
          const update = payload.new as ReadStatePayload;
          setItems((prev) =>
            prev.map((item) =>
              item.conversationIds.includes(update.conversation_id)
                ? { ...item, unreadCount: 0 }
                : item
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, allConversationIds, currentProfileId, profilesById]);

  const totalUnread = items.reduce((sum, item) => sum + item.unreadCount, 0);

  return (
    <aside
      className={`flex flex-col overflow-hidden border-r border-slate-200 bg-white dark:border-white/10 dark:bg-[#111] lg:w-80 lg:shrink-0 ${
        isConversationOpen ? "hidden lg:flex" : "flex w-full"
      }`}
    >
      {/* Sidebar header */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3.5 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <MessageSquare className="h-4 w-4 text-red-500" />
          <span className="text-sm font-black text-slate-950 dark:text-white">Inbox</span>
          {totalUnread > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-black text-white">
              {totalUnread}
            </span>
          )}
        </div>
        <div>
          {tokenInfo.isPremium ? (
            <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              Premium
            </span>
          ) : (
            <span className="text-[11px] font-bold text-slate-400 dark:text-white/30">
              {tokenInfo.tokensRemaining}/{tokenInfo.tokenLimit} starts
            </span>
          )}
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <MessageSquare className="mb-3 h-8 w-8 text-slate-200 dark:text-white/15" />
            <p className="text-sm font-black text-slate-500 dark:text-white/40">No conversations yet</p>
            <p className="mt-1 text-xs font-semibold text-slate-400 dark:text-white/25">
              Conversations appear when started.
            </p>
          </div>
        ) : (
          items.map((item) => {
            const isActive =
              activeConversationId !== null && item.conversationIds.includes(activeConversationId);

            return (
              <Link
                key={item.conversationId}
                href={`/messages/${item.conversationId}`}
                className={`block border-b border-slate-100 px-4 py-3 transition dark:border-white/5 ${
                  isActive
                    ? "bg-red-50 dark:bg-red-500/10"
                    : "hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Avatar name={item.displayName} avatarUrl={item.displayAvatar} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`truncate text-sm font-black ${
                          isActive
                            ? "text-red-700 dark:text-red-300"
                            : "text-slate-950 dark:text-white"
                        }`}
                      >
                        {item.displayName}
                      </p>
                      <span className="shrink-0 text-[10px] font-bold text-slate-400 dark:text-white/30">
                        {formatSidebarTime(item.latestAt)}
                      </span>
                    </div>

                    <div className="mt-0.5 flex items-center gap-1">
                      {item.displayRoleLabel && (
                        <span className="shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-px text-[9px] font-black uppercase text-slate-400 dark:border-white/10 dark:bg-transparent dark:text-white/25">
                          {item.displayRoleLabel}
                        </span>
                      )}
                      {item.isTeamInbox && (
                        <span className="shrink-0 rounded border border-blue-200 bg-blue-50 px-1.5 py-px text-[9px] font-black uppercase text-blue-600 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-300">
                          Club
                        </span>
                      )}
                    </div>

                    <p className="mt-1 truncate text-xs font-semibold text-slate-500 dark:text-white/35">
                      {item.latestBody
                        ? `${item.latestSenderName ?? "Member"}: ${item.latestBody}`
                        : item.subject}
                    </p>
                  </div>

                  <div className="mt-0.5 shrink-0">
                    {item.unreadCount > 0 ? (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-black text-white">
                        {item.unreadCount > 99 ? "99+" : item.unreadCount}
                      </span>
                    ) : (
                      <span className="mt-1.5 block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    )}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </aside>
  );
}
