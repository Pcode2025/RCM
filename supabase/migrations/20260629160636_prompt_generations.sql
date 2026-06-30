/*
# Prompt Generation History

## Summary
Adds a table to record every set of AI-generated prompts so users can browse, re-open, and reuse their generation history.

## 1. New Table: `prompt_generations`
Each row is one generation run (4 prompts produced together):
- `id`               — UUID primary key
- `product_name`     — product the prompts were generated for
- `language`         — target language setting
- `ai_model`         — AI model used to generate
- `image_model`      — target image model
- `video_model`      — target video model
- `hook_duration`    — hook seconds
- `content_duration` — content seconds
- `cta_duration`     — cta seconds
- `image_prompt`     — generated image prompt
- `hook_prompt`      — generated hook video prompt
- `content_prompt`   — generated content video prompt
- `cta_prompt`       — generated cta video prompt
- `product_images`   — JSON array of image URLs used as context
- `product_info`     — JSON snapshot of the full product form (so a run can be re-opened)
- `created_at`       — timestamp

## 2. Security
- RLS enabled on `prompt_generations`.
- Single-tenant (no auth): all four CRUD policies target `anon, authenticated` with `USING (true)` / `WITH CHECK (true)` so the anon-key frontend can read and write its own history.

## 3. Indexes
- Index on `created_at DESC` for fast history listing.

## Notes
- `IF NOT EXISTS` / `DROP POLICY IF EXISTS` make this migration safe to re-run.
*/

CREATE TABLE IF NOT EXISTS prompt_generations (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name     text        NOT NULL DEFAULT '',
  language         text        NOT NULL DEFAULT '',
  ai_model         text        NOT NULL DEFAULT '',
  image_model      text        NOT NULL DEFAULT '',
  video_model      text        NOT NULL DEFAULT '',
  hook_duration    int         NOT NULL DEFAULT 0,
  content_duration int         NOT NULL DEFAULT 0,
  cta_duration     int         NOT NULL DEFAULT 0,
  image_prompt     text        NOT NULL DEFAULT '',
  hook_prompt      text        NOT NULL DEFAULT '',
  content_prompt   text        NOT NULL DEFAULT '',
  cta_prompt       text        NOT NULL DEFAULT '',
  product_images   jsonb       NOT NULL DEFAULT '[]'::jsonb,
  product_info     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prompt_generations_created_at_idx
  ON prompt_generations (created_at DESC);

ALTER TABLE prompt_generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pg_select" ON prompt_generations;
CREATE POLICY "pg_select" ON prompt_generations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "pg_insert" ON prompt_generations;
CREATE POLICY "pg_insert" ON prompt_generations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "pg_update" ON prompt_generations;
CREATE POLICY "pg_update" ON prompt_generations FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "pg_delete" ON prompt_generations;
CREATE POLICY "pg_delete" ON prompt_generations FOR DELETE
  TO anon, authenticated USING (true);
