import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isAuthenticated = !!req.auth
  const user = req.auth?.user
  const userRole = (user as { role?: string } | null)?.role

  // Public routes
  const publicRoutes = ['/auth/signin', '/auth/verify-request', '/auth/error', '/auth/pending']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Profile completion routes
  const isProfileCompletionRoute = pathname === '/auth/complete-profile'
  const isPendingRoute = pathname === '/auth/pending'

  // Redirect authenticated users away from signin/error/verify pages
  if (isAuthenticated && isPublicRoute && !isPendingRoute && !isProfileCompletionRoute) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // PENDING users: redirect to pending page
  if (isAuthenticated && userRole === 'PENDING' && !isPendingRoute && !pathname.startsWith('/api')) {
    return NextResponse.redirect(new URL('/auth/pending', req.url))
  }

  // Active users without gamertag: redirect to complete profile
  if (isAuthenticated && user && userRole !== 'PENDING' && !user.gamertag && !isProfileCompletionRoute && !pathname.startsWith('/api')) {
    return NextResponse.redirect(new URL('/auth/complete-profile', req.url))
  }

  // Redirect away from pending/complete-profile pages if not needed
  if (isAuthenticated && user?.gamertag && (isProfileCompletionRoute || isPendingRoute)) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Redirect unauthenticated users to signin
  if (!isAuthenticated && !isPublicRoute && !pathname.startsWith('/api')) {
    return NextResponse.redirect(new URL('/auth/signin', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)'],
}
