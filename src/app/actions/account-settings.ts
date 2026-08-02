"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { enforceActionRateLimit } from "@/lib/action-rate-limit";
import { getBaseUrl } from "@/lib/api";
import { getAuthenticatedProfile, isReservedAdminEmail } from "@/lib/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

const MAX_PASSWORD_LENGTH = 72;
const MIN_PASSWORD_LENGTH = 8;
const PROFILE_MEDIA_BUCKET = "profile-media";

function text(formData: FormData, key: string, maxLength = 500) {
  return String(formData.get(key) ?? "").trim().slice(0, maxLength);
}

function accountRedirect(kind: "notice" | "error", message: string): never {
  redirect(`/account?${kind}=${encodeURIComponent(message)}#settings`);
}

function storagePathFromPublicUrl(value?: string | null) {
  if (!value) return null;
  const marker = `/storage/v1/object/public/${PROFILE_MEDIA_BUCKET}/`;
  const markerIndex = value.indexOf(marker);
  if (markerIndex < 0) return null;
  return decodeURIComponent(value.slice(markerIndex + marker.length).split("?")[0]);
}

export async function updateAccountEmailAction(formData: FormData) {
  const { supabase, user, profile } = await getAuthenticatedProfile();
  if (!profile) redirect("/auth/sign-in");
  await enforceActionRateLimit(`account-email:${user.id}`, 5, 60 * 60_000, "/account#settings");

  const email = text(formData, "email", 254).toLowerCase();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) accountRedirect("error", "Enter a valid new email address.");
  if (email === user.email?.toLowerCase()) accountRedirect("error", "That is already your account email.");

  const redirectTo = `${getBaseUrl()}/auth/callback?next=${encodeURIComponent("/account?notice=Email change confirmed.#settings")}`;
  const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: redirectTo });
  if (error) {
    console.error("[account.email_change.failed]", { code: error.code, status: error.status });
    accountRedirect("error", error.status === 429 ? "Too many email changes were requested. Try again later." : "The email change could not be started. Check the address and try again.");
  }

  accountRedirect("notice", "Confirmation links were sent as required. Your email changes only after the confirmation is completed.");
}

export async function updateAccountPasswordAction(formData: FormData) {
  const { supabase, user, profile } = await getAuthenticatedProfile();
  if (!profile || !user.email) redirect("/auth/sign-in");
  await enforceActionRateLimit(`account-password:${user.id}`, 5, 60 * 60_000, "/account#settings");

  const currentPassword = text(formData, "current_password", MAX_PASSWORD_LENGTH);
  const password = text(formData, "password", MAX_PASSWORD_LENGTH);
  const confirmation = text(formData, "confirm_password", MAX_PASSWORD_LENGTH);
  if (!currentPassword) accountRedirect("error", "Enter your current password to authorise this change.");
  if (password.length < MIN_PASSWORD_LENGTH) accountRedirect("error", `Use at least ${MIN_PASSWORD_LENGTH} characters for the new password.`);
  if (password !== confirmation) accountRedirect("error", "The new passwords do not match.");
  if (currentPassword === password) accountRedirect("error", "Choose a new password that differs from your current password.");

  const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
  if (authError) accountRedirect("error", "Your current password is incorrect.");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error("[account.password_change.failed]", { code: error.code, status: error.status });
    accountRedirect("error", error.code === "weak_password" ? "The new password is too weak. Use a longer mix of letters, numbers, and symbols." : "The password could not be updated. Try again.");
  }

  await supabase.auth.refreshSession();
  accountRedirect("notice", "Password updated. A security notification has been sent to your account email.");
}

export async function updateAccountPrivacyAction(formData: FormData) {
  const { supabase, user, profile } = await getAuthenticatedProfile();
  if (!profile) redirect("/auth/sign-in");
  await enforceActionRateLimit(`account-privacy:${user.id}`, 20, 60 * 60_000, "/account#settings");
  const isPublic = formData.get("is_public") === "on";
  const { error } = await supabase.from("profiles").update({ is_public: isPublic, updated_at: new Date().toISOString() }).eq("id", user.id);
  if (error) accountRedirect("error", "Profile visibility could not be updated. Try again.");
  revalidatePath("/account");
  revalidatePath("/players");
  revalidatePath(`/players/${user.id}`);
  accountRedirect("notice", isPublic ? "Your profile is now public." : "Your profile is now private.");
}

export async function deleteOwnAccountAction(formData: FormData) {
  const { user, profile } = await getAuthenticatedProfile();
  if (!profile) redirect("/auth/sign-in");
  await enforceActionRateLimit(`account-delete:${user.id}`, 3, 24 * 60 * 60_000, "/account#settings");

  if (profile.role === "admin" || isReservedAdminEmail(user.email)) accountRedirect("error", "The protected administrator account cannot be deleted here.");
  if (text(formData, "confirmation", 20) !== "DELETE") accountRedirect("error", "Type DELETE exactly to confirm account deletion.");
  if (text(formData, "email", 254).toLowerCase() !== user.email?.toLowerCase()) accountRedirect("error", "Enter the signed-in account email to confirm deletion.");

  const serviceClient = createSupabaseServiceRoleClient();
  const [{ data: ownership }, { data: activeSubscription }, { data: playerProfile }] = await Promise.all([
    serviceClient.from("club_members").select("team_id").eq("profile_id", user.id).eq("club_role", "owner").limit(1).maybeSingle<{ team_id: string }>(),
    serviceClient.from("billing_subscriptions").select("id").eq("profile_id", user.id).in("status", ["active", "trialing", "past_due"]).limit(1).maybeSingle<{ id: string }>(),
    serviceClient.from("player_profiles").select("photo_urls").eq("profile_id", user.id).maybeSingle<{ photo_urls: string[] | null }>()
  ]);

  if (ownership) accountRedirect("error", "Transfer club ownership before deleting this account.");
  if (activeSubscription) accountRedirect("error", "Cancel the active subscription from Manage Subscription before deleting this account.");

  const storagePaths = new Set<string>();
  const avatarPath = storagePathFromPublicUrl(profile.avatar_url);
  if (avatarPath) storagePaths.add(avatarPath);
  for (const url of playerProfile?.photo_urls ?? []) {
    const path = storagePathFromPublicUrl(url);
    if (path) storagePaths.add(path);
  }

  const { error: authDeleteError } = await serviceClient.auth.admin.deleteUser(user.id, false);
  if (authDeleteError) {
    console.error("[account.self_delete.auth_failed]", { code: authDeleteError.code, status: authDeleteError.status });
    accountRedirect("error", "The account could not be deleted safely. No partial deletion was completed; try again or contact support.");
  }

  await serviceClient.from("users").delete().eq("id", user.id);
  if (storagePaths.size) await serviceClient.storage.from(PROFILE_MEDIA_BUCKET).remove(Array.from(storagePaths));
  redirect("/?notice=Your%20EuroScout%20Pro%20account%20was%20deleted.");
}
