"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkNumber, readForm, toNumber, type FormState } from "@/lib/forms";

export type MovementKind = "receipt" | "issue" | "adjustment";

const DB_TYPE: Record<MovementKind, "RECEIPT" | "ISSUE" | "ADJUSTMENT"> = {
  receipt: "RECEIPT",
  issue: "ISSUE",
  adjustment: "ADJUSTMENT",
};

// Record a receipt, issue or adjustment through the database function
// record_movement(). The function checks the business rules and writes the
// ledger row in one transaction; the stock trigger rejects negative stock.
export async function recordMovement(
  kind: MovementKind,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const values = readForm(formData);
  const fieldErrors: Record<string, string> = {};

  if (!values.material_id) fieldErrors.material_id = "Select a material.";

  const qtyError = checkNumber(values.quantity ?? "", { min: 0.001 });
  if (qtyError) fieldErrors.quantity = qtyError === "Must be at least 0.001." ? "Must be greater than 0." : qtyError;
  else if (!/^\d+([.,]\d{1,3})?$/.test(values.quantity)) fieldErrors.quantity = "Use at most 3 decimals.";

  if (kind === "issue" && !values.equipment_id) fieldErrors.equipment_id = "Select the machine that receives the part.";
  if (kind === "adjustment") {
    if (!values.reason_code) fieldErrors.reason_code = "Select a reason.";
    if (values.direction !== "in" && values.direction !== "out") fieldErrors.direction = "Select increase or decrease.";
  }
  if ((values.reference ?? "").length > 50) fieldErrors.reference = "Maximum 50 characters.";
  if ((values.notes ?? "").length > 500) fieldErrors.notes = "Maximum 500 characters.";

  if (Object.keys(fieldErrors).length > 0) return { error: null, fieldErrors, values };

  // The user always types a positive quantity; adjustments get their sign here.
  // Receipts and issues are signed inside the database function.
  const quantity = toNumber(values.quantity) * (kind === "adjustment" && values.direction === "out" ? -1 : 1);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_movement", {
    p_material_id: Number(values.material_id),
    p_movement_type: DB_TYPE[kind],
    p_quantity: quantity,
    p_equipment_id: kind === "issue" ? Number(values.equipment_id) : null,
    p_supplier_id: kind === "receipt" && values.supplier_id ? Number(values.supplier_id) : null,
    p_reason_code: kind === "adjustment" ? values.reason_code : null,
    p_reference: values.reference || null,
    p_notes: values.notes || null,
  });

  if (error) return explainError(error.message, values);
  redirect(`/movements?type=${kind}&done=${data}`);
}

// Turn the database message into a field error the user understands
function explainError(raw: string, values: Record<string, string>): FormState {
  // "available 12.000" -> "available 12"
  const message = raw.replace(/(\d+)\.(\d*?)0+\b/g, (_m, int: string, dec: string) => (dec ? `${int}.${dec}` : int));

  if (message.startsWith("Insufficient stock")) {
    return { error: null, fieldErrors: { quantity: `${message}.` }, values };
  }
  if (message.includes("Material not found")) {
    return { error: null, fieldErrors: { material_id: "This material is inactive or no longer exists." }, values };
  }
  if (message.includes("Equipment")) {
    return { error: null, fieldErrors: { equipment_id: "This machine is inactive or no longer exists." }, values };
  }
  if (message.includes("Not authenticated")) {
    return { error: "Your session has expired. Sign in again.", fieldErrors: {}, values };
  }
  return { error: `The movement was not recorded: ${message}`, fieldErrors: {}, values };
}
