-- Migration: Add GT Auto and Custom Parts Categories
-- Date: 2026-01-29
-- Description: Add two new part categories for GT Auto (wide body) and Custom Parts
-- Related Plan: docs/GT-AUTO-CUSTOM-PARTS-PLAN.md

-- ============================================================================
-- PART 1: Insert New Part Categories
-- ============================================================================

-- GT Auto Category (displayOrder: 6 - comes after Extreme which is 5)
INSERT INTO "PartCategory" ("id", "name", "displayOrder", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'GT Auto',
  6,
  NOW(),
  NOW()
);

-- Custom Parts Category (displayOrder: 7 - comes after GT Auto which is 6)
INSERT INTO "PartCategory" ("id", "name", "displayOrder", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'Custom Parts',
  7,
  NOW(),
  NOW()
);

-- ============================================================================
-- NOTES:
-- ============================================================================
-- This migration adds the two new part categories that will contain the new parts:
-- - GT Auto: Will contain Wide Body Installed option
-- - Custom Parts: Will contain Front, Side, Rear, Wing, and conditional Wing options
--
-- Display order:
-- 1. Sports (1)
-- 2. Club Sports (2)
-- 3. Semi-Racing (3)
-- 4. Racing (4)
-- 5. Extreme (5)
-- 6. GT Auto (6) <- NEW
-- 7. Custom Parts (7) <- NEW
--
-- Verify insertion:
-- SELECT "name", "displayOrder" FROM "PartCategory" ORDER BY "displayOrder";
