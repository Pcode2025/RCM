/*
# Video Editor — Storage Bucket, Projects & Assets

## Summary
Adds a browser-based video editor: projects hold a timeline (clips + text overlays
+ export settings) and reference uploaded media assets (video / image / audio)
stored in a dedicated public storage bucket.

## 1. Storage Bucket
- Public bucket `editor-assets` (up to 500 MB/file) for video, image and audio uploads.
- storage.objects policies so the anon-key frontend can upload/view/update/delete inside it.

## 2. New Table `editor_projects`
- `id` uuid PK
- `name` text
- `timeline` jsonb — ordered clips + text overlays + audio track (app-defined shape), default {}
- `export_resolution` text — '4k' | '2k' | 'fhd' | 'hd'
- `export_fps` int — 24 | 30 | 60
- `orientation` text — 'landscape' | 'portrait'
- `created_at` / `updated_at` timestamptz

## 3. New Table `editor_assets`
- `id` uuid PK
- `project_id` uuid FK -> editor_projects (cascade delete)
- `kind` text — 'video' | 'image' | 'audio'
- `name` text, `public_url` text, `storage_path` text
- `duration` double precision — seconds (0 for images)
- `file_size` int8, `mime_type` text
- `created_at` timestamptz

## 4. Security
- RLS enabled on both tables. Single-tenant (no auth): anon + authenticated CRUD with USING(true)/WITH CHECK(true), mirroring existing product-images setup.

## Notes
- Idempotent: IF NOT EXISTS / ON CONFLICT / DROP POLICY IF EXISTS throughout.
*/

-- ─── Storage bucket ──────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'editor-assets',
  'editor-assets',
  true,
  524288000,
  ARRAY[
    'video/mp4','video/webm','video/quicktime','video/x-matroska',
    'image/jpeg','image/png','image/webp','image/gif','image/avif',
    'audio/mpeg','audio/mp3','audio/wav','audio/ogg','audio/aac','audio/webm'
  ]
) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "ea_anon_select" ON storage.objects;
CREATE POLICY "ea_anon_select" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'editor-assets');

DROP POLICY IF EXISTS "ea_anon_insert" ON storage.objects;
CREATE POLICY "ea_anon_insert" ON storage.objects FOR INSERT
  TO anon, authenticated WITH CHECK (bucket_id = 'editor-assets');

DROP POLICY IF EXISTS "ea_anon_update" ON storage.objects;
CREATE POLICY "ea_anon_update" ON storage.objects FOR UPDATE
  TO anon, authenticated USING (bucket_id = 'editor-assets');

DROP POLICY IF EXISTS "ea_anon_delete" ON storage.objects;
CREATE POLICY "ea_anon_delete" ON storage.objects FOR DELETE
  TO anon, authenticated USING (bucket_id = 'editor-assets');

-- ─── editor_projects ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS editor_projects (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text        NOT NULL DEFAULT 'Untitled Project',
  timeline          jsonb       NOT NULL DEFAULT '{}'::jsonb,
  export_resolution text        NOT NULL DEFAULT 'fhd',
  export_fps        int         NOT NULL DEFAULT 30,
  orientation       text        NOT NULL DEFAULT 'landscape',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE editor_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ep_select" ON editor_projects;
CREATE POLICY "ep_select" ON editor_projects FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "ep_insert" ON editor_projects;
CREATE POLICY "ep_insert" ON editor_projects FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "ep_update" ON editor_projects;
CREATE POLICY "ep_update" ON editor_projects FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "ep_delete" ON editor_projects;
CREATE POLICY "ep_delete" ON editor_projects FOR DELETE
  TO anon, authenticated USING (true);

-- ─── editor_assets ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS editor_assets (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid        NOT NULL REFERENCES editor_projects(id) ON DELETE CASCADE,
  kind         text        NOT NULL DEFAULT 'video',
  name         text        NOT NULL DEFAULT '',
  public_url   text        NOT NULL,
  storage_path text        NOT NULL DEFAULT '',
  duration     double precision NOT NULL DEFAULT 0,
  file_size    int8        NOT NULL DEFAULT 0,
  mime_type    text        NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS editor_assets_project_idx ON editor_assets(project_id);

ALTER TABLE editor_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eas_select" ON editor_assets;
CREATE POLICY "eas_select" ON editor_assets FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "eas_insert" ON editor_assets;
CREATE POLICY "eas_insert" ON editor_assets FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "eas_update" ON editor_assets;
CREATE POLICY "eas_update" ON editor_assets FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "eas_delete" ON editor_assets;
CREATE POLICY "eas_delete" ON editor_assets FOR DELETE
  TO anon, authenticated USING (true);
