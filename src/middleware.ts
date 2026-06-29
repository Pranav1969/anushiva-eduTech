import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response = NextResponse.next({ request })
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isGoingToAdmin = request.nextUrl.pathname.startsWith('/admin')
  const isGoingToAdminLogin = request.nextUrl.pathname === '/admin_login'

  // 1. SAFEGUARD: If they are going to the admin login page itself, let them through!
  if (isGoingToAdminLogin) {
    // If they are ALREADY logged in as an admin, send them to the admin dashboard instead of showing the login page again
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      
      if (profile?.role === 'admin') {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
    }
    return response
  }

  // 2. PROTECT ADMIN ROUTES
  if (isGoingToAdmin) {
    // If not logged in, redirect to login page
    if (!user) {
      return NextResponse.redirect(new URL('/admin_login', request.url))
    }
    
    // Check role from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = { 
  /*
   * Matches your admin panel and login screen exactly as before, 
   * while safely ensuring that Next.js/Turbopack internal file routing maps 
   * and your backend Cron routes are fully exempted from interception.
   */
  matcher: [
    '/admin/:path*', 
    '/admin_login',
    '/((?!api|_next/static|_next/image|favicon.ico).*)'
  ] 
}