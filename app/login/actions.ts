"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error: string | null };

// Sign in with the email and password typed in the form
export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Invalid email or password." };
  }

  redirect("/dashboard");
}

// One-click demo access. Credentials live in server-only environment
// variables, so they never reach the browser.
export async function signInDemo(): Promise<LoginState> {
  const email = process.env.DEMO_EMAIL;
  const password = process.env.DEMO_PASSWORD;

  if (!email || !password) {
    return { error: "The demo account is not configured." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "The demo account is not available right now." };
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
