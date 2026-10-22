import { redirect } from "next/navigation";

// The app starts on the dashboard (proxy.ts sends visitors without a session to /login)
export default function Home() {
  redirect("/dashboard");
}
