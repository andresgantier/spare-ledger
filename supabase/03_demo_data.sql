-- =====================================================================
-- SpareLedger - Phase 3: Demo data
-- Fictional company: Vossberg Antriebstechnik GmbH (Ruhr area, Germany)
-- Simulates ~6 months of spare-parts warehouse activity with a
-- reorder-point policy. Dates are relative to the day you run it.
-- Run AFTER 01 and 02, and after creating the 4 users in Authentication.
-- Re-runnable: wipes master data and movements, then regenerates them.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. The 4 demo users must exist
-- ---------------------------------------------------------------------
do $$
begin
  if (select count(*) from auth.users
      where email in ('demo@example.com', 'm.schulz@example.com',
                      'a.yilmaz@example.com', 't.becker@example.com')) < 4 then
    raise exception 'Create the 4 demo users in Authentication > Users first';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 1. Reset (TRUNCATE bypasses the row-level immutability trigger on purpose)
-- ---------------------------------------------------------------------
truncate table
  public.stock_movements, public.materials, public.equipment, public.areas,
  public.locations, public.suppliers, public.categories
restart identity cascade;

-- ---------------------------------------------------------------------
-- 2. Users: display names and roles
-- ---------------------------------------------------------------------
update public.profiles p
set full_name = v.full_name,
    role      = v.role
from auth.users u
join (values
  ('demo@example.com',     'Demo User',     'manager'),
  ('m.schulz@example.com', 'Markus Schulz', 'storekeeper'),
  ('a.yilmaz@example.com', 'Ayse Yilmaz',   'storekeeper'),
  ('t.becker@example.com', 'Thomas Becker', 'manager')
) as v(email, full_name, role) on v.email = u.email
where p.id = u.id;

-- ---------------------------------------------------------------------
-- 3. Master data
-- ---------------------------------------------------------------------
insert into public.categories (code, name) values
  ('BRG', 'Bearings'),
  ('FLT', 'Filters'),
  ('BLT', 'Belts and chains'),
  ('VLV', 'Valves'),
  ('ELE', 'Electrical'),
  ('SEN', 'Sensors'),
  ('SEL', 'Seals and gaskets'),
  ('PNE', 'Pneumatics'),
  ('HYD', 'Hydraulics'),
  ('LUB', 'Lubricants');

insert into public.suppliers (code, name, contact_name, email, phone) values
  ('WLA', 'Westfalen Lager & Antrieb GmbH',  'Jens Hoffmann',   'vertrieb@westfalen-lager.example',   '+49 231 555 0101'),
  ('HFT', 'Hansa Filtertechnik GmbH',        'Petra Krüger',    'info@hansa-filter.example',          '+49 40 555 0102'),
  ('HYS', 'Hydro-Service Dortmund GmbH',     'Michael Wagner',  'service@hydro-dortmund.example',     '+49 231 555 0103'),
  ('EMS', 'EMS Elektro-Großhandel GmbH',     'Sabine Fischer',  'bestellung@ems-elektro.example',     '+49 201 555 0104'),
  ('DTB', 'DichtTec Bochum GmbH',            'Frank Neumann',   'sales@dichttec.example',             '+49 234 555 0105'),
  ('PNK', 'Pneumatik Kraus GmbH',            'Andrea Kraus',    'info@pneumatik-kraus.example',       '+49 209 555 0106'),
  ('SLZ', 'Schmierstoffe Lenz KG',           'Stefan Lenz',     'order@lenz-schmierstoffe.example',   '+49 2361 555 0107'),
  ('RRI', 'Rhein-Ruhr Industriebedarf GmbH', 'Claudia Schmitt', 'vertrieb@rr-industriebedarf.example', '+49 203 555 0108');

-- 4 aisles x 4 racks x 3 shelves = 48 bins (ids 1..48 after restart identity)
insert into public.locations (code, description)
select format('%s-%s-%s', aisle, lpad(rack::text, 2, '0'), lpad(shelf::text, 2, '0')),
       format('Aisle %s, rack %s, shelf %s', aisle, rack, shelf)
from unnest(array['A', 'B', 'C', 'D']) as aisle,
     generate_series(1, 4) as rack,
     generate_series(1, 3) as shelf
