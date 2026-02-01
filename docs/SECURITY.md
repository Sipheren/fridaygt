# FridayGT Security Model & Access Control

**Last Updated:** 2026-02-02
**Version:** 2.20.2

---

## Table of Contents
1. [User Roles](#user-roles)
2. [Authentication](#authentication)
3. [Authorization](#authorization)
4. [Access Control Matrix](#access-control-matrix)
5. [API Security](#api-security)
6. [Database Security](#database-security)
7. [Public vs Private Access](#public-vs-private-access)
8. [Security Best Practices](#security-best-practices)

---

## User Roles

FridayGT uses a role-based access control (RBAC) system with three roles:

| Role | Description | Default State |
|------|-------------|---------------|
| **PENDING** | New user awaiting admin approval | ✓ Yes |
| **USER** | Approved regular user with full access | - |
| **ADMIN** | Administrator with management privileges | - |

**Role Hierarchy:** `ADMIN` > `USER` > `PENDING`

### PENDING Role
- **Purpose:** New users awaiting approval before accessing features
- **Capabilities:** Can view admin dashboard to see approval status
- **Limitations:** Cannot create/edit/delete any content
- **Path to USER:** Admin approval via `/api/admin/pending-users/[id]/approve`

### USER Role
- **Purpose:** Regular approved users with full feature access
- **Capabilities:** Full CRUD on own resources, view public resources
- **Limitations:** Cannot manage users, cannot modify others' private data
- **Path to ADMIN:** Promoted by admin via user management or database

### ADMIN Role
- **Purpose:** Administrators with system management capabilities
- **Capabilities:** Everything USER can do + user management + modify any resource
- **Privileges:** Bypasses ownership checks, can reorder races, manage all data
- **Obtained by:** Promoted by existing admin

---

## Authentication

### Provider
- **Library:** NextAuth.js v5
- **Provider:** Resend (email magic links)
- **Method:** Passwordless authentication with time-limited magic links
- **Session Storage:** PostgreSQL database via Supabase adapter
- **Session Duration:** 30 days (configurable)

### Authentication Flow

1. **Sign In Request:** User enters email
2. **Magic Link:** Email sent with time-limited token (15 minutes)
3. **Session Creation:** Successful auth creates session in database via Supabase adapter
4. **Role Assignment:** Session callback fetches `role` from `User` table
5. **Auto-Promotion:** If email matches `DEFAULT_ADMIN_EMAIL`, automatically promoted to ADMIN
6. **Admin Notification:** For PENDING users, admins receive email notification (once per user)
7. **Access Granted:** User gains access based on role

### Session Configuration

**File:** `src/lib/auth.ts`

```typescript
export const { handlers, auth } = NextAuth({
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    Resend({
      from: process.env.EMAIL_FROM!,
      apiKey: process.env.RESEND_API_KEY!,
      maxAge: 15 * 60, // 15 minutes
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      // Attach user ID and fetch role from User table
      session.user.id = user.id

      const supabase = createClient(/* service role */)
      const { data: dbUser } = await supabase
        .from('User')
        .select('role, gamertag')
        .eq('id', user.id)
        .single()

      session.user.role = dbUser?.role || 'PENDING'
      session.user.gamertag = dbUser?.gamertag || undefined

      // Notify admins about pending users (atomic, prevents duplicates)
      // Auto-promote DEFAULT_ADMIN_EMAIL to ADMIN

      return session
    },
  },
})
```

**Environment Variables Required:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `RESEND_API_KEY` - Resend API key for email
- `EMAIL_FROM` - Sender email address
- `DEFAULT_ADMIN_EMAIL` - Auto-promoted admin email (bootstrap)

**Security Notes:**
- Sessions stored in database (survives server restarts)
- Role fetched from User table on every session (real-time updates)
- Magic links expire after 15 minutes
- No passwords stored (reduces attack surface)
- Admin notifications sent atomically (prevents duplicate emails)
- Auto-promotion of default admin for bootstrapping

---

## Authorization

### Authorization Functions

**File:** `src/lib/auth-utils.ts`

#### 1. isAdmin() - Role Type Guard

```typescript
export function isAdmin(session: Session | null): session is Session & {
  user: { email: string; role: 'ADMIN'; }
}
```

**Purpose:** Check if user has ADMIN role and narrow TypeScript type

**Usage:**
```typescript
const session = await auth()
if (isAdmin(session)) {
  // TypeScript knows session.user.role === 'ADMIN'
  // Admin-only code here
}
```

**Returns:** `true` if ADMIN, `false` otherwise

#### 2. getCurrentUser() - Fetch User Data

```typescript
export async function getCurrentUser<T extends keyof DbUser = 'id'>(
  session: Session | null,
  selectFields: T[] = ['id']
): Promise<Pick<DbUser, T> | null>
```

**Purpose:** Fetch user data from database for ownership checks

**Usage:**
```typescript
const userData = await getCurrentUser(session, ['id', 'role', 'gamertag'])
if (userData?.id === resource.userId) {
  // User owns this resource
}
```

**Why Service Role Client:** Bypasses RLS to fetch user data (safe because filtering by session email)

### Authorization Pattern

All API routes follow this pattern:

```typescript
export async function PATCH(request) {
  // 1. Authenticate
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Authorize (role check)
  if (!isAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 3. Verify ownership (for non-admins)
  const userData = await getCurrentUser(session)
  if (userData?.id !== resource.userId && !isAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 4. Perform action
  // ... code here
}
```

---

## Rate Limiting

### Implementation

**File:** `src/lib/rate-limit.ts`

FridayGT uses in-memory rate limiting to protect API endpoints from abuse and DoS attacks.

**Type:** In-memory Map (suitable for single-instance deployments)
**Future:** Redis/Vercel KV planned for distributed rate limiting

### Rate Limit Tiers

| Tier | Limit | Window | Use Case |
|------|-------|--------|----------|
| **Auth** | 5 requests | 1 minute | Authentication endpoints |
| **Mutation** | 20 requests | 1 minute | POST, PATCH, DELETE operations |
| **Query** | 100 requests | 1 minute | GET operations |
| **Expensive** | 3 requests | 1 minute | Resource-intensive operations |

### Response Headers

All rate-limited endpoints include standard headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2026-02-02T12:00:00.000Z
Retry-After: 30
```

**When limit exceeded:**
- HTTP Status: `429 Too Many Requests`
- Body: `{ error: "Too many requests, please try again later." }`

### Usage Pattern

```typescript
import { checkRateLimit, rateLimitHeaders, RateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // Check rate limit
  const rateLimit = await checkRateLimit(request, RateLimit.Mutation())

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    )
  }

  // Handle request...
}
```

### IP Address Detection

Rate limiting identifies clients by IP address using these headers (in order):
1. `x-forwarded-for` - Proxies/load balancers
2. `x-real-ip` - Nginx/Apache
3. `cf-connecting-ip` - Cloudflare

**Security:** Requests without identifiable IPs are rejected to prevent bypass.

### Protected Endpoints

Rate limiting is applied to:
- `/api/auth/[...nextauth]` - Auth endpoints (5/min)
- `/api/builds` - Build mutations (20/min)
- `/api/lap-times` - Lap time mutations (20/min)
- `/api/races` - Race mutations (20/min)
- All admin endpoints (20/min)
- Public query endpoints (100/min)

---

## Access Control Matrix

### By Resource Type

| Resource | Action | Public | PENDING | USER | ADMIN | Notes |
|----------|--------|--------|---------|------|-------|-------|
| **Cars** | View | ✓ | ✓ | ✓ | ✓ | Reference data |
| **Tracks** | View | ✓ | ✓ | ✓ | ✓ | Reference data |
| **Parts** | View | ✓ | ✓ | ✓ | ✓ | Reference data |
| **Settings** | View | ✓ | ✓ | ✓ | ✓ | Reference data |
| **Builds** | View public | ✗ | ✗ | ✓ | ✓ | isPublic=true |
| **Builds** | View own | ✗ | ✗ | ✓ | ✓ | userId=current |
| **Builds** | Create | ✗ | ✗ | ✓ | ✓ | Requires USER |
| **Builds** | Edit own | ✗ | ✗ | ✓ | ✓ | Requires USER |
| **Builds** | Edit any | ✗ | ✗ | ✗ | ✓ | Admin only |
| **Builds** | Delete own | ✗ | ✗ | ✓ | ✓ | Requires USER |
| **Builds** | Delete any | ✗ | ✗ | ✗ | ✓ | Admin only |
| **Builds** | Clone public | ✗ | ✗ | ✓ | ✓ | isPublic=true |
| **Builds** | Clone own | ✗ | ✗ | ✓ | ✓ | userId=current |
| **Lap Times** | View any | ✗ | ✗ | ✓ | ✓ | All visible |
| **Lap Times** | Create | ✗ | ✗ | ✓ | ✓ | Requires USER |
| **Lap Times** | Delete own | ✗ | ✗ | ✓ | ✓ | Requires USER |
| **Races** | View any | ✗ | ✗ | ✓ | ✓ | All visible |
| **Races** | Create | ✗ | ✗ | ✓ | ✓ | Requires USER |
| **Races** | Edit own | ✗ | ✗ | ✓ | ✓ | CreatedById=current |
| **Races** | Edit any | ✗ | ✗ | ✗ | ✓ | Admin only |
| **Races** | Delete own | ✗ | ✗ | ✓ | ✓ | CreatedById=current |
| **Races** | Delete any | ✗ | ✗ | ✗ | ✓ | Admin only |
| **Race Members** | View | ✗ | ✗ | ✓ | ✓ | Public viewable |
| **Race Members** | Add/remove | ✗ | ✗ | ✗ | ✓ | Admin only |
| **Race Members** | Reorder | ✗ | ✗ | ✗ | ✓ | Admin only |
| **Users** | View all | ✗ | ✗ | ✗ | ✓ | Admin only |
| **Users** | Approve | ✗ | ✗ | ✗ | ✓ | Admin only |
| **Users** | Reject | ✗ | ✗ | ✗ | ✓ | Admin only |
| **Users** | Edit profile | ✗ | ✗ | ✓ (own) | ✓ | All users |
| **Users** | Change role | ✗ | ✗ | ✗ | ✓ | Admin only |

**Legend:**
- ✓ = Allowed
- ✗ = Blocked
- "own" = Resource where userId/createdById matches current user
- "public" = Resource where isPublic=true

---

## API Security

### Public Endpoints (No Authentication)

**Reference Data APIs:**

| Endpoint | Method | Access | Purpose |
|----------|--------|--------|---------|
| `/api/cars` | GET | Public | GT7 car catalog (552 cars) |
| `/api/tracks` | GET | Public | GT7 track catalog (118 tracks) |
| `/api/parts` | GET | Public | Parts catalog (72 parts) |
| `/api/parts/categories` | GET | Public | Part categories (5) |
| `/api/tuning-settings` | GET | Public | Tuning settings (17 settings) |
| `/api/tuning-settings/sections` | GET | Public | Tuning sections (6) |
| `/api/stats/[...slug]` | GET | Public | Statistics (counts for tracks, cars, builds, races, lap-times, users) |

**Characteristics:**
- ✓ No authentication required
- ✓ Read-only (GET methods only)
- ✓ Cached (1 hour browser + CDN cache)
- ✗ No mutations (POST, PATCH, DELETE blocked)
- ✓ Safe to expose publicly

### Protected Endpoints (Authentication Required)

#### Build Management APIs

| Endpoint | Method | Role Required | Ownership Check |
|----------|--------|--------------|------------------|
| `/api/builds` | GET | USER/PENDING | Filter: own + public |
| `/api/builds` | POST | USER | - |
| `/api/builds/[id]` | GET | USER/PENDING | Public or own |
| `/api/builds/[id]` | PATCH | USER (own) / ADMIN (any) | ✓ |
| `/api/builds/[id]` | DELETE | USER (own) / ADMIN (any) | ✓ |
| `/api/builds/[id]/clone` | POST | USER | ✓ |
| `/api/builds/quick` | POST | USER | - |

#### Lap Time APIs

| Endpoint | Method | Role Required | Ownership Check |
|----------|--------|--------------|------------------|
| `/api/lap-times` | GET | USER | Filter: userId |
| `/api/lap-times` | POST | USER | - |
| `/api/lap-times/[id]` | DELETE | USER (own) / ADMIN | ✓ |

#### Race Management APIs

| Endpoint | Method | Role Required | Ownership Check |
|----------|--------|--------------|------------------|
| `/api/races` | GET | USER | All visible |
| `/api/races` | POST | USER | - |
| `/api/races/[id]` | GET | USER/PENDING | All visible |
| `/api/races/[id]` | PATCH | USER (own) / ADMIN (any) | ✓ |
| `/api/races/[id]` | DELETE | USER (own) / ADMIN (any) | ✓ |
| `/api/races/reorder` | PATCH | ADMIN | - |

#### Race Member APIs

| Endpoint | Method | Role Required | Notes |
|----------|--------|--------------|-------|
| `/api/races/[id]/members` | GET | Public | View only |
| `/api/races/[id]/members` | POST | ADMIN | Add member |
| `/api/races/[id]/members/[memberId]` | DELETE | ADMIN | Remove member |
| `/api/races/[id]/members/reorder` | PATCH | ADMIN | Reorder |
| `/api/races/[id]/members/[memberId]/tyre` | PATCH | ADMIN | Change tyre |

#### User Management APIs (Admin Only)

| Endpoint | Method | Role Required |
|----------|--------|--------------|
| `/api/admin/users` | GET | ADMIN |
| `/api/admin/users/[id]` | PATCH | ADMIN |
| `/api/admin/pending-users` | GET | ADMIN |
| `/api/admin/pending-users/[id]/approve` | POST | ADMIN |
| `/api/admin/pending-users/[id]/reject` | POST | ADMIN |

#### Profile APIs

| Endpoint | Method | Role Required | Notes |
|----------|--------|--------------|-------|
| `/api/user/profile` | PATCH | USER or ADMIN | Can edit own profile |

#### Cron Jobs (Protected)

| Endpoint | Method | Access | Notes |
|----------|--------|--------|-------|
| `/api/cron/cleanup-tokens` | GET | CRON_SECRET | Cleanup expired tokens (protected by secret) |

**Cron Security:** Protected by `CRON_SECRET` environment variable. Must be included in request headers.

---

## Database Security

### Row Level Security (RLS)

RLS is enabled on all user data tables to enforce access control at the database level.

#### RLS Policies by Table

| Table | Public | User Access | Admin Access | Policy Type |
|-------|--------|-------------|--------------|-------------|
| **User** | ✗ | Own row only | ✓ All rows | SELECT/UPDATE |
| **CarBuild** | Partial | Own only | ✓ All | + public readable |
| **CarBuildUpgrade** | ✗ | Via build | Via build | Cascades |
| **CarBuildSetting** | ✗ | Via build | Via build | Cascades |
| **LapTime** | ✗ | Own only | ✓ All | Filtered by userId |
| **Race** | Partial | Own only | ✓ All | + public viewable |
| **RaceCar** | ✗ | Via race | Via race | Junction table |
| **RaceMember** | ✓ Read | ✓ Read | ✓ All | Public SELECT |
| **RunList** | ✗ | ✗ | ✓ All | Legacy system |
| **RunListEntry** | ✗ | ✗ | ✓ All | Legacy system |

**Legend:**
- ✓ = Access granted
- ✗ = Access denied
- "Via build/race" = Access inherited through parent relationship
- "Partial" = Some data publicly accessible (public builds, races)

#### Public Access Exceptions

**CarBuild Table:**
- Public builds (`isPublic = true`) readable by all users
- Private builds only readable by owner and admins

**Race Table:**
- All races readable by authenticated users (USER role)
- Public visibility on frontend but requires authentication

**RaceMember Table:**
- Public can read race members (view-only)
- Only admins can add/remove/reorder members

### Service Role Client

**File:** `src/lib/supabase/service-role.ts`

**Purpose:** Bypass RLS for admin operations

**Usage:**
```typescript
import { createServiceRoleClient } from '@/lib/supabase/service-role'

const supabase = createServiceRoleClient()
// Can access any data regardless of RLS policies
// Only use for admin operations or ownership-verified queries
```

**Security Safeguards:**
- Only imported in API routes (not client-side code)
- Admin routes protected by `isAdmin()` check
- User fetches filtered by session email (safe)
- Never exposed to client components

---

## Public vs Private Access

### What Public Users Can See (Unauthenticated)

| Data Type | Access | Examples |
|-----------|--------|----------|
| **GT7 Reference Data** | ✓ Read only | Cars, tracks, parts, settings |
| **Build Detail Pages** | ✗ Blocked | Must authenticate |
| **Race Detail Pages** | ✗ Blocked | Must authenticate |
| **Lap Times** | ✗ Blocked | Must authenticate |
| **User Data** | ✗ Blocked | Protected |

### What PENDING Users Can See

| Data Type | Access | Notes |
|-----------|--------|-------|
| **Admin Dashboard** | ✓ | To see approval status |
| **Reference Data** | ✓ | Cars, tracks, parts, settings |
| **Own Resources** | ✗ | Blocked until approved |
| **Public Resources** | ✗ | Blocked until approved |
| **Others' Data** | ✗ | Blocked |

### What USER Users Can See

| Data Type | Access | Notes |
|-----------|--------|-------|
| **Own Builds** | ✓ Full CRUD | Create, edit, delete |
| **Public Builds** | ✓ View only | Can clone |
| **Private Builds** | ✗ | Owner/admin only |
| **Own Lap Times** | ✓ Full CRUD | Create, delete |
| **All Lap Times** | ✓ View only | Can see everyone's |
| **Own Races** | ✓ Full CRUD | Create, edit, delete |
| **All Races** | ✓ View only | Can see everyone's |
| **Race Members** | ✓ View only | Read-only access |

### What ADMIN Users Can See

| Data Type | Access | Notes |
|-----------|--------|-------|
| **Everything USER can see** | ✓ | Plus: |
| **All Builds** | ✓ Full CRUD | Can edit/delete any |
| **All Lap Times** | ✓ Full CRUD | Can delete any |
| **All Races** | ✓ Full CRUD | Can edit/delete any |
| **All Users** | ✓ Manage | Approve, reject, edit |
| **Race Members** | ✓ Full control | Add, remove, reorder |

---

## Security Best Practices

### Implemented ✅

1. **Row Level Security (RLS)**
   - Enabled on all user data tables
   - Database-level enforcement (bypasses require service role)

2. **Role-Based Access Control**
   - Three-tier role system (PENDING, USER, ADMIN)
   - Type-safe role checking with TypeScript guards

3. **Ownership Verification**
   - Users can only modify their own resources
   - Admins bypass ownership checks for management

4. **Public API Protection**
   - Reference APIs are read-only
   - No mutations on public endpoints
   - Cached responses (reduces load)

5. **Authentication Required**
   - All mutations require authentication
   - Session validation on every request
   - Magic link expiration (15 minutes)

6. **Rate Limiting**
   - Applied to all API endpoints
   - In-memory implementation (Redis planned)
   - Standard rate limit headers
   - IP-based identification with proxy support

7. **Service Role Security**
   - Only used in API routes (not client-side)
   - Protected by admin/ownership checks
   - Never exposed to frontend

8. **SQL Injection Protection**
   - Parameterized queries via Supabase client
   - No direct SQL string concatenation

9. **Admin Notification System**
   - Automatic email notifications for new pending users
   - Atomic updates prevent duplicate notifications
   - Sent to all admins via Resend

10. **Auto-Promotion Bootstrap**
    - `DEFAULT_ADMIN_EMAIL` auto-promoted to ADMIN
    - Enables initial admin setup without database access
    - Safe (controlled by server environment variable)

11. **Cron Job Protection**
    - Protected by `CRON_SECRET` environment variable
    - Prevents unauthorized scheduled task execution

### Future Enhancements 🔮

1. **Redis Rate Limiting**
   - Persistent rate limiting across server restarts
   - Distributed rate limiting for multi-instance deployments

2. **Request Signing**
   - HMAC signing for critical operations
   - Verify request integrity

3. **Advanced Audit Logging**
   - Track all admin actions in database
   - Log resource modifications
   - Security event monitoring dashboard
   - Currently: Basic logging via admin notifications

4. **API Versioning**
   - Versioned API endpoints for breaking changes
   - Backward compatibility maintenance

---

## Security Checklist

### For Developers

- [ ] Never use service role client in components
- [ ] Always verify `isAdmin()` before admin operations
- [ ] Always check ownership before allowing modifications
- [ ] Use `getCurrentUser()` for ownership checks
- [ ] Keep public endpoints read-only
- [ ] Apply rate limiting to all API endpoints
- [ ] Validate input on all endpoints
- [ ] Use appropriate rate limit tier (Auth/Mutation/Query/Expensive)
- [ ] Return rate limit headers on all responses

### For Admins

- [ ] Only approve users you know
- [ ] Verify user identities before approving
- [ ] Review audit logs regularly
- [ ] Be cautious when promoting users to ADMIN
- [ ] Keep service role key secure
- [ ] Monitor for suspicious activity
- [ ] Secure `RESEND_API_KEY` and `CRON_SECRET`
- [ ] Set `DEFAULT_ADMIN_EMAIL` to trusted address

### For Users

- [ ] Keep magic link emails secure
- [ ] Sign out when done on shared devices
- [ ] Report suspicious activity to admins
- [ ] Keep your email account secure

---

## Quick Reference

### Can I...?

| Action | PENDING | USER | ADMIN | Public |
|--------|---------|------|-------|--------|
| View cars/tracks/parts | ✓ | ✓ | ✓ | ✓ |
| Create build | ✗ | ✓ | ✓ | ✗ |
| Edit own build | ✗ | ✓ | ✓ | ✗ |
| Delete own build | ✗ | ✓ | ✓ | ✗ |
| Clone public build | ✗ | ✓ | ✓ | ✗ |
| View others' builds | ✗ | public only | ✓ | ✗ |
| Edit others' builds | ✗ | ✗ | ✓ | ✗ |
| Delete others' builds | ✗ | ✗ | ✓ | ✗ |
| Record lap time | ✗ | ✓ | ✓ | ✗ |
| Delete own lap time | ✗ | ✓ | ✓ | ✗ |
| Create race | ✗ | ✓ | ✓ | ✗ |
| Edit own race | ✗ | ✓ | ✓ | ✗ |
| Reorder races | ✗ | ✗ | ✓ | ✗ |
| Manage users | ✗ | ✗ | ✓ | ✗ |
| Promote users | ✗ | ✗ | ✓ | ✗ |

---

## Troubleshooting

### Common Security Issues

**"Unauthorized" error (401)**
- Cause: Not logged in
- Solution: Sign in with magic link

**"Forbidden" error (403)**
- Cause: Insufficient permissions or not owner
- Solutions:
  - PENDING users: Wait for admin approval
  - Regular users: Can only modify own resources
  - Contact admin for access needed

**"Build not found" error (404)**
- Cause: Build doesn't exist or not accessible
- Solutions:
  - Check build ID is correct
  - Verify build is public (if viewing others')
  - Check you're logged in

**Admin operations failing**
- Cause: Not ADMIN role
- Solution: Contact existing admin to check role

---

## Related Documentation

- **Database Schema:** `docs/DATABASE-SCHEMA.md` - Complete table definitions and RLS policies
- **API Routes:** `src/app/api/**` - Individual route documentation
- **Auth Config:** `src/lib/auth.ts` - Session configuration
- **Auth Utils:** `src/lib/auth-utils.ts` - Helper functions

---

**Last Reviewed:** 2026-02-02
**Next Review:** After next security update
