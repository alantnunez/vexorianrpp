-- =====================================================================
-- MiniSA RP · V4 · MIGRACIÓN (Supabase > SQL Editor > New query > Run)
-- Es IDEMPOTENTE: puedes ejecutarla más de una vez. No borra datos existentes.
-- Las tablas antiguas de la V3 se renombran a legacy_* y se cierran al público.
-- NO subas la carpeta /supabase al hosting del juego.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 0. Tablas privadas (nunca expuestas por la API)
-- ---------------------------------------------------------------------
create table if not exists private.secrets      (k text primary key, v text not null);
create table if not exists private.owner_config (id int primary key default 1 check (id = 1), owner_email text, owner_id uuid);
insert into private.owner_config (id) values (1) on conflict do nothing;

-- ---------------------------------------------------------------------
-- 1. Migración de las tablas antiguas (V3 -> legacy_*)
-- ---------------------------------------------------------------------
do $mig$
declare r record;
begin
  for r in select * from (values
      ('players','hb'),('chat','pid'),('dms','from_name'),('contacts','friend_name'),('shots','sc')
    ) as t(tbl, marker)
  loop
    if to_regclass('public.'||r.tbl) is not null
       and exists (select 1 from information_schema.columns
                   where table_schema='public' and table_name=r.tbl and column_name=r.marker)
       and to_regclass('public.legacy_'||r.tbl) is null then
      execute format('drop policy if exists "mini_all" on public.%I', r.tbl);
      execute format('revoke all on public.%I from anon, authenticated', r.tbl);
      execute format('alter table public.%I rename to %I', r.tbl, 'legacy_'||r.tbl);
      execute format('comment on table public.%I is %L', 'legacy_'||r.tbl, 'Datos de la V3. Cerrada al público. Solo lectura desde el SQL Editor.');
    end if;
  end loop;
end
$mig$;

-- ---------------------------------------------------------------------
-- 2. Tablas nuevas
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  money bigint not null default 500 check (money >= 0),
  level int not null default 1,
  exp int not null default 0,
  job_delivered int not null default 0,
  shirt text not null default '#2f6fb5',
  pants text not null default '#2b3350',
  created_at timestamptz not null default now(),
  last_seen timestamptz
);
create unique index if not exists profiles_username_lower on public.profiles (lower(username));

create table if not exists public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('XTX','CREATOR')),
  granted_by uuid,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);
create unique index if not exists one_creator_only on public.user_roles (role) where role = 'CREATOR';

create table if not exists public.character_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  hp real not null default 100,
  hunger real not null default 100,
  thirst real not null default 100,
  energy real not null default 100,
  x real not null default 240,
  y real not null default 356,
  scene text not null default 'out',
  hospital boolean not null default false,
  hospital_started_at timestamptz,
  hospital_start_hp real,
  hospital_bed int,
  invisible boolean not null default false,
  session_id uuid,
  session_at timestamptz,
  kicked_at timestamptz,
  xtx_access_until timestamptz,
  xtx_fail int not null default 0,
  xtx_lock_until timestamptz,
  job_active boolean not null default false,
  job_started_at timestamptz,
  job_boxes int not null default 0,
  job_money int not null default 0,
  job_streak int not null default 0,
  claim_ammo_at timestamptz,
  last_sync timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.equipment (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  weapon text,
  ammo_loaded int not null default 0 check (ammo_loaded between 0 and 12),
  armor real not null default 0 check (armor between 0 and 100)
);

