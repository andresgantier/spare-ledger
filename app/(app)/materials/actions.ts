"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  checkCode,
  checkNumber,
  fromDbError,
  isChecked,
  normalizeCode,
  readForm,
  toNumber,
  type FormState,
} from "@/lib/forms";

// Create (id = null) or update a spare part.
// Code and unit of measure are fixed after creation: changing the unit
// would silently change the meaning of every recorded movement.
export async function saveMaterial(
  id: number | null,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const values = readForm(formData);
  const code = normalizeCode(values.code);
  const fieldErrors: Record<string, string> = {};
  const isNew = id === null;

  if (isNew) {
    const e = checkCode(code, /^[A-Z0-9_-]{3,20}$/, "3–20 characters: letters, digits, - and _ (e.g. BRG-1013).");
    if (e) fieldErrors.code = e;
    if (!values.uom_code) fieldErrors.uom_code = "Select a unit.";
  }
  const description = values.description ?? "";
  if (description.length < 3 || description.length > 200) fieldErrors.description = "3–200 characters.";
  if (!values.category_id) fieldErrors.category_id = "Select a category.";
  if (!values.location_id) fieldErrors.location_id = "Select a location.";
  if (!values.supplier_id) fieldErrors.supplier_id = "Select a supplier.";

  const leadTime = checkNumber(values.lead_time_days ?? "", { min: 0, max: 365, integer: true });
  if (leadTime) fieldErrors.lead_time_days = leadTime;
  const unitCost = checkNumber(values.unit_cost ?? "", { min: 0 });
  if (unitCost) fieldErrors.unit_cost = unitCost;
  const safety = checkNumber(values.safety_stock ?? "", { min: 0 });
  if (safety) fieldErrors.safety_stock = safety;

  if (Object.keys(fieldErrors).length > 0) return { error: null, fieldErrors, values };

  const row = {
    description,
    category_id: Number(values.category_id),
    location_id: Number(values.location_id),
    supplier_id: Number(values.supplier_id),
    lead_time_days: toNumber(values.lead_time_days),
    unit_cost: toNumber(values.unit_cost),
    safety_stock: toNumber(values.safety_stock),
    is_active: isChecked(values.is_active),
  };

  const supabase = await createClient();
  const { error } = isNew
    ? await supabase.from("materials").insert({ code, uom_code: values.uom_code, ...row })
    : await supabase.from("materials").update(row).eq("id", id);

  if (error) return fromDbError(error, values, "materials");
  redirect(`/materials?saved=${encodeURIComponent(code)}`);
}
