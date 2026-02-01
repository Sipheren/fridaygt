# FRIDAYGT SECURITY AUDIT & REMEDIATION GUIDE
**Date:** February 1, 2026
**Version:** 2.19.0

---

## EXECUTIVE SUMMARY

This is a **well-architected application** with strong security fundamentals. Your Row Level Security (RLS) is properly implemented, you have comprehensive input validation with Zod, and proper authorization checks throughout.

**CRITICAL ISSUES REQUIRE IMMEDIATE ATTENTION:**
1. Exposed API keys/secrets in git repository
2. Service role key usage bypasses RLS
3. Missing distributed rate limiting

---

## 🔴 CRITICAL SEVERITY ISSUES

---

### ISSUE #1: Exposed Credentials in Repository

**Severity:** CRITICAL
**Risk:** Unauthorized database access, email abuse, session hijacking

**What's Exposed:**
| Credential | Location | Risk Level |
|------------|----------|------------|
| `SUPABASE_SERVICE_ROLE_KEY` | `.env` file | 🔴 CRITICAL - Bypasses all RLS, full database access |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env` file | 🟠 HIGH - Project access |
| `RESEND_API_KEY` | `.env` file | 🟠 HIGH - Email spam/phishing abuse |
| `NEXTAUTH_SECRET` | `.env` file | 🔴 CRITICAL - Session token forgery |
| `DEFAULT_ADMIN_EMAIL` | `.env` file | 🟡 MEDIUM - Email exposed |
| `VERCEL_OIDC_TOKEN` | `.env` file | 🔴 CRITICAL - Deployment access |

---

#### STEP-BY-STEP FIX INSTRUCTIONS

**STEP 1: Immediately Rotate All Exposed Keys**

1. **Rotate Supabase Service Role Key:**
   - Go to: https://supabase.com/dashboard
   - Select your project: `jbreuzfssbcqgwahugfn`
   - Navigate to: Settings → API
   - Click "Regenerate" next to `service_role` key
   - **Important:** Copy the new key immediately

2. **Rotate Supabase Anon Key:**
   - Same page in Supabase dashboard
   - Click "Regenerate" next to `anon` public key
   - Copy the new key

3. **Rotate NextAuth Secret:**
   - Generate a new random secret:
   ```bash
   openssl rand -base64 32
   ```
   - Save the output

4. **Rotate Resend API Key:**
   - Go to: https://resend.com/api-keys
   - Delete the existing API key
   - Create a new API key
   - Copy the new key

5. **Revoke Vercel OIDC Token:**
   - Go to: https://vercel.com/account/tokens
   - Find and delete the exposed token
   - Create a new token if needed

**STEP 2: Update Local Environment**

Create a new `.env.local` file with your NEW credentials:

```bash
# From your project root
cat > .env.local << 'EOF'
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://jbreuzfssbcqgwahugfn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<YOUR_NEW_ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<YOUR_NEW_SERVICE_ROLE_KEY>

# NextAuth
NEXTAUTH_SECRET=<YOUR_NEW_SECRET>
NEXTAUTH_URL=http://localhost:3000

# Email
RESEND_API_KEY=<YOUR_NEW_RESEND_KEY>
EMAIL_FROM=noreply@fridaygt.com

# Admin
DEFAULT_ADMIN_EMAIL=david@sipheren.com
EOF
```

**STEP 3: Update Production Environment (Vercel)**

1. Go to: https://vercel.com/david-sipheren/fridaygt/settings/environment-variables
2. For each variable:
   - Click the variable
   - Paste the NEW value
   - Save

3. **Redeploy immediately:**
   ```bash
   # Trigger a production deployment
   git push
   ```

**STEP 4: Remove .env Files from Git History**

```bash
# Install git-filter-repo (macOS)
brew install git-filter-repo

# Create a backup branch first
git branch backup-before-cleanup

# Remove .env and .env.local from entire git history
git filter-repo --path .env --path .env.local --invert-paths

# Force push to remote (WARNING: This rewrites history)
git push origin --force --all
git push origin --force --tags
```

**STEP 5: Verify .gitignore is Correct**

```bash
# Check your .gitignore contains these lines
cat .gitignore | grep -E "^\.env"
```

Expected output should include:
```
.env
.env.local
.env.*.local
```

If not, add them:
```bash
cat >> .gitignore << 'EOF'

