import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isAuthenticated = !!req.auth
  const user = req.auth?.user

  // Public routes
  const publicRoutes = ['/auth/signin', '/auth/verify-request', '/auth/error']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Profile completion route
  const isProfileCompletionRoute = pathname === '/auth/complete-profile'

  // Redirect authenticated users away from auth pages (except profile completion)
  if (isAuthenticated && isPublicRoute && !isProfileCompletionRoute) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Check if authenticated user needs to complete profile (missing gamertag)
  if (isAuthenticated && user && !user.gamertag && !isProfileCompletionRoute && !pathname.startsWith('/api')) {
    return NextResponse.redirect(new URL('/auth/complete-profile', req.url))
  }

  // Redirect away from profile completion if gamertag already set
  if (isAuthenticated && user?.gamertag && isProfileCompletionRoute) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Redirect unauthenticated users to signin
  if (!isAuthenticated && !isPublicRoute && !pathname.startsWith('/api')) {
    return NextResponse.redirect(new URL('/auth/signin', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