order by 1;

insert into public.areas (code, name) values
  ('ASM', 'Assembly'),
  ('MCH', 'Machining'),
  ('PNT', 'Paint shop'),
  ('UTL', 'Utilities'),
  ('WRK', 'Maintenance workshop');

insert into public.equipment (code, name, area_id)
select v.code, v.name, a.id
from (values
  ('ASM-CNV-01', 'Assembly conveyor line 1',            'ASM'),
  ('ASM-CNV-02', 'Assembly conveyor line 2',            'ASM'),
  ('ASM-ROB-01', 'Robot welding cell 1',                'ASM'),
  ('ASM-PRS-01', 'Hydraulic press 250 t',               'ASM'),
  ('MCH-CNC-01', 'CNC machining center 1',              'MCH'),
  ('MCH-CNC-02', 'CNC machining center 2',              'MCH'),
  ('MCH-CNC-03', 'CNC machining center 3',              'MCH'),
  ('MCH-LTH-01', 'CNC lathe 1',                         'MCH'),
  ('MCH-GRD-01', 'Gear grinding machine',               'MCH'),
  ('PNT-BTH-01', 'Spray paint booth',                   'PNT'),
  ('PNT-OVN-01', 'Curing oven',                         'PNT'),
  ('PNT-CNV-01', 'Overhead paint conveyor',             'PNT'),
  ('UTL-CMP-01', 'Screw compressor 1',                  'UTL'),
  ('UTL-CMP-02', 'Screw compressor 2',                  'UTL'),
  ('UTL-HVC-01', 'Hall ventilation unit',               'UTL'),
  ('UTL-PMP-01', 'Cooling water pump station',          'UTL'),
  ('WRK-GEN',    'Maintenance workshop (general use)',  'WRK')
) as v(code, name, area_code)
join public.areas a on a.code = v.area_code
order by v.code;

-- 120 spare parts. Lead time and safety stock are set by the simulation below.
-- Every 5th part of a category is bought from the general distributor (RRI).
insert into public.materials
  (code, description, category_id, uom_code, location_id, supplier_id,
   lead_time_days, unit_cost, safety_stock)
select
  s.cat_code || '-' || (1000 + s.seq),
  s.description,
  c.id,
  s.uom_code,
  ((row_number() over (order by c.id, s.seq) - 1) % 48) + 1,
  sup.id,
  7,
  s.unit_cost,
  0
