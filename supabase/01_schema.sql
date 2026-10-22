Script: supabase/01_schema.sql
sql
-- =====================================================================
-- SpareLedger - Phase 1: Schema (tables, constraints, indexes)
-- Run in Supabase SQL Editor.
-- Re-runnable: the reset block drops and recreates everything.
-- WARNING: running it again deletes all data in these tables.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Reset
-- ---------------------------------------------------------------------
drop table if exists public.stock_movements    cascade;
drop table if exists public.materials          cascade;
drop table if exists public.adjustment_reasons cascade;
drop table if exists public.equipment          cascade;
drop table if exists public.areas              cascade;
drop table if exists public.locations          cascade;
drop table if exists public.suppliers          cascade;
drop table if exists public.units_of_measure   cascade;
drop table if exists public.categories         cascade;
drop table if exists public.profiles           cascade;
drop function if exists public.set_updated_at() cascade;

-- ---------------------------------------------------------------------
-- Helper: keep updated_at current on every update
-- ---------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Users: extends Supabase auth.users with display name and role
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null check (char_length(trim(full_name)) between 1 and 100),
  role        text not null default 'storekeeper'
              check (role in ('storekeeper', 'technician', 'manager')),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Master data
-- ---------------------------------------------------------------------
create table public.categories (
  id    bigint generated always as identity primary key,
  code  text not null unique check (code ~ '^[A-Z0-9_-]{2,10}$'),
  name  text not null unique check (char_length(trim(name)) between 1 and 60)
);

create table public.units_of_measure (
  code  text primary key check (code ~ '^[A-Z]{1,5}$'),
  name  text not null unique
);

