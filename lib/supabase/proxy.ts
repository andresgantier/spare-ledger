import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that can be opened without signing in
const PUBLIC_PATHS = ["/login", "/api/health"];

// Runs before every page request:
// 1. refreshes the Supabase session cookie,
// 2. sends visitors without a session to /login,
// 3. sends signed-in users away from /login.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
          // Cache headers stop a CDN from sharing one user's session with others
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          );
        },
      },
    }
  );

  // Do not run code between createServerClient and getClaims().
  // getClaims() verifies the token signature; never trust getSession() here.
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims);

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  if (!isSignedIn && !isPublic) {
    return redirectKeepingCookies(request, "/login", supabaseResponse);
  }
  if (isSignedIn && path === "/login") {
    return redirectKeepingCookies(request, "/dashboard", supabaseResponse);
  }

  // Return this exact response: it carries the refreshed cookies
  return supabaseResponse;
}

// A redirect must carry the refreshed cookies and cache headers too,
// otherwise the user is signed out on the next request.
function redirectKeepingCookies(request: NextRequest, to: string, from: NextResponse) {
  const url = request.nextUrl.clone();
  url.pathname = to;
  url.search = "";
  const response = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = from.headers.get(header);
    if (value) response.headers.set(header, value);
  }
  return response;
}