from (values
  ('BRG',  1, 'Deep groove ball bearing 6204-2RS',            'PC',     6.80),
  ('BRG',  2, 'Deep groove ball bearing 6205-2RS',            'PC',     7.90),
  ('BRG',  3, 'Deep groove ball bearing 6206-2RS',            'PC',     9.40),
  ('BRG',  4, 'Deep groove ball bearing 6208-2RS',            'PC',    14.60),
  ('BRG',  5, 'Deep groove ball bearing 6310-2Z',             'PC',    32.50),
  ('BRG',  6, 'Spherical roller bearing 22210 E',             'PC',   118.00),
  ('BRG',  7, 'Tapered roller bearing 30206',                 'PC',    24.30),
  ('BRG',  8, 'Cylindrical roller bearing NU 208',            'PC',    46.80),
  ('BRG',  9, 'Pillow block bearing UCP 205',                 'PC',    21.90),
  ('BRG', 10, 'Flange bearing UCFL 206',                      'PC',    26.40),
  ('BRG', 11, 'Needle roller bearing HK 2016',                'PC',     4.20),
  ('BRG', 12, 'Angular contact ball bearing 7205 B',          'PC',    38.70),

  ('FLT',  1, 'Hydraulic return filter element 10 µm',        'PC',    48.50),
  ('FLT',  2, 'Hydraulic pressure filter element 3 µm',       'PC',    72.00),
  ('FLT',  3, 'Compressor air intake filter',                 'PC',    39.90),
  ('FLT',  4, 'Compressed air line filter element 0.01 µm',   'PC',    54.20),
  ('FLT',  5, 'Compressor oil filter cartridge',              'PC',    28.60),
  ('FLT',  6, 'Compressor air/oil separator',                 'PC',   145.00),
  ('FLT',  7, 'HVAC bag filter F7 592x592',                   'PC',    34.50),
  ('FLT',  8, 'HVAC panel filter G4 592x592',                 'PC',    11.20),
  ('FLT',  9, 'Paint booth ceiling filter 2x1 m',             'PC',    62.00),
  ('FLT', 10, 'Paint booth floor filter 2x20 m',              'ROLL',  89.00),
  ('FLT', 11, 'Coolant filter cartridge 25 µm',               'PC',    19.80),
  ('FLT', 12, 'Dust collector cartridge filter',              'PC',   118.00),

  ('BLT',  1, 'V-belt SPZ 1250',                              'PC',     9.80),
  ('BLT',  2, 'V-belt SPA 1500',                              'PC',    13.40),
  ('BLT',  3, 'V-belt SPB 2000',                              'PC',    21.70),
  ('BLT',  4, 'Timing belt HTD 8M-1200-30',                   'PC',    58.00),
  ('BLT',  5, 'Timing belt T10-1010-25',                      'PC',    42.30),
  ('BLT',  6, 'Flat conveyor belt 600 mm wide',               'M',     64.00),
  ('BLT',  7, 'Roller chain 08B-1',                           'M',     12.50),
  ('BLT',  8, 'Roller chain 12B-1',                           'M',     24.80),
  ('BLT',  9, 'Chain connecting link 08B-1',                  'PC',     1.40),
  ('BLT', 10, 'Sprocket 08B-1 z19',                           'PC',    22.60),
  ('BLT', 11, 'Conveyor roller 50x500 mm',                    'PC',    18.90),
  ('BLT', 12, 'Poly-V belt 8PJ 1016',                         'PC',    16.20),

  ('VLV',  1, 'Ball valve DN25 PN40 stainless steel',         'PC',    64.00),
  ('VLV',  2, 'Ball valve DN50 PN16',                         'PC',   112.00),
  ('VLV',  3, 'Butterfly valve DN80 PN16',                    'PC',   168.00),
  ('VLV',  4, 'Check valve DN32',                             'PC',    46.50),
  ('VLV',  5, 'Gate valve DN50 PN16',                         'PC',   138.00),
  ('VLV',  6, 'Pressure relief valve 1/2" 10 bar',            'PC',    58.40),
  ('VLV',  7, 'Solenoid valve 2/2 1/2" 24 VDC',               'PC',    89.00),
  ('VLV',  8, 'Globe valve DN25 PN40',                        'PC',   124.00),
  ('VLV',  9, 'Needle valve 1/4"',                            'PC',    32.80),
  ('VLV', 10, 'Pressure regulator 1/2" 0-10 bar',             'PC',    74.60),
  ('VLV', 11, 'Float valve 3/4"',                             'PC',    41.20),
  ('VLV', 12, 'Motorized ball valve DN25 24 VAC',             'PC',   285.00),

  ('ELE',  1, 'Contactor 3P 9 A 24 VDC',                      'PC',    38.50),
  ('ELE',  2, 'Contactor 3P 25 A 230 VAC',                    'PC',    64.20),
  ('ELE',  3, 'Motor protection switch 4-6.3 A',              'PC',    52.80),
  ('ELE',  4, 'Miniature circuit breaker C16 1P',             'PC',     6.90),
  ('ELE',  5, 'Fuse NH00 63 A gG',                            'PC',     7.40),
  ('ELE',  6, 'Control relay 24 VDC 2 CO',                    'PC',    11.60),
  ('ELE',  7, 'Power supply 24 VDC 5 A DIN rail',             'PC',    96.00),
  ('ELE',  8, 'Control cable 7x1.5 mm²',                      'M',      3.20),
  ('ELE',  9, 'Power cable NYY-J 5x2.5 mm²',                  'M',      4.60),
  ('ELE', 10, 'LED machine light 24 V',                       'PC',    79.00),
  ('ELE', 11, 'Emergency stop button 40 mm',                  'PC',    28.40),
  ('ELE', 12, 'Frequency inverter 2.2 kW',                    'PC',   465.00),

  ('SEN',  1, 'Inductive proximity sensor M12 PNP',           'PC',    34.60),
  ('SEN',  2, 'Inductive proximity sensor M18 PNP',           'PC',    39.20),
  ('SEN',  3, 'Photoelectric sensor diffuse M18',             'PC',    58.00),
  ('SEN',  4, 'Capacitive level sensor M30',                  'PC',    86.50),
  ('SEN',  5, 'Pressure transmitter 0-10 bar 4-20 mA',        'PC',   148.00),
  ('SEN',  6, 'Temperature sensor PT100 G1/2',                'PC',    62.40),
  ('SEN',  7, 'Rotary encoder 1024 ppr',                      'PC',   212.00),
  ('SEN',  8, 'Limit switch with roller lever',               'PC',    41.80),
  ('SEN',  9, 'Safety light curtain 600 mm',                  'PC',   890.00),
  ('SEN', 10, 'Flow switch DN25',                             'PC',   156.00),
  ('SEN', 11, 'Sensor cable M12 4-pin 5 m',                   'PC',    12.80),
  ('SEN', 12, 'Reed switch for pneumatic cylinder',           'PC',    18.40),

  ('SEL',  1, 'O-ring NBR 20x2',                              'PC',     0.35),
  ('SEL',  2, 'O-ring NBR 50x3',                              'PC',     0.60),
  ('SEL',  3, 'O-ring kit NBR 382 pcs',                       'SET',   39.00),
  ('SEL',  4, 'Radial shaft seal 30x47x7',                    'PC',     3.80),
  ('SEL',  5, 'Radial shaft seal 45x62x8',                    'PC',     5.20),
  ('SEL',  6, 'Flange gasket DN50 PN16',                      'PC',     2.90),
  ('SEL',  7, 'Flange gasket DN80 PN16',                      'PC',     3.80),
  ('SEL',  8, 'Mechanical seal 35 mm for pump',               'PC',   186.00),
  ('SEL',  9, 'Hydraulic cylinder seal kit 50 mm',            'SET',   64.00),
  ('SEL', 10, 'PTFE thread seal tape 12 mm',                  'ROLL',   1.20),
  ('SEL', 11, 'Gasket sheet 1500x1500x2 mm',                  'PC',    92.00),
  ('SEL', 12, 'V-ring seal VA 40',                            'PC',     2.40),

  ('PNE',  1, 'Pneumatic cylinder ISO 15552 50x100',          'PC',   118.00),
  ('PNE',  2, 'Compact cylinder 32x25',                       'PC',    54.60),
  ('PNE',  3, 'Solenoid valve 5/2 24 VDC 1/4"',               'PC',    78.00),
  ('PNE',  4, 'Push-in fitting 8 mm straight',                'PC',     1.90),
  ('PNE',  5, 'Push-in fitting 10 mm elbow',                  'PC',     2.60),
  ('PNE',  6, 'Polyurethane tubing 8 mm blue',                'M',      0.95),
  ('PNE',  7, 'Polyurethane tubing 10 mm blue',               'M',      1.30),
  ('PNE',  8, 'Filter regulator 1/2"',                        'PC',    69.00),
  ('PNE',  9, 'Quick coupling 1/4"',                          'PC',     7.80),
  ('PNE', 10, 'Sintered silencer 1/4"',                       'PC',     2.10),
  ('PNE', 11, 'Vacuum suction cup 40 mm',                     'PC',     9.60),
  ('PNE', 12, 'Pneumatic cylinder repair kit 50 mm',          'SET',   36.00),

  ('HYD',  1, 'Hydraulic hose 1/2" 2SN 1000 mm',              'PC',    38.40),
  ('HYD',  2, 'Hydraulic hose 3/4" 2SN 1500 mm',              'PC',    56.80),
  ('HYD',  3, 'Hydraulic fitting 12L straight',               'PC',     6.80),
  ('HYD',  4, 'Directional valve 4/3 NG6 24 VDC',             'PC',   248.00),
  ('HYD',  5, 'Hydraulic gear pump 16 cc',                    'PC',   385.00),
  ('HYD',  6, 'Pressure gauge 0-250 bar 63 mm',               'PC',    24.60),
  ('HYD',  7, 'Flat face coupling 1/2"',                      'PC',    42.00),
  ('HYD',  8, 'Return line filter housing',                   'PC',   136.00),
  ('HYD',  9, 'Hydraulic cylinder 40x200',                    'PC',   312.00),
  ('HYD', 10, 'Accumulator bladder 4 L',                      'PC',   168.00),
  ('HYD', 11, 'Hydraulic hose 3/8" 1SN 800 mm',               'PC',    26.20),
  ('HYD', 12, 'Check valve cartridge 1/2"',                   'PC',    48.00),

  ('LUB',  1, 'Hydraulic oil HLP 46',                         'L',      3.40),
  ('LUB',  2, 'Gear oil CLP 220',                             'L',      4.80),
  ('LUB',  3, 'Compressor oil VDL 100',                       'L',      6.20),
  ('LUB',  4, 'Multipurpose grease EP2 400 g cartridge',      'PC',     6.90),
  ('LUB',  5, 'High-temperature grease 400 g cartridge',      'PC',    12.40),
  ('LUB',  6, 'Chain lubricant spray 400 ml',                 'PC',     9.80),
  ('LUB',  7, 'Cutting fluid concentrate',                    'L',      5.60),
  ('LUB',  8, 'Penetrating oil spray 400 ml',                 'PC',     7.20),
  ('LUB',  9, 'Food-grade grease H1 400 g',                   'PC',    14.60),
  ('LUB', 10, 'Slideway oil 68',                              'L',      4.10),
  ('LUB', 11, 'Synthetic gear oil PG 460',                    'L',     14.20),
  ('LUB', 12, 'Contact cleaner spray 400 ml',                 'PC',     8.40)
) as s(cat_code, seq, description, uom_code, unit_cost)
join public.categories c on c.code = s.cat_code
join public.suppliers sup on sup.code =
  case
    when s.seq % 5 = 0 then 'RRI'
    else case s.cat_code
      when 'BRG' then 'WLA' when 'BLT' then 'WLA'
      when 'FLT' then 'HFT'
      when 'VLV' then 'HYS' when 'HYD' then 'HYS'
      when 'ELE' then 'EMS' when 'SEN' then 'EMS'
      when 'SEL' then 'DTB'
      when 'PNE' then 'PNK'
      when 'LUB' then 'SLZ'
    end
  end
