-- Migration: Add GT Auto Parts
-- Date: 2026-01-29
-- Description: Add Wide Body Installed part to the GT Auto category
-- Related Plan: docs/GT-AUTO-CUSTOM-PARTS-PLAN.md
-- Dependencies: 20260129_gt_auto_custom_parts_categories.sql must be run first

-- ============================================================================
-- PART 1: Insert GT Auto Parts
-- ============================================================================

-- Wide Body Installed
-- Options: Yes, No
-- Default: No
INSERT INTO "Part" ("id", "categoryId", "name", "description", "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  (SELECT "id" FROM "PartCategory" WHERE "name" = 'GT Auto'),
  'Wide Body Installed',
  'Wide body installation status',
  true,
  NOW(),
  NOW()
);

-- ============================================================================
-- NOTES:
-- ============================================================================
-- This migration adds the Wide Body Installed part to the GT Auto category.
--
-- UI Component: Select/ComboBox
-- Options: ["Yes", "No"]
-- Default Value: "No"
--
-- Verify insertion:
-- SELECT p."name", p."description", pc."name" as category
-- FROM "Part" p
-- JOIN "PartCategory" pc ON p."categoryId" = pc."id"
-- WHERE pc."name" = 'GT Auto';
