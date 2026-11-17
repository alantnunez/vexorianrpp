-- =====================================================================
-- VEXORIAN ROLEPLAY · V5 · MIGRACIÓN SEGURA (versión 2)
-- Supabase > SQL Editor > New query > pega TODO > Run.
-- Diseñada para bases que YA tienen piezas de otro V5:
--   · todo lo nuevo usa nombres propios (v5_…) → no choca con tus tablas/funciones (vip_tiers, pay_mult, admin_money_daily…)
--   · antes de reemplazar una función pública guarda su texto en private.backup_v5_functions
--   · guarda copias de tus tablas clave en private.backup_v5_*
--   · es atómica: si algo falla, no se aplica nada (puedes corregir y volver a ejecutar)
--   · asigna a Alantnunez el rol CREATOR y el ID 0 (sin crear cuentas ni borrar datos)
-- Es idempotente. NO subas este archivo al hosting.
-- =====================================================================
begin;

-- ---------------------------------------------------------------------
-- 0. Comprobación de que existe la estructura base (si falta algo, lo dice y no toca nada)
-- ---------------------------------------------------------------------
do $pre$
declare need text[] := array[
  'public.profiles.id','public.profiles.username','public.profiles.money','public.profiles.level','public.profiles.exp','public.profiles.job_delivered','public.profiles.shirt','public.profiles.pants','public.profiles.created_at','public.profiles.last_seen',
  'public.user_roles.user_id','public.user_roles.role','public.user_roles.granted_by',
  'public.character_state.user_id','public.character_state.hp','public.character_state.hunger','public.character_state.thirst','public.character_state.energy','public.character_state.x','public.character_state.y','public.character_state.scene',
  'public.character_state.hospital','public.character_state.hospital_started_at','public.character_state.hospital_start_hp','public.character_state.hospital_bed','public.character_state.invisible','public.character_state.session_id','public.character_state.kicked_at',
  'public.character_state.xtx_access_until','public.character_state.job_active','public.character_state.job_started_at','public.character_state.job_boxes','public.character_state.job_money','public.character_state.job_streak','public.character_state.last_sync',
  'public.equipment.user_id','public.equipment.weapon','public.equipment.ammo_loaded','public.equipment.armor',
  'public.item_catalog.item_key','public.item_catalog.name','public.item_catalog.icon','public.item_catalog.price','public.item_catalog.kind','public.item_catalog.hunger','public.item_catalog.thirst','public.item_catalog.hp','public.item_catalog.energy','public.item_catalog.buyable','public.item_catalog.unique_item','public.item_catalog.max_qty','public.item_catalog.zone_key',
  'public.inventory.user_id','public.inventory.item_key','public.inventory.qty',
  'public.vehicle_catalog.veh_key','public.vehicle_catalog.name','public.vehicle_catalog.price','public.vehicle_catalog.color','public.vehicle_catalog.speed',
  'public.vehicles_owned.id','public.vehicles_owned.user_id','public.vehicles_owned.model_key','public.vehicles_owned.color','public.vehicles_owned.plate','public.vehicles_owned.created_at',
  'public.property_catalog.property_key','public.property_catalog.name','public.property_catalog.price',
  'public.properties_owned.property_key','public.properties_owned.user_id',
  'public.purchases.user_id','public.purchases.kind','public.purchases.item_key','public.purchases.qty','public.purchases.unit_price','public.purchases.total',
  'public.dm_messages.id','public.dm_messages.from_id','public.dm_messages.to_id','public.dm_messages.msg','public.dm_messages.created_at','public.dm_messages.read_at',
  'public.player_contacts.owner_id','public.player_contacts.friend_id',
  'public.world_state.id','public.world_state.weather','public.world_state.time_mode','public.world_state.fixed_hour',
  'public.zones.zone_key','public.zones.name','public.zones.enabled',
  'public.bans.user_id','public.bans.reason','public.bans.banned_by','public.bans.expires_at','public.bans.active','public.bans.unbanned_by','public.bans.unbanned_at',
  'public.admin_log.admin_id','public.admin_log.action','public.admin_log.target_id','public.admin_log.details','public.admin_log.created_at',
  'private.owner_config.id','private.owner_config.owner_id'];
  miss text[] := '{}'; n text; sch text; tb text; col text;
begin
  foreach n in array need loop
    sch := split_part(n, '.', 1); tb := split_part(n, '.', 2); col := split_part(n, '.', 3);
    if not exists (select 1 from information_schema.columns where table_schema = sch and table_name = tb and column_name = col) then miss := miss || n; end if;
  end loop;
  if array_length(miss, 1) > 0 then
    raise exception 'Falta estructura base: %. Ejecuta antes 01_migracion_v4.sql o envíame este mensaje.', array_to_string(miss, ', ');
  end if;
end
$pre$;

-- ---------------------------------------------------------------------
-- 1. Copias de seguridad (solo la primera vez; nunca se sobrescriben)
-- ---------------------------------------------------------------------
create table if not exists private.backup_v5_profiles          as table public.profiles;
create table if not exists private.backup_v5_user_roles        as table public.user_roles;
create table if not exists private.backup_v5_character_state   as table public.character_state;
create table if not exists private.backup_v5_inventory         as table public.inventory;
create table if not exists private.backup_v5_vehicles_owned    as table public.vehicles_owned;
create table if not exists private.backup_v5_vehicle_catalog   as table public.vehicle_catalog;
create table if not exists private.backup_v5_properties_owned  as table public.properties_owned;
create table if not exists private.backup_v5_purchases         as table public.purchases;
create table if not exists private.backup_v5_functions (sig text primary key, def text not null, saved_at timestamptz not null default now());

-- ---------------------------------------------------------------------
-- 2. Alantnunez = CREATOR (se repara el permiso sin crear otra cuenta)
-- ---------------------------------------------------------------------
do $own$
declare u uuid;
begin
  insert into private.owner_config (id) values (1) on conflict do nothing;
  select owner_id into u from private.owner_config where id = 1;
  if u is null or not exists (select 1 from public.profiles where id = u) then
    select id into u from public.profiles where lower(username) = 'alantnunez' order by created_at limit 1;
    if u is not null then update private.owner_config set owner_id = u where id = 1; end if;
  end if;
  if u is not null then
    delete from public.user_roles where role = 'CREATOR' and user_id <> u;
    insert into public.user_roles (user_id, role, granted_by) values (u, 'CREATOR', u) on conflict do nothing;
  end if;
end
$own$;

