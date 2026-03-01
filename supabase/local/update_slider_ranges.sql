-- Version: 2.24.1
-- Purpose: Update TuningSetting min/max ranges to match GT7 in-game values
--          and align with the slider scaling improvements in this release.
--
-- Changes:
--   1. Toe Angle         → minValue -0.50, maxValue 0.50  (was -5.00/5.00)
--   2. Damping Ratio (Compression) → maxValue 50.00       (was 80.00)
--   3. Damping Ratio (Expansion)   → maxValue 50.00       (was 80.00)
--   4. Natural Frequency           → maxValue 6.00        (was 5.00)
--
-- NOTE: "Natural Frequency" is assumed to be the "Spring scaling" referenced
--       in the bug report (GT7 expresses spring stiffness in Hz).
--       Confirm this is correct before running if unsure.
--
-- Run manually in the Supabase SQL editor. Safe to run multiple times
-- (UPDATE is idempotent when setting the same value).
-- ============================================================


-- 1. Toe Angle: ±0.50° (was ±5.00°)
--    Note: The UI component (ToeAngleInput.tsx) also has hardcoded ±0.50
--    after this release — this DB update keeps both in sync.
UPDATE "TuningSetting"
SET
  "minValue" = -0.50,
  "maxValue" = 0.50
WHERE id = '9bf91806-4839-4eb7-b455-7df77c4ab20b';


-- 2. Damping Ratio (Compression): max 50% (was 80%)
UPDATE "TuningSetting"
SET
  "maxValue" = 50.00
WHERE id = '602d7326-2e7e-49de-a2cb-a902623c9456';


-- 3. Damping Ratio (Expansion): max 50% (was 80%)
UPDATE "TuningSetting"
SET
  "maxValue" = 50.00
WHERE id = 'bc5d8aee-a30a-4811-bb46-8ca89013597a';


-- 4. Natural Frequency (Spring): max 6.00 Hz (was 5.00 Hz)
UPDATE "TuningSetting"
SET
  "maxValue" = 6.00
WHERE id = '4a713793-1633-4e51-84fb-58ef14bde4f1';


-- Verify all changes applied correctly
SELECT
  id,
  name,
  "inputType",
  "minValue",
  "maxValue",
  step,
  unit
FROM "TuningSetting"
WHERE id IN (
  '9bf91806-4839-4eb7-b455-7df77c4ab20b',  -- Toe Angle
  '602d7326-2e7e-49de-a2cb-a902623c9456',  -- Damping Ratio (Compression)
  'bc5d8aee-a30a-4811-bb46-8ca89013597a',  -- Damping Ratio (Expansion)
  '4a713793-1633-4e51-84fb-58ef14bde4f1'   -- Natural Frequency
)
ORDER BY name;
