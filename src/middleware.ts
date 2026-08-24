//src\middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_STUDENT_PATHS = [
  '/student/login',
  '/student/signup',
  '/student/auth', // covers /student/auth/callback
  '/student/forgot-password',   // ← add
  '/student/reset-password',    // ← add
]

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isGoingToAdmin = pathname.startsWith('/admin')
  const isGoingToAdminLogin = pathname === '/admin_login'
  const isPublicStudentPath = PUBLIC_STUDENT_PATHS.some(p => pathname.startsWith(p))
  const isGoingToCompleteProfile = pathname.startsWith('/student/complete-profile')
  const isGoingToSetPassword = pathname.startsWith('/student/set-password')
  const isGoingToStudent =
    pathname.startsWith('/student') &&
    !isPublicStudentPath &&
    !isGoingToCompleteProfile &&
    !isGoingToSetPassword
  const isGoingToStudentLogin = pathname === '/student/login'

  if (isGoingToAdminLogin) {
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

  if (isGoingToAdmin) {
    if (!user) {
      return NextResponse.redirect(new URL('/admin_login', request.url))
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Needs a logged-in user, but NOT a matching web_session_token yet —
  // this page's entire job is to create the student row and set that token for the first time.
  if (isGoingToCompleteProfile) {
    if (!user) {
      return NextResponse.redirect(new URL('/student/login', request.url))
    }
    return response
  }

  // Needs a logged-in user, but NOT a matching web_session_token yet —
  // oauth-bootstrap withholds the token until a password is set, by design.
  if (isGoingToSetPassword) {
    if (!user) {
      return NextResponse.redirect(new URL('/student/login', request.url))
    }
    return response
  }

  if (isGoingToStudent) {
    if (!user) {
      return NextResponse.redirect(new URL('/student/login', request.url))
    }

    const { data: student } = await supabase
      .from('students')
      .select('web_session_token, password_set')
      .eq('auth_id', user.id)
      .single()

    // Password not set yet (e.g. mid-way through Google signup) — send them to
    // finish that step instead of treating this as a multi-device session mismatch.
    if (student && student.password_set === false) {
      return NextResponse.redirect(new URL('/student/set-password', request.url))
    }

    const cookieToken = request.cookies.get('web_session_token')?.value

    if (!student || !cookieToken || student.web_session_token !== cookieToken) {
      await supabase.auth.signOut()

      const redirectUrl = new URL('/student/login', request.url)
      redirectUrl.searchParams.set('reason', 'multi_device')

      const redirectResponse = NextResponse.redirect(redirectUrl)
      redirectResponse.cookies.delete('web_session_token')
      return redirectResponse
    }
  }

  if (isGoingToStudentLogin) {
    if (user) {
      const { data: student } = await supabase
        .from('students')
        .select('web_session_token, password_set')
        .eq('auth_id', user.id)
        .single()

      if (student && student.password_set === false) {
        return NextResponse.redirect(new URL('/student/set-password', request.url))
      }

      const cookieToken = request.cookies.get('web_session_token')?.value

      if (student && cookieToken && student.web_session_token === cookieToken) {
        return NextResponse.redirect(new URL('/student', request.url))
      }
    }
    return response
  }

  return response
}
  
export const config = {
  matcher: [
    '/admin/:path*',
    '/admin_login',
    '/student/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico).*)'
  ]
}