order by c.id, s.seq;

-- ---------------------------------------------------------------------
-- 4. Movement simulation (182 days, day 181 = yesterday)
--    Per material: opening balance, random consumption, reorder-point
--    policy with lead time, quarterly count differences, damaged/returned
--    parts. Target mix: ~10% RED (late deliveries), ~20% YELLOW (order on
--    its way), ~10% slow movers (no movement for 90+ days), rest GREEN.
-- ---------------------------------------------------------------------
do $$
declare
  v_start        date := current_date - 182;
  v_horizon      int  := 181;
  v_becker       uuid;
  v_storekeepers uuid[];
  v_equipment    bigint[];
  m              record;
  e              record;
  d              int;
  v_day          date;
  v_class        text;
  v_issue_max    int;
  v_p            numeric;
  v_lead         int;
  v_lambda       numeric;
  v_ss           int;
  v_q            int;
  v_rop          int;
  v_window       int;
  v_s0           numeric;
  v_stock        numeric;
  v_min          numeric;
  v_pending      numeric;
  v_arrival      int;
  v_qty          numeric;
  v_cons90       numeric;
  v_rop_act      numeric;
  v_target       numeric;
  v_delta        numeric;
begin
  perform setseed(0.42);  -- reproducible results

  select id into v_becker from auth.users where email = 't.becker@example.com';
  select array_agg(id order by email) into v_storekeepers
  from auth.users where email in ('m.schulz@example.com', 'a.yilmaz@example.com');
  select array_agg(id order by id) into v_equipment from public.equipment;

  -- Scratch table: events of one material before they are written to the ledger
  create temp table seed_events (
    seq           bigint generated always as identity,
    ts            timestamptz,
    movement_type text,
    quantity      numeric,
    supplier_id   bigint,
    equipment_id  bigint,
    reason_code   text,
    reference     text,
    notes         text,
    created_by    uuid
  ) on commit drop;

  for m in
    select mat.id, mat.unit_cost, mat.uom_code, mat.supplier_id,
           p.lead_min, p.lead_max, p.issue_max, p.p_min, p.p_max,
           row_number() over (order by mat.id) as n
    from public.materials mat
    join public.categories c on c.id = mat.category_id
    -- Per category: lead time range (days), max units per issue,
    -- daily probability range of an issue
    join (values
      ('BRG',  5, 14, 2, 0.03, 0.12),
      ('FLT',  3, 10, 3, 0.03, 0.10),
      ('BLT',  5, 14, 2, 0.02, 0.10),
      ('VLV', 14, 42, 1, 0.01, 0.05),
      ('ELE',  3, 21, 2, 0.02, 0.08),
      ('SEN', 10, 35, 1, 0.01, 0.06),
      ('SEL',  5, 14, 4, 0.03, 0.12),
      ('PNE',  7, 21, 3, 0.02, 0.10),
      ('HYD', 14, 42, 1, 0.01, 0.05),
      ('LUB',  3,  7, 2, 0.05, 0.20)
    ) as p(cat_code, lead_min, lead_max, issue_max, p_min, p_max) on p.cat_code = c.code
    order by mat.id
  loop
    -- Intended end state of this material
    v_class := case
      when m.n % 10 = 0       then 'DEAD'
      when m.n % 10 = 7       then 'RED'
      when m.n % 10 in (3, 5) then 'YELLOW'
      else 'GREEN'
    end;

    -- Usage parameters (meters and liters are issued in larger quantities)
    v_issue_max := m.issue_max * case when m.uom_code in ('M', 'L') then 8 else 1 end;
    v_p := m.p_min + random()::numeric * (m.p_max - m.p_min);
    if m.unit_cost > 150 then
      v_p := v_p * 0.4;  -- expensive parts are used less often
    end if;
    v_lead   := m.lead_min + floor(random() * (m.lead_max - m.lead_min + 1))::int;
    v_lambda := v_p * (1 + v_issue_max) / 2.0;  -- expected units per day

    if v_class = 'DEAD' then
      v_ss  := 1;
      v_q   := 0;
      v_rop := 0;
      v_s0  := 3 + v_issue_max + floor(random() * 4);
      v_p   := 0.03;
    else
      v_ss  := greatest(1, ceil(v_lambda * v_lead * 0.5))::int;      -- safety stock
      v_q   := greatest(v_issue_max * 2, ceil(v_lambda * 30))::int;  -- ~1 month per order
      v_rop := ceil(v_lambda * v_lead)::int + v_ss;                  -- planning reorder point
      v_s0  := v_rop + v_q;
    end if;

    -- Late deliveries at the end of the period for RED and YELLOW parts
    v_window := case v_class
      when 'RED'    then v_lead + 30
      when 'YELLOW' then v_lead + 15
      else 0
    end;

    update public.materials
    set lead_time_days = v_lead, safety_stock = v_ss
    where id = m.id;

    v_stock   := v_s0;
    v_min     := v_s0;
    v_pending := 0;
    v_arrival := 0;

    for d in 1..v_horizon loop
      v_day := v_start + d;

      -- 1) Supplier delivery arrives (07:00-10:00)
      if v_pending > 0 and d >= v_arrival and d <= v_horizon - v_window then
        insert into seed_events (ts, movement_type, quantity, supplier_id, reference, created_by)
        values ((v_day + time '07:00' + random() * interval '3 hours')::timestamptz,
                'RECEIPT', v_pending, m.supplier_id,
                'DN-' || to_char(v_day, 'YYMMDD') || '-' || m.id,
                v_storekeepers[1 + floor(random() * 2)::int]);
        v_stock   := v_stock + v_pending;
        v_pending := 0;
      end if;

      -- 2) Issue to a machine (10:00-15:00); slow movers stop after day 75
      if (v_class <> 'DEAD' or d <= 75) and random() < v_p then
        v_qty := case when v_class = 'DEAD' then 1
                      else 1 + floor(random() * v_issue_max) end;
        if v_class <> 'DEAD' or v_stock - v_qty > v_ss then
          insert into seed_events (ts, movement_type, quantity, equipment_id, reference, created_by)
          values ((v_day + time '10:00' + random() * interval '5 hours')::timestamptz,
                  'ISSUE', -v_qty,
                  v_equipment[1 + floor(random() * array_length(v_equipment, 1))::int],
                  'WO-' || (260000 + floor(random() * 9000))::int,
                  v_storekeepers[1 + floor(random() * 2)::int]);
          v_stock := v_stock - v_qty;
          v_min   := least(v_min, v_stock);
        end if;
      end if;

      -- 3) Occasional damaged part or unused part returned (15:00)
      if v_class <> 'DEAD' and random() < 0.004 then
        v_qty := case when random() < 0.5 then -1 else 1 end;
        insert into seed_events (ts, movement_type, quantity, reason_code, notes, created_by)
        values ((v_day + time '15:00' + random() * interval '30 minutes')::timestamptz,
                'ADJUSTMENT', v_qty,
                case when v_qty < 0 then 'DAMAGED' else 'RETURN' end,
                case when v_qty < 0 then 'Damaged during installation'
                     else 'Unused part returned by technician' end,
                case when v_qty < 0 then v_becker
                     else v_storekeepers[1 + floor(random() * 2)::int] end);
        v_stock := v_stock + v_qty;
        v_min   := least(v_min, v_stock);
      end if;

      -- 4) Quarterly cycle count with small differences (16:00)
      if d = 91 and v_class <> 'DEAD' and random() < 0.15 then
        v_qty := case when random() < 0.6 then -1 else 1 end;
        insert into seed_events (ts, movement_type, quantity, reason_code, notes, created_by)
        values ((v_day + time '16:00')::timestamptz,
                'ADJUSTMENT', v_qty, 'COUNT_DIFF', 'Quarterly cycle count', v_becker);
        v_stock := v_stock + v_qty;
        v_min   := least(v_min, v_stock);
      end if;

      -- 5) Reorder-point policy: order when stock falls to the reorder point
      if v_class <> 'DEAD' and v_pending = 0 and v_stock <= v_rop then
        v_pending := v_q;
        v_arrival := d + v_lead;
      end if;
    end loop;

    -- Reorder point with the same formula the app uses (last 90 days)
    select coalesce(-sum(quantity), 0) into v_cons90
    from seed_events
    where movement_type = 'ISSUE' and ts >= now() - interval '90 days';
    v_rop_act := round(v_cons90 / 90.0 * v_lead + v_ss, 2);

    -- Calibrate the opening balance so the final stock lands in the intended status
    v_target := null;
    if v_class = 'RED' then
      v_target := floor(random() * (v_ss + 1));                         -- 0 .. safety stock
    elsif v_class = 'YELLOW' and floor(v_rop_act) >= v_ss + 1 then
      v_target := v_ss + 1 + floor(random() * (floor(v_rop_act) - v_ss)); -- above SS, up to ROP
    end if;

    v_delta := coalesce(v_target - v_stock, 0);
    v_delta := greatest(v_delta, -v_min);  -- the ledger may never go below zero
    v_s0    := v_s0 + v_delta;

    -- Write the ledger: opening balance first, then events in order.
    -- Each row passes the stock trigger from Phase 2.
    if v_s0 > 0 then
      insert into public.stock_movements
        (material_id, movement_type, quantity, movement_date, reason_code, notes, created_by)
      values
        (m.id, 'ADJUSTMENT', v_s0, (v_start + time '06:30')::timestamptz,
         'OPENING_BALANCE', 'Initial stock taken over from Excel', v_becker);
    end if;

    for e in select * from seed_events order by seq loop
      insert into public.stock_movements
        (material_id, movement_type, quantity, movement_date, supplier_id,
         equipment_id, reason_code, reference, notes, created_by)
      values
        (m.id, e.movement_type, e.quantity, e.ts, e.supplier_id,
         e.equipment_id, e.reason_code, e.reference, e.notes, e.created_by);
    end loop;

    delete from seed_events;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 5. Result: status mix
-- ---------------------------------------------------------------------
select stock_status,
       count(*)         as materials,
       sum(stock_value) as stock_value_eur
from public.v_material_status
group by stock_status
order by stock_status;