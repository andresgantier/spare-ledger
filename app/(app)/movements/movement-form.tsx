"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Field, FormActions, FormError } from "@/components/form-parts";
import { emptyFormState } from "@/lib/forms";
import { formatQty } from "@/lib/format";
import type { Option } from "@/lib/types";
import { cn } from "@/lib/utils";
import { recordMovement, type MovementKind } from "./actions";

export type MaterialChoice = {
  id: number;
  code: string;
  description: string;
  uom: string;
  stock: number;
  location: string;
  supplierId: number;
  supplierName: string;
  status: "RED" | "YELLOW" | "GREEN";
};

export type EquipmentGroup = { area: string; items: Option[] };

const SUBMIT_LABEL: Record<MovementKind, string> = {
  receipt: "Record receipt",
  issue: "Record issue",
  adjustment: "Record adjustment",
};

const STATUS_DOT = { RED: "bg-status-red", YELLOW: "bg-status-yellow", GREEN: "bg-status-green" };

export function MovementForm({
  kind,
  materials,
  suppliers,
  equipment,
  reasons,
  initialMaterialId,
}: {
  kind: MovementKind;
  materials: MaterialChoice[];
  suppliers: Option[];
  equipment: EquipmentGroup[];
  reasons: Option[];
  initialMaterialId?: string;
}) {
  const [state, formAction] = useActionState(recordMovement.bind(null, kind), emptyFormState);
  const value = (key: string, initial = "") => state.values[key] ?? initial;
  const err = state.fieldErrors;

  // Live preview of the selected material and the stock after this movement
  const [materialId, setMaterialId] = useState(value("material_id", initialMaterialId ?? ""));
  const [quantity, setQuantity] = useState(value("quantity"));
  const [direction, setDirection] = useState(value("direction", "out"));
  const material = materials.find((m) => String(m.id) === materialId);

  const qty = Number(quantity.replace(",", "."));
  const sign = kind === "receipt" || (kind === "adjustment" && direction === "in") ? 1 : -1;
  const after = material && qty > 0 ? material.stock + sign * qty : null;

  return (
    <form action={formAction} className="grid gap-6 sm:grid-cols-2">
      <Field label="Material" htmlFor="material_id" error={err.material_id} className="sm:col-span-2">
        <NativeSelect
          id="material_id"
          name="material_id"
          defaultValue={value("material_id", initialMaterialId ?? "")}
          onChange={(e) => setMaterialId(e.target.value)}
          required
          aria-invalid={!!err.material_id}
        >
          <option value="" disabled>Select a material (type the code to jump)</option>
          {materials.map((m) => (
            <option key={m.id} value={m.id}>
              {m.code} · {m.description}
            </option>
          ))}
        </NativeSelect>
      </Field>

      {material && (
        <div className="grid gap-3 rounded-lg border bg-muted/40 p-4 text-sm sm:col-span-2 sm:grid-cols-4">
          <Info label="Current stock">
            <span className="flex items-center gap-2 font-medium tabular-nums">
              <span className={cn("size-2 rounded-full", STATUS_DOT[material.status])} />
              {formatQty(material.stock)} {material.uom}
            </span>
          </Info>
          <Info label="Location"><span className="font-mono text-xs">{material.location}</span></Info>
          <Info label="Supplier">{material.supplierName}</Info>
          <Info label="After this movement">
            {after === null ? (
              <span className="text-muted-foreground">Enter a quantity</span>
            ) : (
              <span className={cn("font-medium tabular-nums", after < 0 && "text-destructive")}>
                {formatQty(after)} {material.uom}
                {after < 0 && " (not enough stock)"}
              </span>
            )}
          </Info>
        </div>
      )}

      {kind === "adjustment" && (
        <Field label="Direction" htmlFor="direction" error={err.direction}>
          <NativeSelect id="direction" name="direction" defaultValue={value("direction", "out")} onChange={(e) => setDirection(e.target.value)}>
            <option value="out">Decrease stock (−)</option>
            <option value="in">Increase stock (+)</option>
          </NativeSelect>
        </Field>
      )}

      <Field
        label={`Quantity${material ? ` (${material.uom})` : ""}`}
        htmlFor="quantity"
        error={err.quantity}
        hint={kind === "adjustment" ? "Always positive; the direction sets the sign." : undefined}
      >
        <Input
          id="quantity"
          name="quantity"
          type="number"
          inputMode="decimal"
          min="0.001"
          step="any"
          defaultValue={value("quantity")}
          onChange={(e) => setQuantity(e.target.value)}
          required
          aria-invalid={!!err.quantity}
        />
      </Field>

      {kind === "receipt" && (
        <Field label="Supplier" htmlFor="supplier_id" error={err.supplier_id} hint="Leave as is to use the material's usual supplier.">
          <NativeSelect id="supplier_id" name="supplier_id" defaultValue={value("supplier_id")}>
            <option value="">{material ? `Usual supplier: ${material.supplierName}` : "Usual supplier of the material"}</option>
            {suppliers.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </NativeSelect>
        </Field>
      )}

      {kind === "issue" && (
        <Field label="Destination equipment" htmlFor="equipment_id" error={err.equipment_id}>
          <NativeSelect id="equipment_id" name="equipment_id" defaultValue={value("equipment_id")} required aria-invalid={!!err.equipment_id}>
            <option value="" disabled>Select a machine</option>
            {equipment.map((group) => (
              <optgroup key={group.area} label={group.area}>
                {group.items.map((e) => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </optgroup>
            ))}
          </NativeSelect>
        </Field>
      )}

      {kind === "adjustment" && (
        <Field label="Reason" htmlFor="reason_code" error={err.reason_code}>
          <NativeSelect id="reason_code" name="reason_code" defaultValue={value("reason_code")} required aria-invalid={!!err.reason_code}>
            <option value="" disabled>Select a reason</option>
            {reasons.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </NativeSelect>
        </Field>
      )}

      <Field
        label={kind === "receipt" ? "Delivery note" : kind === "issue" ? "Work order" : "Reference"}
        htmlFor="reference"
        error={err.reference}
        hint="Optional"
      >
        <Input
          id="reference"
          name="reference"
          defaultValue={value("reference")}
          placeholder={kind === "receipt" ? "e.g. DN-48213" : kind === "issue" ? "e.g. WO-264511" : ""}
          maxLength={50}
        />
      </Field>

      <Field label="Notes" htmlFor="notes" error={err.notes} hint="Optional" className="sm:col-span-2">
        <Input id="notes" name="notes" defaultValue={value("notes")} maxLength={500} />
      </Field>

      <div className="space-y-4 sm:col-span-2">
        <FormError message={state.error} />
        <FormActions cancelHref={`/movements?type=${kind}`} label={SUBMIT_LABEL[kind]} />
      </div>
    </form>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div>{children}</div>
    </div>
  );
}
