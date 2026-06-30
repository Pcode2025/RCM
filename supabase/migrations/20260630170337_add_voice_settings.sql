/*
# Add voice settings columns to prompt_generations

1. Modified Tables
   - `prompt_generations`
     - `voice_type` (text, default 'Male') - The type of voiceover voice
     - `voice_age` (integer, default 30) - The age of the voiceover speaker

2. Important Notes
   - These columns store the voice direction metadata alongside each generation
   - Defaults ensure backward compatibility with existing rows
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'prompt_generations' AND column_name = 'voice_type'
  ) THEN
    ALTER TABLE prompt_generations ADD COLUMN voice_type text NOT NULL DEFAULT 'Male';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'prompt_generations' AND column_name = 'voice_age'
  ) THEN
    ALTER TABLE prompt_generations ADD COLUMN voice_age integer NOT NULL DEFAULT 30;
  END IF;
END $$;