-- ---------------------------------------------------------------------
-- 3. Roles ADMIN y VIP, y tipo de objeto "ingredient" (solo se cambia si hace falta)
-- ---------------------------------------------------------------------
do $c$
declare r record; ok_roles boolean; ok_kind boolean;
begin
  select exists (select 1 from pg_constraint where conrelid = 'public.user_roles'::regclass and contype = 'c'
                 and pg_get_constraintdef(oid) ilike '%ADMIN%' and pg_get_constraintdef(oid) ilike '%VIP%' and pg_get_constraintdef(oid) ilike '%CREATOR%') into ok_roles;
  if not ok_roles then
    for r in select conname from pg_constraint where conrelid = 'public.user_roles'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%role%' loop
      execute format('alter table public.user_roles drop constraint %I', r.conname);
    end loop;
    alter table public.user_roles add constraint user_roles_role_chk check (role in ('XTX','CREATOR','ADMIN','VIP'));
  end if;
  select not exists (select 1 from pg_constraint where conrelid = 'public.item_catalog'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%kind%')
         or exists (select 1 from pg_constraint where conrelid = 'public.item_catalog'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%kind%' and pg_get_constraintdef(oid) ilike '%ingredient%') into ok_kind;
  if not ok_kind then
    for r in select conname from pg_constraint where conrelid = 'public.item_catalog'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%kind%' loop
      execute format('alter table public.item_catalog drop constraint %I', r.conname);
    end loop;
    alter table public.item_catalog add constraint item_catalog_kind_chk check (kind in ('food','drink','med','tech','gear','ammo','ingredient'));
  end if;
end
$c$;

-- ---------------------------------------------------------------------
-- 4. ID permanente: Alantnunez = 0, el resto por orden de creación, nunca se reutiliza
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists player_id int;

create or replace function private.v5_keep_player_id() returns trigger
language plpgsql as $$
begin
  if old.player_id is not null and new.player_id is distinct from old.player_id
     and coalesce(current_setting('v5.allow_pid_change', true), '') <> 'on' then
    raise exception 'El ID de jugador es permanente.';
  end if;
  return new;
end $$;
drop trigger if exists trg_v5_keep_player_id on public.profiles;

do $ids$
declare seqname text; ow uuid; r record; mx bigint; lv bigint; called boolean;
begin
  perform set_config('v5.allow_pid_change', 'on', true);
  seqname := pg_get_serial_sequence('public.profiles', 'player_id');
  if seqname is null then
    create sequence if not exists public.player_id_seq minvalue 1 start 1;
    seqname := 'public.player_id_seq';
  end if;
  select coalesce(max(player_id), 0) into mx from public.profiles;
  execute format('select last_value, is_called from %s', seqname) into lv, called;
  execute format('select setval(%L, %s, false)', seqname, greatest(lv + case when called then 1 else 0 end, mx + 1));
  select owner_id into ow from private.owner_config where id = 1;
  if ow is not null then
    if exists (select 1 from public.profiles where player_id = 0 and id <> ow) then
      update public.profiles set player_id = nextval(seqname::regclass)::int where player_id = 0 and id <> ow;
    end if;
    update public.profiles set player_id = 0 where id = ow and player_id is distinct from 0;
  end if;
  for r in select id from public.profiles where player_id is null order by created_at, id loop
    update public.profiles set player_id = nextval(seqname::regclass)::int where id = r.id;
  end loop;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'player_id' and column_default is not null) then
    execute format('alter table public.profiles alter column player_id set default nextval(%L)', seqname);
  end if;
end
$ids$;
create unique index if not exists profiles_player_id_uq on public.profiles (player_id);
alter table public.profiles alter column player_id set not null;
create trigger trg_v5_keep_player_id before update on public.profiles
  for each row when (old.player_id is distinct from new.player_id) execute function private.v5_keep_player_id();
grant select (player_id) on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- 5. Tablas y columnas nuevas (todas con prefijo v5_ para no chocar con las tuyas)
-- ---------------------------------------------------------------------
alter table public.character_state add column if not exists home_key text;
alter table public.character_state add column if not exists cook_recipe text;
alter table public.character_state add column if not exists cook_ready_at timestamptz;
alter table public.vehicles_owned  add column if not exists fuel real not null default 100;
alter table public.vehicles_owned  add column if not exists x real;
alter table public.vehicles_owned  add column if not exists y real;
alter table public.vehicles_owned  add column if not exists a real;
alter table public.vehicle_catalog add column if not exists available boolean not null default true;

create table if not exists public.v5_vip_prefs (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  pay2x boolean not null default true,
  speed boolean not null default false,
  needs boolean not null default false
);
create table if not exists public.v5_property_guests (
  property_key text not null references public.property_catalog(property_key) on delete cascade,
  guest_id uuid not null references public.profiles(id) on delete cascade,
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (property_key, guest_id)
);
create table if not exists public.v5_recipes (
  recipe_key text primary key,
  name text not null,
  icon text not null default '🍳',
  result_key text not null references public.item_catalog(item_key),
  seconds int not null default 8,
  ingredients jsonb not null
);
create table if not exists public.v5_transport_points (
  point_key text primary key, name text not null, x real not null, y real not null
);
create table if not exists public.v5_transport_runs (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  to_key text not null references public.v5_transport_points(point_key),
  status text not null default 'active' check (status in ('active','picked','done','cancelled')),
  reward_base int not null,
  reward bigint,
  started_at timestamptz not null default now(),
  picked_at timestamptz,
  delivered_at timestamptz
);
create unique index if not exists v5_transport_one_active on public.v5_transport_runs (user_id) where status in ('active','picked');
create index if not exists v5_transport_runs_user on public.v5_transport_runs (user_id, id desc);
create table if not exists public.v5_staff_money_daily (
  admin_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  total bigint not null default 0,
  primary key (admin_id, day)
);

-- ---------------------------------------------------------------------
-- 6. Catálogos
-- ---------------------------------------------------------------------
insert into public.property_catalog (property_key, name, price)
select 'casa_' || lpad(t.n::text, 2, '0'), t.name, t.price from (values
 (1,'Casa Las Palmas 1',14000),(2,'Casa Las Palmas 2',14000),(3,'Casa Las Palmas 3',16000),
 (4,'Casa San Miguel 1',12000),(5,'Casa San Miguel 2',12000),(6,'Casa San Miguel 3',13000),
 (7,'Villa del Este 1',22000),(8,'Villa del Este 2',22000),(9,'Villa del Este 3',25000),
 (10,'Villa Sur 1',18000),(11,'Villa Sur 2',18000),(12,'Villa Sur 3',20000),
 (13,'Villa del Este 4',23000),(14,'Villa del Este 5',23000),(15,'Villa del Este 6',26000),
 (16,'Casa Las Palmas 4',15000),(17,'Casa Las Palmas 5',15000),(18,'Casa Las Palmas 6',17000),
 (19,'Casa San Miguel 4',12500),(20,'Casa San Miguel 5',12500),(21,'Casa San Miguel 6',12500),(22,'Casa San Miguel 7',13000),(23,'Casa San Miguel 8',13000),
 (24,'Casa San Miguel II 1',12000),(25,'Casa San Miguel II 2',12000),(26,'Casa San Miguel II 3',12000),(27,'Casa San Miguel II 4',12000),
 (28,'Casa Las Palmas II 1',15500),(29,'Casa Las Palmas II 2',15500),(30,'Casa Las Palmas II 3',15500),(31,'Casa Las Palmas II 4',15500),(32,'Casa Las Palmas II 5',15500),(33,'Casa Las Palmas II 6',15500),
 (34,'Villa Sur 4',19000),(35,'Villa Sur 5',19000),(36,'Villa Sur 6',21000),
 (37,'Villa Sur II 1',18500),(38,'Villa Sur II 2',18500),(39,'Villa Sur II 3',18500),(40,'Villa Sur II 4',18500),(41,'Villa Sur II 5',18500),(42,'Villa Sur II 6',18500),
 (43,'Residencial Sur 1',11000),(44,'Residencial Sur 2',11000),(45,'Residencial Sur 3',11000),
 (46,'Residencial Sur II 1',11000),(47,'Residencial Sur II 2',11000),(48,'Residencial Sur II 3',11000)
) as t(n, name, price)
on conflict (property_key) do nothing;

insert into public.item_catalog (item_key,name,icon,price,kind,hunger,thirst,hp,energy,buyable,unique_item,max_qty,zone_key) values
 ('huevo','Huevos','🥚',6,'ingredient',0,0,0,0,true,false,30,'supermercado'),
 ('pan','Pan','🍞',4,'ingredient',0,0,0,0,true,false,30,'supermercado'),
 ('carne','Carne','🥩',12,'ingredient',0,0,0,0,true,false,30,'supermercado'),
 ('arroz','Arroz','🍚',5,'ingredient',0,0,0,0,true,false,30,'supermercado'),
 ('verdura','Verduras','🥬',4,'ingredient',0,0,0,0,true,false,30,'supermercado'),
 ('tortilla','Tortilla casera','🍳',0,'food',40,0,2,0,false,false,20,null),
 ('sandwich_casero','Sándwich casero','🥪',0,'food',55,0,3,0,false,false,20,null),
 ('arroz_carne','Arroz con carne','🍛',0,'food',80,-4,6,0,false,false,20,null),
 ('ensalada','Ensalada fresca','🥗',0,'food',25,15,4,0,false,false,20,null)
on conflict (item_key) do update set name=excluded.name, icon=excluded.icon, price=excluded.price, kind=excluded.kind,
  hunger=excluded.hunger, thirst=excluded.thirst, hp=excluded.hp, energy=excluded.energy, buyable=excluded.buyable,
  unique_item=excluded.unique_item, max_qty=excluded.max_qty, zone_key=excluded.zone_key;

insert into public.v5_recipes (recipe_key,name,icon,result_key,seconds,ingredients) values
 ('tortilla','Tortilla casera','🍳','tortilla',8,'{"huevo":2}'),
 ('sandwich_casero','Sándwich casero','🥪','sandwich_casero',8,'{"pan":1,"carne":1}'),
 ('arroz_carne','Arroz con carne','🍛','arroz_carne',14,'{"arroz":1,"carne":1,"verdura":1}'),
 ('ensalada','Ensalada fresca','🥗','ensalada',6,'{"verdura":2}')
on conflict (recipe_key) do update set name=excluded.name, icon=excluded.icon, result_key=excluded.result_key, seconds=excluded.seconds, ingredients=excluded.ingredients;

-- Un solo vehículo a la venta ($3,000). Los demás modelos se conservan pero ya no se venden.
insert into public.vehicle_catalog (veh_key,name,price,color,speed) values ('sedan','Sedán',3000,'#c94f45',1.0) on conflict (veh_key) do nothing;
update public.vehicle_catalog set available = false where veh_key <> 'sedan';
update public.vehicle_catalog set available = true, price = 3000, name = 'Sedán' where veh_key = 'sedan';

insert into public.v5_transport_points (point_key, name, x, y) values
 ('depot','Central de transporte',1040,392),('super','Supermercado 24/7',250,935),('almacen','Almacén',240,392),
 ('gas_este','Gasolinera Este',3600,952),('gas_centro','Gasolinera Centro',1645,2602)
on conflict (point_key) do update set name=excluded.name, x=excluded.x, y=excluded.y;

insert into public.zones (zone_key, name) values ('transporte','Central de transporte') on conflict (zone_key) do update set name = excluded.name;

-- Nivel = 1 + exp/96 (equivale a la fórmula anterior). Nunca baja un nivel ya alcanzado.
update public.profiles set exp = greatest(exp, (level - 1) * 96);
update public.profiles set level = greatest(level, 1 + exp / 96);

-- ---------------------------------------------------------------------
-- 7. RLS y permisos de las tablas nuevas
-- ---------------------------------------------------------------------
do $rls$
declare t text;
begin
  foreach t in array array['v5_vip_prefs','v5_property_guests','v5_recipes','v5_transport_points','v5_transport_runs','v5_staff_money_daily'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $rls$;
grant select on public.v5_vip_prefs, public.v5_property_guests, public.v5_recipes, public.v5_transport_points, public.v5_transport_runs to authenticated;
drop policy if exists p_v5_vip_own on public.v5_vip_prefs;
create policy p_v5_vip_own on public.v5_vip_prefs for select to authenticated using (user_id = auth.uid());
drop policy if exists p_v5_guest_own on public.v5_property_guests;
create policy p_v5_guest_own on public.v5_property_guests for select to authenticated using (guest_id = auth.uid());
drop policy if exists p_v5_recipes_read on public.v5_recipes;
create policy p_v5_recipes_read on public.v5_recipes for select to authenticated using (true);
drop policy if exists p_v5_tpoints_read on public.v5_transport_points;
create policy p_v5_tpoints_read on public.v5_transport_points for select to authenticated using (true);
drop policy if exists p_v5_truns_own on public.v5_transport_runs;
create policy p_v5_truns_own on public.v5_transport_runs for select to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 8. Funciones internas propias de la V5 (schema private; prefijo v5_)
-- ---------------------------------------------------------------------
create or replace function private.v5_require_user() returns uuid
language plpgsql stable security definer set search_path = public, private as $$
declare u uuid := auth.uid();
begin
  if u is null then raise exception 'Sesión no válida. Inicia sesión de nuevo.'; end if;
  if private.v5_is_banned(u) then raise exception 'Tu cuenta está suspendida.'; end if;
  return u;
end $$;

create or replace function private.v5_require_creator() returns uuid
language plpgsql stable security definer set search_path = public, private as $$
declare u uuid := private.v5_require_user();
begin
  if not private.v5_is_creator(u) then raise exception 'Acceso denegado: solo el CREATOR.'; end if;
  return u;
end $$;

create or replace function private.v5_is_creator(p uuid) returns boolean
language sql stable security definer set search_path = public, private as
$$ select p is not null
      and p = (select owner_id from private.owner_config where id = 1)
      and exists (select 1 from public.user_roles r where r.user_id = p and r.role = 'CREATOR') $$;

create or replace function private.v5_has_xtx(p uuid) returns boolean
language sql stable security definer set search_path = public, private as
$$ select exists (select 1 from public.user_roles r where r.user_id = p and r.role = 'XTX') or private.v5_is_creator(p) $$;

create or replace function private.v5_is_banned(p uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.bans b where b.user_id = p and b.active and (b.expires_at is null or b.expires_at > now())) $$;

create or replace function private.v5_zone_open(p_zone text) returns boolean
language sql stable security definer set search_path = public as
$$ select p_zone is null or coalesce((select enabled from public.zones where zone_key = p_zone), true) $$;

create or replace function private.v5_hosp_rate() returns real language sql immutable as $$ select 1.4::real $$;

create or replace function private.v5_hosp_hp(cs public.character_state) returns real
language sql stable as
$$ select least(100, coalesce(cs.hospital_start_hp, 5) + private.v5_hosp_rate() * extract(epoch from (now() - cs.hospital_started_at)))::real $$;

create or replace function private.v5_alog(p_admin uuid, p_action text, p_target uuid, p_details jsonb) returns void
language sql security definer set search_path = public as
$$ insert into public.admin_log (admin_id, action, target_id, details) values (p_admin, p_action, p_target, p_details) $$;

create or replace function private.v5_world_json() returns jsonb
language sql stable security definer set search_path = public as
$$ select jsonb_build_object('weather', w.weather, 'time_mode', w.time_mode, 'fixed_hour', w.fixed_hour,
          'zones', (select coalesce(jsonb_object_agg(z.zone_key, z.enabled), '{}'::jsonb) from public.zones z))
   from public.world_state w where w.id = 1 $$;

create or replace function private.v5_inv_json(p uuid) returns jsonb
language sql stable security definer set search_path = public as
$$ select coalesce(jsonb_object_agg(item_key, qty), '{}'::jsonb) from public.inventory where user_id = p and qty > 0 $$;

create or replace function private.v5_roles_json(p uuid) returns jsonb
language sql stable security definer set search_path = public, private as
$$ select coalesce(jsonb_agg(role order by role), '[]'::jsonb) from public.user_roles where user_id = p $$;

create or replace function private.v5_add_item(p uuid, p_key text, p_qty int) returns int
language plpgsql security definer set search_path = public as $$
declare q int;
begin
  insert into public.inventory (user_id, item_key, qty) values (p, p_key, greatest(p_qty, 0))
  on conflict (user_id, item_key) do update set qty = public.inventory.qty + p_qty
  returning qty into q;
  return q;
end $$;

create or replace function private.v5_night_now() returns boolean language sql stable as
$$ select extract(hour from (now() at time zone 'America/Santo_Domingo')) >= 22
        or extract(hour from (now() at time zone 'America/Santo_Domingo')) < 6 $$;

create or replace function private.v5_has_role(p uuid, r text) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.user_roles x where x.user_id = p and x.role = r) $$;

create or replace function private.v5_is_staff(p uuid) returns boolean
language sql stable security definer set search_path = public, private as
$$ select private.v5_is_creator(p) or private.v5_has_role(p, 'ADMIN') $$;

create or replace function private.v5_require_staff() returns uuid
language plpgsql stable security definer set search_path = public, private as $$
declare u uuid := private.v5_require_user();
begin
  if not private.v5_is_staff(u) then raise exception 'Acceso denegado: solo el personal autorizado.'; end if;
  return u;
end $$;

create or replace function private.v5_top_role(p uuid) returns text
language sql stable security definer set search_path = public, private as
$$ select case when private.v5_is_creator(p) then 'CREATOR'
               when private.v5_has_role(p, 'ADMIN') then 'ADMIN'
               when private.v5_has_role(p, 'VIP') then 'VIP'
               when private.v5_has_role(p, 'XTX') then 'XTX' else '' end $$;

-- Multiplicador de pago de los trabajos. Se aplica UNA sola vez por pago, siempre desde esta función.
create or replace function private.v5_pay_mult(p uuid) returns int
language sql stable security definer set search_path = public, private as
$$ select case when (private.v5_has_role(p, 'VIP') or private.v5_is_creator(p)) and coalesce((select v.pay2x from public.v5_vip_prefs v where v.user_id = p), true) then 2 else 1 end $$;

create or replace function private.v5_level_of(p_exp int) returns int language sql immutable as $$ select 1 + greatest(p_exp, 0) / 96 $$;
create or replace function private.v5_admin_daily_limit() returns bigint language sql immutable as $$ select 10000::bigint $$;
create or replace function private.v5_today() returns date language sql stable as $$ select (now() at time zone 'America/Santo_Domingo')::date $$;

create or replace function private.v5_can_enter_house(p uuid, p_key text) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.properties_owned o where o.property_key = p_key and o.user_id = p)
       or exists (select 1 from public.v5_property_guests g where g.property_key = p_key and g.guest_id = p
                  and exists (select 1 from public.properties_owned o2 where o2.property_key = p_key)) $$;

