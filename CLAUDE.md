# ⚠️ MANDATORY FIRST ACTIONS - DO THESE BEFORE ANYTHING ELSE

## 1. Session Logging (NON-NEGOTIABLE)

**YOU MUST** create/update `session-log.md` in the project root.
```
## [YYYY-MM-DD HH:MM] Session Entry
**Prompt:** [what user asked]
**Response:** [summary of what you did]
**Files changed:** [list]
**Tools used:** [list]
```

- Create this file if it doesn't exist
- Append to it after EVERY response
- This is REQUIRED for session recovery
- DO NOT SKIP THIS STEP

## 2. Read Project Docs

Before making changes, **YOU MUST** read from project folders:
- `docs/PLAN.md` - Current roadmap
- `docs/DESIGN-SYSTEM.md` - UI/UX guidelines
- **`supabase/migrations/` - ALWAYS check the LATEST file for current database structure**
- `docs/SECURITY.md` - Security rules

---

# Project Rules

## Database Schema

**CRITICAL DATABASE RULES:**
- Database schema is in `supabase/migrations/` folder
- **YOU MUST read the LATEST migration file** (highest timestamp/version number) for current structure
- NEVER assume schema - always verify by reading the latest migration
- All SQL queries must be run by user manually

### Creating New Migrations/SQL Files
**STRICTLY FOLLOW THIS LOCATION:**
- ✅ **ALL new migrations MUST be created in `supabase/local/` ONLY**
- ✅ **ALL new SQL files MUST be saved to `supabase/local/` ONLY**
- ❌ NEVER create migration files directly in `supabase/migrations/`
- ❌ NEVER create SQL files outside `supabase/local/`
- User will move files to migrations folder after manual testing

---

## Git Workflow

### Branching (ALWAYS follow this)
| Rule | Detail |
|------|--------|
| ❌ NEVER | Commit directly to main |
| ✅ ALWAYS | Create feature branches first |

Branch naming: `feature/description`, `fix/description`, `docs/description`

### Commit Messages (REQUIRED format)
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation
- `refactor:` - Code refactoring
- `style:` - Formatting
- `chore:` - Maintenance

### ⚠️ CRITICAL: Single Push Policy
**DO NOT push multiple times** - this triggers multiple Vercel deployments and can hit usage limits
- ✅ Commit all changes locally first
- ✅ Build locally to verify it works (`npm run build`)
- ✅ **ONLY push once when all work is complete and user asks**
- ❌ NEVER push after each commit
- ❌ NEVER push intermediate work

### Before Every Commit/Push
1. Run `npm run build` to verify no TypeScript errors
2. Run linters
3. Run tests (if available)
4. Check for sensitive data
5. Update `session-log.md`

---

## Versioning

Semantic versioning: `MAJOR.MINOR.PATCH`
- `0.0.X` - Small fixes
- `0.X.0` - New features
- `X.0.0` - Major milestones (user will specify)

### Files to Update When Releasing

| File | What to Update |
|------|----------------|
| `package.json` | Line 3: `"version"` (PRIMARY) |
| `README.md` | Line 11: version display |
| `README.md` | Version history table (new row at top) |
| `docs/PLAN.md` | Version history table |
| SQL migrations | Header: `-- Version: X.X.X` |

Auto-updated (don't touch): `package-lock.json`, header display

---

## .gitignore

**NEVER violate .gitignore rules:**
- ❌ Never commit ignored files
- ❌ Never remove items without permission
- `docs/LOG.md` is gitignored (local only)
- `session-log.md` is gitignored (local only)

---

## Documentation Updates

Keep docs current:
| Change Type | Update This |
|-------------|-------------|
| Roadmap changes | `PLAN.md` |
| Development progress | `LOG.md` |
| UI/styling | `DESIGN-SYSTEM.md` |
| Database changes | Latest migration file in `supabase/migrations/` |
| Security | `SECURITY.md`, `API_SECURITY.md` |

New plans → `docs/FEATURE-NAME-PLAN.md`
Completed plans → `docs/.archived/`

---

## Project Context

- Framework: Next.js
- ALWAYS check existing patterns before changes
- Match current code conventions

---

# ⚠️ REMINDER: Did you update session-log.md?

If not, do it NOW before responding.