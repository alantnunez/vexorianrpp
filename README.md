# VEXORIAN ROLEPLAY · V5 (versión corregida)

Todo está en **una sola carpeta**. Construido sobre la V4 (no se rehizo nada). `RESPALDO_V4_no_subir.zip` = copia de seguridad del código anterior.

## Cómo instalarlo (en este orden)

1. **(Opcional) `00_diagnostico_solo_lectura.sql`**: solo lee. La consulta A muestra a Alantnunez, su ID y sus roles.
2. **`03_migracion_v5.sql`** en *Supabase > SQL Editor > New query > pega todo > Run*.
   - Esta versión está hecha para bases que **ya tienen piezas de otro V5** (como la tuya: `vip_tiers`, `pay_mult`, `admin_money_daily`…). Todo lo nuevo usa nombres propios `v5_…`, así que **no choca ni toca tus tablas y funciones**.
   - Antes de reemplazar una función pública guarda su texto en `private.backup_v5_functions`, y copia tus tablas clave en `private.backup_v5_*`.
   - Es **atómica**: si algo falla, no se aplica nada. Si el *Run* da error, pásame el mensaje exacto.
   - Al terminar devuelve una fila **«verificacion»** con: Alantnunez (`player_id` 0, rol CREATOR, `es_creator` true), `ids_duplicados` 0 y `funciones_faltantes` (debe ser `[]`).
   - Si `funciones_faltantes` no está vacío, esas funciones vienen de `01_migracion_v4.sql`: dime cuáles son antes de ejecutarlo.
3. Sube los archivos del juego a tu hosting (**sin** los `.sql` ni el `.zip`).
4. Entra con la cuenta Alantnunez: arriba aparecerá **🛠️ Panel** y la barra dorada **CREATOR**.

Instalación desde cero: `01_migracion_v4.sql` → `02_configuracion_manual.sql` → `03_migracion_v5.sql`.

## Alantnunez (ID 0): panel con todas las funciones
El servidor reconoce a Alantnunez por la base de datos (no por el nombre en pantalla): `private.owner_config` + rol CREATOR. La migración **repara** ese permiso si faltaba y le asigna el **ID 0** (si otro jugador tuviera el 0, recibe el siguiente libre).
- **Jugadores:** buscar por nombre o ID, perfil completo, asignar/retirar XTX, ADMIN y VIP, expulsar, banear/desbanear, curar, cambiar nivel, dar vehículo, dar casa, ver compras.
- **Economía:** dar/quitar dinero, dar/retirar objetos, consultar balances y compras.
- **Mundo:** clima, lluvia, tormenta, hora, zonas (almacén, supermercado, concesionario, ropa, hospital, central de transporte, base XTX).
- **Casas:** lista de las 48 con dueño e invitados; liberar o asignar.
- **Historial:** todas las operaciones quedan registradas.
- **Poderes:** volar (F6), velocidad (F7), invisibilidad (F8), panel (F9); acceso a los paneles ADMIN y VIP.
- **ADMIN** (limitado): expulsar, entregar objetos básicos y dinero hasta $10,000 por día. **VIP**: pago x2, velocidad, metabolismo lento.

## Novedades V5
Mapa limpio (solo lugares con función; el resto son parques con bancas), 48 casas comprables con interior, invitados, sentarse, acostarse y cocinar; ID permanente; transportista desde el nivel 5 con furgoneta de trabajo; pago VIP x2; hambre y sed más lentas; un auto de $3,000 con combustible y gasolineras; chat con rol e ID; Modo rendimiento.

## Pruebas
Probé el juego en un navegador real con un **servidor Supabase simulado** (sin red en mi entorno): paneles CREATOR/ADMIN/VIP, Alantnunez con ID #0 y todas sus pestañas/botones, casas, invitados, muebles, cocina, transportista (bloqueo nivel 1, flujo nivel 5, sin doble cobro), combustible, pago VIP, geometría del mapa y consola sin errores.
**No** pude ejecutar el SQL contra un Postgres real ni probar Auth/Realtime reales. Lo revisé de forma estática (funciones y tablas referenciadas, comillas `$$`), pero el primer *Run* es la prueba definitiva.

## Límites
- La posición y los disparos los calcula el navegador (no hay servidor de juego); dinero, compras, propiedades, invitaciones, pagos, roles y niveles los valida el servidor.
- Si tu otro V5 tenía su propio panel/VIP (`vip_tiers`), esta versión no lo usa: el VIP de este juego funciona con el rol VIP y `v5_vip_prefs`.
- Chat de voz por proximidad: no estaba implementado, no se añadió.