create or replace function private.v5_guests_json(p_key text) returns jsonb
language sql stable security definer set search_path = public as
$$ select coalesce(jsonb_agg(jsonb_build_object('id', pr.id, 'username', pr.username, 'pid', pr.player_id) order by pr.username), '[]'::jsonb)
   from public.v5_property_guests g join public.profiles pr on pr.id = g.guest_id where g.property_key = p_key $$;

-- Alta de usuario con ID permanente (el propietario recibe el ID 0)
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, private, extensions as $$
declare uname text; owner_mail text; is_owner boolean := false;
begin
  uname := trim(coalesce(new.raw_user_meta_data->>'username', ''));
  if uname = '' then uname := 'Jugador' || substr(replace(new.id::text,'-',''), 1, 6); end if;
  if uname !~ '^[A-Za-z0-9_]{3,16}$' then raise exception 'invalid_username'; end if;
  select owner_email into owner_mail from private.owner_config where id = 1;
  if lower(uname) = 'alantnunez' then
    if owner_mail is not null and lower(new.email) = lower(owner_mail) then is_owner := true;
    else raise exception 'reserved_username'; end if;
  elsif owner_mail is not null and lower(new.email) = lower(owner_mail) then
    is_owner := true; uname := 'Alantnunez';
  end if;
  if is_owner and not exists (select 1 from public.profiles where player_id = 0) then
    insert into public.profiles (id, username, player_id) values (new.id, uname, 0);
  else
    insert into public.profiles (id, username) values (new.id, uname);
  end if;
  insert into public.character_state (user_id) values (new.id);
  insert into public.equipment (user_id) values (new.id);
  if is_owner then
    update private.owner_config set owner_id = new.id where id = 1;
    insert into public.user_roles (user_id, role, granted_by) values (new.id, 'CREATOR', new.id);
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------
-- 8b. Guardar y retirar las versiones previas de las funciones públicas que la V5 redefine
--     (así no hay errores de «cannot change return type»; el texto anterior queda en private.backup_v5_functions)
-- ---------------------------------------------------------------------
do $drop$
declare r record;
begin
  for r in select p.oid, p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname = any (array['get_me','heartbeat','sync_state','buy_vehicle','vehicle_fuel_sync','refuel_vehicle','job_deliver','job_end_shift','transport_status','transport_start','transport_pickup','transport_deliver','transport_cancel','enter_house','leave_house','list_guests','invite_guest','revoke_guest','cook_start','cook_collect','vip_set','get_dms','get_contacts','search_players','public_info','admin_overview','admin_list_players','admin_player_detail','admin_purchases','admin_set_role','admin_kick','admin_ban','admin_unban','admin_money','admin_item','admin_set_world','admin_set_zone','admin_set_power','admin_log_list','admin_my_limits','admin_set_level','admin_heal','admin_give_vehicle','admin_give_property','admin_release_property','admin_list_properties']) loop
    insert into private.backup_v5_functions (sig, def) values (r.sig::text, pg_get_functiondef(r.oid)) on conflict do nothing;
    execute format('drop function %s', r.sig);
  end loop;
