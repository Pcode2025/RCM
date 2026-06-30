import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import bcrypt from "npm:bcryptjs@2.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function rowToGeneration(row: Record<string, unknown>) {
  const info = (row.product_info ?? {}) as Record<string, unknown>;
  return {
    id: row.id,
    createdAt: row.created_at,
    product: {
      ...info,
      name: (info.name as string) ?? (row.product_name as string),
      productImages: (row.product_images as string[]) ?? (info.productImages as string[]) ?? [],
    },
    settings: {
      language: row.language,
      aiModel: row.ai_model,
      imageModel: row.image_model,
      videoModel: row.video_model,
      duration: {
        hook: row.hook_duration,
        content: row.content_duration,
        content2: row.content2_duration ?? 0,
        cta: row.cta_duration,
      },
    },
    prompts: {
      imagePrompt: row.image_prompt,
      hookPrompt: row.hook_prompt,
      contentPrompt: row.content_prompt,
      content2Prompt: row.content2_prompt ?? "",
      ctaPrompt: row.cta_prompt,
    },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action as string | undefined;

    if (action === "create") {
      const projectId = body.projectId as string;
      const password = (body.password as string | undefined)?.trim() || "";
      if (!projectId) return json({ error: "projectId is required" }, 400);

      const isProtected = password.length > 0;
      const passwordHash = isProtected ? bcrypt.hashSync(password, 10) : null;

      const { data: existing } = await supabase
        .from("project_shares")
        .select("id, share_token")
        .eq("project_id", projectId)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("project_shares")
          .update({ password_hash: passwordHash, is_protected: isProtected })
          .eq("project_id", projectId)
          .select("share_token, is_protected")
          .maybeSingle();
        if (error || !data) return json({ error: "Failed to update share" }, 500);
        return json({ token: data.share_token, isProtected: data.is_protected });
      }

      const { data, error } = await supabase
        .from("project_shares")
        .insert({ project_id: projectId, password_hash: passwordHash, is_protected: isProtected })
        .select("share_token, is_protected")
        .maybeSingle();
      if (error || !data) return json({ error: "Failed to create share" }, 500);
      return json({ token: data.share_token, isProtected: data.is_protected });
    }

    if (action === "status") {
      const projectId = body.projectId as string;
      if (!projectId) return json({ error: "projectId is required" }, 400);
      const { data } = await supabase
        .from("project_shares")
        .select("share_token, is_protected")
        .eq("project_id", projectId)
        .maybeSingle();
      if (!data) return json({ shared: false });
      return json({ shared: true, token: data.share_token, isProtected: data.is_protected });
    }

    if (action === "revoke") {
      const projectId = body.projectId as string;
      if (!projectId) return json({ error: "projectId is required" }, 400);
      await supabase.from("project_shares").delete().eq("project_id", projectId);
      return json({ revoked: true });
    }

    if (action === "view") {
      const token = body.token as string;
      const password = (body.password as string | undefined) ?? "";
      if (!token) return json({ error: "token is required" }, 400);

      const { data: share } = await supabase
        .from("project_shares")
        .select("project_id, password_hash, is_protected")
        .eq("share_token", token)
        .maybeSingle();

      if (!share) return json({ error: "not_found" }, 404);

      if (share.is_protected) {
        if (!password) return json({ needsPassword: true }, 401);
        const ok = bcrypt.compareSync(password, share.password_hash ?? "");
        if (!ok) return json({ needsPassword: true, error: "invalid_password" }, 401);
      }

      const { data: project } = await supabase
        .from("projects")
        .select("id, name, created_at")
        .eq("id", share.project_id)
        .maybeSingle();
      if (!project) return json({ error: "not_found" }, 404);

      const { data: rows } = await supabase
        .from("prompt_generations")
        .select("*")
        .eq("project_id", share.project_id)
        .order("created_at", { ascending: false });

      return json({
        project: { id: project.id, name: project.name, createdAt: project.created_at },
        generations: (rows ?? []).map(rowToGeneration),
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unexpected error" }, 500);
  }
});
