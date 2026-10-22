"use client";

import { useActionState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Field, FormActions, FormError } from "@/components/form-parts";
import { emptyFormState } from "@/lib/forms";
import type { Material, Option } from "@/lib/types";
import { saveMaterial } from "./actions";
import type { MaterialOptions } from "./options";

export function MaterialForm({ material, options }: { material?: Material; options: MaterialOptions }) {
  const isNew = !material;
  const [state, formAction] = useActionState(saveMaterial.bind(null, material?.id ?? null), emptyFormState);
  const submitted = Object.keys(state.values).length > 0;
  const value = (key: string, initial: string | number | null | undefined) =>
    state.values[key] ?? (initial == null ? "" : String(initial));
  const err = state.fieldErrors;

  return (
    <form action={formAction} className="grid gap-6 sm:grid-cols-2">
      <Field label="Code" htmlFor="code" error={err.code} hint={isNew ? "e.g. BRG-1013. Cannot be changed later." : "The code cannot be changed."}>
        <Input id="code" name="code" defaultValue={value("code", material?.code)} readOnly={!isNew} required aria-invalid={!!err.code} className="font-mono uppercase read-only:bg-muted" />
      </Field>
      <Field label="Category" htmlFor="category_id" error={err.category_id}>
        <Select id="category_id" defaultValue={value("category_id", material?.category_id)} options={options.categories} placeholder="Select a category" invalid={!!err.category_id} />
      </Field>
      <Field label="Description" htmlFor="description" error={err.description} className="sm:col-span-2">
        <Input id="description" name="description" defaultValue={value("description", material?.description)} required aria-invalid={!!err.description} />
      </Field>

      {isNew ? (
        <Field label="Unit of measure" htmlFor="uom_code" error={err.uom_code} hint="Cannot be changed once movements exist.">
          <Select id="uom_code" defaultValue={value("uom_code", "")} options={options.units} placeholder="Select a unit" invalid={!!err.uom_code} />
        </Field>
      ) : (
        <Field label="Unit of measure" htmlFor="uom_code" hint="Fixed: all recorded movements use this unit.">
          <Input id="uom_code" value={options.units.find((u) => u.value === material.uom_code)?.label ?? material.uom_code} readOnly className="bg-muted" />
        </Field>
      )}
      <Field label="Storage location" htmlFor="location_id" error={err.location_id}>
        <Select id="location_id" defaultValue={value("location_id", material?.location_id)} options={options.locations} placeholder="Select a location" invalid={!!err.location_id} />
      </Field>

      <Field label="Supplier" htmlFor="supplier_id" error={err.supplier_id}>
        <Select id="supplier_id" defaultValue={value("supplier_id", material?.supplier_id)} options={options.suppliers} placeholder="Select a supplier" invalid={!!err.supplier_id} />
      </Field>
      <Field label="Lead time (days)" htmlFor="lead_time_days" error={err.lead_time_days} hint="Days from order to delivery. Used for the reorder point.">
        <Input id="lead_time_days" name="lead_time_days" type="number" min={0} max={365} step={1} defaultValue={value("lead_time_days", material?.lead_time_days ?? 7)} required aria-invalid={!!err.lead_time_days} />
      </Field>

      <Field label="Unit cost (EUR)" htmlFor="unit_cost" error={err.unit_cost}>
        <Input id="unit_cost" name="unit_cost" type="number" min={0} step="0.01" defaultValue={value("unit_cost", material?.unit_cost)} required aria-invalid={!!err.unit_cost} />
      </Field>
      <Field label="Safety stock" htmlFor="safety_stock" error={err.safety_stock} hint="Minimum buffer. At or below it the material turns red.">
        <Input id="safety_stock" name="safety_stock" type="number" min={0} step="any" defaultValue={value("safety_stock", material?.safety_stock ?? 0)} required aria-invalid={!!err.safety_stock} />
      </Field>

      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <Checkbox name="is_active" defaultChecked={submitted ? state.values.is_active === "on" : material?.is_active ?? true} />
        Active (inactive materials keep their history but cannot be moved)
      </label>

      <div className="space-y-4 sm:col-span-2">
        <FormError message={state.error} />
        <FormActions cancelHref="/materials" />
      </div>
    </form>
  );
}

function Select({
  id,
  defaultValue,
  options,
  placeholder,
  invalid,
}: {
  id: string;
  defaultValue: string;
  options: Option[];
  placeholder: string;
  invalid: boolean;
}) {
  return (
    <NativeSelect id={id} name={id} defaultValue={defaultValue} required aria-invalid={invalid}>
      <option value="" disabled>{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </NativeSelect>
  );
}