end
$drop$;

-- ---------------------------------------------------------------------
-- 9. API del jugador (versiones ampliadas; mismas firmas que la V4)
-- ---------------------------------------------------------------------
create or replace function public.get_me() returns jsonb
language plpgsql security definer set search_path = public, private, extensions, pg_temp as $$
declare u uuid := auth.uid(); p public.profiles; cs public.character_state; eq public.equipment; b public.bans; vp public.v5_vip_prefs;
begin
  if u is null then raise exception 'Sesión no válida.'; end if;
  select * into p from public.profiles where id = u;
  if not found then
    insert into public.profiles (id, username)
    select id, 'Jugador' || substr(replace(id::text,'-',''), 1, 6) from auth.users where id = u;
    select * into p from public.profiles where id = u;
  end if;
  insert into public.character_state (user_id) values (u) on conflict do nothing;
  insert into public.equipment (user_id) values (u) on conflict do nothing;
  select * into b from public.bans where user_id = u and active and (expires_at is null or expires_at > now()) order by id desc limit 1;
  if found then return jsonb_build_object('banned', true, 'reason', b.reason, 'until', b.expires_at); end if;
  select * into cs from public.character_state where user_id = u;
  select * into eq from public.equipment where user_id = u;
  select * into vp from public.v5_vip_prefs where user_id = u;
  update public.profiles set last_seen = now() where id = u;
  return jsonb_build_object(
    'id', u, 'username', p.username, 'player_id', p.player_id, 'money', p.money, 'level', p.level, 'exp', p.exp, 'delivered', p.job_delivered,
    'shirt', p.shirt, 'pants', p.pants,
    'roles', private.v5_roles_json(u), 'creator', private.v5_is_creator(u), 'role', private.v5_top_role(u),
    'vip', jsonb_build_object('pay2x', coalesce(vp.pay2x, true), 'speed', coalesce(vp.speed, false), 'needs', coalesce(vp.needs, false)),
    'state', jsonb_build_object('hp', case when cs.hospital then private.v5_hosp_hp(cs) else cs.hp end,
        'hunger', cs.hunger, 'thirst', cs.thirst, 'energy', cs.energy, 'x', cs.x, 'y', cs.y, 'scene', cs.scene,
        'invisible', cs.invisible, 'xtx_access', coalesce(cs.xtx_access_until > now(), false), 'job_active', cs.job_active),
    'hospital', case when cs.hospital then jsonb_build_object('bed', cs.hospital_bed,
        'started_ms', (extract(epoch from cs.hospital_started_at) * 1000)::bigint,
        'start_hp', cs.hospital_start_hp, 'rate', private.v5_hosp_rate()) else null end,
    'equipment', jsonb_build_object('weapon', eq.weapon, 'ammo_loaded', eq.ammo_loaded, 'armor', eq.armor),
    'inv', private.v5_inv_json(u),
    'vehicles', (select coalesce(jsonb_agg(jsonb_build_object('id', v.id, 'model', v.model_key, 'color', v.color,
                  'plate', v.plate, 'x', v.x, 'y', v.y, 'a', v.a, 'fuel', v.fuel) order by v.created_at), '[]'::jsonb)
                 from public.vehicles_owned v where v.user_id = u),
    'properties', (select coalesce(jsonb_agg(jsonb_build_object('key', po.property_key, 'owner', pr.username, 'owner_pid', pr.player_id, 'mine', po.user_id = u)), '[]'::jsonb)
                   from public.properties_owned po join public.profiles pr on pr.id = po.user_id),
    'guest_of', (select coalesce(jsonb_agg(jsonb_build_object('key', g.property_key, 'owner', pr.username)), '[]'::jsonb)
                 from public.v5_property_guests g join public.properties_owned po on po.property_key = g.property_key
                 join public.profiles pr on pr.id = po.user_id where g.guest_id = u),
    'cook', case when cs.cook_recipe is null then null else jsonb_build_object('recipe', cs.cook_recipe,
                 'ready_ms', (extract(epoch from cs.cook_ready_at) * 1000)::bigint) end,
    'catalog', jsonb_build_object(
        'items', (select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) from public.item_catalog c),
        'vehicles', (select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) from public.vehicle_catalog c),
        'properties', (select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) from public.property_catalog c),
        'recipes', (select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) from public.v5_recipes c),
        'points', (select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) from public.v5_transport_points c)),
    'world', private.v5_world_json(),
    'server_ms', (extract(epoch from now()) * 1000)::bigint
  );
end $$;

create or replace function public.heartbeat(p_session uuid default null) returns jsonb
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare u uuid := auth.uid(); cs public.character_state; pr public.profiles; vp public.v5_vip_prefs;
begin
  if u is null then raise exception 'Sesión no válida.'; end if;
  if private.v5_is_banned(u) then return jsonb_build_object('banned', true); end if;
  select * into cs from public.character_state where user_id = u for update;
  if p_session is not null and cs.session_id is not null and cs.session_id <> p_session then
    return jsonb_build_object('replaced', true);
  end if;
  if cs.home_key is not null and (cs.hospital or not private.v5_can_enter_house(u, cs.home_key)) then
    update public.character_state set home_key = null where user_id = u;
    cs.home_key := null;
  end if;
  update public.profiles set last_seen = now() where id = u returning * into pr;
  update public.character_state set session_at = now() where user_id = u;
  select * into vp from public.v5_vip_prefs where user_id = u;
  return jsonb_build_object('money', pr.money, 'level', pr.level, 'exp', pr.exp, 'roles', private.v5_roles_json(u), 'creator', private.v5_is_creator(u),
    'role', private.v5_top_role(u), 'player_id', pr.player_id,
    'vip', jsonb_build_object('pay2x', coalesce(vp.pay2x, true), 'speed', coalesce(vp.speed, false), 'needs', coalesce(vp.needs, false)),
    'inv', private.v5_inv_json(u), 'invisible', cs.invisible, 'home_key', cs.home_key,
    'xtx_access', coalesce(cs.xtx_access_until > now(), false),
    'kicked_ms', case when cs.kicked_at is null then 0 else (extract(epoch from cs.kicked_at) * 1000)::bigint end,
    'properties', (select coalesce(jsonb_agg(jsonb_build_object('key', po.property_key, 'owner', q.username, 'owner_pid', q.player_id, 'mine', po.user_id = u)), '[]'::jsonb)
                   from public.properties_owned po join public.profiles q on q.id = po.user_id),
    'guest_of', (select coalesce(jsonb_agg(jsonb_build_object('key', g.property_key, 'owner', q.username)), '[]'::jsonb)
                 from public.v5_property_guests g join public.properties_owned po on po.property_key = g.property_key
                 join public.profiles q on q.id = po.user_id where g.guest_id = u),
    'world', private.v5_world_json(), 'server_ms', (extract(epoch from now()) * 1000)::bigint);
end $$;

