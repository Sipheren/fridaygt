# FridayGT Project Instructions

## Session Logging

**REQUIRED**: Log all session activity to `session-log.md` in the project root.

- Log every prompt received and response given
- Include timestamps for each entry
- Format: `## [YYYY-MM-DD HH:MM] Session Entry`
- Include tool calls, file changes, and decisions made
- This enables session recovery if interrupted

## Git Workflow

### Branching Strategy
- **Never commit directly to main**
- Create feature branches for all work: `feature/description`, `fix/description`, `docs/description`
- Merge to main only after work is complete

### Commit Messages
Use conventional commits format:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `style:` - Formatting, styling changes
- `chore:` - Maintenance tasks

### Pre-Commit Checks
- Run linters before committing
- Run tests if available
- Verify no sensitive data is being committed

## Versioning

Follow semantic versioning (MAJOR.MINOR.PATCH):
- `0.0.X` - Small changes, quick additions, minor fixes
- `0.X.0` - Large feature additions, significant alterations
- `X.0.0` - Major milestones (user will indicate when these occur)

Update version in relevant files when making releases.

## .gitignore

**Respect the .gitignore file at all times.**
- Never commit ignored files
- Never remove items from .gitignore without explicit permission
- Note: `docs/LOG.md` is gitignored (development log stays local)
- Note: `session-log.md` is gitignored (session data stays local)

## Documentation

### Required Reading
Before starting work, read relevant docs from the `docs/` folder:
- `PLAN.md` - Current project plan and roadmap
- `LOG.md` - Development log (local only)
- `DESIGN-SYSTEM.md` - UI/UX design guidelines
- `DATABASE-SCHEMA.md` - Database structure
- `SECURITY.md` - Security guidelines
- `API_SECURITY.md` - API security specifics

### Documentation Updates
Keep documentation current with all changes:
- Update `PLAN.md` when roadmap changes
- Update `LOG.md` with development progress
- Update `DESIGN-SYSTEM.md` for UI/styling changes
- Update `DATABASE-SCHEMA.md` for data model changes
- Update `SECURITY.md` for security-related changes

### New Plans
- Create new planning documents in `docs/` folder
- Use descriptive names: `FEATURE-NAME-PLAN.md`
- Archive completed plans to `docs/.archived/`

## Project Context

This is a Next.js project. Always check existing patterns and conventions in the codebase before making changes.