create table if not exists public.item_catalog (
  item_key text primary key,
  name text not null, icon text not null default '📦',
  price int not null default 0,
  kind text not null check (kind in ('food','drink','med','tech','gear','ammo')),
  hunger int not null default 0, thirst int not null default 0, hp int not null default 0, energy int not null default 0,
  buyable boolean not null default false,
  unique_item boolean not null default false,
  max_qty int not null default 20,
  zone_key text
);
create table if not exists public.inventory (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_key text not null references public.item_catalog(item_key),
  qty int not null default 0 check (qty >= 0),
  primary key (user_id, item_key)
);
create table if not exists public.vehicle_catalog (
  veh_key text primary key, name text not null, price int not null, color text not null default '#888888', speed real not null default 1
);
create table if not exists public.vehicles_owned (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  model_key text not null references public.vehicle_catalog(veh_key),
  color text not null, plate text not null,
  x real, y real, a real,
  created_at timestamptz not null default now()
);
create index if not exists vehicles_owned_user on public.vehicles_owned (user_id);
create table if not exists public.property_catalog (
  property_key text primary key, name text not null, price int not null
);
create table if not exists public.properties_owned (
  property_key text primary key references public.property_catalog(property_key),
  user_id uuid not null references public.profiles(id) on delete cascade,
  bought_at timestamptz not null default now()
);
create table if not exists public.purchases (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null, item_key text, qty int not null default 1,
  unit_price int not null default 0, total bigint not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists purchases_user_idx on public.purchases (user_id, id desc);

create table if not exists public.dm_messages (
  id bigint generated always as identity primary key,
  from_id uuid not null references public.profiles(id) on delete cascade,
  to_id uuid not null references public.profiles(id) on delete cascade,
  msg text not null check (char_length(msg) between 1 and 300),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists dm_to_idx   on public.dm_messages (to_id, id);
create index if not exists dm_from_idx on public.dm_messages (from_id, id);
create table if not exists public.player_contacts (
  owner_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, friend_id), check (owner_id <> friend_id)
);

create table if not exists public.world_state (
  id int primary key default 1 check (id = 1),
  weather text not null default 'clear' check (weather in ('clear','cloudy','rain','storm')),
  time_mode text not null default 'real' check (time_mode in ('real','fixed')),
  fixed_hour real not null default 12 check (fixed_hour >= 0 and fixed_hour < 24),
  updated_by uuid, updated_at timestamptz default now()
);
insert into public.world_state (id) values (1) on conflict do nothing;
create table if not exists public.zones (
  zone_key text primary key, name text not null, enabled boolean not null default true
);
create table if not exists public.bans (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reason text, banned_by uuid, banned_at timestamptz not null default now(),
  expires_at timestamptz, active boolean not null default true,
  unbanned_by uuid, unbanned_at timestamptz
);
create index if not exists bans_user_idx on public.bans (user_id, active);
create table if not exists public.admin_log (
  id bigint generated always as identity primary key,
  admin_id uuid, action text not null, target_id uuid, details jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_log_idx on public.admin_log (id desc);

-- ---------------------------------------------------------------------
-- 3. Catálogos (los precios viven SOLO en el servidor)
-- ---------------------------------------------------------------------
insert into public.item_catalog (item_key,name,icon,price,kind,hunger,thirst,hp,energy,buyable,unique_item,max_qty,zone_key) values
 ('agua','Agua','💧',8,'drink',0,35,0,0,true,false,30,'supermercado'),
 ('refresco','Refresco','🥤',12,'drink',5,25,0,15,true,false,30,'supermercado'),
 ('jugo','Jugo natural','🧃',15,'drink',10,30,5,0,true,false,30,'supermercado'),
 ('energ','Bebida energética','⚡',25,'drink',0,10,0,60,true,false,20,'supermercado'),
 ('manzana','Manzana','🍎',6,'food',12,6,0,0,true,false,30,'supermercado'),
 ('sandwich','Sándwich','🥪',18,'food',32,0,0,0,true,false,30,'supermercado'),
 ('burger','Hamburguesa','🍔',30,'food',48,-6,3,0,true,false,30,'supermercado'),
 ('pizza','Pizza','🍕',36,'food',60,-8,0,0,true,false,30,'supermercado'),
 ('venda','Botiquín','🩹',45,'med',0,0,35,0,true,false,15,'supermercado'),
 ('phone','Teléfono','📱',150,'tech',0,0,0,0,true,true,1,'supermercado'),
 ('pistol','Pistola XTX','🔫',0,'gear',0,0,0,0,false,true,1,null),
 ('ammo','Munición','🔸',0,'ammo',0,0,0,0,false,false,120,null),
 ('vest','Chaleco antibalas','🦺',0,'gear',0,0,0,0,false,true,1,null),
 ('xtx_kit','Equipo XTX','🎒',0,'gear',0,0,0,0,false,true,1,null)
on conflict (item_key) do update set name=excluded.name, icon=excluded.icon, price=excluded.price, kind=excluded.kind,
  hunger=excluded.hunger, thirst=excluded.thirst, hp=excluded.hp, energy=excluded.energy, buyable=excluded.buyable,
  unique_item=excluded.unique_item, max_qty=excluded.max_qty, zone_key=excluded.zone_key;

insert into public.vehicle_catalog (veh_key,name,price,color,speed) values
 ('compacto','Compacto',1800,'#4a76b8',0.95),
 ('sedan','Sedán',3200,'#c94f45',1.0),
 ('pickup','Pickup',4800,'#3d8a64',0.97),
 ('deportivo','Deportivo',9000,'#e0b93a',1.28)
on conflict (veh_key) do update set name=excluded.name, price=excluded.price, color=excluded.color, speed=excluded.speed;

insert into public.property_catalog (property_key,name,price) values
 ('casa_01','Casa Las Palmas 1',14000),('casa_02','Casa Las Palmas 2',14000),('casa_03','Casa Las Palmas 3',16000),
 ('casa_04','Casa San Miguel 1',12000),('casa_05','Casa San Miguel 2',12000),('casa_06','Casa San Miguel 3',13000),
 ('casa_07','Villa del Este 1',22000),('casa_08','Villa del Este 2',22000),('casa_09','Villa del Este 3',25000),
 ('casa_10','Villa Sur 1',18000),('casa_11','Villa Sur 2',18000),('casa_12','Villa Sur 3',20000)
on conflict (property_key) do update set name=excluded.name, price=excluded.price;

insert into public.zones (zone_key,name) values
 ('almacen','Almacén'),('supermercado','Supermercado 24/7'),('concesionario','Concesionario'),
 ('moda','Tienda de ropa'),('hospital','Hospital Central'),('xtx','Base XTX')
on conflict (zone_key) do update set name=excluded.name;

-- ---------------------------------------------------------------------
-- 4. Funciones internas (schema private: no se pueden llamar desde el navegador)
-- ---------------------------------------------------------------------
create or replace function private.is_creator(p uuid) returns boolean
language sql stable security definer set search_path = public, private as
$$ select p is not null
      and p = (select owner_id from private.owner_config where id = 1)
      and exists (select 1 from public.user_roles r where r.user_id = p and r.role = 'CREATOR') $$;

create or replace function private.has_xtx(p uuid) returns boolean
language sql stable security definer set search_path = public, private as
$$ select exists (select 1 from public.user_roles r where r.user_id = p and r.role = 'XTX') or private.is_creator(p) $$;

create or replace function private.is_banned(p uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.bans b where b.user_id = p and b.active and (b.expires_at is null or b.expires_at > now())) $$;

create or replace function private.require_user() returns uuid
language plpgsql stable security definer set search_path = public, private as $$
declare u uuid := auth.uid();
begin
  if u is null then raise exception 'Sesión no válida. Inicia sesión de nuevo.'; end if;
  if private.is_banned(u) then raise exception 'Tu cuenta está suspendida.'; end if;
  return u;
end $$;

create or replace function private.require_creator() returns uuid
language plpgsql stable security definer set search_path = public, private as $$
declare u uuid := private.require_user();
begin
  if not private.is_creator(u) then raise exception 'Acceso denegado: solo el CREATOR.'; end if;
  return u;
end $$;

create or replace function private.zone_open(p_zone text) returns boolean
language sql stable security definer set search_path = public as
$$ select p_zone is null or coalesce((select enabled from public.zones where zone_key = p_zone), true) $$;

create or replace function private.hosp_rate() returns real language sql immutable as $$ select 1.4::real $$;

create or replace function private.hosp_hp(cs public.character_state) returns real
language sql stable as
$$ select least(100, coalesce(cs.hospital_start_hp, 5) + private.hosp_rate() * extract(epoch from (now() - cs.hospital_started_at)))::real $$;

create or replace function private.alog(p_admin uuid, p_action text, p_target uuid, p_details jsonb) returns void
language sql security definer set search_path = public as
$$ insert into public.admin_log (admin_id, action, target_id, details) values (p_admin, p_action, p_target, p_details) $$;

create or replace function private.world_json() returns jsonb
language sql stable security definer set search_path = public as
$$ select jsonb_build_object('weather', w.weather, 'time_mode', w.time_mode, 'fixed_hour', w.fixed_hour,
          'zones', (select coalesce(jsonb_object_agg(z.zone_key, z.enabled), '{}'::jsonb) from public.zones z))
   from public.world_state w where w.id = 1 $$;

create or replace function private.inv_json(p uuid) returns jsonb
language sql stable security definer set search_path = public as
$$ select coalesce(jsonb_object_agg(item_key, qty), '{}'::jsonb) from public.inventory where user_id = p and qty > 0 $$;

create or replace function private.roles_json(p uuid) returns jsonb
language sql stable security definer set search_path = public, private as
$$ select coalesce(jsonb_agg(role order by role), '[]'::jsonb) from public.user_roles where user_id = p $$;

create or replace function private.add_item(p uuid, p_key text, p_qty int) returns int
language plpgsql security definer set search_path = public as $$
declare q int;
begin
  insert into public.inventory (user_id, item_key, qty) values (p, p_key, greatest(p_qty, 0))
  on conflict (user_id, item_key) do update set qty = public.inventory.qty + p_qty
  returning qty into q;
  return q;
end $$;

create or replace function private.night_now() returns boolean language sql stable as
$$ select extract(hour from (now() at time zone 'America/Santo_Domingo')) >= 22
        or extract(hour from (now() at time zone 'America/Santo_Domingo')) < 6 $$;

-- Código de acceso XTX (se guarda con hash bcrypt; jamás en texto plano)
create or replace function private.set_xtx_code(p_code text) returns text
language plpgsql security definer set search_path = public, private, extensions as $$
begin
  if p_code is null or char_length(p_code) < 4 then raise exception 'El código debe tener al menos 4 caracteres.'; end if;
  insert into private.secrets (k, v) values ('xtx_code', extensions.crypt(p_code, extensions.gen_salt('bf')))
  on conflict (k) do update set v = excluded.v;
  return 'Código XTX actualizado.';
end $$;

-- Propietario / CREATOR
create or replace function private.set_owner(p_email text) returns text
language plpgsql security definer set search_path = public, private, extensions as $$
declare u uuid;
begin
  update private.owner_config set owner_email = lower(p_email), owner_id = null where id = 1;
  select id into u from auth.users where lower(email) = lower(p_email);
  if u is null then
    return 'Listo. Ahora crea la cuenta en el juego con ese correo (el nombre será Alantnunez).';
  end if;
  update public.profiles set username = username || '_' || substr(id::text, 1, 4)
   where lower(username) = 'alantnunez' and id <> u;
  insert into public.profiles (id, username) values (u, 'Alantnunez')
  on conflict (id) do update set username = 'Alantnunez';
  insert into public.character_state (user_id) values (u) on conflict do nothing;
  insert into public.equipment (user_id) values (u) on conflict do nothing;
  update private.owner_config set owner_id = u where id = 1;
  delete from public.user_roles where role = 'CREATOR' and user_id <> u;
  insert into public.user_roles (user_id, role, granted_by) values (u, 'CREATOR', u) on conflict do nothing;
  return 'Cuenta existente convertida en Alantnunez (CREATOR).';
end $$;

-- Guardia: CREATOR solo para el propietario
create or replace function private.guard_roles() returns trigger
language plpgsql security definer set search_path = public, private as $$
begin
  if new.role = 'CREATOR' and new.user_id is distinct from (select owner_id from private.owner_config where id = 1) then
    raise exception 'El rol CREATOR es exclusivo del propietario.';
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_roles on public.user_roles;
create trigger trg_guard_roles before insert or update on public.user_roles
  for each row execute function private.guard_roles();

-- Alta de usuario: crea perfil, estado, equipo y (solo para el propietario) el rol CREATOR
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
  insert into public.profiles (id, username) values (new.id, uname);
  insert into public.character_state (user_id) values (new.id);
  insert into public.equipment (user_id) values (new.id);
  if is_owner then
    update private.owner_config set owner_id = new.id where id = 1;
    insert into public.user_roles (user_id, role, granted_by) values (new.id, 'CREATOR', new.id);
  end if;
  return new;
end $$;
drop trigger if exists on_auth_user_created_v4 on auth.users;
create trigger on_auth_user_created_v4 after insert on auth.users
  for each row execute function private.handle_new_user();

-- Usuarios que ya existían en auth.users antes de la V4
insert into public.profiles (id, username)
select u.id, 'Jugador' || substr(replace(u.id::text,'-',''), 1, 6) from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id) on conflict do nothing;
insert into public.character_state (user_id) select id from public.profiles on conflict do nothing;
insert into public.equipment (user_id) select id from public.profiles on conflict do nothing;

-- ---------------------------------------------------------------------
-- 5. RLS: nadie escribe directamente; solo lectura de lo propio
-- ---------------------------------------------------------------------
do $rls$
declare t text;
begin
  foreach t in array array['profiles','user_roles','character_state','equipment','item_catalog','inventory','vehicle_catalog',
      'vehicles_owned','property_catalog','properties_owned','purchases','dm_messages','player_contacts','world_state',
      'zones','bans','admin_log'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $rls$;

grant select (id, username, shirt, pants, level, last_seen) on public.profiles to authenticated;
grant select on public.user_roles, public.character_state, public.equipment, public.inventory, public.vehicles_owned,
                public.purchases, public.dm_messages, public.player_contacts to authenticated;
grant select on public.item_catalog, public.vehicle_catalog, public.property_catalog, public.properties_owned,
                public.world_state, public.zones to authenticated;

drop policy if exists p_profiles_read on public.profiles;
create policy p_profiles_read on public.profiles for select to authenticated using (true);
drop policy if exists p_roles_own on public.user_roles;
create policy p_roles_own on public.user_roles for select to authenticated using (user_id = auth.uid());
drop policy if exists p_state_own on public.character_state;
create policy p_state_own on public.character_state for select to authenticated using (user_id = auth.uid());
drop policy if exists p_equip_own on public.equipment;
create policy p_equip_own on public.equipment for select to authenticated using (user_id = auth.uid());
drop policy if exists p_inv_own on public.inventory;
create policy p_inv_own on public.inventory for select to authenticated using (user_id = auth.uid());
drop policy if exists p_veh_own on public.vehicles_owned;
create policy p_veh_own on public.vehicles_owned for select to authenticated using (user_id = auth.uid());
drop policy if exists p_purch_own on public.purchases;
create policy p_purch_own on public.purchases for select to authenticated using (user_id = auth.uid());
drop policy if exists p_dm_own on public.dm_messages;
create policy p_dm_own on public.dm_messages for select to authenticated using (auth.uid() in (from_id, to_id));
drop policy if exists p_contacts_own on public.player_contacts;
create policy p_contacts_own on public.player_contacts for select to authenticated using (owner_id = auth.uid());
drop policy if exists p_cat_read on public.item_catalog;
create policy p_cat_read on public.item_catalog for select to authenticated using (true);
drop policy if exists p_vcat_read on public.vehicle_catalog;
create policy p_vcat_read on public.vehicle_catalog for select to authenticated using (true);
drop policy if exists p_pcat_read on public.property_catalog;
create policy p_pcat_read on public.property_catalog for select to authenticated using (true);
drop policy if exists p_powned_read on public.properties_owned;
create policy p_powned_read on public.properties_owned for select to authenticated using (true);
drop policy if exists p_world_read on public.world_state;
create policy p_world_read on public.world_state for select to authenticated using (true);
drop policy if exists p_zones_read on public.zones;
create policy p_zones_read on public.zones for select to authenticated using (true);
-- bans y admin_log: sin políticas = cerradas (solo vía funciones del CREATOR)

-- ---------------------------------------------------------------------
-- 6. API del jugador (todas validan auth.uid() en el servidor)
-- ---------------------------------------------------------------------
create or replace function public.username_available(p_name text) returns boolean
language sql stable security definer set search_path = public as
$$ select p_name ~ '^[A-Za-z0-9_]{3,16}$' and lower(p_name) <> 'alantnunez'
          and not exists (select 1 from public.profiles where lower(username) = lower(p_name)) $$;

create or replace function public.get_me() returns jsonb
language plpgsql security definer set search_path = public, private, extensions, pg_temp as $$
declare u uuid := auth.uid(); p public.profiles; cs public.character_state; eq public.equipment; b public.bans;
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
  update public.profiles set last_seen = now() where id = u;
  return jsonb_build_object(
    'id', u, 'username', p.username, 'money', p.money, 'level', p.level, 'exp', p.exp, 'delivered', p.job_delivered,
    'shirt', p.shirt, 'pants', p.pants,
    'roles', private.roles_json(u), 'creator', private.is_creator(u),
    'state', jsonb_build_object('hp', case when cs.hospital then private.hosp_hp(cs) else cs.hp end,
        'hunger', cs.hunger, 'thirst', cs.thirst, 'energy', cs.energy, 'x', cs.x, 'y', cs.y, 'scene', cs.scene,
        'invisible', cs.invisible, 'xtx_access', coalesce(cs.xtx_access_until > now(), false),
        'job_active', cs.job_active),
    'hospital', case when cs.hospital then jsonb_build_object('bed', cs.hospital_bed,
        'started_ms', (extract(epoch from cs.hospital_started_at) * 1000)::bigint,
        'start_hp', cs.hospital_start_hp, 'rate', private.hosp_rate()) else null end,
    'equipment', jsonb_build_object('weapon', eq.weapon, 'ammo_loaded', eq.ammo_loaded, 'armor', eq.armor),
    'inv', private.inv_json(u),
    'vehicles', (select coalesce(jsonb_agg(jsonb_build_object('id', v.id, 'model', v.model_key, 'color', v.color,
                  'plate', v.plate, 'x', v.x, 'y', v.y, 'a', v.a) order by v.created_at), '[]'::jsonb)
                 from public.vehicles_owned v where v.user_id = u),
    'properties', (select coalesce(jsonb_agg(jsonb_build_object('key', po.property_key, 'owner', pr.username, 'mine', po.user_id = u)), '[]'::jsonb)
                   from public.properties_owned po join public.profiles pr on pr.id = po.user_id),
    'catalog', jsonb_build_object(
        'items', (select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) from public.item_catalog c),
        'vehicles', (select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) from public.vehicle_catalog c),
        'properties', (select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) from public.property_catalog c)),
    'world', private.world_json(),
    'server_ms', (extract(epoch from now()) * 1000)::bigint
  );