create or replace function public.sync_state(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_user(); cs public.character_state; eq public.equipment;
        dt real; nh real; nt real; ne real; hp2 real; sc text;
begin
  select * into cs from public.character_state where user_id = u for update;
  select * into eq from public.equipment where user_id = u for update;
  if cs.hospital then
    update public.character_state set last_sync = now() where user_id = u;
    return jsonb_build_object('ok', true, 'hospital', true);
  end if;
  dt  := least(60, greatest(1, extract(epoch from (now() - coalesce(cs.last_sync, now() - interval '60 seconds')))));
  hp2 := greatest(1, least(100, coalesce((p->>'hp')::real, cs.hp)));
  hp2 := least(hp2, cs.hp + 0.5 * dt + 1);
  nh  := greatest(0, least(cs.hunger, coalesce((p->>'hunger')::real, cs.hunger)));
  nt  := greatest(0, least(cs.thirst, coalesce((p->>'thirst')::real, cs.thirst)));
  ne  := greatest(0, least(100, coalesce((p->>'energy')::real, cs.energy)));
  ne  := least(ne, cs.energy + 1.0 * dt + 1);
  sc  := coalesce(p->>'scene', 'out');
  if sc not in ('out','in','shop','hosp','cloth','home') then sc := 'out'; end if;
  update public.character_state set hp = hp2, hunger = nh, thirst = nt, energy = ne,
    x = greatest(0, least(4200, coalesce((p->>'x')::real, x))), y = greatest(0, least(3200, coalesce((p->>'y')::real, y))),
    scene = sc, last_sync = now(), updated_at = now() where user_id = u;
  update public.equipment set
    ammo_loaded = greatest(0, least(eq.ammo_loaded, coalesce((p->>'ammo')::int, eq.ammo_loaded))),
    armor = greatest(0, least(eq.armor, coalesce((p->>'armor')::real, eq.armor)))
  where user_id = u;
  return jsonb_build_object('ok', true);
end $$;

-- Vehículo a la venta: solo los marcados como disponibles. Se entrega con el tanque lleno.
create or replace function public.buy_vehicle(p_key text) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_user(); v public.vehicle_catalog; m bigint; n int; vid uuid; plate text;
begin
  select * into v from public.vehicle_catalog where veh_key = p_key and available;
  if not found then raise exception 'Ese vehículo no está a la venta.'; end if;
  if not (private.v5_zone_open('concesionario') or private.v5_is_creator(u)) then raise exception 'El concesionario está cerrado.'; end if;
  select count(*) into n from public.vehicles_owned where user_id = u;
  if n >= 4 then raise exception 'Ya tienes el máximo de vehículos (4).'; end if;
  update public.profiles set money = money - v.price where id = u and money >= v.price returning money into m;
  if not found then raise exception 'No te alcanza el dinero ($%).', v.price; end if;
  plate := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  insert into public.vehicles_owned (user_id, model_key, color, plate, fuel) values (u, v.veh_key, v.color, plate, 100) returning id into vid;
  insert into public.purchases (user_id, kind, item_key, qty, unit_price, total) values (u, 'vehicle', v.veh_key, 1, v.price, v.price);
  return jsonb_build_object('money', m, 'id', vid, 'model', v.veh_key, 'color', v.color, 'plate', plate, 'fuel', 100);
end $$;

-- Combustible: el consumo lo informa el cliente (solo puede BAJAR); llenar el tanque cuesta dinero y lo valida el servidor.
create or replace function public.vehicle_fuel_sync(p_id uuid, p_fuel real) returns void
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_user();
begin
  update public.vehicles_owned set fuel = greatest(0, least(fuel, coalesce(p_fuel, fuel))) where id = p_id and user_id = u;
end $$;

create or replace function public.refuel_vehicle(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_user(); v public.vehicles_owned; cost int; m bigint;
begin
  select * into v from public.vehicles_owned where id = p_id and user_id = u for update;
  if not found then raise exception 'Ese vehículo no es tuyo.'; end if;
  if 100 - v.fuel < 1 then raise exception 'El tanque ya está lleno.'; end if;
  cost := greatest(1, ceil((100 - v.fuel) * 0.5))::int;
  update public.profiles set money = money - cost where id = u and money >= cost returning money into m;
  if not found then raise exception 'No te alcanza el dinero ($%).', cost; end if;
  update public.vehicles_owned set fuel = 100 where id = p_id;
  insert into public.purchases (user_id, kind, item_key, qty, unit_price, total) values (u, 'fuel', v.plate, 1, cost, cost);
  return jsonb_build_object('money', m, 'fuel', 100, 'cost', cost);
end $$;

-- ----- Trabajo del almacén (pago x2 para VIP, aplicado una sola vez) -----
create or replace function public.job_deliver() returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_user(); cs public.character_state; p public.profiles;
        el real; lvl int; base int; lim real; pay int; notes text[] := '{}'; streak int; m bigint; lv2 int; mult int;
begin
  select * into cs from public.character_state where user_id = u for update;
  select * into p from public.profiles where id = u for update;
  if not cs.job_active or cs.job_started_at is null then raise exception 'No hay ningún pedido activo.'; end if;
  el := extract(epoch from (now() - cs.job_started_at));
  if el < 12 then raise exception 'Entrega demasiado rápida. Inténtalo de nuevo.'; end if;
  lvl := p.level;
  base := 30 + (lvl - 1) * 6;
  lim := greatest(35, 75 - lvl * 3);
  streak := cs.job_streak;
  pay := base;
  if el < lim * 0.6 then
    streak := streak + 1; pay := round(pay * 1.4); notes := array_append(notes, 'rápido');
  else
    streak := 0;
    if el > lim then pay := round(pay * 0.7); notes := array_append(notes, 'tarde'); end if;
  end if;
  if streak > 1 then pay := pay + least(streak, 6) * 2; notes := array_append(notes, 'racha x' || streak::text); end if;
  if private.v5_night_now() then pay := round(pay * 1.25); notes := array_append(notes, 'noche'); end if;
  mult := private.v5_pay_mult(u);
  if mult > 1 then pay := pay * mult; notes := array_append(notes, 'VIP x' || mult::text); end if;
  update public.profiles set money = money + pay, job_delivered = job_delivered + 1, exp = exp + 12,
         level = private.v5_level_of(exp + 12) where id = u returning money, level into m, lv2;
  update public.character_state set job_started_at = null, job_boxes = job_boxes + 1, job_money = job_money + pay, job_streak = streak where user_id = u;
  return jsonb_build_object('pay', pay, 'money', m, 'level', lv2, 'delivered', p.job_delivered + 1, 'notes', to_jsonb(notes));
end $$;

create or replace function public.job_end_shift() returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_user(); cs public.character_state; bonus int := 0; m bigint;
begin
  select * into cs from public.character_state where user_id = u for update;
  if not cs.job_active then raise exception 'No tienes un turno activo.'; end if;
  if cs.job_boxes >= 5 then bonus := (case when private.v5_night_now() then 25 else 20 end) * private.v5_pay_mult(u); end if;
  update public.profiles set money = money + bonus where id = u returning money into m;
  update public.character_state set job_active = false, job_started_at = null where user_id = u;
  return jsonb_build_object('bonus', bonus, 'boxes', cs.job_boxes, 'earned', cs.job_money + bonus, 'money', m);
end $$;

-- ----- Transportista (desbloqueo en el nivel 5, validado en el servidor) -----
create or replace function public.transport_status() returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_user(); p public.profiles; r public.v5_transport_runs;
begin
  select * into p from public.profiles where id = u;
  select * into r from public.v5_transport_runs where user_id = u and status in ('active','picked') limit 1;
  return jsonb_build_object('level', p.level, 'unlocked', p.level >= 5, 'required', 5,
    'completed', (select count(*) from public.v5_transport_runs where user_id = u and status = 'done'),
    'run', case when r.id is null then null else jsonb_build_object('id', r.id, 'to', r.to_key, 'status', r.status,
             'reward', r.reward_base * private.v5_pay_mult(u)) end);
end $$;

create or replace function public.transport_start(p_to text) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_user(); p public.profiles; tp public.v5_transport_points; dep public.v5_transport_points; dist real; base int; rid bigint;
begin
  if not (private.v5_zone_open('transporte') or private.v5_is_creator(u)) then raise exception 'La central de transporte está cerrada por la administración.'; end if;
  select * into p from public.profiles where id = u;
  if p.level < 5 then raise exception 'El trabajo de transportista se desbloquea en el nivel 5. Tu nivel actual: %.', p.level; end if;
  select * into tp from public.v5_transport_points where point_key = p_to and point_key <> 'depot';
  if not found then raise exception 'Destino no válido.'; end if;
  select * into dep from public.v5_transport_points where point_key = 'depot';
  if exists (select 1 from public.v5_transport_runs where user_id = u and status in ('active','picked')) then raise exception 'Ya tienes una entrega en curso.'; end if;
  dist := sqrt(power(tp.x - dep.x, 2) + power(tp.y - dep.y, 2));
  base := round(80 + dist / 9)::int;
  insert into public.v5_transport_runs (user_id, to_key, reward_base) values (u, tp.point_key, base) returning id into rid;
  return jsonb_build_object('id', rid, 'to', tp.point_key, 'name', tp.name, 'reward', base * private.v5_pay_mult(u), 'mult', private.v5_pay_mult(u));
end $$;

create or replace function public.transport_pickup() returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_user(); rid bigint;
begin
  update public.v5_transport_runs set status = 'picked', picked_at = now()
   where user_id = u and status = 'active' and started_at < now() - interval '2 seconds' returning id into rid;
  if rid is null then raise exception 'No hay una carga pendiente de recoger.'; end if;
  return jsonb_build_object('ok', true, 'id', rid);
end $$;

create or replace function public.transport_deliver() returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_user(); r public.v5_transport_runs; tp public.v5_transport_points; dep public.v5_transport_points;
        need real; mult int; rew bigint; m bigint; lv int;
begin
  select * into r from public.v5_transport_runs where user_id = u and status = 'picked' for update;
  if not found then raise exception 'No tienes ninguna carga recogida para entregar.'; end if;
  select * into tp from public.v5_transport_points where point_key = r.to_key;
  select * into dep from public.v5_transport_points where point_key = 'depot';
  need := greatest(10, sqrt(power(tp.x - dep.x, 2) + power(tp.y - dep.y, 2)) / 380);
  if extract(epoch from (now() - r.picked_at)) < need then raise exception 'Entrega demasiado rápida. Conduce hasta el destino.'; end if;
  mult := private.v5_pay_mult(u);
  rew := r.reward_base::bigint * mult;
  update public.v5_transport_runs set status = 'done', delivered_at = now(), reward = rew where id = r.id and status = 'picked';
  update public.profiles set money = money + rew, exp = exp + 30, level = private.v5_level_of(exp + 30) where id = u returning money, level into m, lv;
  return jsonb_build_object('reward', rew, 'mult', mult, 'money', m, 'level', lv);
end $$;

create or replace function public.transport_cancel() returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_user(); rid bigint;
begin
  update public.v5_transport_runs set status = 'cancelled' where user_id = u and status in ('active','picked') returning id into rid;
  if rid is null then raise exception 'No tienes una entrega en curso.'; end if;
  return jsonb_build_object('ok', true);
end $$;

-- ----- Casas: entrar, invitados y cocina -----
create or replace function public.enter_house(p_key text) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_user(); o uuid; oname text; opid int;
begin
  select po.user_id, pr.username, pr.player_id into o, oname, opid
    from public.properties_owned po join public.profiles pr on pr.id = po.user_id where po.property_key = p_key;
  if o is null then raise exception 'Esta casa todavía no tiene propietario.'; end if;
  if not private.v5_can_enter_house(u, p_key) then raise exception 'Propiedad privada de %. No tienes autorización para entrar.', oname; end if;
  update public.character_state set home_key = p_key where user_id = u;
  return jsonb_build_object('ok', true, 'owner', oname, 'owner_pid', opid, 'is_owner', o = u,
                            'guests', case when o = u then private.v5_guests_json(p_key) else '[]'::jsonb end);
end $$;

create or replace function public.leave_house() returns void
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_user();
begin
  update public.character_state set home_key = null where user_id = u;
end $$;

create or replace function public.list_guests(p_key text) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_user();
begin
  if not exists (select 1 from public.properties_owned where property_key = p_key and user_id = u) then raise exception 'Solo el propietario puede ver los invitados.'; end if;
  return private.v5_guests_json(p_key);
end $$;

create or replace function public.invite_guest(p_key text, p_guest uuid) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_user(); n int;
begin
  if not exists (select 1 from public.properties_owned where property_key = p_key and user_id = u) then raise exception 'Solo el propietario puede invitar personas.'; end if;
  if p_guest = u then raise exception 'Ya eres el propietario.'; end if;
  if not exists (select 1 from public.profiles where id = p_guest) then raise exception 'Ese jugador no existe.'; end if;
  select count(*) into n from public.v5_property_guests where property_key = p_key;
  if n >= 8 and not exists (select 1 from public.v5_property_guests where property_key = p_key and guest_id = p_guest) then raise exception 'Máximo 8 invitados por casa.'; end if;
  insert into public.v5_property_guests (property_key, guest_id, invited_by) values (p_key, p_guest, u) on conflict do nothing;
  return private.v5_guests_json(p_key);
end $$;

create or replace function public.revoke_guest(p_key text, p_guest uuid) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_user();
begin
  if not exists (select 1 from public.properties_owned where property_key = p_key and user_id = u) then raise exception 'Solo el propietario puede retirar accesos.'; end if;
  delete from public.v5_property_guests where property_key = p_key and guest_id = p_guest;
  update public.character_state set home_key = null where user_id = p_guest and home_key = p_key;
  return private.v5_guests_json(p_key);
end $$;

create or replace function public.cook_start(p_recipe text) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_user(); cs public.character_state; rc public.v5_recipes; k text; v text; have int; nm text;
begin
  select * into cs from public.character_state where user_id = u for update;
  if cs.home_key is null then raise exception 'Debes estar dentro de una casa para cocinar.'; end if;
  if cs.cook_recipe is not null then raise exception 'Ya hay una comida en preparación.'; end if;
  select * into rc from public.v5_recipes where recipe_key = p_recipe;
  if not found then raise exception 'Receta desconocida.'; end if;
  for k, v in select key, value from jsonb_each_text(rc.ingredients) loop
    select coalesce(qty, 0) into have from public.inventory where user_id = u and item_key = k;
    if coalesce(have, 0) < v::int then
      select name into nm from public.item_catalog where item_key = k;
      raise exception 'Te faltan ingredientes: % (necesitas %).', coalesce(nm, k), v;
    end if;
  end loop;
  for k, v in select key, value from jsonb_each_text(rc.ingredients) loop
    perform private.v5_add_item(u, k, -(v::int));
  end loop;
  update public.character_state set cook_recipe = rc.recipe_key, cook_ready_at = now() + make_interval(secs => rc.seconds) where user_id = u;
  return jsonb_build_object('recipe', rc.recipe_key, 'seconds', rc.seconds,
    'ready_ms', (extract(epoch from (now() + make_interval(secs => rc.seconds))) * 1000)::bigint, 'inv', private.v5_inv_json(u));
end $$;

create or replace function public.cook_collect() returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_user(); cs public.character_state; rc public.v5_recipes; it public.item_catalog; cur int;
begin
  select * into cs from public.character_state where user_id = u for update;
  if cs.home_key is null then raise exception 'Entra a una casa para recoger tu comida.'; end if;
  if cs.cook_recipe is null then raise exception 'No hay comida en preparación.'; end if;
  if cs.cook_ready_at > now() then raise exception 'Todavía se está cocinando (% s).', ceil(extract(epoch from (cs.cook_ready_at - now())))::int; end if;
  select * into rc from public.v5_recipes where recipe_key = cs.cook_recipe;
  select * into it from public.item_catalog where item_key = rc.result_key;
  select coalesce(qty, 0) into cur from public.inventory where user_id = u and item_key = it.item_key;
  if coalesce(cur, 0) + 1 > it.max_qty then raise exception 'No puedes llevar más % en el inventario.', it.name; end if;
  perform private.v5_add_item(u, it.item_key, 1);
  update public.character_state set cook_recipe = null, cook_ready_at = null where user_id = u;
  return jsonb_build_object('item', it.item_key, 'name', it.name, 'icon', it.icon, 'inv', private.v5_inv_json(u));
end $$;

-- ----- VIP -----
create or replace function public.vip_set(p_power text, p_on boolean) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_user(); vp public.v5_vip_prefs;
begin
  if not (private.v5_has_role(u, 'VIP') or private.v5_is_creator(u)) then raise exception 'Solo los jugadores VIP pueden usar este panel.'; end if;
  if p_power not in ('pay2x','speed','needs') then raise exception 'Poder desconocido.'; end if;
  insert into public.v5_vip_prefs (user_id) values (u) on conflict do nothing;
  if p_power = 'pay2x' then update public.v5_vip_prefs set pay2x = p_on where user_id = u;
  elsif p_power = 'speed' then update public.v5_vip_prefs set speed = p_on where user_id = u;
  else update public.v5_vip_prefs set needs = p_on where user_id = u; end if;
  select * into vp from public.v5_vip_prefs where user_id = u;
  return jsonb_build_object('pay2x', vp.pay2x, 'speed', vp.speed, 'needs', vp.needs);
end $$;

-- ----- Mensajes, contactos y búsqueda: ahora con ID de jugador -----
create or replace function public.get_dms(p_since bigint default 0) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_user();
begin
  return coalesce((select jsonb_agg(x order by x.id) from (
      select m.id, m.from_id, m.to_id, m.msg, m.created_at, m.read_at,
             case when m.from_id = u then tp.username else fp.username end as peer_name,
             case when m.from_id = u then tp.player_id else fp.player_id end as peer_pid,
             case when m.from_id = u then private.v5_top_role(m.to_id) else private.v5_top_role(m.from_id) end as peer_role
      from public.dm_messages m
      join public.profiles fp on fp.id = m.from_id
      join public.profiles tp on tp.id = m.to_id
      where (m.from_id = u or m.to_id = u) and m.id > coalesce(p_since, 0)
      order by m.id desc limit 300) x), '[]'::jsonb);
end $$;

create or replace function public.get_contacts() returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_user();
begin
  return coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username, 'pid', p.player_id, 'role', private.v5_top_role(p.id),
            'online', coalesce(p.last_seen > now() - interval '30 seconds', false)) order by p.username)
          from public.player_contacts c join public.profiles p on p.id = c.friend_id where c.owner_id = u), '[]'::jsonb);
