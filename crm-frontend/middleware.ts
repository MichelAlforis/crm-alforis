// middleware.ts
// ============= AUTH MIDDLEWARE =============
// Protège les routes /dashboard si pas d'authentification

import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Routes protégées
  const protectedRoutes = ['/dashboard']
  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  )

  if (isProtected) {
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      // Pas de token → Redirect login
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}