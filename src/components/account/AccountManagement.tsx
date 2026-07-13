"use client";

import Link from "next/link";
import { CreditCard, Sparkles, ShieldCheck } from "lucide-react";
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
    <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-sm dark:border-white/10 dark:from-[#1a1a1a] dark:to-[#111]">
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${isPremium ? "bg-gradient-to-br from-amber-400 to-amber-600" : "bg-gradient-to-br from-slate-300 to-slate-500"}`}>
          {isPremium ? (
            <Sparkles className="h-6 w-6 text-white" />
          ) : (
            <ShieldCheck className="h-6 w-6 text-white" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-black text-slate-950 dark:text-white">{isPremium ? "Premium Account" : "Standard Account"}</h3>
            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-black uppercase text-slate-500 dark:border-white/10 dark:bg-black/20 dark:text-white/45">
              {accountTier}
            </span>
            {isPremium && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
                ACTIVE
              </span>
            )}
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-white/50">
            {isPremium
              ? premiumExpiryText || "Unlimited features and priority support"
              : "Core marketplace access with weekly message limits"}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {isPremium ? (
          <>
            <Link
              href="/api/billing/portal"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700"
            >
              <CreditCard className="h-5 w-5" />
              Manage Subscription
            </Link>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 dark:border-white/10 dark:bg-black/20 dark:text-white/50">
              Cancel, update payment, or view invoices
            </div>
          </>
        ) : (
          <>
            <Link
              href={`/api/billing/checkout?plan=${billingPlan}`}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-gradient-to-r from-red-600 to-red-700 px-5 text-sm font-black text-white shadow-md transition hover:from-red-700 hover:to-red-800"
            >
              <Sparkles className="h-5 w-5" />
              Upgrade to {planLabel}
            </Link>
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              Unlock unlimited messaging, analytics & more
            </div>
          </>
        )}
      </div>

      {!isPremium && (
        <div className="mt-5 grid gap-3 border-t border-slate-200 pt-5 dark:border-white/10 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-black/20">
            <p className="text-xs font-black uppercase tracking-wider text-red-600 dark:text-red-400">Unlimited</p>
            <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">Messages</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-black/20">
            <p className="text-xs font-black uppercase tracking-wider text-red-600 dark:text-red-400">Advanced</p>
            <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">Analytics</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-black/20">
            <p className="text-xs font-black uppercase tracking-wider text-red-600 dark:text-red-400">Premium</p>
            <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">Profile Badge</p>
          </div>
        </div>
      )}
    </div>
  );
}
