# ADR-0003 — Aprobación manual de reservas

> **Estado:** aceptado. **Fecha:** 2026-08-27. **Decisores:** PO (decisión), bootstrap (objeción registrada). **Historias:** US-AGE-05, US-AGE-15. **Reglas:** DOM-010, DOM-012.

## Contexto

El texto original de US-AGE-09 pedía aceptar o rechazar reservas manualmente; sus criterios de aceptación describían el constraint de no-solape. Son dos features distintas: un flujo de negocio y un invariante de datos. Se separaron: US-AGE-09 conserva el constraint (ADR-0002); US-AGE-15 lleva el flujo. El PO eligió explícitamente el flujo con aprobación manual (opción 8b del cuestionario de bootstrap, 2026-08-27).

## Decisión

Toda reserva de clienta nace en estado `pending_approval` y **ocupa su espacio desde ese instante** (incluida en el `where` del constraint — si no ocupara, dos pendientes podrían apuntar al mismo espacio y la aprobación crearía el choque que el constraint existe para impedir). La administradora aprueba o rechaza desde el panel:

- **Aprobar** → `approved`; corre el flujo de confirmación (US-NOT-08) y anticipo (US-AGE-13).
- **Rechazar** → libera el espacio inmediatamente, notifica a la clienta con motivo opcional, y queda en la bitácora (US-TEC-01).
- Las pendientes se destacan en la agenda diaria (US-AGE-11); una pendiente sin resolver dentro del plazo configurado se destaca más — no se auto-aprueba ni se auto-rechaza sin regla escrita y aprobada por el PO (DOM-012).

## Alternativas consideradas

- **Reserva instantánea** (recomendación del bootstrap): confirmación inmediata para la clienta, cero cola de trabajo para la dueña; el caso "emergencia" se resuelve cancelando con la política normal. Descartada por decisión del PO.
- **Instantánea ahora + aprobación como historia futura:** descartada; el PO quiere el control manual desde el inicio.

## Consecuencias

- **Ganamos:** control total de la dueña sobre quién entra a su agenda; el caso de emergencia queda cubierto sin excepción especial.
- **Perdemos / aceptamos:** fricción — la clienta no sabe al instante si tiene cita; espacios ocupados por pendientes que quizá se rechacen (inventario congelado); una tarea diaria nueva e ineludible para la dueña: la cola de aprobación.
- **Objeción registrada (bootstrap, 2026-08-27):** la fricción de aprobación manual cuesta conversión — una clienta que no recibe confirmación rápida reserva en otro lado — y traslada carga operativa diaria a la dueña. Se recomendó reserva instantánea. El PO escuchó el costo y decidió aprobación manual. Queda constancia: el trade-off fue visto y aceptado, no omitido.
- Métrica a vigilar desde F1: tiempo mediano pendiente→resuelta. Si excede lo tolerable, reabrir este ADR con datos.