# Environment variables
.env
.env.local
.env.*.local
EOF
```

**STEP 6: Verify Cleanup**

```bash
# Check that .env is not tracked
git status

# Should NOT show .env or .env.local

# Verify they're not in git history
git log --all --full-history -- .env
# Should return: "fatal: bad default revision 'refs/heads/...'" or no commits

# Search for any remaining secrets in history
git log --all --pretty=format:"%H" -- .env
git log --all --pretty=format:"%H" -- .env.local
```

**STEP 7: Monitor for Suspicious Activity**

- Check Supabase logs: https://supabase.com/dashboard → Logs
- Check Resend logs: https://resend.com/logs
- Look for unusual API activity
- Consider implementing audit logging (see Issue #6)

---

### ISSUE #2: Service Role Key Bypasses RLS

**Severity:** CRITICAL
**Location:** All API routes use `/src/lib/supabase/service-role.ts`

**The Problem:**
The service role key bypasses Row Level Security. Every API route must authenticate first, or this creates a privilege escalation vulnerability.

**Current Usage:**
```typescript
// Used in EVERY API route
import { createServiceRoleClient } from '@/lib/supabase/service-role'
const supabase = createServiceRoleClient()
```

---

#### STEP-BY-STEP FIX INSTRUCTIONS

**STEP 1: Audit All Service Role Usage**

Run this to find all usages:
```bash
grep -r "createServiceRoleClient" src/app/api/ --include="*.ts" --include="*.tsx"
```

**STEP 2: Verify Each Route Has Auth Checks**

Each API route should follow this pattern:

```typescript
// ✅ CORRECT PATTERN
import { getCurrentUser } from '@/lib/auth-utils'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function POST(request: NextRequest) {
  // 1. Authenticate FIRST
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Get user data
  const currentUser = await getCurrentUser(session)
  if (!currentUser) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }

  // 3. NOW use service role client (safe because user is authenticated)
  const supabase = createServiceRoleClient()

  // 4. Add ownership check for user data
  const { data, error } = await supabase
    .from('CarBuild')
    .select('*')
    .eq('userId', currentUser.id)  // Ownership check
    .single()
}
```

**STEP 3: Add Warning Comment to Service Role Client**

Edit `/src/lib/supabase/service-role.ts`:

```typescript
/**
 * ⚠️ CRITICAL: Service Role Client
 *
 * This client bypasses Row Level Security (RLS) and has full database access.
 *
 * REQUIREMENTS BEFORE USE:
 * 1. User MUST be authenticated via getServerSession()
 * 2. User MUST be authorized via getCurrentUser()
 * 3. All queries MUST include ownership checks (userId === currentUser.id)
 * 4. Admin endpoints MUST verify isAdmin(currentUser)
 *
 * NEVER use this client without proper authentication.
 */
export function createServiceRoleClient() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  return supabase
}
```

**STEP 4: Add ESLint Rule for Service Role Usage**

Create `.eslintrc.security.json`:

```json
{
  "rules": {
    "no-restricted-imports": ["error", {
      "name": "@/lib/supabase/service-role",
      "message": "Service role client bypasses RLS. Ensure authentication is implemented before using."
    }]
  }
}
```

**STEP 5: Add Test Cases**

Create `src/__tests__/api-security.test.ts`:

```typescript
import { createServiceRoleClient } from '@/lib/supabase/service-role'

describe('Service Role Security', () => {
  it('should require authentication before use', async () => {
    // Test that unauthenticated requests fail
    const response = await fetch('/api/builds', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test' })
    })
    expect(response.status).toBe(401)
  })

  it('should enforce ownership checks', async () => {
    // Test that users can't access other users' data
    const session = await loginAsUser()
    const response = await fetch('/api/builds/other-users-build-id', {
      headers: { Authorization: `Bearer ${session.token}` }
    })
    expect(response.status).toBe(403)
  })
})
```

**STEP 6: Document API Security Patterns**

Create `docs/API_SECURITY.md`:

```markdown
# API Security Guidelines

## Authentication Pattern

All API routes must follow this pattern:

1. Get session: `const session = await getServerSession(authOptions)`
2. Verify user: `const user = await getCurrentUser(session)`
3. Check authorization: `if (!isAdmin(user)) return 403`
4. Add ownership filters: `.eq('userId', user.id)`
5. Then use service role client

