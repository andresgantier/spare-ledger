// Row shapes returned by the database (master data)

export type Option = { value: string; label: string };

export type Location = { id: number; code: string; description: string | null; is_active: boolean };

export type Supplier = {
  id: number;
  code: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
};

export type Area = { id: number; code: string; name: string };

export type Equipment = { id: number; code: string; name: string; area_id: number; is_active: boolean };

export type Material = {
  id: number;
  code: string;
  description: string;
  category_id: number;
  uom_code: string;
  location_id: number;
  supplier_id: number;
  lead_time_days: number;
  unit_cost: number;
  safety_stock: number;
  is_active: boolean;
};

// One row of v_movement_history (ledger with readable names)
export type MovementHistoryRow = {
  id: number;
  movement_date: string;
  movement_type: "RECEIPT" | "ISSUE" | "ADJUSTMENT";
  quantity: number;
  material_id: number;
  material_code: string;
  material_description: string;
  uom_code: string;
  equipment_code: string | null;
  equipment_name: string | null;
  area_name: string | null;
  supplier_name: string | null;
  reason_code: string | null;
  reason_description: string | null;
  reference: string | null;
  notes: string | null;
  created_by_name: string;
};

// One row of v_material_status (stock, reorder point and traffic light)
export type MaterialStatusRow = {
  material_id: number;
  code: string;
  description: string;
  category_id: number;
  category_name: string;
  uom_code: string;
  location_id: number;
  location_code: string;
  supplier_id: number;
  supplier_name: string;
  lead_time_days: number;
  unit_cost: number;
  safety_stock: number;
  is_active: boolean;
  stock_qty: number;
  last_movement_at: string | null;
  issued_qty_90d: number;
  avg_daily_consumption: number;
  reorder_point: number;
  stock_value: number;
  stock_status: "RED" | "YELLOW" | "GREEN";
  days_since_last_movement: number | null;
  is_slow_moving: boolean;
};
