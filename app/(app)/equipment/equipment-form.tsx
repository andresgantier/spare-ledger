"use client";

import { useActionState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Field, FormActions, FormError } from "@/components/form-parts";
import { emptyFormState } from "@/lib/forms";
import type { Equipment, Option } from "@/lib/types";
import { saveEquipment } from "./actions";

export function EquipmentForm({ equipment, areas }: { equipment?: Equipment; areas: Option[] }) {
  const isNew = !equipment;
  const [state, formAction] = useActionState(saveEquipment.bind(null, equipment?.id ?? null), emptyFormState);
  const submitted = Object.keys(state.values).length > 0;
  const value = (key: string, initial: string | number | null | undefined) =>
    state.values[key] ?? (initial == null ? "" : String(initial));
  const err = state.fieldErrors;

  return (
    <form action={formAction} className="grid gap-6 sm:grid-cols-2">
      <Field label="Code" htmlFor="code" error={err.code} hint={isNew ? "e.g. MCH-CNC-04. Cannot be changed later." : "The code cannot be changed."}>
        <Input id="code" name="code" defaultValue={value("code", equipment?.code)} readOnly={!isNew} required aria-invalid={!!err.code} className="font-mono uppercase read-only:bg-muted" />
      </Field>
      <Field label="Name" htmlFor="name" error={err.name}>
        <Input id="name" name="name" defaultValue={value("name", equipment?.name)} required aria-invalid={!!err.name} />
      </Field>
      <Field label="Area" htmlFor="area_id" error={err.area_id}>
        <NativeSelect id="area_id" name="area_id" defaultValue={value("area_id", equipment?.area_id)} required aria-invalid={!!err.area_id}>
          <option value="" disabled>Select an area</option>
          {areas.map((a) => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </NativeSelect>
      </Field>
      <label className="flex items-center gap-2 self-end pb-2 text-sm">
        <Checkbox name="is_active" defaultChecked={submitted ? state.values.is_active === "on" : equipment?.is_active ?? true} />
        Active (inactive equipment cannot receive parts)
      </label>
      <div className="space-y-4 sm:col-span-2">
        <FormError message={state.error} />
        <FormActions cancelHref="/equipment" />
      </div>
    </form>
  );
}
