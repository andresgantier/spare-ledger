import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Option } from "@/lib/types";

export type MaterialOptions = {
  categories: Option[];
  units: Option[];
  locations: Option[];
  suppliers: Option[];
};

// Dropdown values for the material form. Inactive locations and suppliers
// are hidden, except the ones the material already uses.
export async function loadMaterialOptions(current?: {
  location_id: number;
  supplier_id: number;
}): Promise<MaterialOptions> {
  const supabase = await createClient();
  const [categories, units, locations, suppliers] = await Promise.all([
    supabase.from("categories").select("id, code, name").order("name"),
    supabase.from("units_of_measure").select("code, name").order("name"),
    supabase.from("locations").select("id, code, is_active").order("code"),
    supabase.from("suppliers").select("id, name, is_active").order("name"),
  ]);

  return {
    categories: (categories.data ?? []).map((c) => ({ value: String(c.id), label: `${c.name} (${c.code})` })),
    units: (units.data ?? []).map((u) => ({ value: u.code, label: `${u.code} – ${u.name}` })),
    locations: (locations.data ?? [])
      .filter((l) => l.is_active || l.id === current?.location_id)
      .map((l) => ({ value: String(l.id), label: l.is_active ? l.code : `${l.code} (inactive)` })),
    suppliers: (suppliers.data ?? [])
      .filter((s) => s.is_active || s.id === current?.supplier_id)
      .map((s) => ({ value: String(s.id), label: s.is_active ? s.name : `${s.name} (inactive)` })),
  };
}
