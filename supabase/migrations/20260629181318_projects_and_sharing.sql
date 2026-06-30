/*
# Projects & Secure Project Sharing

## Summary
Adds a "Projects" concept so prompt generations can be grouped, and a secure
password-protected global sharing mechanism. Sharing secrets (password hashes)
are intentionally kept OUT of the client's reach: the `project_shares` table has
RLS enabled with NO anon/authenticated policies, so only the service-role
edge function (`project-share`) can read or write it.

## 1. New Table: `projects`
- `id`         — uuid primary key
- `name`       — project display name
- `created_at` — timestamp
RLS: single-tenant (no auth) so anon + authenticated may CRUD their own projects.

## 2. Modified Table: `prompt_generations`
- New nullable column `project_id` (uuid) referencing `projects(id)`
  ON DELETE SET NULL — moves a generation into a project; deleting a project
  un-files its generations rather than destroying them.

## 3. New Table: `project_shares`
One row per shared project, written ONLY by the edge function (service role):
- `id`           — uuid primary key
- `project_id`   — uuid, unique, references `projects(id)` ON DELETE CASCADE
- `share_token`  — uuid, unique, the public link identifier
- `password_hash`— text, bcrypt hash (null = no password)
- `is_protected` — boolean, whether a password is required
- `created_at`   — timestamp

## 4. Security
- RLS enabled on all tables.
- `projects`: anon + authenticated CRUD (single-tenant app, no sign-in).
- `prompt_generations`: existing policies unchanged.
- `project_shares`: RLS enabled, NO policies added on purpose. anon and
  authenticated roles therefore have ZERO access; only the service-role key
  (used by the `project-share` edge function) can read/write it. This keeps
  password hashes and share tokens off-limits to the public anon key.

## 5. Indexes
- `prompt_generations(project_id)` for fast per-project listing.
- `project_shares(share_token)` for fast public lookups.

## Notes
1. IF NOT EXISTS / DROP POLICY IF EXISTS make this migration safe to re-run.
2. No destructive operations — only additive changes.
*/

CREATE TABLE IF NOT EXISTS projects (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL DEFAULT 'Untitled project',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects_select" ON projects;
CREATE POLICY "projects_select" ON projects FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "projects_insert" ON projects;
CREATE POLICY "projects_insert" ON projects FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "projects_update" ON projects;
CREATE POLICY "projects_update" ON projects FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "projects_delete" ON projects;
CREATE POLICY "projects_delete" ON projects FOR DELETE
  TO anon, authenticated USING (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prompt_generations' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE prompt_generations
      ADD COLUMN project_id uuid REFERENCES projects(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS prompt_generations_project_id_idx
  ON prompt_generations (project_id);

CREATE TABLE IF NOT EXISTS project_shares (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid        NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  share_token   uuid        NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  password_hash text,
  is_protected  boolean     NOT NULL DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_shares_share_token_idx
  ON project_shares (share_token);

-- RLS enabled with NO policies: only the service-role edge function may touch this table.
ALTER TABLE project_shares ENABLE ROW LEVEL SECURITY;
