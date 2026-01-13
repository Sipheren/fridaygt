# Column Casing Migration - Test Plan

**Date:** 2026-01-13
**Migration:** `migrations/fix-race-column-casing.sql`

## Pre-Migration Checklist

- [ ] Review migration script
- [ ] Review rollback plan
- [ ] Ensure database backup exists
- [ ] Notify team of upcoming migration
- [ ] Schedule maintenance window (if needed)

## Test Environment Setup

### Option A: Development Database (Recommended First)

1. **Create development backup**
   ```bash
   # Connect to Supabase and export schema
   pg_dump -h db.xxx.supabase.co -U postgres -d postgres > dev-backup-pre-migration.sql
   ```

2. **Run verification script (BEFORE migration)**
   ```bash
   psql -h db.xxx.supabase.co -U postgres -d postgres -f scripts/verify-column-casing.sql > before-migration.txt
   ```

3. **Apply migration**
   ```bash
   psql -h db.xxx.supabase.co -U postgres -d postgres -f migrations/fix-race-column-casing.sql
   ```

4. **Run verification script (AFTER migration)**
   ```bash
   psql -h db.xxx.supabase.co -U postgres -d postgres -f scripts/verify-column-casing.sql > after-migration.txt
   ```

5. **Compare results**
   ```bash
   diff before-migration.txt after-migration.txt
   # Should show column name changes only
   ```

### Option B: Local Testing (If you have a local database)

```bash
# Start local Postgres
docker run --name test-postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres

# Copy database structure
pg_dump -h db.xxx.supabase.co -U postgres -d postgres --schema-only | psql -h localhost -U postgres

# Run migration
psql -h localhost -U postgres -d postgres -f migrations/fix-race-column-casing.sql

# Verify
psql -h localhost -U postgres -d postgres -f scripts/verify-column-casing.sql
```

## Functional Testing

After migration, test these features:

### 1. API Endpoints

```bash
# Test races listing
curl http://localhost:3000/api/races

# Should return:
# - 200 status
# - Array of races
# - No column errors
```

### 2. Frontend Pages

**Manual testing checklist:**

- [ ] Navigate to `/races` page
- [ ] Verify races display correctly
- [ ] Search functionality works
- [ ] Filter by Active/Inactive works
- [ ] Click on a race → navigates to race detail page
- [ ] Run list associations display correctly

### 3. Run List Integration

- [ ] Navigate to a run list detail page
- [ ] Add a new race to the run list
- [ ] Verify race appears in list
- [ ] Delete a race from the run list
- [ ] Verify race is removed

### 4. Race Detail Page

- [ ] Navigate to `/races/[id]`
- [ ] Verify race details display
- [ ] Check track and car information
- [ ] Verify leaderboard displays
- [ ] Check run list associations

## Automated Tests

Run the test suite:

```bash
npm test
```

**Expected:** All tests pass

## Performance Testing

Column rename should be instant. Verify:

```sql
-- Test query performance
EXPLAIN ANALYZE
SELECT "Race".*, "RaceCar".*, "Car".*
FROM "Race"
LEFT JOIN "RaceCar" ON "Race"."id" = "RaceCar"."raceId"
LEFT JOIN "Car" ON "RaceCar"."carId" = "Car"."id"
LIMIT 10;
```

**Expected:** Execution time similar to before migration

## Error Scenarios

### Test Rollback

1. **Apply rollback SQL**
   ```sql
   ALTER TABLE "Race" RENAME COLUMN "createdAt" TO "createdat";
   ALTER TABLE "Race" RENAME COLUMN "updatedAt" TO "updatedat";
   ALTER TABLE "Race" RENAME COLUMN "createdById" TO "createdbyid";

   ALTER TABLE "RaceCar" RENAME COLUMN "carId" TO "carid";
   ALTER TABLE "RaceCar" RENAME COLUMN "buildId" TO "buildid";
   ALTER TABLE "RaceCar" RENAME COLUMN "raceId" TO "raceid";
   ```

2. **Verify old state is restored**
   ```bash
   psql -h db.xxx.supabase.co -U postgres -d postgres -f scripts/verify-column-casing.sql
   ```

3. **Re-apply migration**
   ```bash
   psql -h db.xxx.supabase.co -U postgres -d postgres -f migrations/fix-race-column-casing.sql
   ```

## Sign-Off Criteria

Migration is ready for production when:

- [ ] All pre-migration checks complete
- [ ] Verification script shows correct column names
- [ ] All functional tests pass
- [ ] No performance degradation
- [ ] Rollback tested and works
- [ ] Code review completed
- [ ] Documentation updated

## Production Deployment

### Timeline

1. **T-30 minutes:** Final checks
2. **T-15 minutes:** Notify users (if maintenance needed)
3. **T-5 minutes:** Apply database migration
4. **T-0:** Deploy application code
5. **T+5 minutes:** Smoke testing
6. **T+15 minutes:** Full verification

### Commands

```bash
# 1. Backup production database (automatic with Supabase)
# Supabase creates point-in-time recovery automatically

# 2. Apply migration via Supabase dashboard or CLI:
psql -h db.xxx.supabase.co -U postgres -d postgres -f migrations/fix-race-column-casing.sql

# 3. Deploy application code
git push origin main  # If using auto-deploy
# or manual deploy through your hosting provider

# 4. Verify
curl https://yourdomain.com/api/races
```

## Monitoring After Deployment

Check for errors:

```bash
# Check application logs
tail -f /var/log/app.log | grep -i error

# Check database logs (via Supabase dashboard)
# Look for any column-related errors
```

## Success Criteria

Migration is successful when:

- ✅ No database errors in logs
- ✅ `/api/races` returns correct data
- ✅ Races page displays all races
- ✅ No user-reported issues
- ✅ Performance metrics unchanged

## Emergency Contacts

- Database Admin: [Your Name]
- On-Call Developer: [Your Name]
- Rollback Procedure: Documented in migration file

## Notes

- Migration duration: < 1 second
- Downtime required: None (if deployed correctly)
- Data impact: None (renaming only)
- Rollback time: < 1 second
