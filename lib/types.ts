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
