"use client";

import { useActionState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signInDemo, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(signIn, initialState);
  const [demoState, demoAction, isDemoPending] = useActionState(signInDemo, initialState);

  const error = state.error ?? demoState.error;
  const busy = isPending || isDemoPending;

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@company.com"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={busy}>
          {isPending && <LoaderCircle className="animate-spin" />}
          Sign in
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs text-muted-foreground uppercase">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <form action={demoAction}>
        <Button type="submit" variant="outline" className="w-full" disabled={busy}>
          {isDemoPending ? <LoaderCircle className="animate-spin" /> : null}
          Explore the demo
          {!isDemoPending && <ArrowRight />}
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Signs you in with a shared demo account. No registration needed.
        </p>
      </form>
    </div>
  );
}
