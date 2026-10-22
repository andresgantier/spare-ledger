"use client";

import { useActionState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Field, FormActions, FormError } from "@/components/form-parts";
import { emptyFormState } from "@/lib/forms";
import type { Supplier } from "@/lib/types";
import { saveSupplier } from "./actions";

export function SupplierForm({ supplier }: { supplier?: Supplier }) {
  const isNew = !supplier;
  const [state, formAction] = useActionState(saveSupplier.bind(null, supplier?.id ?? null), emptyFormState);
  const submitted = Object.keys(state.values).length > 0;
  const value = (key: string, initial: string | null | undefined) => state.values[key] ?? initial ?? "";
  const err = state.fieldErrors;

  return (
    <form action={formAction} className="grid gap-6 sm:grid-cols-2">
      <Field label="Code" htmlFor="code" error={err.code} hint={isNew ? "Short code, e.g. WLA. Cannot be changed later." : "The code cannot be changed."}>
        <Input id="code" name="code" defaultValue={value("code", supplier?.code)} readOnly={!isNew} required aria-invalid={!!err.code} className="font-mono uppercase read-only:bg-muted" />
      </Field>
      <Field label="Company name" htmlFor="name" error={err.name}>
        <Input id="name" name="name" defaultValue={value("name", supplier?.name)} required aria-invalid={!!err.name} />
      </Field>
      <Field label="Contact person" htmlFor="contact_name" error={err.contact_name}>
        <Input id="contact_name" name="contact_name" defaultValue={value("contact_name", supplier?.contact_name)} />
      </Field>
      <Field label="Email" htmlFor="email" error={err.email}>
        <Input id="email" name="email" type="email" defaultValue={value("email", supplier?.email)} aria-invalid={!!err.email} />
      </Field>
      <Field label="Phone" htmlFor="phone" error={err.phone}>
        <Input id="phone" name="phone" type="tel" defaultValue={value("phone", supplier?.phone)} />
      </Field>
      <label className="flex items-center gap-2 self-end pb-2 text-sm">
        <Checkbox name="is_active" defaultChecked={submitted ? state.values.is_active === "on" : supplier?.is_active ?? true} />
        Active
      </label>
      <div className="space-y-4 sm:col-span-2">
        <FormError message={state.error} />
        <FormActions cancelHref="/suppliers" />
      </div>
    </form>
  );
}
