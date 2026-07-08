"use server";

import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { isPremiumActive } from "@/lib/premium";
import type { Profile } from "@/lib/auth";

const FREE_ADVANCED_TEAM_SEARCH_LIMIT = 3;
const TEAM_SEARCH_TOKEN_WINDOW_DAYS = 7;

type ServiceClient = ReturnType<typeof createSupabaseServiceRoleClient>;

export interface TeamSearchTokenState {
  isAuthenticated: boolean;
  isPremium: boolean;
  weeklyLimit: number;
  tokensRemaining: number | null;
  windowEndsAt: string | null;
}

interface TeamSearchTokenWallet {
  profile_id: string;
  weekly_limit: number;
  tokens_remaining: number;
  window_started_at: string;
  window_ends_at: string;
}

function teamSearchWindowEnd(from = new Date()) {
  return new Date(from.getTime() + TEAM_SEARCH_TOKEN_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

async function getOptionalProfile() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const serviceClient = createSupabaseServiceRoleClient();
  const { data: profile } = await serviceClient.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>();
  return profile;
}

async function getOrCreateTeamSearchWallet(serviceClient: ServiceClient, profileId: string) {
  const { data: existingWallet, error: readError } = await serviceClient
    .from("team_search_token_wallets")
    .select("profile_id, weekly_limit, tokens_remaining, window_started_at, window_ends_at")
    .eq("profile_id", profileId)
    .maybeSingle<TeamSearchTokenWallet>();

  if (readError) return { wallet: null, error: readError.message };
  if (existingWallet) return { wallet: existingWallet, error: null };

  const now = new Date();
  const { data: newWallet, error: createError } = await serviceClient
    .from("team_search_token_wallets")
    .insert({
      profile_id: profileId,
      weekly_limit: FREE_ADVANCED_TEAM_SEARCH_LIMIT,
      tokens_remaining: FREE_ADVANCED_TEAM_SEARCH_LIMIT,
      window_started_at: now.toISOString(),
      window_ends_at: teamSearchWindowEnd(now)
    })
    .select("profile_id, weekly_limit, tokens_remaining, window_started_at, window_ends_at")
    .single<TeamSearchTokenWallet>();

  return { wallet: newWallet ?? null, error: createError?.message ?? null };
}

function tokenLimitError(windowEndsAt: string) {
  const refreshDate = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(windowEndsAt));

  return `You have used your free advanced team searches. Upgrade to premium for unlimited advanced search, or wait until ${refreshDate}.`;
}

export async function getTeamSearchTokenState(): Promise<TeamSearchTokenState> {
  const profile = await getOptionalProfile();
  if (!profile) {
    return {
      isAuthenticated: false,
      isPremium: false,
      weeklyLimit: FREE_ADVANCED_TEAM_SEARCH_LIMIT,
      tokensRemaining: null,
      windowEndsAt: null
    };
  }

  const isPremium = isPremiumActive(profile);
  if (isPremium) {
    return {
      isAuthenticated: true,
      isPremium: true,
      weeklyLimit: FREE_ADVANCED_TEAM_SEARCH_LIMIT,
      tokensRemaining: null,
      windowEndsAt: null
    };
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const { wallet } = await getOrCreateTeamSearchWallet(serviceClient, profile.id);
  const now = new Date();
  const windowExpired = wallet ? new Date(wallet.window_ends_at).getTime() <= now.getTime() : false;

  return {
    isAuthenticated: true,
    isPremium: false,
    weeklyLimit: wallet?.weekly_limit ?? FREE_ADVANCED_TEAM_SEARCH_LIMIT,
    tokensRemaining: windowExpired ? wallet?.weekly_limit ?? FREE_ADVANCED_TEAM_SEARCH_LIMIT : wallet?.tokens_remaining ?? FREE_ADVANCED_TEAM_SEARCH_LIMIT,
    windowEndsAt: windowExpired ? teamSearchWindowEnd(now) : wallet?.window_ends_at ?? null
  };
}

export async function spendAdvancedTeamSearchTokenAction(metadata: Record<string, string | number | boolean | null> = {}) {
  const profile = await getOptionalProfile();
  if (!profile) {
    return {
      ok: false,
      error: "Sign in to use advanced team search filters.",
      state: await getTeamSearchTokenState()
    };
  }

  const serviceClient = createSupabaseServiceRoleClient();

  if (isPremiumActive(profile)) {
    await serviceClient.from("team_search_token_events").insert({
      profile_id: profile.id,
      event_type: "premium_bypass",
      metadata: { ...metadata, account_tier: profile.account_tier }
    });

    return {
      ok: true,
      error: null,
      state: await getTeamSearchTokenState()
    };
  }

  const { wallet: initialWallet, error } = await getOrCreateTeamSearchWallet(serviceClient, profile.id);
  if (error) {
    return {
      ok: false,
      error,
      state: await getTeamSearchTokenState()
    };
  }
  if (!initialWallet) {
    return {
      ok: false,
      error: "Could not open your advanced search wallet.",
      state: await getTeamSearchTokenState()
    };
  }

  let wallet = initialWallet;
  const now = new Date();

  if (new Date(wallet.window_ends_at).getTime() <= now.getTime()) {
    const { data: refreshed, error: refreshError } = await serviceClient
      .from("team_search_token_wallets")
      .update({
        tokens_remaining: wallet.weekly_limit,
        window_started_at: now.toISOString(),
        window_ends_at: teamSearchWindowEnd(now),
        updated_at: now.toISOString()
      })
      .eq("profile_id", profile.id)
      .select("profile_id, weekly_limit, tokens_remaining, window_started_at, window_ends_at")
      .single<TeamSearchTokenWallet>();

    if (refreshError || !refreshed) {
      return {
        ok: false,
        error: refreshError?.message ?? "Could not refresh your advanced search tokens.",
        state: await getTeamSearchTokenState()
      };
    }

    await serviceClient.from("team_search_token_events").insert({
      profile_id: profile.id,
      event_type: "weekly_refresh",
      tokens_before: wallet.tokens_remaining,
      tokens_after: refreshed.tokens_remaining
    });

    wallet = refreshed;
  }

  if (wallet.tokens_remaining <= 0) {
    return {
      ok: false,
      error: tokenLimitError(wallet.window_ends_at),
      state: await getTeamSearchTokenState()
    };
  }

  const tokensBefore = wallet.tokens_remaining;
  const tokensAfter = tokensBefore - 1;
  const { error: spendError } = await serviceClient
    .from("team_search_token_wallets")
    .update({
      tokens_remaining: tokensAfter,
      updated_at: now.toISOString()
    })
    .eq("profile_id", profile.id);

  if (spendError) {
    return {
      ok: false,
      error: spendError.message,
      state: await getTeamSearchTokenState()
    };
  }

  await serviceClient.from("team_search_token_events").insert({
    profile_id: profile.id,
    event_type: "advanced_search",
    tokens_before: tokensBefore,
    tokens_after: tokensAfter,
    metadata
  });

  return {
    ok: true,
    error: null,
    state: {
      isAuthenticated: true,
      isPremium: false,
      weeklyLimit: wallet.weekly_limit,
      tokensRemaining: tokensAfter,
      windowEndsAt: wallet.window_ends_at
    } satisfies TeamSearchTokenState
  };
}
