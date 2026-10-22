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

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Create (id = null) or update a supplier
export async function saveSupplier(
  id: number | null,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const values = readForm(formData);
  const code = normalizeCode(values.code);
  const fieldErrors: Record<string, string> = {};

  if (id === null) {
    const e = checkCode(code, /^[A-Z0-9_-]{2,20}$/, "2–20 characters: letters, digits, - and _.");
    if (e) fieldErrors.code = e;
  }
  if (!values.name) fieldErrors.name = "Required.";
  else if (values.name.length > 100) fieldErrors.name = "Maximum 100 characters.";
  if (values.email && !EMAIL.test(values.email)) fieldErrors.email = "Enter a valid email address.";
  if (Object.keys(fieldErrors).length > 0) return { error: null, fieldErrors, values };

  const row = {
    name: values.name,
    contact_name: nullIfEmpty(values.contact_name),
    email: nullIfEmpty(values.email?.toLowerCase()),
    phone: nullIfEmpty(values.phone),
    is_active: isChecked(values.is_active),
  };

  const supabase = await createClient();
  const { error } =
    id === null
      ? await supabase.from("suppliers").insert({ code, ...row })
      : await supabase.from("suppliers").update(row).eq("id", id);

  if (error) return fromDbError(error, values, "suppliers");
  redirect(`/suppliers?saved=${encodeURIComponent(code)}`);
}
