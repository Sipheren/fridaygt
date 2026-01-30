-- Migration: Add Base Custom Parts
-- Date: 2026-01-29
-- Description: Add Front, Side, Rear, and Wing parts to the Custom Parts category
-- Related Plan: docs/GT-AUTO-CUSTOM-PARTS-PLAN.md
-- Dependencies: 20260129_gt_auto_custom_parts_categories.sql must be run first

-- ============================================================================
-- PART 1: Insert Base Custom Parts
-- ============================================================================

-- Front
-- Options: Standard, Type A, Type B
-- Default: Standard
INSERT INTO "Part" ("id", "categoryId", "name", "description", "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  (SELECT "id" FROM "PartCategory" WHERE "name" = 'Custom Parts'),
  'Front',
  'Front custom part',
  true,
  NOW(),
  NOW()
);

-- Side
-- Options: Standard, Type A, Type B
-- Default: Standard
INSERT INTO "Part" ("id", "categoryId", "name", "description", "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  (SELECT "id" FROM "PartCategory" WHERE "name" = 'Custom Parts'),
  'Side',
  'Side custom part',
  true,
  NOW(),
  NOW()
);

-- Rear
-- Options: Standard, Type A, Type B
-- Default: Standard
INSERT INTO "Part" ("id", "categoryId", "name", "description", "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  (SELECT "id" FROM "PartCategory" WHERE "name" = 'Custom Parts'),
  'Rear',
  'Rear custom part',
  true,
  NOW(),
  NOW()
);

-- Wing
-- Options: Standard, None, Type A, Type B, Custom
-- Default: Standard
-- Note: When "Custom" is selected, Wing Height and Wing Endplate options appear
INSERT INTO "Part" ("id", "categoryId", "name", "description", "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  (SELECT "id" FROM "PartCategory" WHERE "name" = 'Custom Parts'),
  'Wing',
  'Wing custom part (triggers conditional display of Height and Endplate)',
  true,
  NOW(),
  NOW()
);

-- ============================================================================
-- NOTES:
-- ============================================================================
-- This migration adds the four base Custom Parts:
-- 1. Front - Select with options ["Standard", "Type A", "Type B"], default "Standard"
-- 2. Side - Select with options ["Standard", "Type A", "Type B"], default "Standard"
-- 3. Rear - Select with options ["Standard", "Type A", "Type B"], default "Standard"
-- 4. Wing - Select with options ["Standard", "None", "Type A", "Type B", "Custom"], default "Standard"
--
-- Conditional Logic:
-- When Wing value == "Custom", the frontend will display:
--   - Wing Height (dropdown: Low, Medium, High)
--   - Wing Endplate (number input: 1-20)
--
-- Verify insertion:
-- SELECT p."name", p."description", pc."name" as category
-- FROM "Part" p
-- JOIN "PartCategory" pc ON p."categoryId" = pc."id"
-- WHERE pc."name" = 'Custom Parts'
-- ORDER BY p."name";