## Checklist

- [ ] Session validated
- [ ] User fetched from database
- [ ] Role checked (for admin routes)
- [ ] Ownership verified (for user data)
- [ ] Query includes userId filter
```

---

### ISSUE #3: Missing Distributed Rate Limiting

**Severity:** HIGH
**Location:** `src/lib/rate-limit.ts`

**The Problem:**
Your rate limiting uses an in-memory `Map` which resets on every serverless function restart. Attackers can bypass rate limits by sending requests to different server instances.

---

#### STEP-BY-STEP FIX INSTRUCTIONS

**STEP 1: Install Vercel KV (Redis)**

```bash
npm install @vercel/kv
```

**STEP 2: Update Environment Variables**

Add to `.env.local`:
```bash
# Vercel KV (automatically configured by Vercel)
# No manual configuration needed in production
# For local development, use Redis:
# KV_URL=redis://localhost:6379
```

**STEP 2: Rewrite Rate Limiter**

Edit `src/lib/rate-limit.ts`:

```typescript
import { kv } from '@vercel/kv'

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

export interface RateLimitConfig {
  requests: number
  window: number // in seconds
}

const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  auth: { requests: 5, window: 60 },
  mutation: { requests: 20, window: 60 },
  query: { requests: 100, window: 60 },
}

function getIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0] || 'anonymous'

  if (ip === 'anonymous') {
    throw new Error('Cannot identify request source')
  }

  return `ratelimit:${ip}`
}

export async function checkRateLimit(
  request: Request,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const identifier = getIdentifier(request)
  const key = `${identifier}:${Math.floor(Date.now() / 1000 / config.window)}`

  // Get current count
  const current = await kv.get<number>(key) || 0

  if (current >= config.requests) {
    return {
      success: false,
      limit: config.requests,
      remaining: 0,
      reset: Math.ceil((Math.floor(Date.now() / 1000 / config.window) + 1) * config.window)
    }
  }

  // Increment counter
  const newValue = await kv.incr(key)

  // Set expiry on first request
  if (newValue === 1) {
    await kv.expire(key, config.window)
  }

  return {
    success: true,
    limit: config.requests,
    remaining: config.requests - newValue,
    reset: Math.ceil((Math.floor(Date.now() / 1000 / config.window) + 1) * config.window)
  }
}

export function RateLimit(type: keyof typeof DEFAULT_LIMITS): RateLimitConfig {
  return DEFAULT_LIMITS[type]
}
```

**STEP 3: Update All API Routes**

For each API route, wrap with rate limit check:

```typescript
import { checkRateLimit, RateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // Check rate limit FIRST
  const rateLimit = await checkRateLimit(request, RateLimit.Mutation())
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimit.limit.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.reset.toString(),
          'Retry-After': Math.ceil((rateLimit.reset - Date.now() / 1000)).toString()
        }
      }
    )
  }

  // ... rest of your handler
}
```

**STEP 4: Configure Vercel KV**

1. Go to: https://vercel.com/dashboard
2. Select your project: fridaygt
3. Go to: Storage → Create Database → KV
4. Select the Hobby plan (free tier available)
5. Link to your project

**STEP 5: Test Rate Limiting**

```bash
# Install redis-cli for local testing
brew install redis

# Start local Redis
redis-server

