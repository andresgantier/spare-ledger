import type { PostgrestError } from "@supabase/supabase-js";

// Result of a form Server Action. `values` refills the form after an error.
export type FormState = {
  error: string | null;
  fieldErrors: Record<string, string>;
  values: Record<string, string>;
};

export const emptyFormState: FormState = { error: null, fieldErrors: {}, values: {} };

// Read every text field of a submitted form, trimmed
export function readForm(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") values[key] = value.trim();
  }
  return values;
}

// Codes are stored in upper case without spaces (e.g. "BRG-1002")
export const normalizeCode = (value: string | undefined) =>
  (value ?? "").trim().toUpperCase().replace(/\s+/g, "-");

export const isChecked = (value: string | undefined) => value === "on";

export const nullIfEmpty = (value: string | undefined) => (value ? value : null);

// Turn a database error into a message for the user.
// The database is the final judge: these are its rules, explained in plain words.
export function fromDbError(
  error: PostgrestError,
  values: Record<string, string>,
  table: string
): FormState {
  const constraint = /constraint "([^"]+)"/.exec(error.message)?.[1] ?? "";
  // Postgres names its constraints <table>_<column>_key / _check / _fkey
  const column = constraint.startsWith(`${table}_`)
    ? constraint.slice(table.length + 1).replace(/_(key|check|fkey)$/, "") || undefined
    : undefined;

  switch (error.code) {
    case "23505": // unique_violation
      return {
        error: null,
        fieldErrors: { [column ?? "code"]: "This value is already in use." },
        values,
      };
    case "23514": // check_violation
      return column
        ? { error: null, fieldErrors: { [column]: "This value is not allowed." }, values }
        : { error: "A value is not allowed. Please review the form.", fieldErrors: {}, values };
    case "23503": // foreign_key_violation
      return { error: "A selected reference no longer exists. Reload the page.", fieldErrors: {}, values };
    case "42501": // insufficient_privilege
      return { error: "You are not allowed to make this change.", fieldErrors: {}, values };
    default:
      return { error: `Could not save: ${error.message}`, fieldErrors: {}, values };
  }
}

// Simple field checks used before sending data to the database
export function checkCode(value: string, pattern: RegExp, hint: string): string | null {
  if (!value) return "Required.";
  return pattern.test(value) ? null : hint;
}

export function checkNumber(
  value: string,
  { min, max, integer = false }: { min: number; max?: number; integer?: boolean }
): string | null {
  if (value === "") return "Required.";
  const n = Number(value.replace(",", "."));
  if (!Number.isFinite(n)) return "Enter a number.";
  if (integer && !Number.isInteger(n)) return "Enter a whole number.";
  if (n < min) return `Must be at least ${min}.`;
  if (max !== undefined && n > max) return `Must be at most ${max}.`;
  return null;
}

export const toNumber = (value: string) => Number(value.replace(",", "."));

// Remove characters that would break a PostgREST "or" filter
export const cleanSearch = (value: string | string[] | undefined) =>
  String(Array.isArray(value) ? value[0] : value ?? "")
    .replace(/[,()*%\\]/g, " ")
    .trim()
    .slice(0, 60);

export const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;
