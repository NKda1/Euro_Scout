"use client";

import Link from "next/link";
import { Check, CreditCard, Sparkles } from "lucide-react";
import { BILLING_PLANS, type BillingPlanKey } from "@/lib/billing-plans";

interface AccountManagementProps {
  isPremium: boolean;
  billingPlan: BillingPlanKey;
  accountTier: string;
  premiumExpiryText?: string;
}

export default function AccountManagement({ isPremium, billingPlan, accountTier, premiumExpiryText }: AccountManagementProps) {
  const planLabel = BILLING_PLANS[billingPlan].label;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-black text-slate-950 dark:text-white">{isPremium ? "Premium Account" : "Standard Account"}</h3>
            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-black uppercase text-slate-500 dark:border-white/10 dark:bg-black/20 dark:text-white/45">
              {accountTier}
            </span>
            {isPremium && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
                ACTIVE
              </span>
            )}
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-white/45">
            {isPremium
              ? premiumExpiryText || "Unlimited features and priority support"
              : "Core marketplace access with weekly message limits"}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
        {isPremium ? (
            <Link
              href="/api/billing/portal"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-black text-white transition hover:bg-red-700"
            >
              <CreditCard className="h-4 w-4" />
              Manage Subscription
            </Link>
        ) : (
            <Link
              href={`/api/billing/checkout?plan=${billingPlan}`}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-black text-white transition hover:bg-red-700"
            >
              <Sparkles className="h-4 w-4" />
              Upgrade to {planLabel}
            </Link>
        )}
        </div>
      </div>

      {!isPremium && (
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-200 pt-4 dark:border-white/10">
          {["Unlimited messages", "Advanced analytics", "Premium profile badge"].map((feature) => (
            <span key={feature} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-white/50">
              <Check className="h-3.5 w-3.5 text-red-600" aria-hidden />
              {feature}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
