# API Security Guidelines

## Overview

This document outlines the security patterns required when working with the FridayGT API. All API routes must follow strict authentication and authorization patterns to prevent data breaches and unauthorized access.

---

## Service Role Client Warning

**CRITICAL:** The service role Supabase client (`createServiceRoleClient()`) bypasses Row Level Security (RLS) and has FULL database access. It can read, write, and delete ANY data.

**Never use without proper authentication.**

---

## Required Pattern for All API Routes

Every API route must follow this sequence:

### 1. Get Session (Authentication)

```typescript
import { auth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  // Step 1: Authenticate the user
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
```

### 2. Get User Data (Authorization)

```typescript
import { getCurrentUser } from '@/lib/auth-utils'

// Step 2: Fetch user with role from database
const currentUser = await getCurrentUser(session)
if (!currentUser) {
  return NextResponse.json(
    { error: 'Invalid session' },
    { status: 401 }
  )
}
```

### 3. Check Role (For Admin/Protected Operations)

```typescript
import { isAdmin } from '@/lib/auth-utils'

// Step 3a: Check if user is admin
if (!isAdmin(currentUser)) {
  return NextResponse.json(
    { error: 'Forbidden: Admin access required' },
    { status: 403 }
  )
}
```

### 4. Add Ownership Check (For User Data)

```typescript
import { createServiceRoleClient } from '@/lib/supabase/service-role'

// Step 4: Only NOW can you use service role client
const supabase = createServiceRoleClient()

// ALWAYS include ownership filter
const { data, error } = await supabase
  .from('CarBuild')
  .select('*')
  .eq('userId', currentUser.id)  // ← CRITICAL
  .single()

// Or for admin operations on specific user:
const { data } = await supabase
  .from('User')
  .update({ role: 'ADMIN' })
  .eq('id', targetUserId)  // ← Target specific user only
```

---

## Common Patterns

### Public Read Access

For data that's publicly readable (cars, tracks):

```typescript
// No auth needed for GET requests
if (request.method === 'GET') {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('Car')
    .select('*')
    .eq('isPublic', true)
  return NextResponse.json({ data })
}

// Auth required for mutations
if (request.method === 'POST') {
  const session = await auth()
  if (!session) return 401
  // ... proceed with mutation
}
```

### User-Specific Data

```typescript
const session = await auth()
const currentUser = await getCurrentUser(session)

const supabase = createServiceRoleClient()

// User can only access their own data
const { data } = await supabase
  .from('CarBuild')
  .select('*')
  .eq('userId', currentUser.id)  // ← Ownership filter
```

### Admin Operations

```typescript
const session = await auth()
const currentUser = await getCurrentUser(session)

// Must be admin
if (!isAdmin(currentUser)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

const supabase = createServiceRoleClient()

// Admin can access any user's data
const { data } = await supabase
  .from('User')
  .update({ role: 'USER' })
  .eq('id', targetUserId)
```

### Creator Checks

For resources with a `createdById` field:

```typescript
const session = await auth()
const currentUser = await getCurrentUser(session)

const supabase = createServiceRoleClient()

// Fetch resource first
const { data: resource } = await supabase
  .from('Race')
  .select('createdById')
  .eq('id', raceId)
  .single()

// Check if user is creator OR admin
if (resource.createdById !== currentUser.id && !isAdmin(currentUser)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// Proceed with update/delete
```

---

## Security Checklist

Before using `createServiceRoleClient()`, verify:

- [ ] Session is validated via `auth()` or `getServerSession()`
- [ ] User is fetched from database via `getCurrentUser()`
- [ ] Role is checked via `isAdmin()` for admin operations
- [ ] Ownership is verified via `.eq('userId', user.id)` or `.eq('createdById', user.id)`
- [ ] Query includes userId/createdById filter where applicable

---

## Examples of Vulnerable Code

### ❌ WRONG: No Authentication

```typescript
// DON'T DO THIS
export async function POST(request: NextRequest) {
  const supabase = createServiceRoleClient()  // ← No auth!

  const { data } = await supabase
    .from('CarBuild')
    .insert({ name: 'My Build' })  // ← Anyone can create builds
}
```

### ❌ WRONG: No Ownership Check

```typescript
// DON'T DO THIS
const session = await auth()
const currentUser = await getCurrentUser(session)
const supabase = createServiceRoleClient()

// Deletes ANY build, not just user's own
const { data } = await supabase
  .from('CarBuild')
  .delete()
  .eq('id', buildId)  // ← Missing userId filter!
```

### ❌ WRONG: Admin Check Missing

```typescript
// DON'T DO THIS
const session = await auth()
const currentUser = await getCurrentUser(session)
// Missing isAdmin() check!

const supabase = createServiceRoleClient()

// Any user can promote themselves to admin
await supabase
  .from('User')
  .update({ role: 'ADMIN' })
  .eq('id', currentUser.id)
```

---

## Testing Security

Test that your API routes enforce security:

```typescript
describe('API Security', () => {
  it('should reject unauthenticated requests', async () => {
    const response = await fetch('/api/builds', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test' })
    })
    expect(response.status).toBe(401)
  })

  it('should prevent users from accessing others data', async () => {
    const session = await loginAsUser()
    const response = await fetch('/api/builds/other-users-build', {
      headers: { Authorization: `Bearer ${session.token}` }
    })
    expect(response.status).toBe(403)  // or 404 if hiding existence
  })

  it('should reject non-admin users from admin endpoints', async () => {
    const session = await loginAsRegularUser()
    const response = await fetch('/api/admin/users', {
      headers: { Authorization: `Bearer ${session.token}` }
    })
    expect(response.status).toBe(403)
  })
})
```

---

## Quick Reference

| Helper | Purpose | Location |
|--------|---------|----------|
| `auth()` | Get session | `@/lib/auth` |
| `getServerSession()` | Get session (alternative) | `next-auth` |
| `getCurrentUser()` | Fetch user with role | `@/lib/auth-utils` |
| `isAdmin()` | Type guard for admin | `@/lib/auth-utils` |
| `createServiceRoleClient()` | Database client | `@/lib/supabase/service-role` |

---

## Questions?

If you're unsure whether a pattern is secure, ask:
1. Is the user authenticated?
2. Is the user authorized (role check)?
3. Is the ownership verified (userId filter)?
4. Would this be safe if an attacker knew the endpoint?

When in doubt, add more checks.
