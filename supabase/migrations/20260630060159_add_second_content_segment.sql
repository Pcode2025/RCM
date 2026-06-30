/*
# Add Second Content Segment to Prompt Generations

## Summary
Adds support for a second "Content" video segment in each generation. The app
now produces five prompts (image, hook, content, content 2, cta) and tracks a
duration for the new segment.

## 1. Modified Table: `prompt_generations`
- New column `content2_duration` (int, default 0) — seconds for the second content segment.
- New column `content2_prompt` (text, default '') — the generated prompt for the second content segment.

## 2. Security
- No RLS changes. Existing policies continue to apply.

## Notes
1. Additive, non-destructive change — existing rows get safe defaults.
2. Uses a guarded DO block so the migration is safe to re-run.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prompt_generations' AND column_name = 'content2_duration'
  ) THEN
    ALTER TABLE prompt_generations ADD COLUMN content2_duration int NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prompt_generations' AND column_name = 'content2_prompt'
  ) THEN
    ALTER TABLE prompt_generations ADD COLUMN content2_prompt text NOT NULL DEFAULT '';
  END IF;
END $$;