end $$;

create or replace function public.claim_session(p_session uuid) returns void
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_user();
begin
  update public.character_state set session_id = p_session, session_at = now() where user_id = u;
end $$;

create or replace function public.heartbeat(p_session uuid default null) returns jsonb
language plpgsql security definer set search_path = public, private, pg_temp as $$
declare u uuid := auth.uid(); cs public.character_state; m bigint;
begin
  if u is null then raise exception 'Sesión no válida.'; end if;
  if private.is_banned(u) then return jsonb_build_object('banned', true); end if;
  select * into cs from public.character_state where user_id = u for update;
  if p_session is not null and cs.session_id is not null and cs.session_id <> p_session then
    return jsonb_build_object('replaced', true);
  end if;
  update public.profiles set last_seen = now() where id = u returning money into m;
  update public.character_state set session_at = now() where user_id = u;
  return jsonb_build_object('money', m, 'roles', private.roles_json(u), 'creator', private.is_creator(u),
    'inv', private.inv_json(u), 'invisible', cs.invisible,
    'xtx_access', coalesce(cs.xtx_access_until > now(), false),
    'kicked_ms', case when cs.kicked_at is null then 0 else (extract(epoch from cs.kicked_at) * 1000)::bigint end,
    'world', private.world_json(), 'server_ms', (extract(epoch from now()) * 1000)::bigint);
