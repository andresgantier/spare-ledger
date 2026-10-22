import Form from "next/form";
import Link from "next/link";
import type { ReactNode } from "react";
import { CheckCircle2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

// Search and filter bar. Submits as URL parameters (?q=...), so filters
// survive a reload and can be shared as a link.
export function FilterBar({
  action,
  q,
  placeholder,
  includeInactive,
  showInactiveToggle = true,
  children,
}: {
  action: string;
  q: string;
  placeholder: string;
  includeInactive?: boolean;
  showInactiveToggle?: boolean;
  children?: ReactNode;
}) {
  return (
    <Form action={action} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative sm:w-72">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={q} placeholder={placeholder} className="pl-9" aria-label="Search" />
      </div>
      {children}
      {showInactiveToggle && (
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox name="inactive" defaultChecked={includeInactive} />
          Show inactive
        </label>
      )}
      <div className="flex gap-2">
        <Button type="submit" variant="secondary">
          Apply
        </Button>
        <Button variant="ghost" asChild>
          <Link href={action}>Reset</Link>
        </Button>
      </div>
    </Form>
  );
}

// Green confirmation after a save (the form redirects with ?saved=CODE)
export function SavedNotice({ code }: { code?: string }) {
  if (!code) return null;
  return (
    <p className="flex items-center gap-2 rounded-md border border-status-green/30 bg-status-green/10 px-3 py-2 text-sm">
      <CheckCircle2 className="size-4 text-status-green" />
      <span>
        <span className="font-medium">{code}</span> was saved.
      </span>
    </p>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return active ? <Badge variant="secondary">Active</Badge> : <Badge variant="muted">Inactive</Badge>;
}

export function ListCard({ count, noun, children }: { count: number; noun: string; children: ReactNode }) {
  return (
    <Card className="gap-0 py-0">
      <div className="border-b px-4 py-3 text-sm text-muted-foreground">
        {count} {count === 1 ? noun : `${noun}s`}
      </div>
      {children}
    </Card>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <p className="px-4 py-10 text-center text-sm text-muted-foreground">{text}</p>;
}

export function ListSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-full max-w-2xl" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}

export function FormSkeleton() {
  return <Skeleton className="h-[28rem] w-full max-w-3xl rounded-xl" />;
}

export function LoadError({ message }: { message: string }) {
  return <p className="text-sm text-destructive">Could not load the data: {message}</p>;
}

// "← Back to …" link above edit pages
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      ← {label}
    </Link>
  );
}

// Clickable code that opens the edit page
export function CodeLink({ href, code }: { href: string; code: string }) {
  return (
    <Link href={href} className="font-mono text-xs font-medium text-primary underline-offset-4 hover:underline">
      {code}
    </Link>
  );
}
