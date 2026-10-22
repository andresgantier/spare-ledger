"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Field, FormActions, FormError } from "@/components/form-parts";
import { emptyFormState } from "@/lib/forms";
import type { Area } from "@/lib/types";
import { saveArea } from "./actions";

export function AreaForm({ area }: { area?: Area }) {
  const isNew = !area;
  const [state, formAction] = useActionState(saveArea.bind(null, area?.id ?? null), emptyFormState);
  const value = (key: string, initial: string | undefined) => state.values[key] ?? initial ?? "";
  const err = state.fieldErrors;

  return (
    <form action={formAction} className="grid gap-6 sm:grid-cols-2">
      <Field label="Code" htmlFor="code" error={err.code} hint={isNew ? "e.g. ASM. Cannot be changed later." : "The code cannot be changed."}>
        <Input id="code" name="code" defaultValue={value("code", area?.code)} readOnly={!isNew} required aria-invalid={!!err.code} className="font-mono uppercase read-only:bg-muted" />
      </Field>
      <Field label="Name" htmlFor="name" error={err.name}>
        <Input id="name" name="name" defaultValue={value("name", area?.name)} required aria-invalid={!!err.name} />
      </Field>
      <div className="space-y-4 sm:col-span-2">
        <FormError message={state.error} />
        <FormActions cancelHref="/equipment" />
      </div>
    </form>
  );
}
