-- Ensure clinical columns exist and map old names to new ones
BEGIN;

-- visit_diagnoses
ALTER TABLE IF EXISTS visit_diagnoses
  ADD COLUMN IF NOT EXISTS diagnosis_id uuid,
  ADD COLUMN IF NOT EXISTS tooth_type text,
  ADD COLUMN IF NOT EXISTS quadrant text,
  ADD COLUMN IF NOT EXISTS tooth_number text,
  ADD COLUMN IF NOT EXISTS needs_xray boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS visit_id uuid,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Migrate from legacy columns if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visit_diagnoses' AND column_name='tooth_set') THEN
    UPDATE visit_diagnoses SET tooth_type = tooth_set WHERE tooth_type IS NULL;
    ALTER TABLE visit_diagnoses DROP COLUMN IF EXISTS tooth_set;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visit_diagnoses' AND column_name='xray_flag') THEN
    UPDATE visit_diagnoses SET needs_xray = xray_flag WHERE needs_xray IS NULL;
    ALTER TABLE visit_diagnoses DROP COLUMN IF EXISTS xray_flag;
  END IF;
END$$;

-- procedure_plan_rows
-- Create enum type if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'procedure_status') THEN
    CREATE TYPE procedure_status AS ENUM ('planned','in_progress','complete','cancelled','completed');
  END IF;
END$$;

ALTER TABLE IF EXISTS procedure_plan_rows
  ADD COLUMN IF NOT EXISTS visit_id uuid,
  ADD COLUMN IF NOT EXISTS visit_diagnosis_id uuid,
  ADD COLUMN IF NOT EXISTS treatment_id uuid,
  ADD COLUMN IF NOT EXISTS provider_id uuid,
  ADD COLUMN IF NOT EXISTS do_today boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comment text,
  ADD COLUMN IF NOT EXISTS status procedure_status DEFAULT 'planned',
  ADD COLUMN IF NOT EXISTS planned_date timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Migrate legacy columns if any (for_when -> do_today/planned_date)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='procedure_plan_rows' AND column_name='for_when') THEN
    UPDATE procedure_plan_rows SET do_today = (for_when = 'today') WHERE do_today IS NULL;
    ALTER TABLE procedure_plan_rows DROP COLUMN IF EXISTS for_when;
  END IF;
END$$;

COMMIT;