# Test rate limiting
curl -X POST http://localhost:3000/api/builds
# Repeat 20+ times
# Should get 429 after limit
```

**STEP 6: Add Monitoring**

```typescript
// Add to your rate limiter
if (!rateLimit.success) {
  // Log to your monitoring service
  console.warn(`Rate limit exceeded for ${identifier}`)

  // Optional: Send alert to Sentry/DataDog
  // Sentry.captureMessage('Rate limit exceeded', { extra: { identifier } })
}
```

---

## 🟠 HIGH SEVERITY ISSUES

---

### ISSUE #4: Infinite Magic Link Expiry

**Severity:** HIGH
**Location:** `src/lib/auth.ts`

**The Problem:**
Magic links from NextAuth don't expire by default. If an attacker gains access to a user's email, they can use old magic links to sign in.

---

#### STEP-BY-STEP FIX INSTRUCTIONS

**STEP 1: Update NextAuth Configuration**

Edit `src/lib/auth.ts`, find the session callback and add maxAge:

```typescript
// Find this section and update
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: SupabaseAdapter({...}),
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
  },
  providers: [
    Resend({
      from: process.env.EMAIL_FROM,
      async sendVerificationRequest({ identifier: email, url, provider }) {
        // ... existing email code
      },
    }),
  ],

  // ADD THIS: Magic link expiration
  callbacks: {
    async session({ session, user }) {
      // ... existing session code
    },

    // ADD SIGN-IN CALLBACK TO SET TOKEN EXPIRY
    async signIn({ user, account, profile, email, credentials }) {
      return true
    },

    // ADD JWT CALLBACK
    async jwt({ token, user, account, trigger, session }) {
      // Add token expiration
      if (user) {
        token.exp = Math.floor(Date.now() / 1000) + (15 * 60) // 15 minutes
      }
      return token
    },
  },

  // SET MAX AGE FOR VERIFICATION TOKENS
  // This requires a database migration
})
```

**STEP 2: Create Migration for Token Expiry**

Create `supabase/migrations/done/add-token-expiry.sql`:

```sql
-- Add expires_at column to VerificationToken
ALTER TABLE "VerificationToken"
ADD COLUMN "expires_at" TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '15 minutes');

-- Create index for cleanup queries
CREATE INDEX idx_verification_token_expires_at ON "VerificationToken"("expires_at");

-- Function to clean expired tokens
CREATE OR REPLACE FUNCTION clean_expired_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM "VerificationToken" WHERE "expires_at" < NOW();
END;
$$ LANGUAGE plpgsql;
```

Run migration:
```bash
npx supabase db push
```

**STEP 3: Update Email Sending Logic**

Edit `src/lib/auth.ts`, find the Resend provider and update:

```typescript
Resend({
  from: process.env.EMAIL_FROM,
  maxAge: 15 * 60, // 15 minutes
  async sendVerificationRequest({ identifier: email, url, provider }) {
    const user = await db.getUserByEmail(email)

    // Store token with expiry
    const token = url.split('/').pop()
    await db.setVerificationToken(token, email, new Date(Date.now() + 15 * 60 * 1000))

    await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Sign in to FridayGT',
      react: VerificationEmail({ magicLink: url }),
    })
  },
})
```

**STEP 4: Add Token Cleanup Job**

Create `src/app/api/cron/cleanup-tokens/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()

  // Clean expired tokens
  await supabase.rpc('clean_expired_tokens')

  return NextResponse.json({ success: true })
}
```

Set up cron in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-tokens",
      "schedule": "0 * * * *"
    }
  ]
}
```

---

### ISSUE #5: Admin Auto-Promotion Vulnerability

**Severity:** HIGH
**Location:** `src/lib/auth.ts:159-166`

**The Problem:**
Any user registering with `david@sipheren.com` automatically gets ADMIN role. If your email is compromised, attackers get admin access.

---

#### STEP-BY-STEP FIX INSTRUCTIONS

**STEP 1: Remove Auto-Promotion Logic**

Edit `src/lib/auth.ts`:

```typescript
// FIND THIS CODE AND REMOVE IT:
// if (session.user.email === process.env.DEFAULT_ADMIN_EMAIL) {
//   const { data: adminUser } = await supabase
//     .from('User')
//     .update({ role: 'ADMIN' })
//     .eq('id', session.user.id)
//     .select()
//     .single()
// }

// REPLACE WITH:
// No auto-promotion. All admin changes must be manual.
```

**STEP 2: Create Initial Admin via SQL**

Create `supabase/migrations/done/set-initial-admin.sql`:

```sql
-- Set the initial admin account by email
-- Run this once to promote your account to admin
UPDATE "User"
SET "role" = 'ADMIN'
WHERE "email" = 'david@sipheren.com';

-- Verify the update
DO $$
DECLARE
  admin_count integer;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM "User" WHERE "role" = 'ADMIN';
  IF admin_count = 0 THEN
    RAISE EXCEPTION 'No admin account found. Please verify email address.';
  END IF;
END $$;
```

**STEP 3: Add MFA Requirement for Admin Accounts**

Install MFA library:
```bash
npm install @simplewebauthn/browser @simplewebauthn/server
```

