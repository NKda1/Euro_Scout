import { redirect } from "next/navigation";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";

interface OpenArticleRouteProps {
  params: Promise<{
    articleId: string;
  }>;
}

export async function GET(_request: Request, { params }: OpenArticleRouteProps) {
  const { articleId } = await params;
  const authClient = await createSupabaseServerClient();
  const serviceClient = createSupabaseServiceRoleClient();
  const {
    data: { user }
  } = await authClient.auth.getUser();

  const { data: article } = await serviceClient
    .from("journalist_articles")
    .select("id, journalist_profile_id, article_url, status")
    .eq("id", articleId)
    .maybeSingle<{
      id: string;
      journalist_profile_id: string;
      article_url: string;
      status: string;
    }>();

  if (!article || article.status !== "published") {
    redirect("/news?error=Article link is not available.");
  }

  let viewerRole: string | null = null;
  if (user) {
    const { data: viewerProfile } = await serviceClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle<{ role: string }>();
    viewerRole = viewerProfile?.role ?? null;
  }

  if (!user || user.id !== article.journalist_profile_id) {
    await serviceClient.from("journalist_article_clicks").insert({
      article_id: article.id,
      journalist_profile_id: article.journalist_profile_id,
      viewer_profile_id: user?.id ?? null,
      viewer_role: viewerRole
    });
  }

  redirect(article.article_url);
}
