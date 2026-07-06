import type { Profile, UserRole } from "@/lib/auth";

export type AccountTier = "free" | "premium";

export type PremiumFeatureKey =
  | "unlimited_messaging"
  | "advanced_analytics"
  | "premium_profile_signal"
  | "expanded_watchlists"
  | "watchlist_export"
  | "club_direct_messaging_control"
  | "club_call_negotiation_tools"
  | "journalist_content_analytics"
  | "journalist_thumbnail_posts";

export interface PremiumFeatureDefinition {
  key: PremiumFeatureKey;
  label: string;
  standard: string;
  premium: string;
  roles: Exclude<UserRole, "admin">[];
}

export const PREMIUM_FEATURES: PremiumFeatureDefinition[] = [
  {
    key: "unlimited_messaging",
    label: "Messaging",
    standard: "5 new conversations every 7 days, with 3 replies included per new thread.",
    premium: "Unlimited conversation starts and replies.",
    roles: ["player", "club", "journalist", "fan"]
  },
  {
    key: "advanced_analytics",
    label: "Profile analytics",
    standard: "Basic profile view totals and activity prompts.",
    premium: "Detailed profile views, trends, film views, saves and response signals.",
    roles: ["player", "club"]
  },
  {
    key: "premium_profile_signal",
    label: "Premium profile signal",
    standard: "Normal public profile listing.",
    premium: "Premium star and higher-trust visual signals on public profile surfaces.",
    roles: ["player", "club"]
  },
  {
    key: "expanded_watchlists",
    label: "Recruitment watchlists",
    standard: "Default recruitment shortlist.",
    premium: "Expanded watchlists, richer comparison tools and saved recruiting boards.",
    roles: ["club"]
  },
  {
    key: "watchlist_export",
    label: "Watchlist export",
    standard: "View watchlists inside EuroScout.",
    premium: "Export watchlists and recruiting reports for internal club review.",
    roles: ["club"]
  },
  {
    key: "club_direct_messaging_control",
    label: "Messaging control",
    standard: "Direct messaging remains open when a club accepts player outreach.",
    premium: "Club owners can turn direct messages on or off while keeping Express interest live.",
    roles: ["club"]
  },
  {
    key: "club_call_negotiation_tools",
    label: "Video call negotiation",
    standard: "Players can request calls and receive accepted meeting updates.",
    premium: "Advanced call scheduling, counter-proposals and negotiation-room controls.",
    roles: ["club"]
  },
  {
    key: "journalist_content_analytics",
    label: "Article analytics",
    standard: "Publish article links on the EuroScout news surface.",
    premium: "Track article opens, recent engagement and source performance.",
    roles: ["journalist"]
  },
  {
    key: "journalist_thumbnail_posts",
    label: "Article presentation",
    standard: "Share article links with basic metadata.",
    premium: "Add thumbnails and richer cards for published links.",
    roles: ["journalist"]
  }
];

export function isPremiumActive(profile: Pick<Profile, "role" | "account_tier" | "premium_expires_at">) {
  if (profile.role === "admin") return true;
  if (profile.account_tier !== "premium") return false;
  if (!profile.premium_expires_at) return true;

  return new Date(profile.premium_expires_at).getTime() > Date.now();
}

export function accountTierLabel(profile: Pick<Profile, "role" | "account_tier" | "premium_expires_at">) {
  if (profile.role === "admin") return "Admin";
  return isPremiumActive(profile) ? "Premium" : "Standard";
}

export function rolePremiumFeatures(role: UserRole) {
  if (role === "admin") return PREMIUM_FEATURES;
  return PREMIUM_FEATURES.filter((feature) => feature.roles.includes(role));
}

export function hasPremiumFeature(profile: Pick<Profile, "role" | "account_tier" | "premium_expires_at">, feature: PremiumFeatureKey) {
  if (!isPremiumActive(profile)) return false;
  if (profile.role === "admin") return true;
  return rolePremiumFeatures(profile.role).some((item) => item.key === feature);
}

export function premiumExpiryLabel(profile: Pick<Profile, "premium_expires_at">) {
  if (!profile.premium_expires_at) return "Active until cancelled";

  return `Active until ${new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(profile.premium_expires_at))}`;
}