end $$;

create or replace function public.search_players(p_q text) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_user(); q text := left(btrim(coalesce(p_q, '')), 20);
begin
  if char_length(q) < 1 then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'username', s.username, 'pid', s.player_id, 'role', private.v5_top_role(s.id),
            'online', coalesce(s.last_seen > now() - interval '30 seconds', false)))
          from (select id, username, player_id, last_seen from public.profiles
                where id <> u and (username ilike (q || '%') or player_id::text = q) order by username limit 15) s), '[]'::jsonb);
end $$;

-- ID y rol verificados por el servidor (el cliente no puede falsearlos)
create or replace function public.public_info(p_ids uuid[]) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_user();
begin
  return coalesce((select jsonb_object_agg(p.id::text, jsonb_build_object('pid', p.player_id, 'role', private.v5_top_role(p.id)))
                   from public.profiles p where p.id = any(p_ids)), '{}'::jsonb);
end $$;

-- ---------------------------------------------------------------------
-- 10. Paneles de personal: CREATOR (todo) y ADMIN (limitado)
-- ---------------------------------------------------------------------
create or replace function public.admin_list_players(p_q text default '', p_online_only boolean default false, p_limit int default 60) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_staff(); q text := left(coalesce(p_q, ''), 30);
begin
  return coalesce((select jsonb_agg(t.x) from (
    select jsonb_build_object('id', p.id, 'username', p.username, 'pid', p.player_id, 'money', p.money, 'level', p.level, 'last_seen', p.last_seen,
      'online', coalesce(p.last_seen > now() - interval '30 seconds', false),
      'roles', private.v5_roles_json(p.id), 'banned', private.v5_is_banned(p.id)) as x
    from public.profiles p
    where (q = '' or p.username ilike '%' || q || '%' or p.player_id::text = q)
      and (not p_online_only or p.last_seen > now() - interval '30 seconds')
    order by coalesce(p.last_seen > now() - interval '30 seconds', false) desc, p.username
    limit least(greatest(p_limit, 1), 200)) t), '[]'::jsonb);
