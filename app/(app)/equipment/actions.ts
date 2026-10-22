"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkCode, fromDbError, isChecked, normalizeCode, readForm, type FormState } from "@/lib/forms";

// Create (id = null) or update a machine / issue destination
export async function saveEquipment(
  id: number | null,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const values = readForm(formData);
  const code = normalizeCode(values.code);
  const fieldErrors: Record<string, string> = {};

  if (id === null) {
    const e = checkCode(code, /^[A-Z0-9_-]{2,20}$/, "2–20 characters: letters, digits, - and _ (e.g. MCH-CNC-04).");
    if (e) fieldErrors.code = e;
  }
  if (!values.name) fieldErrors.name = "Required.";
  else if (values.name.length > 100) fieldErrors.name = "Maximum 100 characters.";
  if (!values.area_id) fieldErrors.area_id = "Select an area.";
  if (Object.keys(fieldErrors).length > 0) return { error: null, fieldErrors, values };

  const row = {
    name: values.name,
    area_id: Number(values.area_id),
    is_active: isChecked(values.is_active),
  };

  const supabase = await createClient();
  const { error } =
    id === null
      ? await supabase.from("equipment").insert({ code, ...row })
      : await supabase.from("equipment").update(row).eq("id", id);

  if (error) return fromDbError(error, values, "equipment");
  redirect(`/equipment?saved=${encodeURIComponent(code)}`);
}

// Create (id = null) or update a plant area
export async function saveArea(
  id: number | null,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const values = readForm(formData);
  const code = normalizeCode(values.code);
  const fieldErrors: Record<string, string> = {};

  if (id === null) {
    const e = checkCode(code, /^[A-Z0-9_-]{2,10}$/, "2–10 characters: letters, digits, - and _ (e.g. ASM).");
    if (e) fieldErrors.code = e;
  }
  if (!values.name) fieldErrors.name = "Required.";
  if (Object.keys(fieldErrors).length > 0) return { error: null, fieldErrors, values };

  const supabase = await createClient();
  const { error } =
    id === null
      ? await supabase.from("areas").insert({ code, name: values.name })
      : await supabase.from("areas").update({ name: values.name }).eq("id", id);

  if (error) return fromDbError(error, values, "areas");
  redirect(`/equipment?saved=${encodeURIComponent(code)}`);
}
