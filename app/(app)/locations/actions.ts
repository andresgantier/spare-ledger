"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  checkCode,
  fromDbError,
  isChecked,
  normalizeCode,
  nullIfEmpty,
  readForm,
  type FormState,
} from "@/lib/forms";

// Create (id = null) or update a storage location
export async function saveLocation(
  id: number | null,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const values = readForm(formData);
  const code = normalizeCode(values.code);
  const fieldErrors: Record<string, string> = {};

  if (id === null) {
    const e = checkCode(code, /^[A-Z0-9-]{2,20}$/, "2–20 characters: letters, digits and hyphens (e.g. A-01-02).");
    if (e) fieldErrors.code = e;
  }
  if ((values.description ?? "").length > 200) fieldErrors.description = "Maximum 200 characters.";
  if (Object.keys(fieldErrors).length > 0) return { error: null, fieldErrors, values };

  const row = {
    description: nullIfEmpty(values.description),
    is_active: isChecked(values.is_active),
  };

  const supabase = await createClient();
  const { error } =
    id === null
      ? await supabase.from("locations").insert({ code, ...row })
      : await supabase.from("locations").update(row).eq("id", id);

  if (error) return fromDbError(error, values, "locations");
  redirect(`/locations?saved=${encodeURIComponent(code)}`);
}
