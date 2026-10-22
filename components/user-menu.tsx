import { LogOut } from "lucide-react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  storekeeper: "Storekeeper",
  technician: "Technician",
  manager: "Maintenance manager",
};

// Signed-in user's name, role and sign-out button.
// Reads the session, so it must render inside a <Suspense> boundary.
export async function UserMenu({ variant = "sidebar" }: { variant?: "sidebar" | "header" }) {
  // Render only at request time: the session check uses the current time
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  const { data: profile } = userId
    ? await supabase.from("profiles").select("full_name, role").eq("id", userId).single()
    : { data: null };

  const name: string = profile?.full_name ?? String(data?.claims?.email ?? "User");
  const role: string = profile ? ROLE_LABELS[profile.role] ?? profile.role : "";
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const inSidebar = variant === "sidebar";

  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
          inSidebar ? "bg-sidebar-accent text-sidebar-accent-foreground" : "bg-secondary"
        )}
      >
        {initials}
      </div>
      <div className={cn("min-w-0 flex-1", !inSidebar && "hidden sm:block")}>
        <p className={cn("truncate text-sm font-medium", inSidebar && "text-sidebar-accent-foreground")}>
          {name}
        </p>
        <p className={cn("truncate text-xs", inSidebar ? "text-sidebar-foreground/70" : "text-muted-foreground")}>
          {role}
        </p>
      </div>
      <form action={signOut}>
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          aria-label="Sign out"
          title="Sign out"
          className={cn(inSidebar && "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")}
        >
          <LogOut />
        </Button>
      </form>
    </div>
  );
}

export function UserMenuSkeleton({ variant = "sidebar" }: { variant?: "sidebar" | "header" }) {
  const tone = variant === "sidebar" ? "bg-sidebar-accent" : "";
  return (
    <div className="flex items-center gap-3">
      <Skeleton className={cn("size-8 rounded-full", tone)} />
      <div className="flex-1 space-y-1.5">
        <Skeleton className={cn("h-3.5 w-24", tone)} />
        <Skeleton className={cn("h-3 w-16", tone)} />
      </div>
    </div>
  );
}