end $$;

create or replace function public.admin_my_limits() returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_staff(); used bigint;
begin
  select coalesce(total, 0) into used from public.v5_staff_money_daily where admin_id = u and day = private.v5_today();
  used := coalesce(used, 0);
  return jsonb_build_object('role', private.v5_top_role(u), 'creator', private.v5_is_creator(u),
    'daily_limit', private.v5_admin_daily_limit(), 'used', used, 'remaining', greatest(private.v5_admin_daily_limit() - used, 0));
end $$;

create or replace function public.admin_kick(p_id uuid, p_reason text default null) returns void
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_staff();
begin
  if p_id = u or private.v5_is_creator(p_id) then raise exception 'No puedes expulsar a este jugador.'; end if;
  if not private.v5_is_creator(u) and private.v5_is_staff(p_id) then raise exception 'Un ADMIN no puede expulsar a otro miembro del personal.'; end if;
  update public.character_state set kicked_at = now() where user_id = p_id;
  perform private.v5_alog(u, 'kick', p_id, jsonb_build_object('reason', left(p_reason, 200)));
end $$;

create or replace function public.admin_money(p_id uuid, p_delta bigint, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_staff(); m bigint; used bigint; lim bigint := private.v5_admin_daily_limit();
begin
  if p_delta is null or p_delta = 0 or abs(p_delta) > 100000000 then raise exception 'Cantidad no válida.'; end if;
  if not private.v5_is_creator(u) then
    if p_delta < 0 then raise exception 'Un ADMIN solo puede entregar dinero, no retirarlo.'; end if;
    if p_id = u then raise exception 'No puedes entregarte dinero a ti mismo.'; end if;
    insert into public.v5_staff_money_daily (admin_id, day, total) values (u, private.v5_today(), 0) on conflict do nothing;
    select total into used from public.v5_staff_money_daily where admin_id = u and day = private.v5_today() for update;
    if used + p_delta > lim then raise exception 'Límite diario superado. Hoy te quedan $%.', greatest(lim - used, 0); end if;
    update public.v5_staff_money_daily set total = total + p_delta where admin_id = u and day = private.v5_today();
  end if;
  update public.profiles set money = money + p_delta where id = p_id and money + p_delta >= 0 returning money into m;
  if not found then raise exception 'El saldo no puede quedar negativo (o el jugador no existe).'; end if;
  insert into public.purchases (user_id, kind, item_key, qty, unit_price, total) values (p_id, 'admin_money', left(p_reason, 60), 1, 0, p_delta);
  perform private.v5_alog(u, case when p_delta > 0 then 'money_add' else 'money_remove' end, p_id, jsonb_build_object('delta', p_delta, 'reason', left(p_reason, 200)));
  return jsonb_build_object('money', m);
end $$;

create or replace function public.admin_item(p_id uuid, p_key text, p_delta int) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_staff(); q int;
begin
  if p_delta is null or p_delta = 0 or abs(p_delta) > 9999 then raise exception 'Cantidad no válida.'; end if;
  if not exists (select 1 from public.item_catalog where item_key = p_key) then raise exception 'Objeto desconocido.'; end if;
  if not exists (select 1 from public.profiles where id = p_id) then raise exception 'Jugador no encontrado.'; end if;
  if not private.v5_is_creator(u) then
    if p_delta < 1 or p_delta > 20 then raise exception 'Un ADMIN puede entregar de 1 a 20 unidades por vez.'; end if;
    if p_id = u then raise exception 'No puedes entregarte objetos a ti mismo.'; end if;
    if not exists (select 1 from public.item_catalog where item_key = p_key and kind in ('food','drink','med','tech','ingredient')) then
      raise exception 'Ese objeto solo puede entregarlo el CREATOR.';
    end if;
  end if;
  if p_delta < 0 and coalesce((select qty from public.inventory where user_id = p_id and item_key = p_key), 0) < -p_delta then
    raise exception 'El jugador no tiene tantas unidades.';
  end if;
  q := private.v5_add_item(p_id, p_key, p_delta);
  insert into public.purchases (user_id, kind, item_key, qty, unit_price, total) values (p_id, 'admin_item', p_key, p_delta, 0, 0);
  perform private.v5_alog(u, case when p_delta > 0 then 'item_give' else 'item_take' end, p_id, jsonb_build_object('item', p_key, 'qty', p_delta));
  return jsonb_build_object('qty', q, 'inv', private.v5_inv_json(p_id));
end $$;

-- Solo el CREATOR administra roles (XTX, ADMIN, VIP). CREATOR sigue siendo exclusivo del propietario.
create or replace function public.admin_set_role(p_id uuid, p_role text, p_grant boolean) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_creator();
begin
  if p_role not in ('XTX','ADMIN','VIP') then raise exception 'Solo se pueden asignar o retirar XTX, ADMIN y VIP. CREATOR es exclusivo del propietario.'; end if;
  if not exists (select 1 from public.profiles where id = p_id) then raise exception 'Jugador no encontrado.'; end if;
  if p_grant then
    insert into public.user_roles (user_id, role, granted_by) values (p_id, p_role, u) on conflict do nothing;
  else
    delete from public.user_roles where user_id = p_id and role = p_role;
    if p_role = 'XTX' then update public.character_state set xtx_access_until = null where user_id = p_id; end if;
  end if;
  perform private.v5_alog(u, case when p_grant then 'role_grant' else 'role_revoke' end, p_id, jsonb_build_object('role', p_role));
  return jsonb_build_object('roles', private.v5_roles_json(p_id));
end $$;

create or replace function public.admin_player_detail(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_creator(); p public.profiles; cs public.character_state; eq public.equipment;
begin
  select * into p from public.profiles where id = p_id;
  if not found then raise exception 'Jugador no encontrado.'; end if;
  select * into cs from public.character_state where user_id = p_id;
  select * into eq from public.equipment where user_id = p_id;
  perform private.v5_alog(u, 'view_profile', p_id, null);
  return jsonb_build_object('id', p.id, 'username', p.username, 'player_id', p.player_id, 'money', p.money, 'level', p.level, 'exp', p.exp,
    'delivered', p.job_delivered, 'shirt', p.shirt, 'pants', p.pants, 'created_at', p.created_at, 'last_seen', p.last_seen,
    'roles', private.v5_roles_json(p_id), 'banned', private.v5_is_banned(p_id),
    'state', jsonb_build_object('hp', cs.hp, 'hunger', cs.hunger, 'thirst', cs.thirst, 'energy', cs.energy,
                'x', cs.x, 'y', cs.y, 'scene', cs.scene, 'hospital', cs.hospital),
    'equipment', jsonb_build_object('weapon', eq.weapon, 'ammo_loaded', eq.ammo_loaded, 'armor', eq.armor),
    'inv', private.v5_inv_json(p_id),
    'vehicles', (select coalesce(jsonb_agg(jsonb_build_object('model', v.model_key, 'plate', v.plate, 'fuel', v.fuel)), '[]'::jsonb) from public.vehicles_owned v where v.user_id = p_id),
    'properties', (select coalesce(jsonb_agg(o.property_key), '[]'::jsonb) from public.properties_owned o where o.user_id = p_id));
end $$;

-- ---------------------------------------------------------------------
-- 10b. Funciones extra del CREATOR (todo el panel de Alantnunez)
-- ---------------------------------------------------------------------
create or replace function public.admin_purchases(p_id uuid, p_limit int default 40) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_creator();
begin
  return coalesce((select jsonb_agg(to_jsonb(x)) from (
    select id, kind, item_key, qty, unit_price, total, created_at from public.purchases
    where user_id = p_id order by id desc limit least(greatest(p_limit, 1), 200)) x), '[]'::jsonb);
end $$;

create or replace function public.admin_overview() returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_creator();
begin
  return jsonb_build_object(
    'players', (select count(*) from public.profiles),
    'online', (select count(*) from public.profiles where last_seen > now() - interval '30 seconds'),
    'banned', (select count(distinct user_id) from public.bans where active and (expires_at is null or expires_at > now())),
    'money', (select coalesce(sum(money), 0) from public.profiles),
    'houses_owned', (select count(*) from public.properties_owned),
    'world', private.v5_world_json());
end $$;

create or replace function public.admin_ban(p_id uuid, p_reason text default null, p_hours int default null) returns void
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_creator(); until_at timestamptz;
begin
  if p_id = u or private.v5_is_creator(p_id) then raise exception 'No puedes banear al CREATOR.'; end if;
  if p_hours is not null and p_hours > 0 then until_at := now() + make_interval(hours => p_hours); end if;
  update public.bans set active = false where user_id = p_id and active;
  insert into public.bans (user_id, reason, banned_by, expires_at) values (p_id, left(p_reason, 200), u, until_at);
  update public.character_state set kicked_at = now() where user_id = p_id;
  begin
    update auth.users set banned_until = coalesce(until_at, now() + interval '100 years') where id = p_id;
  exception when others then null;
  end;
  perform private.v5_alog(u, 'ban', p_id, jsonb_build_object('reason', left(p_reason, 200), 'hours', p_hours));
end $$;

create or replace function public.admin_unban(p_id uuid) returns void
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_creator();
begin
  update public.bans set active = false, unbanned_by = u, unbanned_at = now() where user_id = p_id and active;
  begin
    update auth.users set banned_until = null where id = p_id;
  exception when others then null;
  end;
  perform private.v5_alog(u, 'unban', p_id, null);
end $$;

create or replace function public.admin_set_world(p_weather text, p_time_mode text, p_hour real default 12) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_creator();
begin
  if p_weather not in ('clear','cloudy','rain','storm') then raise exception 'Clima no válido.'; end if;
  if p_time_mode not in ('real','fixed') then raise exception 'Modo de hora no válido.'; end if;
  update public.world_state set weather = p_weather, time_mode = p_time_mode,
         fixed_hour = greatest(0, least(23.99, coalesce(p_hour, 12))), updated_by = u, updated_at = now() where id = 1;
  perform private.v5_alog(u, 'world_set', null, jsonb_build_object('weather', p_weather, 'time_mode', p_time_mode, 'hour', p_hour));
  return private.v5_world_json();
end $$;

create or replace function public.admin_set_zone(p_key text, p_enabled boolean) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_creator();
begin
  update public.zones set enabled = p_enabled where zone_key = p_key;
  if not found then raise exception 'Zona desconocida.'; end if;
  perform private.v5_alog(u, 'zone_set', null, jsonb_build_object('zone', p_key, 'enabled', p_enabled));
  return private.v5_world_json();
end $$;

create or replace function public.admin_set_power(p_power text, p_on boolean) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_creator();
begin
  if p_power not in ('invisible','fly','speed') then raise exception 'Poder desconocido.'; end if;
  if p_power = 'invisible' then update public.character_state set invisible = p_on where user_id = u; end if;
  perform private.v5_alog(u, 'power', u, jsonb_build_object('power', p_power, 'on', p_on));
  return jsonb_build_object('power', p_power, 'on', p_on);
end $$;

create or replace function public.admin_log_list(p_limit int default 60) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_creator();
begin
  return coalesce((select jsonb_agg(to_jsonb(x)) from (
    select l.id, l.action, l.details, l.created_at, a.username as admin, t.username as target
    from public.admin_log l
    left join public.profiles a on a.id = l.admin_id
    left join public.profiles t on t.id = l.target_id
    order by l.id desc limit least(greatest(p_limit, 1), 200)) x), '[]'::jsonb);
end $$;

create or replace function public.admin_set_level(p_id uuid, p_level int) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_creator(); lv int;
begin
  if p_level is null or p_level < 1 or p_level > 100 then raise exception 'El nivel debe estar entre 1 y 100.'; end if;
  update public.profiles set level = p_level, exp = (p_level - 1) * 96 where id = p_id returning level into lv;
  if not found then raise exception 'Jugador no encontrado.'; end if;
  perform private.v5_alog(u, 'level_set', p_id, jsonb_build_object('level', p_level));
  return jsonb_build_object('level', lv);
end $$;

create or replace function public.admin_heal(p_id uuid) returns void
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_creator();
begin
  update public.character_state set hp = 100, hunger = 100, thirst = 100, energy = 100,
         hospital = false, hospital_started_at = null, hospital_bed = null where user_id = p_id;
  if not found then raise exception 'Jugador no encontrado.'; end if;
  perform private.v5_alog(u, 'heal', p_id, null);
end $$;

create or replace function public.admin_give_vehicle(p_id uuid, p_model text) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_creator(); v public.vehicle_catalog; vid uuid; plate text;
begin
  select * into v from public.vehicle_catalog where veh_key = p_model;
  if not found then raise exception 'Modelo desconocido.'; end if;
  if not exists (select 1 from public.profiles where id = p_id) then raise exception 'Jugador no encontrado.'; end if;
  plate := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  insert into public.vehicles_owned (user_id, model_key, color, plate, fuel) values (p_id, v.veh_key, v.color, plate, 100) returning id into vid;
  perform private.v5_alog(u, 'vehicle_give', p_id, jsonb_build_object('model', p_model, 'plate', plate));
  return jsonb_build_object('id', vid, 'plate', plate);
end $$;

create or replace function public.admin_list_properties() returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_creator();
begin
  return coalesce((select jsonb_agg(jsonb_build_object('key', c.property_key, 'name', c.name, 'price', c.price,
            'owner_id', o.user_id, 'owner', pr.username, 'owner_pid', pr.player_id,
            'guests', (select count(*) from public.v5_property_guests g where g.property_key = c.property_key)) order by c.property_key)
          from public.property_catalog c
          left join public.properties_owned o on o.property_key = c.property_key
          left join public.profiles pr on pr.id = o.user_id), '[]'::jsonb);
end $$;

create or replace function public.admin_give_property(p_id uuid, p_key text) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_creator();
begin
  if not exists (select 1 from public.property_catalog where property_key = p_key) then raise exception 'Propiedad desconocida.'; end if;
  if not exists (select 1 from public.profiles where id = p_id) then raise exception 'Jugador no encontrado.'; end if;
  if exists (select 1 from public.properties_owned where property_key = p_key) then raise exception 'Esa propiedad ya tiene dueño. Libérala primero.'; end if;
  insert into public.properties_owned (property_key, user_id) values (p_key, p_id);
  perform private.v5_alog(u, 'property_give', p_id, jsonb_build_object('property', p_key));
  return jsonb_build_object('key', p_key);
end $$;

create or replace function public.admin_release_property(p_key text) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.v5_require_creator(); prev uuid;
begin
  delete from public.properties_owned where property_key = p_key returning user_id into prev;
  if prev is null then raise exception 'Esa propiedad no tiene dueño.'; end if;
  delete from public.v5_property_guests where property_key = p_key;
  update public.character_state set home_key = null where home_key = p_key;
  perform private.v5_alog(u, 'property_release', prev, jsonb_build_object('property', p_key));
  return jsonb_build_object('key', p_key);
end $$;

-- ---------------------------------------------------------------------
-- 11. Permisos de ejecución (solo usuarios autenticados)
-- ---------------------------------------------------------------------
do $grants$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = any (array['get_me','heartbeat','sync_state','buy_vehicle','vehicle_fuel_sync','refuel_vehicle','job_deliver','job_end_shift','transport_status','transport_start','transport_pickup','transport_deliver','transport_cancel','enter_house','leave_house','list_guests','invite_guest','revoke_guest','cook_start','cook_collect','vip_set','get_dms','get_contacts','search_players','public_info','admin_overview','admin_list_players','admin_player_detail','admin_purchases','admin_set_role','admin_kick','admin_ban','admin_unban','admin_money','admin_item','admin_set_world','admin_set_zone','admin_set_power','admin_log_list','admin_my_limits','admin_set_level','admin_heal','admin_give_vehicle','admin_give_property','admin_release_property','admin_list_properties'])
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.sig);
    execute format('grant execute on function %s to authenticated', r.sig);
  end loop;
end $grants$;

commit;

-- ---------------------------------------------------------------------
-- 12. VERIFICACIÓN (resultado final: debe mostrar a Alantnunez con ID 0 y CREATOR, y 0 funciones faltantes)
-- ---------------------------------------------------------------------
select jsonb_build_object(
  'alantnunez', (select jsonb_build_object('username', p.username, 'player_id', p.player_id,
                   'roles', (select coalesce(jsonb_agg(r.role), '[]'::jsonb) from public.user_roles r where r.user_id = p.id),
                   'es_creator', private.v5_is_creator(p.id), 'owner_config_ok', (select owner_id = p.id from private.owner_config where id = 1))
                 from public.profiles p where lower(p.username) = 'alantnunez' limit 1),
  'ids_duplicados', (select count(*) from (select player_id from public.profiles group by 1 having count(*) > 1) d),
  'funciones_faltantes', (select coalesce(jsonb_agg(n), '[]'::jsonb) from unnest(array['get_me','heartbeat','sync_state','buy_vehicle','vehicle_fuel_sync','refuel_vehicle','job_deliver','job_end_shift','transport_status','transport_start','transport_pickup','transport_deliver','transport_cancel','enter_house','leave_house','list_guests','invite_guest','revoke_guest','cook_start','cook_collect','vip_set','get_dms','get_contacts','search_players','public_info','admin_overview','admin_list_players','admin_player_detail','admin_purchases','admin_set_role','admin_kick','admin_ban','admin_unban','admin_money','admin_item','admin_set_world','admin_set_zone','admin_set_power','admin_log_list','admin_my_limits','admin_set_level','admin_heal','admin_give_vehicle','admin_give_property','admin_release_property','admin_list_properties',
      'username_available','claim_session','buy_item','use_item','buy_clothes','buy_property','park_vehicle','job_start_shift','job_new_order',
      'report_death','hospital_release','xtx_enter','xtx_claim','equip_vest','reload_gun','send_dm','mark_dms_read','add_contact','remove_contact']) n
      where not exists (select 1 from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and p.proname = n))
) as verificacion;
