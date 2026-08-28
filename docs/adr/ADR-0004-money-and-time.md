# ADR-0004 — Dinero en colones enteros; tiempo en UTC

> **Estado:** aceptado. **Fecha:** 2026-08-27. **Decisores:** PO + bootstrap. **Reglas:** DOM-001, DOM-003, DOM-004.

## Contexto

El negocio opera en Costa Rica: precios en colones (CRC), zona `America/Costa_Rica`. El colón tiene céntimos oficiales pero el comercio real no los usa: los precios son enteros de colones. Los floats pierden precisión en silencio; las zonas horarias mezcladas corren citas.

## Decisión

**Dinero.** Todo monto es un **entero de colones** (exponente 0) dentro del value object `Money` en `shared/`: `{ amount: number /* entero validado */, currency: 'CRC' }`. Operaciones (suma, resta, porcentaje de descuento con regla de redondeo explícita) viven en el value object. En la base: `integer`/`bigint`; columnas `numeric` con decimales, `real` o `double precision` para dinero, prohibidas (lint de migraciones, F4). Si algún día se necesitan céntimos o otra divisa, el cambio es un solo lugar: el value object y su exponente.

**Tiempo.** Todo instante se persiste UTC `timestamptz` (DOM-003). Conversión a `America/Costa_Rica` únicamente en display, con la zona como constante de configuración en `shared/` — no repetida por pantalla. El dominio recibe un `Clock` inyectado (DOM-004); `new Date()` en dominio, prohibido.

## Alternativas consideradas

- **Céntimos como unidad menor (×100):** fiel al estándar ISO, pero introduce un factor 100 que nadie en el negocio usa y que invita al clásico bug de doble conversión. El exponente vive en el value object; cambiarlo después es barato.
- **`numeric(12,2)` en la base:** exacto, pero permite decimales que el negocio no tiene y deja pasar montos no enteros sin error.
- **Guardar hora local:** legible en la base, y garantiza el bug del cambio de reglas de zona/DST. Descartado.

## Consecuencias

- Un monto con decimales es **irrepresentable**: el constructor de `Money` rechaza no-enteros.
- Todo redondeo (descuentos de fidelidad %, promociones) es una decisión explícita del value object, no un accidente de float.
- Los tests de agendamiento pueden simular cualquier instante vía `Clock`.
- La UI siempre formatea desde UTC + zona configurada; un cambio de zona del negocio es una constante, no una migración.
