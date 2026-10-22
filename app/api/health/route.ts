import { NextResponse } from "next/server";

// Simple connectivity check against the Supabase Auth service
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return NextResponse.json(
      { ok: false, error: "Missing Supabase environment variables" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: key },
      cache: "no-store",
    });
    const body = await res.json().catch(() => null);
    return NextResponse.json(
      { ok: res.ok, status: res.status, supabase: body },
      { status: res.ok ? 200 : 502 }
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 502 }
    );
  }
}