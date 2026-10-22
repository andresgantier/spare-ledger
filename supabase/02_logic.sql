-- =====================================================================
-- SpareLedger - Phase 2: Business logic (views, movement function,
-- triggers, permissions and RLS policies)
-- Run in Supabase SQL Editor AFTER 01_schema.sql.
-- Re-runnable. If 01_schema.sql is ever re-run, run this file again.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Reset
-- ---------------------------------------------------------------------
drop view if exists
  public.v_movement_history,
  public.v_monthly_consumption,
  public.v_top_consumption_90d,
  public.v_dashboard_kpis,
  public.v_material_status,
  public.v_consumption_90d,
  public.v_stock
cascade;

drop trigger  if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.check_movement_stock() cascade;
drop function if exists public.prevent_movement_changes() cascade;
drop function if exists public.record_movement(bigint, text, numeric, bigint, bigint, text, text, text) cascade;

-- =====================================================================
-- 1. VIEWS (security_invoker = caller's RLS applies)
-- =====================================================================

-- Current stock per material = sum of all movements (the ledger)
create view public.v_stock
with (security_invoker = true) as
select
  m.id                                         as material_id,
  coalesce(sum(sm.quantity), 0)::numeric(12,3) as stock_qty,
  max(sm.movement_date)                        as last_movement_at
from public.materials m
left join public.stock_movements sm on sm.material_id = m.id
group by m.id;

-- Average daily consumption = issues of the last 90 days / 90
create view public.v_consumption_90d
with (security_invoker = true) as
select
  m.id                                          as material_id,
  coalesce(-sum(sm.quantity), 0)::numeric(12,3) as issued_qty_90d,
  round(coalesce(-sum(sm.quantity), 0) / 90.0, 4) as avg_daily_consumption
from public.materials m
left join public.stock_movements sm
  on  sm.material_id   = m.id
  and sm.movement_type = 'ISSUE'
  and sm.movement_date >= now() - interval '90 days'
group by m.id;

-- Main status view: stock, reorder point, traffic light, value, slow movers
create view public.v_material_status
with (security_invoker = true) as
with base as (
  select
    m.id              as material_id,
    m.code,
    m.description,
    m.category_id,
    c.name            as category_name,
    m.uom_code,
    m.location_id,
    l.code            as location_code,
    m.supplier_id,
    s.name            as supplier_name,
    m.lead_time_days,
    m.unit_cost,
    m.safety_stock,
    m.is_active,
    st.stock_qty,
    st.last_movement_at,
    co.issued_qty_90d,
    co.avg_daily_consumption,
    -- Reorder point = avg daily consumption x lead time + safety stock
    round(co.avg_daily_consumption * m.lead_time_days + m.safety_stock, 2) as reorder_point
  from public.materials m
  join public.categories        c  on c.id  = m.category_id
  join public.locations         l  on l.id  = m.location_id
  join public.suppliers         s  on s.id  = m.supplier_id
  join public.v_stock           st on st.material_id = m.id
  join public.v_consumption_90d co on co.material_id = m.id
)
select
  b.*,
  round(b.stock_qty * b.unit_cost, 2) as stock_value,
  case
    when b.stock_qty <= b.safety_stock  then 'RED'
    when b.stock_qty <= b.reorder_point then 'YELLOW'
    else 'GREEN'
  end as stock_status,
  (current_date - (b.last_movement_at at time zone 'Europe/Berlin')::date) as days_since_last_movement,
  (b.last_movement_at is null
   or b.last_movement_at < now() - interval '90 days') as is_slow_moving
from base b;

-- Dashboard KPIs (one row, active materials only)
create view public.v_dashboard_kpis
with (security_invoker = true) as
select
  coalesce(sum(stock_value), 0)                                     as total_inventory_value,
  count(*) filter (where stock_status = 'RED')                      as red_count,
  count(*) filter (where stock_status = 'YELLOW')                   as yellow_count,
  count(*) filter (where stock_status = 'GREEN')                    as green_count,
  count(*) filter (where is_slow_moving and stock_qty > 0)          as slow_moving_count,
  coalesce(sum(stock_value) filter (where is_slow_moving and stock_qty > 0), 0) as slow_moving_value,
  count(*)                                                          as active_materials
from public.v_material_status
where is_active;

-- Top 10 consumption of the last 90 days, ranked by value
create view public.v_top_consumption_90d
with (security_invoker = true) as
select
  material_id,
  code,
  description,
  uom_code,
  issued_qty_90d,
  round(issued_qty_90d * unit_cost, 2) as issued_value_90d
from public.v_material_status
where issued_qty_90d > 0
order by issued_value_90d desc
limit 10;

-- Monthly consumption value (last 12 months)
create view public.v_monthly_consumption
with (security_invoker = true) as
select
  date_trunc('month', sm.movement_date at time zone 'Europe/Berlin')::date as month,
  round(sum(-sm.quantity * m.unit_cost), 2) as issued_value,
  count(*)                                  as issue_count
from public.stock_movements sm
join public.materials m on m.id = sm.material_id
where sm.movement_type = 'ISSUE'
  and sm.movement_date >= now() - interval '12 months'
group by 1
order by 1;

-- Full movement history with readable names (per material and latest movements)
create view public.v_movement_history
with (security_invoker = true) as
select
  sm.id,
  sm.movement_date,
  sm.movement_type,
  sm.quantity,
  sm.material_id,
  m.code          as material_code,
  m.description   as material_description,
  m.uom_code,
  sm.equipment_id,
  e.code          as equipment_code,
  e.name          as equipment_name,
  a.name          as area_name,
  sm.supplier_id,
  s.name          as supplier_name,
  sm.reason_code,
  r.description   as reason_description,
  sm.reference,
  sm.notes,
  sm.created_by,
  p.full_name     as created_by_name
from public.stock_movements sm
join      public.materials          m on m.id   = sm.material_id
left join public.equipment          e on e.id   = sm.equipment_id
left join public.areas              a on a.id   = e.area_id
left join public.suppliers          s on s.id   = sm.supplier_id
left join public.adjustment_reasons r on r.code = sm.reason_code
join      public.profiles           p on p.id   = sm.created_by;

-- =====================================================================
-- 2. TRIGGERS ON THE LEDGER
-- =====================================================================

-- Stock can never go below zero, whoever inserts the row
create function public.check_movement_stock()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_stock numeric;
begin
  if new.quantity >= 0 then
    return new;
  end if;

  -- Lock the material row so concurrent issues of the same part wait in line
  perform 1 from public.materials where id = new.material_id for update;

  select coalesce(sum(quantity), 0) into v_stock
  from public.stock_movements
  where material_id = new.material_id;

  if v_stock + new.quantity < 0 then
    raise exception 'Insufficient stock: available %, requested %', v_stock, abs(new.quantity)
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger stock_movements_check_stock
  before insert on public.stock_movements
  for each row execute function public.check_movement_stock();

-- Ledger rows are immutable: corrections are new ADJUSTMENT rows
create function public.prevent_movement_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Stock movements cannot be changed or deleted. Record an adjustment instead.'
    using errcode = 'P0001';
end;
$$;

create trigger stock_movements_immutable
  before update or delete on public.stock_movements
  for each row execute function public.prevent_movement_changes();

-- =====================================================================
-- 3. MOVEMENT FUNCTION (the only write path for movements)
-- Quantity is always entered as a positive number for RECEIPT and ISSUE;
-- the function applies the sign. ADJUSTMENT accepts + or -.
-- =====================================================================
create function public.record_movement(
  p_material_id   bigint,
  p_movement_type text,
  p_quantity      numeric,
  p_equipment_id  bigint default null,
  p_supplier_id   bigint default null,
  p_reason_code   text   default null,
  p_reference     text   default null,
  p_notes         text   default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id  uuid := auth.uid();
  v_supplier bigint;
  v_quantity numeric(12,3);
  v_id       bigint;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select supplier_id into v_supplier
  from public.materials
  where id = p_material_id and is_active;

  if not found then
    raise exception 'Material not found or inactive';
  end if;

  if p_quantity is null or p_quantity = 0 then
    raise exception 'Quantity must be different from zero';
  end if;

  if p_movement_type = 'RECEIPT' then
    if p_quantity < 0 then
      raise exception 'Receipt quantity must be positive';
    end if;
    v_quantity := p_quantity;
    v_supplier := coalesce(p_supplier_id, v_supplier);  -- default: material's supplier

  elsif p_movement_type = 'ISSUE' then
    if p_quantity < 0 then
      raise exception 'Issue quantity must be positive';
    end if;
    if p_equipment_id is null then
      raise exception 'Destination equipment is required for an issue';
    end if;
    if not exists (select 1 from public.equipment where id = p_equipment_id and is_active) then
      raise exception 'Equipment not found or inactive';
    end if;
    v_quantity := -p_quantity;
    v_supplier := null;

  elsif p_movement_type = 'ADJUSTMENT' then
    if nullif(trim(p_reason_code), '') is null then
      raise exception 'A reason is required for an adjustment';
    end if;
    v_quantity := p_quantity;
    v_supplier := null;

  else
    raise exception 'Invalid movement type: %', p_movement_type;
  end if;

  insert into public.stock_movements
    (material_id, movement_type, quantity, supplier_id, equipment_id,
     reason_code, reference, notes, created_by)
  values
    (p_material_id,
     p_movement_type,
     v_quantity,
     v_supplier,
     case when p_movement_type = 'ISSUE'      then p_equipment_id end,
     case when p_movement_type = 'ADJUSTMENT' then p_reason_code  end,
     nullif(trim(p_reference), ''),
     nullif(trim(p_notes), ''),
     v_user_id)
  returning id into v_id;

  return v_id;
end;
$$;

-- =====================================================================
-- 4. NEW USERS GET A PROFILE AUTOMATICALLY
-- =====================================================================
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
             split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- 5. PERMISSIONS (who may touch what at all)
-- =====================================================================
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- Read everything (tables and views)
grant select on all tables in schema public to authenticated;

-- Create and edit master data (no delete: deactivate with is_active instead)
grant insert, update on
  public.categories, public.suppliers, public.locations,
  public.areas, public.equipment, public.materials
to authenticated;

-- Users may only change their own display name
grant update (full_name) on public.profiles to authenticated;

grant usage, select on all sequences in schema public to authenticated;

-- Movements: no direct insert; only through the function
revoke execute on function public.record_movement(bigint, text, numeric, bigint, bigint, text, text, text) from public, anon;
grant  execute on function public.record_movement(bigint, text, numeric, bigint, bigint, text, text, text) to authenticated;

-- =====================================================================
-- 6. RLS POLICIES (which rows, for signed-in users only)
-- =====================================================================

-- Read policy on every table
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'categories', 'units_of_measure', 'suppliers', 'locations',
    'areas', 'equipment', 'materials', 'adjustment_reasons', 'stock_movements'
  ]
  loop
    execute format('drop policy if exists "Authenticated users can read" on public.%I', t);
    execute format('create policy "Authenticated users can read" on public.%I
                    for select to authenticated using (true)', t);
  end loop;
end $$;

-- Insert and update policies on master data
do $$
declare
  t text;
begin
  foreach t in array array[
    'categories', 'suppliers', 'locations', 'areas', 'equipment', 'materials'
  ]
  loop
    execute format('drop policy if exists "Authenticated users can insert" on public.%I', t);
    execute format('create policy "Authenticated users can insert" on public.%I
                    for insert to authenticated with check (true)', t);
    execute format('drop policy if exists "Authenticated users can update" on public.%I', t);
    execute format('create policy "Authenticated users can update" on public.%I
                    for update to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Own profile only
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));