end $$;

-- Guardado del progreso. El servidor solo acepta cambios plausibles.
create or replace function public.sync_state(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_user(); cs public.character_state; eq public.equipment;
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
  if sc not in ('out','in','shop','hosp','cloth') then sc := 'out'; end if;
  update public.character_state set hp = hp2, hunger = nh, thirst = nt, energy = ne,
    x = greatest(0, least(4200, coalesce((p->>'x')::real, x))), y = greatest(0, least(3200, coalesce((p->>'y')::real, y))),
    scene = sc, last_sync = now(), updated_at = now() where user_id = u;
  update public.equipment set
    ammo_loaded = greatest(0, least(eq.ammo_loaded, coalesce((p->>'ammo')::int, eq.ammo_loaded))),
    armor = greatest(0, least(eq.armor, coalesce((p->>'armor')::real, eq.armor)))
  where user_id = u;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.buy_item(p_key text, p_qty int default 1) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_user(); it public.item_catalog; total bigint; m bigint; cur int; q int;
begin
  if p_qty is null or p_qty < 1 or p_qty > 20 then raise exception 'Cantidad no válida.'; end if;
  select * into it from public.item_catalog where item_key = p_key and buyable;
  if not found then raise exception 'Ese objeto no está a la venta.'; end if;
  if not (private.zone_open(it.zone_key) or private.is_creator(u)) then raise exception 'Esta zona está cerrada por la administración.'; end if;
  select coalesce(qty, 0) into cur from public.inventory where user_id = u and item_key = p_key;
  cur := coalesce(cur, 0);
  if it.unique_item and cur > 0 then raise exception 'Ya tienes este objeto.'; end if;
  if cur + p_qty > it.max_qty then raise exception 'No puedes llevar más de % unidades.', it.max_qty; end if;
  total := it.price::bigint * p_qty;
  update public.profiles set money = money - total where id = u and money >= total returning money into m;
  if not found then raise exception 'No te alcanza el dinero ($%).', total; end if;
  q := private.add_item(u, p_key, p_qty);
  insert into public.purchases (user_id, kind, item_key, qty, unit_price, total) values (u, 'item', p_key, p_qty, it.price, total);
  return jsonb_build_object('money', m, 'qty', q, 'item', p_key);
end $$;

create or replace function public.use_item(p_key text) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_user(); it public.item_catalog; q int;
begin
  select * into it from public.item_catalog where item_key = p_key and kind in ('food','drink','med');
  if not found then raise exception 'Ese objeto no se puede usar.'; end if;
  update public.inventory set qty = qty - 1 where user_id = u and item_key = p_key and qty > 0 returning qty into q;
  if not found then raise exception 'No tienes ese objeto.'; end if;
  update public.character_state set
    hunger = greatest(0, least(100, hunger + it.hunger)), thirst = greatest(0, least(100, thirst + it.thirst)),
    hp = case when hospital then hp else greatest(1, least(100, hp + it.hp)) end,
    energy = greatest(0, least(100, energy + it.energy))
  where user_id = u;
  return jsonb_build_object('qty', q, 'hunger', it.hunger, 'thirst', it.thirst, 'hp', it.hp, 'energy', it.energy);
end $$;

create or replace function public.buy_clothes(p_shirt text, p_pants text) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_user(); p public.profiles; cost int := 0; m bigint;
begin
  if p_shirt !~ '^#[0-9a-fA-F]{6}$' or p_pants !~ '^#[0-9a-fA-F]{6}$' then raise exception 'Color no válido.'; end if;
  if not (private.zone_open('moda') or private.is_creator(u)) then raise exception 'La tienda está cerrada por la administración.'; end if;
  select * into p from public.profiles where id = u for update;
  if lower(p_shirt) <> lower(p.shirt) then cost := cost + 40; end if;
  if lower(p_pants) <> lower(p.pants) then cost := cost + 40; end if;
  if cost = 0 then raise exception 'No hay cambios que comprar.'; end if;
  if p.money < cost then raise exception 'No te alcanza el dinero ($%).', cost; end if;
  update public.profiles set money = money - cost, shirt = lower(p_shirt), pants = lower(p_pants) where id = u returning money into m;
  insert into public.purchases (user_id, kind, item_key, qty, unit_price, total) values (u, 'clothes', lower(p_shirt) || '/' || lower(p_pants), 1, cost, cost);
  return jsonb_build_object('money', m, 'shirt', lower(p_shirt), 'pants', lower(p_pants), 'cost', cost);
end $$;

create or replace function public.buy_vehicle(p_key text) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_user(); v public.vehicle_catalog; m bigint; n int; vid uuid; plate text;
begin
  select * into v from public.vehicle_catalog where veh_key = p_key;
  if not found then raise exception 'Vehículo no disponible.'; end if;
  if not (private.zone_open('concesionario') or private.is_creator(u)) then raise exception 'El concesionario está cerrado.'; end if;
  select count(*) into n from public.vehicles_owned where user_id = u;
  if n >= 4 then raise exception 'Ya tienes el máximo de vehículos (4).'; end if;
  update public.profiles set money = money - v.price where id = u and money >= v.price returning money into m;
  if not found then raise exception 'No te alcanza el dinero ($%).', v.price; end if;
  plate := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  insert into public.vehicles_owned (user_id, model_key, color, plate) values (u, v.veh_key, v.color, plate) returning id into vid;
  insert into public.purchases (user_id, kind, item_key, qty, unit_price, total) values (u, 'vehicle', v.veh_key, 1, v.price, v.price);
  return jsonb_build_object('money', m, 'id', vid, 'model', v.veh_key, 'color', v.color, 'plate', plate);
end $$;

create or replace function public.park_vehicle(p_id uuid, p_x real, p_y real, p_a real) returns void
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_user();
begin
  update public.vehicles_owned set x = greatest(0, least(4200, p_x)), y = greatest(0, least(3200, p_y)), a = p_a
  where id = p_id and user_id = u;
end $$;

create or replace function public.buy_property(p_key text) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_user(); c public.property_catalog; m bigint; n int;
begin
  select * into c from public.property_catalog where property_key = p_key;
  if not found then raise exception 'Propiedad no disponible.'; end if;
  if exists (select 1 from public.properties_owned where property_key = p_key) then raise exception 'Esta propiedad ya tiene dueño.'; end if;
  select count(*) into n from public.properties_owned where user_id = u;
  if n >= 3 then raise exception 'Ya tienes el máximo de propiedades (3).'; end if;
  update public.profiles set money = money - c.price where id = u and money >= c.price returning money into m;
  if not found then raise exception 'No te alcanza el dinero ($%).', c.price; end if;
  insert into public.properties_owned (property_key, user_id) values (p_key, u);
  insert into public.purchases (user_id, kind, item_key, qty, unit_price, total) values (u, 'property', p_key, 1, c.price, c.price);
  return jsonb_build_object('money', m, 'key', p_key);
end $$;

-- ----- Trabajo del almacén (el pago lo calcula el servidor) -----
create or replace function public.job_start_shift() returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_user();
begin
  if not (private.zone_open('almacen') or private.is_creator(u)) then raise exception 'El almacén está cerrado por la administración.'; end if;
  update public.character_state set job_active = true, job_started_at = null, job_boxes = 0, job_money = 0, job_streak = 0 where user_id = u;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.job_new_order() returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_user(); cs public.character_state;
begin
  select * into cs from public.character_state where user_id = u for update;
  if not cs.job_active then raise exception 'No tienes un turno activo.'; end if;
  update public.character_state set job_started_at = now() where user_id = u;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.job_deliver() returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_user(); cs public.character_state; p public.profiles;
        el real; lvl int; base int; lim real; pay int; notes text[] := '{}'; streak int; m bigint; lv2 int;
begin
  select * into cs from public.character_state where user_id = u for update;
  select * into p from public.profiles where id = u for update;
  if not cs.job_active or cs.job_started_at is null then raise exception 'No hay ningún pedido activo.'; end if;
  el := extract(epoch from (now() - cs.job_started_at));
  if el < 12 then raise exception 'Entrega demasiado rápida. Inténtalo de nuevo.'; end if;
  lvl := 1 + p.job_delivered / 8;
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
  if private.night_now() then pay := round(pay * 1.25); notes := array_append(notes, 'noche'); end if;
  update public.profiles set money = money + pay, job_delivered = job_delivered + 1,
         exp = exp + 12, level = 1 + (job_delivered + 1) / 8 where id = u returning money, level into m, lv2;
  update public.character_state set job_started_at = null, job_boxes = job_boxes + 1, job_money = job_money + pay, job_streak = streak where user_id = u;
  return jsonb_build_object('pay', pay, 'money', m, 'level', lv2, 'delivered', p.job_delivered + 1, 'notes', to_jsonb(notes));
end $$;

create or replace function public.job_end_shift() returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_user(); cs public.character_state; bonus int := 0; m bigint;
begin
  select * into cs from public.character_state where user_id = u for update;
  if not cs.job_active then raise exception 'No tienes un turno activo.'; end if;
  if cs.job_boxes >= 5 then bonus := case when private.night_now() then 25 else 20 end; end if;
  update public.profiles set money = money + bonus where id = u returning money into m;
  update public.character_state set job_active = false, job_started_at = null where user_id = u;
  return jsonb_build_object('bonus', bonus, 'boxes', cs.job_boxes, 'earned', cs.job_money + bonus, 'money', m);
end $$;

-- ----- Muerte y hospital (el progreso de recuperación vive en el servidor) -----
create or replace function public.report_death(p_by text default null) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_user(); cs public.character_state; loss bigint; bed int; m bigint;
begin
  select * into cs from public.character_state where user_id = u for update;
  if cs.hospital then
    return jsonb_build_object('bed', cs.hospital_bed, 'started_ms', (extract(epoch from cs.hospital_started_at) * 1000)::bigint,
      'start_hp', cs.hospital_start_hp, 'rate', private.hosp_rate(), 'loss', 0);
  end if;
  select i into bed from generate_series(0, 7) i
   where not exists (select 1 from public.character_state o where o.hospital and o.hospital_bed = i and o.user_id <> u)
   order by i limit 1;
  bed := coalesce(bed, 0);
  select round(money * 0.1)::bigint into loss from public.profiles where id = u;
  update public.profiles set money = money - loss where id = u returning money into m;
  update public.character_state set hospital = true, hospital_started_at = now(), hospital_start_hp = 5, hospital_bed = bed,
    hp = 5, hunger = greatest(hunger, 40), thirst = greatest(thirst, 40), energy = greatest(energy, 40), scene = 'hosp',
    job_active = false, job_started_at = null where user_id = u;
  update public.equipment set armor = 0 where user_id = u;
  return jsonb_build_object('bed', bed, 'started_ms', (extract(epoch from now()) * 1000)::bigint, 'start_hp', 5,
    'rate', private.hosp_rate(), 'loss', coalesce(loss, 0), 'money', m);
end $$;

create or replace function public.hospital_release() returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_user(); cs public.character_state; hp real;
begin
  select * into cs from public.character_state where user_id = u for update;
  if not cs.hospital then return jsonb_build_object('ok', true); end if;
  hp := private.hosp_hp(cs);
  if hp < 99.5 then raise exception 'Todavía te estás recuperando (% %%).', round(hp); end if;
  update public.character_state set hospital = false, hp = 100, hospital_started_at = null, hospital_bed = null where user_id = u;
  return jsonb_build_object('ok', true, 'hp', 100);
end $$;

-- ----- XTX: rol + código, validados en el servidor -----
create or replace function public.xtx_enter(p_code text default null) returns jsonb
language plpgsql security definer set search_path = public, private, extensions as $$
declare u uuid := private.require_user(); cs public.character_state; h text; fails int;
begin
  if not private.zone_open('xtx') and not private.is_creator(u) then
    return jsonb_build_object('ok', false, 'msg', 'La base está cerrada por la administración.');
  end if;
  if not private.has_xtx(u) then
    return jsonb_build_object('ok', false, 'reason', 'role', 'msg', 'No tienes autorización para entrar. Falta el rol XTX.');
  end if;
  select * into cs from public.character_state where user_id = u for update;
  if private.is_creator(u) then
    update public.character_state set xtx_access_until = now() + interval '12 hours' where user_id = u;
    return jsonb_build_object('ok', true);
  end if;
  if cs.xtx_lock_until is not null and cs.xtx_lock_until > now() then
    return jsonb_build_object('ok', false, 'msg', 'Demasiados intentos. Espera un momento.');
  end if;
  select v into h from private.secrets where k = 'xtx_code';
  if h is null then return jsonb_build_object('ok', false, 'msg', 'El código de acceso aún no está configurado en el servidor.'); end if;
  if p_code is not null and extensions.crypt(p_code, h) = h then
    update public.character_state set xtx_access_until = now() + interval '60 minutes', xtx_fail = 0, xtx_lock_until = null where user_id = u;
    return jsonb_build_object('ok', true);
  end if;
  fails := cs.xtx_fail + 1;
  update public.character_state set xtx_fail = case when fails >= 5 then 0 else fails end,
    xtx_lock_until = case when fails >= 5 then now() + interval '60 seconds' else null end where user_id = u;
  return jsonb_build_object('ok', false, 'msg', 'Código incorrecto.');
end $$;

create or replace function public.xtx_claim(p_kind text) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_user(); cs public.character_state; cur int; got int := 0; res text;
begin
  if not private.has_xtx(u) then raise exception 'Solo los miembros XTX pueden usar el equipamiento.'; end if;
  select * into cs from public.character_state where user_id = u for update;
  if not private.is_creator(u) and not coalesce(cs.xtx_access_until > now(), false) then
    raise exception 'Debes entrar por el portón con el código antes de usar la base.';
  end if;
  if p_kind = 'pistol' then
    select coalesce(qty, 0) into cur from public.inventory where user_id = u and item_key = 'pistol';
    if coalesce(cur, 0) > 0 then raise exception 'Ya tienes tu pistola.'; end if;
    perform private.add_item(u, 'pistol', 1);
    update public.equipment set weapon = 'pistol', ammo_loaded = 12 where user_id = u;
    perform private.add_item(u, 'ammo', 24);
    res := 'Recibiste una pistola y 24 balas de reserva.';
  elsif p_kind = 'ammo' then
    select coalesce(qty, 0) into cur from public.inventory where user_id = u and item_key = 'pistol';
    if coalesce(cur, 0) < 1 then raise exception 'Primero necesitas tu pistola.'; end if;
    if cs.claim_ammo_at is not null and cs.claim_ammo_at > now() - interval '20 seconds' then raise exception 'Espera unos segundos para pedir más munición.'; end if;
    select coalesce(qty, 0) into cur from public.inventory where user_id = u and item_key = 'ammo';
    got := least(24, 120 - coalesce(cur, 0));
    if got <= 0 then raise exception 'Ya llevas el máximo de munición (120).'; end if;
    perform private.add_item(u, 'ammo', got);
    update public.character_state set claim_ammo_at = now() where user_id = u;
    res := 'Munición repuesta (+' || got::text || ').';
  elsif p_kind = 'vest' then
    select coalesce(qty, 0) into cur from public.inventory where user_id = u and item_key = 'vest';
    if coalesce(cur, 0) > 0 or exists (select 1 from public.equipment where user_id = u and armor > 0) then raise exception 'Ya tienes un chaleco.'; end if;
    perform private.add_item(u, 'vest', 1);
    res := 'Recogiste un chaleco antibalas. Equípalo desde el mismo punto.';
  elsif p_kind = 'kit' then
    select coalesce(qty, 0) into cur from public.inventory where user_id = u and item_key = 'xtx_kit';
    if coalesce(cur, 0) > 0 then raise exception 'Ya tienes el equipo de la banda.'; end if;
    perform private.add_item(u, 'xtx_kit', 1);
    res := 'Recibiste el equipo XTX.';
  else
    raise exception 'Equipamiento desconocido.';
  end if;
  return jsonb_build_object('msg', res, 'inv', private.inv_json(u),
    'equipment', (select jsonb_build_object('weapon', weapon, 'ammo_loaded', ammo_loaded, 'armor', armor) from public.equipment where user_id = u));
end $$;

create or replace function public.equip_vest() returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_user(); q int;
begin
  update public.inventory set qty = qty - 1 where user_id = u and item_key = 'vest' and qty > 0 returning qty into q;
  if not found then raise exception 'No tienes un chaleco para equipar.'; end if;
  update public.equipment set armor = 100 where user_id = u;
  return jsonb_build_object('armor', 100, 'inv', private.inv_json(u));
end $$;

create or replace function public.reload_gun() returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_user(); eq public.equipment; reserve int; take int;
begin
  select * into eq from public.equipment where user_id = u for update;
  if eq.weapon is distinct from 'pistol' then raise exception 'No tienes arma.'; end if;
  select coalesce(qty, 0) into reserve from public.inventory where user_id = u and item_key = 'ammo';
  reserve := coalesce(reserve, 0);
  take := least(12 - eq.ammo_loaded, reserve);
  if take > 0 then
    perform private.add_item(u, 'ammo', -take);
    update public.equipment set ammo_loaded = ammo_loaded + take where user_id = u;
  end if;
  return jsonb_build_object('loaded', eq.ammo_loaded + greatest(take, 0), 'reserve', reserve - greatest(take, 0));
end $$;

-- ----- Mensajes privados (solo remitente y destinatario) -----
create or replace function public.send_dm(p_to uuid, p_msg text) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_user(); mid bigint; t timestamptz; body text := btrim(coalesce(p_msg, ''));
begin
  if p_to = u then raise exception 'No puedes escribirte a ti mismo.'; end if;
  if char_length(body) < 1 or char_length(body) > 300 then raise exception 'El mensaje debe tener entre 1 y 300 caracteres.'; end if;
  if not exists (select 1 from public.profiles where id = p_to) then raise exception 'Ese jugador no existe.'; end if;
  if exists (select 1 from public.dm_messages d where d.from_id = u and d.created_at > now() - interval '600 milliseconds') then
    raise exception 'Más despacio…';
  end if;
  insert into public.dm_messages (from_id, to_id, msg) values (u, p_to, body) returning id, created_at into mid, t;
  return jsonb_build_object('id', mid, 'created_at', t);
end $$;

create or replace function public.get_dms(p_since bigint default 0) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_user();
begin
  return coalesce((select jsonb_agg(x order by x.id) from (
      select m.id, m.from_id, m.to_id, m.msg, m.created_at, m.read_at,
             case when m.from_id = u then tp.username else fp.username end as peer_name
      from public.dm_messages m
      join public.profiles fp on fp.id = m.from_id
      join public.profiles tp on tp.id = m.to_id
      where (m.from_id = u or m.to_id = u) and m.id > coalesce(p_since, 0)
      order by m.id desc limit 300) x), '[]'::jsonb);
end $$;

create or replace function public.mark_dms_read(p_peer uuid) returns void
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_user();
begin
  update public.dm_messages set read_at = now() where to_id = u and from_id = p_peer and read_at is null;
end $$;

create or replace function public.add_contact(p_friend uuid) returns void
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_user();
begin
  if p_friend = u then raise exception 'No puedes agregarte a ti mismo.'; end if;
  if not exists (select 1 from public.profiles where id = p_friend) then raise exception 'Ese jugador no existe.'; end if;
  insert into public.player_contacts (owner_id, friend_id) values (u, p_friend) on conflict do nothing;
end $$;

create or replace function public.remove_contact(p_friend uuid) returns void
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_user();
begin
  delete from public.player_contacts where owner_id = u and friend_id = p_friend;
end $$;

create or replace function public.get_contacts() returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_user();
begin
  return coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username,
            'online', coalesce(p.last_seen > now() - interval '30 seconds', false)) order by p.username)
          from public.player_contacts c join public.profiles p on p.id = c.friend_id where c.owner_id = u), '[]'::jsonb);
