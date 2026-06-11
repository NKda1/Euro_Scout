"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOnboardedProfile } from "@/lib/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function requireUrl(value: string | null, label: string) {
  if (!value) {
    redirect(`/account?error=${encodeURIComponent(`${label} is required.`)}`);
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("Invalid protocol");
    }
    return parsed.toString();
  } catch {
    redirect(`/account?error=${encodeURIComponent(`${label} must be a valid http or https URL.`)}`);
  }
}

function optionalUrl(value: string | null, label: string) {
  if (!value) return null;
  return requireUrl(value, label);
}

export async function publishJournalistArticleAction(formData: FormData) {
  const { profile } = await requireOnboardedProfile();

  if (profile.role !== "journalist" && profile.role !== "admin") {
    redirect("/account?error=Only journalist accounts can publish news links.");
  }

  const title = text(formData, "title");
  const excerpt = text(formData, "excerpt");
  const articleUrl = requireUrl(text(formData, "article_url"), "Article link");
  const thumbnailUrl = optionalUrl(text(formData, "thumbnail_url"), "Thumbnail link");
  const status = formData.get("save_as_draft") === "on" ? "draft" : "published";
  const leagueIds = formData
    .getAll("league_ids")
    .map((value) => String(value).trim())
    .filter(Boolean)
    .slice(0, 12);

  if (!title || title.length < 4) {
    redirect("/account?error=Article title must be at least 4 characters.");
  }

  if (!excerpt || excerpt.length < 20) {
    redirect("/account?error=Write a short preview of at least 20 characters.");
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const publishedAt = status === "published" ? new Date().toISOString() : null;
  const { error } = await serviceClient.from("journalist_articles").insert({
    journalist_profile_id: profile.id,
    title: title.slice(0, 180),
    article_url: articleUrl,
    thumbnail_url: thumbnailUrl,
    excerpt: excerpt.slice(0, 360),
    league_ids: leagueIds,
    status,
    published_at: publishedAt,
    updated_at: new Date().toISOString()
  });

  if (error) {
    redirect(`/account?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/account");
  revalidatePath("/news");
  redirect(`/account?notice=${encodeURIComponent(status === "published" ? "Article link published." : "Article draft saved.")}`);
}

export async function deleteJournalistArticleAction(formData: FormData) {
  const { profile } = await requireOnboardedProfile();
  const articleId = text(formData, "article_id");

  if (!articleId) {
    redirect("/account?error=Article not found.");
  }

  if (profile.role !== "journalist" && profile.role !== "admin") {
    redirect("/account?error=Only journalist accounts can delete article links.");
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const query = serviceClient.from("journalist_articles").delete().eq("id", articleId);
  const { error } = profile.role === "admin" ? await query : await query.eq("journalist_profile_id", profile.id);

  if (error) {
    redirect(`/account?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/account");
  revalidatePath("/news");
  redirect("/account?notice=Article link deleted.");
}

async function requireAdmin() {
  const { profile } = await requireOnboardedProfile();

  if (profile.role !== "admin") {
    redirect("/admin?error=Admin access is required.");
  }

  return profile;
}

function parseAdminArticlePayload(formData: FormData) {
  const title = text(formData, "title");
  const excerpt = text(formData, "excerpt");
  const articleUrl = requireUrl(text(formData, "article_url"), "Article link");
  const thumbnailUrl = optionalUrl(text(formData, "thumbnail_url"), "Thumbnail link");
  const status = text(formData, "status") === "draft" ? "draft" : "published";
  const leagueIds = formData
    .getAll("league_ids")
    .map((value) => String(value).trim())
    .filter(Boolean)
    .slice(0, 12);

  if (!title || title.length < 4) {
    redirect("/admin/news?error=Article title must be at least 4 characters.");
  }

  if (!excerpt || excerpt.length < 20) {
    redirect("/admin/news?error=Write a short preview of at least 20 characters.");
  }

  return {
    title: title.slice(0, 180),
    excerpt: excerpt.slice(0, 360),
    article_url: articleUrl,
    thumbnail_url: thumbnailUrl,
    league_ids: leagueIds,
    status
  };
}

export async function adminCreateJournalistArticleAction(formData: FormData) {
  const profile = await requireAdmin();
  const payload = parseAdminArticlePayload(formData);
  const serviceClient = createSupabaseServiceRoleClient();
  const authorProfileId = text(formData, "journalist_profile_id") ?? profile.id;
  const publishedAt = payload.status === "published" ? new Date().toISOString() : null;

  const { error } = await serviceClient.from("journalist_articles").insert({
    ...payload,
    journalist_profile_id: authorProfileId,
    published_at: publishedAt,
    updated_at: new Date().toISOString()
  });

  if (error) {
    redirect(`/admin/news?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/news");
  revalidatePath("/news");
  redirect("/admin/news?notice=News article created.");
}

export async function adminUpdateJournalistArticleAction(formData: FormData) {
  await requireAdmin();
  const articleId = text(formData, "article_id");

  if (!articleId) {
    redirect("/admin/news?error=Article not found.");
  }

  const payload = parseAdminArticlePayload(formData);
  const serviceClient = createSupabaseServiceRoleClient();
  const { data: existing } = await serviceClient
    .from("journalist_articles")
    .select("published_at")
    .eq("id", articleId)
    .maybeSingle<{ published_at: string | null }>();

  const { error } = await serviceClient
    .from("journalist_articles")
    .update({
      ...payload,
      published_at: payload.status === "published" ? existing?.published_at ?? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    })
    .eq("id", articleId);

  if (error) {
    redirect(`/admin/news?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/news");
  revalidatePath("/news");
  redirect("/admin/news?notice=News article updated.");
}

export async function adminDeleteJournalistArticleAction(formData: FormData) {
  await requireAdmin();
  const articleId = text(formData, "article_id");

  if (!articleId) {
    redirect("/admin/news?error=Article not found.");
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const { error } = await serviceClient.from("journalist_articles").delete().eq("id", articleId);

  if (error) {
    redirect(`/admin/news?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/news");
  revalidatePath("/news");
  redirect("/admin/news?notice=News article deleted.");
}
