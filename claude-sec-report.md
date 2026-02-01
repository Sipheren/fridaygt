# Security Audit Report - FridayGT

**Date:** 2026-02-01
**Auditor:** Claude Code Security Audit
**Project:** FridayGT

---

## CRITICAL FINDINGS

### 1. Exposed Credentials in Repository

**Severity: CRITICAL**

Your `.env` and `.env.local` files are committed to git despite being in `.gitignore`. These contain:

| Credential | Risk |
|------------|------|
| `SUPABASE_SERVICE_ROLE_KEY` | Full database access - attackers can read/write ALL data |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project access |
| `RESEND_API_KEY` | Email sending abuse (spam/phishing) |
| `NEXTAUTH_SECRET` | Session hijacking capability |
| `DEFAULT_ADMIN_EMAIL` | `david@sipheren.com` exposed |
| `VERCEL_OIDC_TOKEN` | Deployment access token |

**Fix Steps:**
1. **Immediately rotate ALL keys** in Supabase dashboard, Resend dashboard, and generate new NEXTAUTH_SECRET
2. Remove files from git history:
   ```bash
   # Install git-filter-repo (preferred over filter-branch)
   brew install git-filter-repo

   # Remove the files from entire history
   git filter-repo --path .env --path .env.local --invert-paths

   # Force push to remote
   git push origin --force --all
   ```
3. Verify `.gitignore` uses correct patterns:
   ```
   .env
   .env.local
   .env.*.local
   ```

---

## HIGH SEVERITY

### 2. Admin Auto-Promotion Vulnerability

**File:** `src/lib/auth.ts:159-166`

Any user registering with `david@sipheren.com` gets automatic ADMIN role.

**Fix Steps:**
1. Remove auto-promotion logic
2. Add MFA requirement for admin accounts
3. Implement admin approval workflow for role changes
4. Add audit logging for all role changes

---

### 3. Overly Permissive CSP

**File:** `next.config.ts:34-48`

Current CSP allows `*.supabase.co` (any Supabase project) and uses `unsafe-eval`/`unsafe-inline`.

**Fix Steps:**
1. Replace wildcards with specific domains:
   ```typescript
   "connect-src 'self' https://jbreuzfssbcqgwahugfn.supabase.co"
   ```
2. Remove `'unsafe-eval'` and `'unsafe-inline'` from script-src
3. Use nonces for inline scripts if needed

---

## MEDIUM SEVERITY

### 4. In-Memory Rate Limiting

**File:** `src/lib/rate-limit.ts:4`

Using `Map` for rate limiting doesn't work across serverless instances.

**Fix Steps:**
1. Implement Redis-based rate limiting for production
2. Use Upstash Redis (Vercel-friendly) or similar
3. Update fallback identifier from `'anonymous'` to reject requests without IP

---

### 5. PII in Console Logs

**Files:** `src/lib/auth.ts:83,143,148,152,155`, `src/app/api/admin/pending-users/[id]/reject/route.ts`

Email addresses and user IDs logged in production.

**Fix Steps:**
1. Remove or mask email addresses in logs:
   ```typescript
   // Before
   console.log(`Notification for: ${user.email}`)
   // After
   console.log(`Notification for user: ${user.id}`)
   ```
2. Use structured logging with separate PII fields filtered in production

---

### 6. Missing Rate Limiting on Admin Endpoints

**File:** `src/app/api/admin/pending-users/[id]/approve/route.ts`

No rate limiting on user approval/rejection.

**Fix Steps:**
1. Add rate limiting wrapper:
   ```typescript
   const rateLimit = await checkRateLimit(request, RateLimit.Mutation())
   if (!rateLimit.success) {
     return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
   }
   ```

---

### 7. Hardcoded URLs

**Files:** `src/lib/auth.ts:118-119`, `src/app/api/admin/pending-users/[id]/approve/route.ts:85,93`

Hardcoded `fridaygt.com` in email templates.

**Fix Steps:**
1. Use environment variable: `process.env.NEXT_PUBLIC_APP_URL`
2. Set this variable per environment (dev/staging/prod)

---

## LOW SEVERITY

### 8. Gamertag Validation Missing

**File:** `src/lib/validation.ts`

No length or character restrictions on gamertags.

**Fix Steps:**
```typescript
gamertag: z.string()
  .min(3, 'Gamertag must be at least 3 characters')
  .max(20, 'Gamertag must be less than 20 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid characters')
  .optional()
```

---

## GOOD SECURITY PRACTICES FOUND

| Feature | Status |
|---------|--------|
| Row Level Security (RLS) | Properly enabled on all tables |
| SQL Injection Prevention | Using parameterized queries via Supabase |
| Input Validation | Zod schemas on all endpoints |
| Authorization Checks | Session verified on protected routes |
| CSRF Protection | NextAuth default enabled |
| HSTS Header | Properly configured |
| X-Content-Type-Options | nosniff enabled |

---

## REMEDIATION CHECKLIST

### Today (CRITICAL)
- [ ] Rotate Supabase service role key
- [ ] Rotate Supabase anon key
- [ ] Rotate Resend API key
- [ ] Generate new NEXTAUTH_SECRET
- [ ] Remove .env files from git history
- [ ] Force push cleaned history

### This Week (HIGH)
- [ ] Add MFA for admin accounts
- [ ] Fix CSP wildcards in `next.config.ts`
- [ ] Update `.gitignore` patterns

### Next Sprint (MEDIUM)
- [ ] Implement Redis rate limiting
- [ ] Remove PII from console.log statements
- [ ] Add rate limiting to admin endpoints
- [ ] Use environment variables for URLs

### Future (LOW)
- [ ] Add gamertag validation regex
- [ ] Implement structured logging
- [ ] Add comprehensive audit logging

---

## Database Security Summary

Your Supabase RLS policies are **correctly configured** in `supabase/migrations/done/enable-rls-v3.sql`. The `current_user_id()` function properly restricts data access. No SQL injection vulnerabilities found due to proper use of Supabase client with parameterized queries.

The primary database risk is the **exposed service role key** which bypasses all RLS policies.