Create `src/lib/mfa.ts`:
```typescript
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  generateRegistrationOptions,
  verifyRegistrationResponse
} from '@simplewebauthn/server'

export async function requireAdminMFA(userId: string) {
  // Check if user has MFA enrolled
  const supabase = createServiceRoleClient()
  const { data: user } = await supabase
    .from('User')
    .select('mfaEnabled')
    .eq('id', userId)
    .single()

  if (user?.role === 'ADMIN' && !user?.mfaEnabled) {
    throw new Error('Admin accounts must have MFA enabled')
  }
}
```

**STEP 4: Add Admin Audit Logging**

Create migration `supabase/migrations/done/add-admin-audit-log.sql`:

```sql
CREATE TABLE "AdminAuditLog" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "adminId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "action" TEXT NOT NULL,
  "targetId" UUID,
  "targetType" TEXT,
  "details" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_log_admin_id ON "AdminAuditLog"("adminId");
CREATE INDEX idx_admin_audit_log_timestamp ON "AdminAuditLog"("timestamp");
```

**STEP 5: Create Audit Logging Helper**

Create `src/lib/audit-log.ts`:

```typescript
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { headers } from 'next/headers'

interface AuditLogParams {
  adminId: string
  action: string
  targetId?: string
  targetType?: string
  details?: Record<string, any>
}

export async function logAdminAction(params: AuditLogParams) {
  const supabase = createServiceRoleClient()

  // Get request metadata
  const headersList = headers()
  const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  const userAgent = headersList.get('user-agent') || 'unknown'

  await supabase.from('AdminAuditLog').insert({
    adminId: params.adminId,
    action: params.action,
    targetId: params.targetId,
    targetType: params.targetType,
    details: params.details,
    ipAddress,
    userAgent,
  })
}
```

**STEP 6: Add Audit Logging to Admin Endpoints**

Edit each admin route, e.g., `src/app/api/admin/pending-users/[id]/approve/route.ts`:

```typescript
import { logAdminAction } from '@/lib/audit-log'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // ... existing auth checks ...

  // Log the approval
  await logAdminAction({
    adminId: currentUser.id,
    action: 'APPROVE_USER',
    targetId: params.id,
    targetType: 'User',
    details: { userEmail: user.email }
  })

  // ... rest of your code ...
}
```

---

### ISSUE #6: Overly Permissive Content Security Policy

**Severity:** HIGH
**Location:** `next.config.ts:34-48`

**The Problem:**
Your CSP uses `*.supabase.co` (any Supabase project) and allows `unsafe-eval`/`unsafe-inline`.

---

#### STEP-BY-STEP FIX INSTRUCTIONS

**STEP 1: Replace Wildcards with Specific Domains**

Edit `next.config.ts`:

```typescript
// FIND THIS SECTION:
// contentSecurityPolicy: {
//   defaultSrc: ["'self'"],
//   ...
//   connectSrc: ["'self'", "*.supabase.co"], // ❌ TOO PERMISSIVE
// }

// REPLACE WITH:
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  block-all-mixed-content;
  upgrade-insecure-requests;
  connect-src 'self' https://jbreuzfssbcqgwahugfn.supabase.co;
`

// Remove *.supabase.co wildcard
// Use only YOUR specific Supabase project URL
```

**STEP 2: Implement Nonce-Based CSP (Advanced)**

Edit `next.config.ts`:

```typescript
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: (() => {
      // Nonce is generated per-request in middleware
      // This is a placeholder - see Step 3
      return cspHeader
    })()
  }
]
```

**STEP 3: Add Per-Request Nonce Generation**

Create `src/lib/csp.ts`:

```typescript
import crypto from 'crypto'

export function generateCspNonce() {
  return crypto.randomBytes(16).toString('base64')
}

export function getCspHeader(nonce: string) {
  return `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}';
    style-src 'self' 'nonce-${nonce}';
    connect-src 'self' https://jbreuzfssbcqgwahugfn.supabase.co;
  `.replace(/\s{2,}/g, ' ').trim()
}
```

**STEP 4: Update Middleware to Set Nonce**

Edit `src/middleware.ts`:

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { generateCspNonce, getCspHeader } from '@/lib/csp'

export function middleware(request: NextRequest) {
  const nonce = generateCspNonce()
  const csp = getCspHeader(nonce)

  const response = NextResponse.next()

  // Set CSP header
  response.headers.set('Content-Security-Policy', csp)

  // Pass nonce to page via header
  response.headers.set('x-nonce', nonce)

  return response
}
```

