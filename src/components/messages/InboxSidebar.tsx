"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, MessageSquare, Video } from "lucide-react";
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

export interface SidebarCallItem {
  id: string;
  status: string;
  reason: string | null;
  preferredAt: string | null;
  scheduledAt: string | null;
  conversationId: string | null;
  counterpartName: string;
  counterpartAvatar: string | null;
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

interface MeetingChangePayload {
  id?: string;
}

interface InboxSidebarProps {
  initialItems: SidebarItem[];
  profiles: SidebarProfile[];
  currentProfileId: string;
  allConversationIds: string[];
  tokenInfo: TokenInfo;
  initialCallItems?: SidebarCallItem[];
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

function formatCallTime(value: string | null) {
  if (!value) return "Time not set";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
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

function CallStatusBadge({ status }: { status: string }) {
  const isAccepted = status === "accepted";
  const isClubProposed = status === "club_proposed";
  const label = isClubProposed ? "awaiting you" : status.replace(/_/g, " ");
  const cls = isAccepted
    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200"
    : isClubProposed
      ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-200"
      : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200";
  return (
    <span className={`rounded border px-1.5 py-px text-[9px] font-black uppercase ${cls}`}>
      {label}
    </span>
  );
}

export default function InboxSidebar({
  initialItems,
  profiles,
  currentProfileId,
  allConversationIds,
  tokenInfo,
  initialCallItems = [],
}: InboxSidebarProps) {
  const pathname = usePathname();
  const [items, setItems] = useState<SidebarItem[]>(initialItems);
  const [callItems, setCallItems] = useState<SidebarCallItem[]>(initialCallItems);
  const [callsOpen, setCallsOpen] = useState(initialCallItems.length > 0);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const profilesById = useMemo(
    () => new Map(profiles.map((p) => [p.id, p])),
    [profiles]
  );

  const activeConversationIdRef = useRef<string | null>(null);
  const isConversationOpen = pathname !== "/messages" && pathname.startsWith("/messages/");
  const activeConversationId = isConversationOpen
    ? pathname.split("/messages/")[1]?.split("/")[0] ?? null
    : null;
  activeConversationIdRef.current = activeConversationId;

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    setCallItems(initialCallItems);
    if (initialCallItems.length > 0) setCallsOpen(true);
  }, [initialCallItems]);

