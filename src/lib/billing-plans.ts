import type { UserRole } from "@/lib/auth";

export type BillingPlanKey = "player_premium" | "club_premium" | "journalist_premium";
export const SHARED_PREMIUM_PRICE_ENV = "STRIPE_PREMIUM_PRICE_ID";

export const BILLING_PLANS: Record<BillingPlanKey, { label: string; role: Exclude<UserRole, "admin" | "fan">; priceEnv: string }> = {
  player_premium: {
    label: "Player Premium",
    role: "player",
    priceEnv: "STRIPE_PLAYER_PREMIUM_PRICE_ID"
  },
  club_premium: {
    label: "Club Premium",
    role: "club",
    priceEnv: "STRIPE_CLUB_PREMIUM_PRICE_ID"
  },
  journalist_premium: {
    label: "Journalist Premium",
    role: "journalist",
    priceEnv: "STRIPE_JOURNALIST_PREMIUM_PRICE_ID"
  }
};

export function planForRole(role: UserRole): BillingPlanKey | null {
  if (role === "player") return "player_premium";
  if (role === "club") return "club_premium";
  if (role === "journalist") return "journalist_premium";
  return null;
}
