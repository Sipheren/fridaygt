# Supabase CLI Setup Guide

**Status:** CLI Installed ✅ | Configuration Required ⚠️

---

## What You Need to Do

### Step 1: Get Your Project Reference

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **Settings** → **API**
4. Copy your **Project Reference** (looks like: `abc123xyz.supabase.co`)
5. Copy your **Project ID** (from the URL or settings)

### Step 2: Link Your Project

Run this command in your project directory:

```bash
supabase link --project-ref YOUR_PROJECT_REFERENCE
```

**Example:**
```bash
supabase link --project-ref abc123xyz
```

This will:
- Prompt you to log in to Supabase (if not already logged in)
- Link your local project to the remote project
- Set up the `supabase/config.toml` file automatically

### Step 3: Verify the Link

```bash
supabase status
```

You should see your project information displayed.

---

## Common Supabase CLI Commands

### Running Migrations

**Apply migrations from `supabase/migrations/` to remote database:**
```bash
supabase db push
```

**List migrations:**
```bash
supabase migration list
```

**Create a new migration:**
```bash
supabase migration new your_migration_name
```

**Reset database (BE CAREFUL - deletes all data):**
```bash
supabase db reset
```

### Running Local Development

**Start local Supabase stack (Postgres, Studio, etc.):**
```bash
supabase start
```

**Stop local stack:**
```bash
supabase stop
```

**Open Supabase Studio (local):**
```bash
supabase studio
```

---

## How This Helps With Current Issue

### Instead of:
1. Opening Supabase website
2. Navigating to SQL Editor
3. Copying/pasting SQL
4. Running manually
5. Copying results back

### You Can:
```bash
# Run the audit script directly
supabase db execute -f scripts/audit-all-tables.sql > audit-results.txt

# Create and apply migrations
supabase migration new fix_column_casing
# Edit the migration file
supabase db push

# Check migration status
supabase migration list
```

---

## Next Steps After Setup

1. **Link your project** (see Step 2 above)
2. **Run the audit script:**
   ```bash
   supabase db execute -f scripts/audit-all-tables.sql
   ```

3. **Share the results with me** to generate the migration script

---

## Troubleshooting

### "Not logged in"
```bash
supabase login
```

### "Project not found"
- Check your project reference is correct
- Ensure you have access to the project

### "Permission denied"
- Ensure you're using an account with project admin rights

---

## Files Created/Updated

- ✅ `supabase/config.toml` - Placeholder config (will be auto-updated by `supabase link`)
- ✅ `scripts/audit-all-tables.sql` - Audit script ready to run
- ✅ `docs/CURRENT-SITUATION-AND-PLAN.md` - Current status

---

**Ready to proceed? Run:**
```bash
supabase link --project-ref YOUR_PROJECT_REFERENCE
```

Then paste your project reference and I'll help you run the audit!