  // Realtime: messages + read-state
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
              const isActiveThread =
                currentActive !== null && item.conversationIds.includes(currentActive);
              const isOwnMessage = msg.sender_profile_id === currentProfileId;
              return {
                ...item,
                latestBody: msg.body,
                latestSenderName: sender?.display_name ?? "Member",
                latestAt: msg.created_at,
                unreadCount:
                  isActiveThread || isOwnMessage ? item.unreadCount : item.unreadCount + 1,
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

  // Realtime: meeting_requests status changes
  useEffect(() => {
    const channel = supabase
      .channel("inbox-calls-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meeting_requests" },
        async (payload) => {
          const id =
            (payload.new as MeetingChangePayload)?.id ??
            (payload.old as MeetingChangePayload)?.id;
          if (!id) return;

          const newStatus = (payload.new as { status?: string })?.status;

          // Remove if status is now closed
          if (["declined", "cancelled", "completed"].includes(newStatus ?? "")) {
            setCallItems((prev) => prev.filter((c) => c.id !== id));
            return;
          }

          // Fetch the updated row
          const { data } = await supabase
            .from("meeting_requests")
            .select(
              `id, status, request_reason, proposed_start_at, scheduled_at, conversation_id,
               teams:meeting_requests_team_id_fkey(id, name, logo_url),
               profiles:meeting_requests_player_profile_id_fkey(id, display_name, avatar_url)`
            )
            .eq("id", id)
            .in("status", ["pending", "club_proposed", "accepted"])
            .maybeSingle<{
              id: string;
              status: string;
              request_reason: string | null;
              proposed_start_at: string | null;
              scheduled_at: string | null;
              conversation_id: string | null;
              teams: { id: string; name: string; logo_url: string | null } | null;
              profiles: { id: string; display_name: string; avatar_url: string | null } | null;
            }>();

          if (!data) return;

          const newItem: SidebarCallItem = {
            id: data.id,
            status: data.status,
            reason: data.request_reason,
            preferredAt: data.proposed_start_at,
            scheduledAt: data.scheduled_at,
            conversationId: data.conversation_id,
            // We can't determine role here; use what's available
            counterpartName: data.profiles?.display_name ?? data.teams?.name ?? "Member",
            counterpartAvatar: data.profiles?.avatar_url ?? data.teams?.logo_url ?? null,
          };

          setCallItems((prev) => {
            const exists = prev.find((c) => c.id === id);
            const next = exists
              ? prev.map((c) => (c.id === id ? newItem : c))
              : [newItem, ...prev];
            return next;
          });
          setCallsOpen(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const totalUnread = items.reduce((sum, item) => sum + item.unreadCount, 0);
  const pendingCallCount = callItems.filter(
    (c) => c.status === "pending" || c.status === "club_proposed"
  ).length;

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

      {/* Scrollable body: conversations + calls */}
      <div className="flex flex-1 flex-col overflow-hidden">
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

        {/* Collapsible Calls Panel */}
        <div className="shrink-0 border-t border-slate-200 dark:border-white/10">
          <button
            type="button"
            onClick={() => setCallsOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 px-4 py-2.5 transition hover:bg-slate-50 dark:hover:bg-white/[0.03]"
          >
            <div className="flex items-center gap-2">
              <Video className="h-3.5 w-3.5 text-red-500" />
              <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-white/40">
                Call Bookings
              </span>
              {pendingCallCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-black text-white">
                  {pendingCallCount}
                </span>
              )}
            </div>
            <ChevronDown
              className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 dark:text-white/30 ${
                callsOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {callsOpen && (
            <div className="max-h-64 overflow-y-auto border-t border-slate-100 dark:border-white/[0.06]">
              {callItems.length === 0 ? (
                <div className="px-4 py-4 text-center">
                  <p className="text-xs font-semibold text-slate-400 dark:text-white/25">
                    No active call bookings.
                  </p>
                </div>
              ) : (
                callItems.map((call) => {
                  const displayTime = call.scheduledAt ?? call.preferredAt;
                  const isImminent =
                    call.status === "accepted" &&
                    displayTime &&
                    new Date(displayTime).getTime() - Date.now() < 30 * 60_000;
                  const href = call.conversationId
                    ? `/messages/${call.conversationId}`
                    : "/account";

                  return (
                    <Link
                      key={call.id}
                      href={href}
                      className={`block border-b border-slate-100 px-3 py-2.5 transition last:border-0 dark:border-white/[0.06] ${
                        isImminent
                          ? "bg-emerald-50 dark:bg-emerald-500/10"
                          : "hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 bg-cover bg-center text-[10px] font-black text-slate-500 dark:bg-white/10 dark:text-white/40"
                          style={
                            call.counterpartAvatar
                              ? {
                                  backgroundImage: `linear-gradient(180deg, transparent, rgba(0,0,0,.5)), url(${call.counterpartAvatar})`,
                                }
                              : undefined
                          }
                        >
                          {call.counterpartAvatar ? "" : call.counterpartName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-xs font-black text-slate-950 dark:text-white">
                              {call.counterpartName}
                            </p>
                            {isImminent && (
                              <span className="shrink-0 rounded border border-emerald-300 bg-emerald-100 px-1 py-px text-[9px] font-black uppercase text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                                Now
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <CallStatusBadge status={call.status} />
                            {displayTime && (
                              <span className="truncate text-[10px] font-semibold text-slate-400 dark:text-white/30">
                                {formatCallTime(displayTime)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
