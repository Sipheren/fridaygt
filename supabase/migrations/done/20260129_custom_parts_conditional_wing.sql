-- Migration: Add Conditional Wing Options
-- Date: 2026-01-29
-- Description: Add Wing Height and Wing Endplate parts to Custom Parts category
--              These are conditionally displayed when Wing = "Custom"
-- Related Plan: docs/GT-AUTO-CUSTOM-PARTS-PLAN.md
-- Dependencies: 20260129_gt_auto_custom_parts_categories.sql must be run first

-- ============================================================================
-- PART 1: Insert Conditional Wing Options
-- ============================================================================

-- Wing Height
-- Displayed when: Wing value == "Custom"
-- Options: Low, Medium, High
-- Default: Medium
INSERT INTO "Part" ("id", "categoryId", "name", "description", "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  (SELECT "id" FROM "PartCategory" WHERE "name" = 'Custom Parts'),
  'Wing Height',
  'Wing height setting (displayed when Wing = Custom)',
  true,
  NOW(),
  NOW()
);

-- Wing Endplate
-- Displayed when: Wing value == "Custom"
-- Type: Number input (1-20)
-- Default: 1
INSERT INTO "Part" ("id", "categoryId", "name", "description", "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  (SELECT "id" FROM "PartCategory" WHERE "name" = 'Custom Parts'),
  'Wing Endplate',
  'Wing endplate setting (1-20, displayed when Wing = Custom)',
  true,
  NOW(),
  NOW()
);

-- ============================================================================
-- NOTES:
-- ============================================================================
-- This migration adds two conditional parts that only appear when Wing = "Custom":
-- 1. Wing Height - Select with options ["Low", "Medium", "High"], default "Medium"
-- 2. Wing Endplate - Number input with range [1-20], default 1
--
-- Conditional Display Logic (Frontend):
-- IF Wing value == "Custom":
--   - Show Wing Height dropdown
--   - Show Wing Endplate number input
-- ELSE:
--   - Hide Wing Height and Wing Endplate
--
-- UI Components:
-- - Wing Height: Select/ComboBox
-- - Wing Endplate: Number Input (min: 1, max: 20)
--
-- Verify insertion:
-- SELECT p."name", p."description", pc."name" as category
-- FROM "Part" p
-- JOIN "PartCategory" pc ON p."categoryId" = pc."id"
-- WHERE pc."name" = 'Custom Parts' AND p."name" LIKE 'Wing%'
-- ORDER BY p."name";
