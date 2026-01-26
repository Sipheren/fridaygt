/**
 * ADMIN DASHBOARD PAGE (REDIRECT)
 *
 * Purpose:
 * Acts as a simple redirect to the default admin page (/admin/settings).
 * Provides a clean URL structure for admin functionality.
 *
 * Key Features:
 * - Server-side redirect to /admin/settings
 * - No UI rendered - redirects immediately
 *
 * Data Flow:
 * - This page never renders
 * - Next.js redirect() function routes to /admin/settings
 *
 * API Integration:
 * - None - this is a redirect-only page
 *
 * Common Issues:
 * - If redirect doesn't work, check Next.js version compatibility
 * - Redirect should work in both App Router and Pages Router
 *
 * Related Files:
 * - /admin/settings/page.tsx: Target of this redirect
 * - /admin/users/page.tsx: User management page
 * - @/components/layout: Layout components used by admin pages
 */

import { redirect } from 'next/navigation';

export default function AdminPage() {
  // Redirect to settings as the default admin page
  redirect('/admin/settings');
}
