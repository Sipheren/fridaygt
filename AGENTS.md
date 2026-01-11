# AGENTS.md

This file contains guidelines and commands for agentic coding agents working in the FridayGT repository.

## Build & Quality Commands

```bash
# Development server
npm run dev

# Production build
npm run build

# Linting
npm run lint

# Start production server
npm start
```

**Note:** No test framework is currently configured. When tests are added, verify if Jest, Vitest, or another framework is used.

## Code Style Guidelines

### Imports
- Use `@/*` alias for all src imports (configured in tsconfig.json)
- Group imports: external libraries first, then internal modules
- No unused imports (strict ESLint rules)

### Components
- Use `'use client'` directive at the top of client components
- Prefer Server Components by default (no directive needed)
- Export named components (not default exports preferred)
- Component files should export the main component with a descriptive name

### File Naming
- Page components: `page.tsx` (in app directory)
- API routes: `route.ts` (in app/api directory)
- React components: PascalCase (e.g., `CarBuilds.tsx`, `LapTimeForm.tsx`)
- Utility functions: camelCase (e.g., `formatLapTime`, `parseLapTime`)
- Type files: `.d.ts` for type declarations

### TypeScript
- Strict mode enabled
- Use interfaces for object shapes
- Define explicit types for function parameters and return values
- Use `React.ComponentProps` or proper type unions for component props
- Avoid `any` - use unknown with type guards if needed

### Naming Conventions
- Components: PascalCase (e.g., `CarBuilds`, `LapTimeForm`)
- Functions/variables: camelCase (e.g., `fetchBuilds`, `timeInput`)
- Constants: UPPER_SNAKE_CASE (for actual constants)
- Interfaces: PascalCase with `I` prefix NOT used (e.g., `Build`, `Track`)

### Error Handling
- API routes: Wrap in try-catch, use `NextResponse.json({ error: 'message' }, { status: code })`
- Include details in error responses when helpful
- Log errors with `console.error()` including context
- Validate request params before processing

### API Routes
- Check authentication at the start: `const session = await auth()`
- Return 401 for unauthorized, 403 for forbidden, 404 for not found
- Use `createServiceRoleClient()` for database operations
- Format select queries with related data using Supabase syntax:
  ```ts
  .select(`
    id,
    name,
    track:Track(id, name),
    user:User(id, email)
  `)
  ```
- Validate inputs before database operations
- Use `crypto.randomUUID()` for generating IDs

### React Patterns
- Use `cn()` utility from `@/lib/utils` for className merging
- State management: useState, useEffect for simple cases
- Form handling: Manual form submission (not Formik)
- Loading states: Show skeleton UI during async operations
- Error states: Display error messages to users
- Use lucide-react for icons

### Styling
- Use Tailwind CSS classes
- Prefer utility-first approach
- Use semantic HTML elements
- Responsive design with Tailwind breakpoints (sm, md, lg, xl)
- Dark mode support via `next-themes` (default is dark)

### Database
- Tables use PascalCase names (e.g., `RunList`, `LapTime`)
- Foreign keys follow naming convention: `userId`, `carId`, `trackId`
- Timestamps: `createdAt`, `updatedAt` (ISO strings)
- Soft delete not used - actual deletes are performed
- Relationships defined via foreign keys, not ORM

### Comments
- Use JSDoc for utility functions
- No inline comments unless explaining complex logic
- Self-documenting code preferred

### Supabase Client
- Service role: `createServiceRoleClient()` from `@/lib/supabase/service-role`
- Server: use `createClient()` from `@/lib/supabase/server`
- Client: use `createClient()` from `@/lib/supabase/client`
- Each module uses appropriate client type

### Authentication
- Use `auth()` from `@/lib/auth` for NextAuth session
- Check `session?.user?.email` for user identification
- Use `userId` from session or lookup from email in database
- Admin users have `role: 'ADMIN'` in session