**STEP 5: Update Layout to Use Nonce**

Edit `src/app/layout.tsx`:

```typescript
import { headers } from 'next/headers'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = headers()
  const nonce = headersList.get('x-nonce') || ''

  return (
    <html lang="en">
      <head>
        <script nonce={nonce} src="/path/to/script.js" />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

**STEP 6: Test CSP**

```bash
# Install CSP evaluator
npm install -g csp-evaluator

# Test your CSP
curl -I https://fridaygt.com
# Copy the Content-Security-Policy header
csp-evaluator "default-src 'self'; ..."
```

---

## 🟡 MEDIUM SEVERITY ISSUES

---

### ISSUE #7: PII in Console Logs

**Severity:** MEDIUM
**Locations:**
- `src/lib/auth.ts:83,143,148,152,155`
- `src/app/api/admin/pending-users/[id]/reject/route.ts`

**The Problem:**
Email addresses are logged in production, which may expose user data.

---

#### STEP-BY-STEP FIX INSTRUCTIONS

**STEP 1: Update src/lib/auth.ts**

```typescript
// FIND AND REPLACE ALL INSTANCES:
// console.log(`Notification for: ${user.email}`)
// console.log(`Admin approval for: ${email}`)

// WITH:
console.log(`Notification for user: ${user.id}`)
console.log(`Admin approval for user: ${userId}`)
```

**STEP 2: Create Structured Logging Utility**

Create `src/lib/logger.ts`:

```typescript
type LogLevel = 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  userId?: string
  email?: string
  [key: string]: any
}

const isProduction = process.env.NODE_ENV === 'production'

export function log(entry: LogEntry) {
  // In production, mask PII
  const safeEntry = isProduction
    ? {
        ...entry,
        email: entry.email ? maskEmail(entry.email) : undefined,
      }
    : entry

  // Use appropriate log level
  const logFn = entry.level === 'error' ? console.error :
                 entry.level === 'warn' ? console.warn :
                 console.log

  logFn(JSON.stringify(safeEntry))
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return '***@***'

  const maskedLocal = local.charAt(0) + '***'
  const [domainName, ...domainParts] = domain.split('.')
  const maskedDomain = domainName.charAt(0) + '***.' + domainParts.join('.')

  return `${maskedLocal}@${maskedDomain}`
}
```

**STEP 3: Update All Console.log Statements**

```typescript
// BEFORE:
console.log(`User ${user.email} signed in`)

// AFTER:
import { log } from '@/lib/logger'

log({
  level: 'info',
  message: 'User signed in',
  userId: user.id,
  email: user.email, // Automatically masked in production
})
```

---

### ISSUE #8: Missing Rate Limiting on Admin Endpoints

**Severity:** MEDIUM
**Location:** `src/app/api/admin/pending-users/[id]/approve/route.ts`

**The Problem:**
Admin approval endpoints have no rate limiting, allowing rapid approval/rejection spam.

---

#### STEP-BY-STEP FIX INSTRUCTIONS

**STEP 1: Add Rate Limiting to All Admin Routes**

Edit each admin route, e.g., `src/app/api/admin/pending-users/[id]/approve/route.ts`:

```typescript
import { checkRateLimit, RateLimit } from '@/lib/rate-limit'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // ADD THIS AT THE START:
  const rateLimit = await checkRateLimit(request, RateLimit.Mutation())
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    )
  }

  // ... rest of your existing code ...
}
```

**STEP 2: Apply to All Admin Endpoints**

```bash
# Find all admin routes
find src/app/api/admin -name "route.ts" -exec grep -L "checkRateLimit" {} \;

# Expected files to update:
# src/app/api/admin/users/route.ts
# src/app/api/admin/users/[id]/route.ts
# src/app/api/admin/pending-users/route.ts
# src/app/api/admin/pending-users/[id]/route.ts
# src/app/api/admin/pending-users/[id]/approve/route.ts
# src/app/api/admin/pending-users/[id]/reject/route.ts
```

---

### ISSUE #9: Hardcoded URLs

**Severity:** MEDIUM
**Locations:**
- `src/lib/auth.ts:118-119`
- `src/app/api/admin/pending-users/[id]/approve/route.ts:85,93`

**The Problem:**
URLs are hardcoded as `fridaygt.com`, which breaks in development.

---

#### STEP-BY-STEP FIX INSTRUCTIONS

**STEP 1: Add Environment Variable**

Add to `.env.local`:
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Add to Vercel environment variables:
```bash
NEXT_PUBLIC_APP_URL=https://fridaygt.com
```

**STEP 2: Update Email Templates**

Edit `src/lib/email.tsx`:

```typescript
// FIND:
// <a href="https://fridaygt.com/auth/...">

