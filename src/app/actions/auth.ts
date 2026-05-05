"use server";

import { redirect } from "next/navigation";
import { getBaseUrl } from "@/lib/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getRequired(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    throw new Error(`${key} is required`);
  }

  return value;
}

export async function signUpAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const email = getRequired(formData, "email");
  const password = getRequired(formData, "password");
  const displayName = getRequired(formData, "display_name");

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName
      },
      emailRedirectTo: `${getBaseUrl()}/auth/callback?next=/onboarding`
    }
  });

  if (error) {
    redirect(`/auth/sign-up?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/auth/sign-in?notice=Check your email to confirm your account, then sign in.");
}

export async function signInAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const email = getRequired(formData, "email");
  const password = getRequired(formData, "password");
  const next = String(formData.get("next") ?? "/dashboard");

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    redirect(`/auth/sign-in?error=${encodeURIComponent(error.message)}`);
  }

  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