end $$;

create or replace function public.search_players(p_q text) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_user(); q text := left(btrim(coalesce(p_q, '')), 20);
begin
  if char_length(q) < 2 then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'username', s.username,
            'online', coalesce(s.last_seen > now() - interval '30 seconds', false)))
          from (select id, username, last_seen from public.profiles
                where id <> u and username ilike (q || '%') order by username limit 15) s), '[]'::jsonb);
end $$;

create or replace function public.public_roles(p_ids uuid[]) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_user();
begin
  return coalesce((select jsonb_object_agg(r.user_id::text, true) from public.user_roles r
                   where r.user_id = any(p_ids) and r.role = 'XTX'), '{}'::jsonb);
end $$;

-- ---------------------------------------------------------------------
-- 7. API del CREATOR (todas verifican en el servidor y registran la operación)
-- ---------------------------------------------------------------------
create or replace function public.admin_overview() returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_creator();
begin
  return jsonb_build_object(
    'players', (select count(*) from public.profiles),
    'online', (select count(*) from public.profiles where last_seen > now() - interval '30 seconds'),
    'banned', (select count(distinct user_id) from public.bans where active and (expires_at is null or expires_at > now())),
    'money', (select coalesce(sum(money), 0) from public.profiles),
    'world', private.world_json());
