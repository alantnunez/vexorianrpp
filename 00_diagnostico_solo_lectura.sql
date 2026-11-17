-- VEXORIAN RP · DIAGNÓSTICO (solo lee, no cambia nada). Ejecuta cada consulta por separado.

-- A) Estado de Alantnunez (debe verse player_id 0 y el rol CREATOR)
select p.username, p.player_id, (select jsonb_agg(role) from public.user_roles r where r.user_id = p.id) as roles,
       (select owner_id = p.id from private.owner_config where id = 1) as owner_config_ok
from public.profiles p where lower(p.username) = 'alantnunez';

-- B) Funciones existentes (public y private)
select n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||') -> '||pg_get_function_result(p.oid) as funcion
from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('public','private') order by 1;

-- C) Tablas y columnas
select table_schema||'.'||table_name as tabla, string_agg(column_name||':'||data_type, ', ' order by ordinal_position) as columnas
from information_schema.columns where table_schema in ('public','private') group by table_schema, table_name order by 1;
