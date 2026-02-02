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

Before making changes, read from `docs/`:
- `PLAN.md` - Current roadmap
- `DESIGN-SYSTEM.md` - UI/UX guidelines
- `DATABASE-SCHEMA.md` - Data structure
- `SECURITY.md` - Security rules

---

# Project Rules

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

### Before Every Commit
1. Run linters
2. Run tests (if available)
3. Check for sensitive data
4. Update `session-log.md`

---

## Databse SQL
- All SQL quries must be run by user manually

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
| Database | `DATABASE-SCHEMA.md` |
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