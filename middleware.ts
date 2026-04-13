import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_ROUTES = [
  /^\/scenarios\/[^/]+\/play/,
]

function isProtected(pathname: string): boolean {
  return PROTECTED_ROUTES.some(re => re.test(pathname))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Dev bypass: skip auth for protected routes in dev mode
  if (process.env.NEXT_PUBLIC_DEV_MODE === 'true' && isProtected(pathname)) {
    return NextResponse.next()
  }

  // Skip Supabase auth refresh if credentials are not configured
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — must not be removed (keeps cookie fresh)
  const { data: { user } } = await supabase.auth.getUser();

  // Gate protected routes: redirect unauthenticated users to /auth/login
  if (!user && isProtected(pathname)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/auth/login'
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
