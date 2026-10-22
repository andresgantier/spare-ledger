"use client";

import { useActionState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Field, FormActions, FormError } from "@/components/form-parts";
import { emptyFormState } from "@/lib/forms";
import type { Location } from "@/lib/types";
import { saveLocation } from "./actions";

export function LocationForm({ location }: { location?: Location }) {
  const isNew = !location;
  const [state, formAction] = useActionState(saveLocation.bind(null, location?.id ?? null), emptyFormState);
  const submitted = Object.keys(state.values).length > 0;
  const value = (key: string, initial: string | null | undefined) => state.values[key] ?? initial ?? "";
  const err = state.fieldErrors;

  return (
    <form action={formAction} className="grid gap-6 sm:grid-cols-2">
      <Field label="Code" htmlFor="code" error={err.code} hint={isNew ? "Aisle-rack-shelf, e.g. A-01-02. Cannot be changed later." : "The code cannot be changed."}>
        <Input id="code" name="code" defaultValue={value("code", location?.code)} readOnly={!isNew} required aria-invalid={!!err.code} className="font-mono uppercase read-only:bg-muted" />
      </Field>
      <Field label="Description" htmlFor="description" error={err.description}>
        <Input id="description" name="description" defaultValue={value("description", location?.description)} aria-invalid={!!err.description} />
      </Field>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <Checkbox name="is_active" defaultChecked={submitted ? state.values.is_active === "on" : location?.is_active ?? true} />
        Active (inactive locations cannot be assigned to materials)
      </label>
      <div className="space-y-4 sm:col-span-2">
        <FormError message={state.error} />
        <FormActions cancelHref="/locations" />
      </div>
    </form>
  );
}