create table public.suppliers (
  id            bigint generated always as identity primary key,
  code          text not null unique check (code ~ '^[A-Z0-9_-]{2,20}$'),
  name          text not null check (char_length(trim(name)) between 1 and 100),
  contact_name  text,
  email         text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone         text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Storage bins, e.g. A-01-02 (aisle-rack-shelf)
create table public.locations (
  id           bigint generated always as identity primary key,
  code         text not null unique check (code ~ '^[A-Z0-9-]{2,20}$'),
  description  text,
  is_active    boolean not null default true
);

-- Plant areas (e.g. assembly, paint shop, utilities)
create table public.areas (
  id    bigint generated always as identity primary key,
  code  text not null unique check (code ~ '^[A-Z0-9_-]{2,10}$'),
  name  text not null unique
);

-- Issue destinations; each equipment belongs to one area
create table public.equipment (
  id         bigint generated always as identity primary key,
  code       text not null unique check (code ~ '^[A-Z0-9_-]{2,20}$'),
  name       text not null check (char_length(trim(name)) between 1 and 100),
  area_id    bigint not null references public.areas (id),
  is_active  boolean not null default true
);

-- Spare parts master. Stock is NOT stored here: it is derived from movements.
-- unit_cost is fixed (EUR), a deliberate scope decision (no FIFO / moving average).
create table public.materials (
  id              bigint generated always as identity primary key,
  code            text not null unique check (code ~ '^[A-Z0-9_-]{3,20}$'),
  description     text not null check (char_length(trim(description)) between 3 and 200),
  category_id     bigint not null references public.categories (id),
  uom_code        text   not null references public.units_of_measure (code),
  location_id     bigint not null references public.locations (id),
  supplier_id     bigint not null references public.suppliers (id),
  lead_time_days  integer not null check (lead_time_days between 0 and 365),
  unit_cost       numeric(12,2) not null check (unit_cost >= 0),
  safety_stock    numeric(12,3) not null default 0 check (safety_stock >= 0),
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.adjustment_reasons (
  code         text primary key check (code ~ '^[A-Z_]{2,20}$'),
  description  text not null
);

-- ---------------------------------------------------------------------
-- Ledger: every stock change is a row here. Rows are never edited.
-- Signed quantity: RECEIPT > 0, ISSUE < 0, ADJUSTMENT either sign.
-- ---------------------------------------------------------------------
create table public.stock_movements (
  id             bigint generated always as identity primary key,
  material_id    bigint not null references public.materials (id),
  movement_type  text not null check (movement_type in ('RECEIPT', 'ISSUE', 'ADJUSTMENT')),
  quantity       numeric(12,3) not null check (quantity <> 0),
  movement_date  timestamptz not null default now(),
  supplier_id    bigint references public.suppliers (id),
  equipment_id   bigint references public.equipment (id),
  reason_code    text references public.adjustment_reasons (code),
  reference      text check (reference is null or char_length(reference) <= 50),
  notes          text check (notes is null or char_length(notes) <= 500),
  created_by     uuid not null references public.profiles (id),
  created_at     timestamptz not null default now(),

  -- Each movement type carries exactly the fields it needs
  constraint movement_receipt_rules check (
    movement_type <> 'RECEIPT'
    or (quantity > 0 and supplier_id is not null
        and equipment_id is null and reason_code is null)
  ),
  constraint movement_issue_rules check (
    movement_type <> 'ISSUE'
    or (quantity < 0 and equipment_id is not null
        and supplier_id is null and reason_code is null)
  ),
  constraint movement_adjustment_rules check (
    movement_type <> 'ADJUSTMENT'
    or (reason_code is not null
        and supplier_id is null and equipment_id is null)
  )
);

-- ---------------------------------------------------------------------
-- Indexes (PostgreSQL does not index foreign keys automatically)
-- ---------------------------------------------------------------------
create index equipment_area_id_idx        on public.equipment (area_id);

create index materials_category_id_idx    on public.materials (category_id);
create index materials_uom_code_idx       on public.materials (uom_code);
create index materials_location_id_idx    on public.materials (location_id);
create index materials_supplier_id_idx    on public.materials (supplier_id);

-- History per material and stock calculation
create index stock_movements_material_date_idx on public.stock_movements (material_id, movement_date desc);
-- 90-day consumption and monthly trends
create index stock_movements_type_date_idx     on public.stock_movements (movement_type, movement_date);
create index stock_movements_supplier_id_idx   on public.stock_movements (supplier_id);
create index stock_movements_equipment_id_idx  on public.stock_movements (equipment_id);
create index stock_movements_reason_code_idx   on public.stock_movements (reason_code);
create index stock_movements_created_by_idx    on public.stock_movements (created_by);

-- ---------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------
create trigger suppliers_set_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

create trigger materials_set_updated_at
  before update on public.materials
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security: on for every table. No policies yet = no API access.
-- Policies are added in Phase 2.
-- ---------------------------------------------------------------------
alter table public.profiles           enable row level security;
alter table public.categories         enable row level security;
alter table public.units_of_measure   enable row level security;
alter table public.suppliers          enable row level security;
alter table public.locations          enable row level security;
alter table public.areas              enable row level security;
alter table public.equipment          enable row level security;
alter table public.materials          enable row level security;
alter table public.adjustment_reasons enable row level security;
alter table public.stock_movements    enable row level security;

-- ---------------------------------------------------------------------
-- Fixed reference data
-- ---------------------------------------------------------------------
insert into public.units_of_measure (code, name) values
  ('PC',   'Piece'),
  ('SET',  'Set'),
  ('PR',   'Pair'),
  ('M',    'Meter'),
  ('L',    'Liter'),
  ('KG',   'Kilogram'),
  ('ROLL', 'Roll');

insert into public.adjustment_reasons (code, description) values
  ('OPENING_BALANCE', 'Opening balance (initial stock load)'),
  ('COUNT_DIFF',      'Physical count difference'),
  ('DAMAGED',         'Damaged or scrapped'),
  ('RETURN',          'Unused part returned from maintenance'),
  ('OBSOLETE',        'Obsolete, written off');