end $$;

create or replace function public.admin_list_players(p_q text default '', p_online_only boolean default false, p_limit int default 60) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_creator(); q text := left(coalesce(p_q, ''), 30);
begin
  return coalesce((select jsonb_agg(t.x) from (
    select jsonb_build_object('id', p.id, 'username', p.username, 'money', p.money, 'level', p.level, 'last_seen', p.last_seen,
      'online', coalesce(p.last_seen > now() - interval '30 seconds', false),
      'roles', private.roles_json(p.id), 'banned', private.is_banned(p.id)) as x
    from public.profiles p
    where (q = '' or p.username ilike '%' || q || '%')
      and (not p_online_only or p.last_seen > now() - interval '30 seconds')
    order by coalesce(p.last_seen > now() - interval '30 seconds', false) desc, p.username
    limit least(greatest(p_limit, 1), 200)) t), '[]'::jsonb);
end $$;

create or replace function public.admin_player_detail(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_creator(); p public.profiles; cs public.character_state; eq public.equipment;
begin
  select * into p from public.profiles where id = p_id;
  if not found then raise exception 'Jugador no encontrado.'; end if;
  select * into cs from public.character_state where user_id = p_id;
  select * into eq from public.equipment where user_id = p_id;
  perform private.alog(u, 'view_profile', p_id, null);
  return jsonb_build_object('id', p.id, 'username', p.username, 'money', p.money, 'level', p.level, 'exp', p.exp,
    'delivered', p.job_delivered, 'shirt', p.shirt, 'pants', p.pants, 'created_at', p.created_at, 'last_seen', p.last_seen,
    'roles', private.roles_json(p_id), 'banned', private.is_banned(p_id),
    'state', jsonb_build_object('hp', cs.hp, 'hunger', cs.hunger, 'thirst', cs.thirst, 'energy', cs.energy,
                'x', cs.x, 'y', cs.y, 'scene', cs.scene, 'hospital', cs.hospital),
    'equipment', jsonb_build_object('weapon', eq.weapon, 'ammo_loaded', eq.ammo_loaded, 'armor', eq.armor),
    'inv', private.inv_json(p_id),
    'vehicles', (select coalesce(jsonb_agg(jsonb_build_object('model', v.model_key, 'plate', v.plate)), '[]'::jsonb) from public.vehicles_owned v where v.user_id = p_id),
    'properties', (select coalesce(jsonb_agg(o.property_key), '[]'::jsonb) from public.properties_owned o where o.user_id = p_id));
end $$;

create or replace function public.admin_purchases(p_id uuid, p_limit int default 40) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_creator();
begin
  return coalesce((select jsonb_agg(to_jsonb(x)) from (
    select id, kind, item_key, qty, unit_price, total, created_at from public.purchases
    where user_id = p_id order by id desc limit least(greatest(p_limit, 1), 200)) x), '[]'::jsonb);
end $$;

create or replace function public.admin_set_role(p_id uuid, p_role text, p_grant boolean) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_creator();
begin
  if p_role <> 'XTX' then raise exception 'Solo se puede asignar o retirar el rol XTX. CREATOR es exclusivo del propietario.'; end if;
  if not exists (select 1 from public.profiles where id = p_id) then raise exception 'Jugador no encontrado.'; end if;
  if p_grant then
    insert into public.user_roles (user_id, role, granted_by) values (p_id, p_role, u) on conflict do nothing;
  else
    delete from public.user_roles where user_id = p_id and role = p_role;
    update public.character_state set xtx_access_until = null where user_id = p_id;
  end if;
  perform private.alog(u, case when p_grant then 'role_grant' else 'role_revoke' end, p_id, jsonb_build_object('role', p_role));
  return jsonb_build_object('roles', private.roles_json(p_id));
end $$;

create or replace function public.admin_kick(p_id uuid, p_reason text default null) returns void
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_creator();
begin
  if p_id = u or private.is_creator(p_id) then raise exception 'No puedes expulsar al CREATOR.'; end if;
  update public.character_state set kicked_at = now() where user_id = p_id;
  perform private.alog(u, 'kick', p_id, jsonb_build_object('reason', left(p_reason, 200)));
end $$;

create or replace function public.admin_ban(p_id uuid, p_reason text default null, p_hours int default null) returns void
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_creator(); until_at timestamptz;
begin
  if p_id = u or private.is_creator(p_id) then raise exception 'No puedes banear al CREATOR.'; end if;
  if p_hours is not null and p_hours > 0 then until_at := now() + make_interval(hours => p_hours); end if;
  update public.bans set active = false where user_id = p_id and active;
  insert into public.bans (user_id, reason, banned_by, expires_at) values (p_id, left(p_reason, 200), u, until_at);
  update public.character_state set kicked_at = now() where user_id = p_id;
  begin
    update auth.users set banned_until = coalesce(until_at, now() + interval '100 years') where id = p_id;
  exception when others then null;
  end;
  perform private.alog(u, 'ban', p_id, jsonb_build_object('reason', left(p_reason, 200), 'hours', p_hours));
end $$;

create or replace function public.admin_unban(p_id uuid) returns void
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_creator();
begin
  update public.bans set active = false, unbanned_by = u, unbanned_at = now() where user_id = p_id and active;
  begin
    update auth.users set banned_until = null where id = p_id;
  exception when others then null;
  end;
  perform private.alog(u, 'unban', p_id, null);
end $$;

create or replace function public.admin_money(p_id uuid, p_delta bigint, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_creator(); m bigint;
begin
  if p_delta is null or p_delta = 0 or abs(p_delta) > 100000000 then raise exception 'Cantidad no válida.'; end if;
  update public.profiles set money = money + p_delta where id = p_id and money + p_delta >= 0 returning money into m;
  if not found then raise exception 'El saldo no puede quedar negativo (o el jugador no existe).'; end if;
  insert into public.purchases (user_id, kind, item_key, qty, unit_price, total) values (p_id, 'admin_money', left(p_reason, 60), 1, 0, p_delta);
  perform private.alog(u, case when p_delta > 0 then 'money_add' else 'money_remove' end, p_id, jsonb_build_object('delta', p_delta, 'reason', left(p_reason, 200)));
  return jsonb_build_object('money', m);
end $$;

create or replace function public.admin_item(p_id uuid, p_key text, p_delta int) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_creator(); q int;
begin
  if p_delta is null or p_delta = 0 or abs(p_delta) > 9999 then raise exception 'Cantidad no válida.'; end if;
  if not exists (select 1 from public.item_catalog where item_key = p_key) then raise exception 'Objeto desconocido.'; end if;
  if not exists (select 1 from public.profiles where id = p_id) then raise exception 'Jugador no encontrado.'; end if;
  if p_delta < 0 and coalesce((select qty from public.inventory where user_id = p_id and item_key = p_key), 0) < -p_delta then
    raise exception 'El jugador no tiene tantas unidades.';
  end if;
  q := private.add_item(p_id, p_key, p_delta);
  insert into public.purchases (user_id, kind, item_key, qty, unit_price, total) values (p_id, 'admin_item', p_key, p_delta, 0, 0);
  perform private.alog(u, case when p_delta > 0 then 'item_give' else 'item_take' end, p_id, jsonb_build_object('item', p_key, 'qty', p_delta));
  return jsonb_build_object('qty', q, 'inv', private.inv_json(p_id));
end $$;

create or replace function public.admin_set_world(p_weather text, p_time_mode text, p_hour real default 12) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_creator();
begin
  if p_weather not in ('clear','cloudy','rain','storm') then raise exception 'Clima no válido.'; end if;
  if p_time_mode not in ('real','fixed') then raise exception 'Modo de hora no válido.'; end if;
  update public.world_state set weather = p_weather, time_mode = p_time_mode,
         fixed_hour = greatest(0, least(23.99, coalesce(p_hour, 12))), updated_by = u, updated_at = now() where id = 1;
  perform private.alog(u, 'world_set', null, jsonb_build_object('weather', p_weather, 'time_mode', p_time_mode, 'hour', p_hour));
  return private.world_json();
end $$;

create or replace function public.admin_set_zone(p_key text, p_enabled boolean) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_creator();
begin
  update public.zones set enabled = p_enabled where zone_key = p_key;
  if not found then raise exception 'Zona desconocida.'; end if;
  perform private.alog(u, 'zone_set', null, jsonb_build_object('zone', p_key, 'enabled', p_enabled));
  return private.world_json();
end $$;

create or replace function public.admin_set_power(p_power text, p_on boolean) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_creator();
begin
  if p_power not in ('invisible','fly','speed') then raise exception 'Poder desconocido.'; end if;
  if p_power = 'invisible' then update public.character_state set invisible = p_on where user_id = u; end if;
  perform private.alog(u, 'power', u, jsonb_build_object('power', p_power, 'on', p_on));
  return jsonb_build_object('power', p_power, 'on', p_on);
end $$;

create or replace function public.admin_log_list(p_limit int default 60) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare u uuid := private.require_creator();
begin
  return coalesce((select jsonb_agg(to_jsonb(x)) from (
    select l.id, l.action, l.details, l.created_at, a.username as admin, t.username as target
    from public.admin_log l
    left join public.profiles a on a.id = l.admin_id
    left join public.profiles t on t.id = l.target_id
    order by l.id desc limit least(greatest(p_limit, 1), 200)) x), '[]'::jsonb);
end $$;

-- ---------------------------------------------------------------------
-- 8. Permisos de ejecución: solo usuarios autenticados (y username_available para el registro)
-- ---------------------------------------------------------------------
do $grants$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig, p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = any (array[
      'username_available','get_me','claim_session','heartbeat','sync_state','buy_item','use_item','buy_clothes',
      'buy_vehicle','park_vehicle','buy_property','job_start_shift','job_new_order','job_deliver','job_end_shift',
      'report_death','hospital_release','xtx_enter','xtx_claim','equip_vest','reload_gun','send_dm','get_dms',
      'mark_dms_read','add_contact','remove_contact','get_contacts','search_players','public_roles',
      'admin_overview','admin_list_players','admin_player_detail','admin_purchases','admin_set_role','admin_kick',
      'admin_ban','admin_unban','admin_money','admin_item','admin_set_world','admin_set_zone','admin_set_power','admin_log_list'])
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.sig);
    execute format('grant execute on function %s to authenticated', r.sig);
    if r.proname = 'username_available' then execute format('grant execute on function %s to anon', r.sig); end if;
  end loop;
end $grants$;

-- Listo. Siguiente paso: ejecuta 02_configuracion_manual.sql (propietario y código XTX).
