/*
# Product Images — Storage Bucket & Metadata Table

## Summary
Sets up Supabase Storage for product image uploads and a metadata table to record each uploaded image.

## 1. Storage Bucket
- Creates a public bucket `product-images` (max 50 MB per file, images only).
- Adds storage.objects policies so the anon-key frontend can upload, view, update, and delete files inside this bucket.

## 2. New Table: `product_images`
Stores metadata for every image uploaded to the bucket:
- `id`            — UUID primary key
- `storage_path`  — path inside the bucket (e.g. `session_abc/image.jpg`)
- `public_url`    — full publicly-accessible URL
- `original_name` — filename as the user uploaded it
- `file_size`     — bytes
- `mime_type`     — e.g. `image/jpeg`
- `created_at`    — timestamp

## 3. Security
- RLS enabled on `product_images`.
- Single-tenant (no auth): all four CRUD policies target `anon, authenticated` with `USING (true)` / `WITH CHECK (true)` so the anon-key frontend has full access.
- Storage object policies mirror this, scoped to `bucket_id = 'product-images'`.

## Notes
- All statements use `IF NOT EXISTS` / `ON CONFLICT` so the migration is safe to re-run.
- `DROP POLICY IF EXISTS` before each `CREATE POLICY` ensures idempotency.
*/

-- ─── Storage bucket ──────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  52428800,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif','image/bmp']
) ON CONFLICT (id) DO NOTHING;

-- Storage object policies
DROP POLICY IF EXISTS "pi_anon_select" ON storage.objects;
CREATE POLICY "pi_anon_select" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "pi_anon_insert" ON storage.objects;
CREATE POLICY "pi_anon_insert" ON storage.objects FOR INSERT
  TO anon, authenticated WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "pi_anon_update" ON storage.objects;
CREATE POLICY "pi_anon_update" ON storage.objects FOR UPDATE
  TO anon, authenticated USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "pi_anon_delete" ON storage.objects;
CREATE POLICY "pi_anon_delete" ON storage.objects FOR DELETE
  TO anon, authenticated USING (bucket_id = 'product-images');

-- ─── Metadata table ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_images (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path  text        NOT NULL,
  public_url    text        NOT NULL,
  original_name text        NOT NULL DEFAULT '',
  file_size     int8        NOT NULL DEFAULT 0,
  mime_type     text        NOT NULL DEFAULT 'image/jpeg',
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pi_meta_select" ON product_images;
CREATE POLICY "pi_meta_select" ON product_images FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "pi_meta_insert" ON product_images;
CREATE POLICY "pi_meta_insert" ON product_images FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "pi_meta_update" ON product_images;
CREATE POLICY "pi_meta_update" ON product_images FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "pi_meta_delete" ON product_images;
CREATE POLICY "pi_meta_delete" ON product_images FOR DELETE
  TO anon, authenticated USING (true);