// REPLACE WITH:
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Then use:
<a href={`${appUrl}/auth/...`}>
```

**STEP 3: Update src/lib/auth.ts**

```typescript
// FIND all hardcoded URLs
const baseUrl = 'https://fridaygt.com'

// REPLACE WITH:
const getBaseUrl = () => {
  if (typeof window !== 'undefined') return window.location.origin
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}
```

---

## 🟢 LOW SEVERITY ISSUES

---

### ISSUE #10: Weak Gamertag Validation

**Severity:** LOW
**Location:** `src/lib/validation.ts`

**The Problem:**
No validation on gamertag length or characters.

---

#### STEP-BY-STEP FIX INSTRUCTIONS

**STEP 1: Add Gamertag Validation Schema**

Edit `src/lib/validation.ts`:

```typescript
// FIND:
// gamertag: z.string().optional()

// REPLACE WITH:
gamertag: z.string()
  .min(3, 'Gamertag must be at least 3 characters')
  .max(20, 'Gamertag must be less than 20 characters')
  .regex(
    /^[a-zA-Z0-9_\-\s]+$/,
    'Gamertag can only contain letters, numbers, spaces, hyphens, and underscores'
  )
  .trim()
  .optional()
```

**STEP 2: Add Profanity Filter (Optional)**

```bash
npm install bad-words
```

```typescript
import { Filter } from 'bad-words'

const filter = new Filter()

gamertag: z.string()
  .min(3, 'Gamertag must be at least 3 characters')
  .max(20, 'Gamertag must be less than 20 characters')
  .regex(/^[a-zA-Z0-9_\-\s]+$/, 'Invalid characters')
  .refine((val) => !filter.isProfanity(val), {
    message: 'Gamertag contains inappropriate language',
  })
  .trim()
  .optional()
```

---

## ✅ SECURITY CHECKLIST

Use this checklist to track your progress:

### Today (CRITICAL)
- [ ] Rotate Supabase service role key
- [ ] Rotate Supabase anon key
- [ ] Rotate Resend API key
- [ ] Generate new NEXTAUTH_SECRET
- [ ] Revoke Vercel OIDC token
- [ ] Remove .env files from git history
- [ ] Force push cleaned history
- [ ] Update .gitignore
- [ ] Update all environment variables

### This Week (HIGH)
- [ ] Implement distributed rate limiting with Vercel KV
- [ ] Add magic link expiration (15 minutes)
- [ ] Fix CSP wildcards in next.config.ts
- [ ] Remove admin auto-promotion logic
- [ ] Create initial admin via SQL migration
- [ ] Add admin audit logging table
- [ ] Add audit logging to all admin routes

### Next Sprint (MEDIUM)
- [ ] Remove PII from console.log statements
- [ ] Implement structured logging
- [ ] Add rate limiting to admin endpoints
- [ ] Use environment variables for URLs
- [ ] Add nonce-based CSP (optional)

### Future (LOW)
- [ ] Add gamertag validation regex
- [ ] Add profanity filter
- [ ] Implement comprehensive audit logging dashboard
- [ ] Add MFA for admin accounts
- [ ] Add security monitoring/alerting

---

## SUMMARY

Your application has a **solid security foundation**. The main issues are:

1. **Exposed credentials** (CRITICAL) - Rotate immediately
2. **Service role usage** (requires careful handling) - Document and audit
3. **Rate limiting** (in-memory doesn't scale) - Implement Redis/Vercel KV
4. **Magic link expiry** (infinite lifetime) - Add 15-minute expiration
5. **Admin security** (auto-promotion, no audit logging) - Remove auto-promotion, add logging

After addressing the critical and high-priority issues, your application will have **strong security posture** suitable for production use.

---

**Questions?** Need clarification on any step? Let me know!
