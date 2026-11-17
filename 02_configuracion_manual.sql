-- =====================================================================
-- MiniSA RP · V4 · CONFIGURACIÓN MANUAL (ejecutar UNA vez, DESPUÉS de 01_migracion_v4.sql)
-- Este archivo contiene secretos: edítalo SOLO en tu copia local o directamente en el
-- SQL Editor de Supabase. NO lo subas a GitHub ni al hosting.
-- =====================================================================

-- 1) PROPIETARIO (CREATOR). Pon aquí TU correo real.
--    · Si aún no tienes cuenta: después de ejecutar esto, entra al juego > "Crear cuenta",
--      usa ese mismo correo y elige tu contraseña. El nombre será Alantnunez automáticamente.
--    · Si ya creaste el usuario en Supabase > Authentication > Users, esta línea lo convierte
--      en Alantnunez (CREATOR) al instante.
--    La contraseña la eliges tú en el formulario: Supabase Auth la guarda cifrada.
--    Nadie más puede registrar el nombre "Alantnunez" ni recibir el rol CREATOR.
select private.set_owner('TU_CORREO@ejemplo.com');

-- 2) CÓDIGO DE ACCESO DEL PORTÓN XTX (se guarda como hash bcrypt, solo en el servidor).
select private.set_xtx_code('3010');

-- 3) (Opcional) Para cambiar el código en el futuro, vuelve a ejecutar la línea 2 con otro valor.
-- 4) (Opcional) Para ver el registro administrativo:
--    select * from public.admin_log order by id desc limit 50;
