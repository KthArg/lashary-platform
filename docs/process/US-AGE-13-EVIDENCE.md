# Evidencia de US-AGE-13

Fecha: 2026-10-05. Estado: en progreso; implementación publicada, pendiente de integración y revisión.

## Piezas del anticipo por paquete

| Posición | PR | Contenido | Líneas modificadas |
|---|---|---|---|
| 16/21 | [#178](https://github.com/KthArg/lashary-platform/pull/178) | Contrato de catalog y plan | 57 |
| 17/21 | [#179](https://github.com/KthArg/lashary-platform/pull/179) | Columna deposit, RPC y pruebas SQL | 89 |
| 18/21 | [#180](https://github.com/KthArg/lashary-platform/pull/180) | Dominio, comandos y repositorio | 138 |
| 19/21 | [#181](https://github.com/KthArg/lashary-platform/pull/181) | Formulario, listado y protección de precisión | 134 |
| 20/21 | [#182](https://github.com/KthArg/lashary-platform/pull/182) | Evidencia y estado de la historia | Menos de 400 |
| 21/21 | Pieza de protección del historial | Migración RESTRICT y prueba SQL | Menos de 400 |

Las dependencias #173, #174 y #175 ya están integradas en main. La rama us/US-AGE-13 se actualizó con ese main y las 21 piezas forman una sola cadena: #178 continúa después de #177 y #182 después de #181. Cada pieza incorpora su base mediante merge commit, conservando los commits originales, sin push forzado. Integrar las piezas en orden con merge commit según INT-005.

## Verificación realizada

- 72 pruebas unitarias y de interfaz: ingreso y envío del anticipo, creación, edición, lectura, desactivación y errores.
- 17 aserciones pgTAP en una base local temporal: monto independiente, compatibilidad del RPC previo, cero, valores inválidos, rango entero seguro, permisos y rollback completo después del guardado previo.
- 117 pruebas unitarias/UI combinadas de catalog, audit y payments; 58 aserciones SQL combinadas (21 de invariantes de #175, 17 del anticipo, 10 de audit y 10 de payments).
- Tipado de src correcto y reglas de verify.sh aprobadas antes de publicar cada pieza.
- Revisión independiente: el redondeo de entradas extremas fue detectado, reproducido, corregido y revisado sin hallazgos pendientes.
- Las tres pruebas HTTP existentes no pudieron pasar porque el Supabase de desarrollo no tiene las tablas de paquetes. No se restableció esa base ni se ejecutaron migraciones remotas.

## Pendientes para cerrar

- Integrar las piezas de US-AGE-13; comprobar los checks de CI y obtener las aprobaciones exigidas.
- Integrar y aplicar la migración de protección de exoneraciones de la pieza 21. ADR-0009 fue aceptado por el equipo el 2026-10-05; 16 aserciones SQL locales demuestran la conservación del historial. #118 por sí solo conserva CASCADE; el archivado y la reactivación siguen fuera de esta pieza.
- Los criterios originales 2 y 3 pertenecen a US-AGE-05 y el 4 a US-AGE-12, con aprobación del PO registrada el 2026-10-03. No se vuelven a exigir para cerrar US-AGE-13.

El criterio original 1 queda implementado en los PR de catalog; todavía no se declara integrado. El criterio original 5 cuenta con el flujo de exoneración y bitácora de la pila de payments. Esta evidencia no equivale a aprobación formal ni autoriza merges. La actualización de ramas reactiva CI y debe revisarse su resultado antes de integrar.

## Pieza 21/21: conservación del historial

La migración 20261005000000_payments_exemption_history.sql cambia CASCADE por RESTRICT de forma atómica, sin editar migraciones existentes. payments_exemption_history.test.sql impide el borrado directo de perfiles con exoneraciones activas e inactivas y el borrado indirecto desde auth.users, conserva sus registros y permite editar el perfil. Se comprobó el fallo con el esquema anterior y el éxito de las 16 aserciones con la migración aplicada únicamente en una base local temporal. La suite SQL completa aprueba 87 aserciones; dos registros previos a la migración conservan contenido y estado.

La suite completa previa produjo 488 pruebas aprobadas, 3 fallos y 6 omitidas; fallan package-repository.integration.test.ts y el setup de package-rls-isolation.test.ts por las tablas/seed de paquetes ausentes en Supabase de desarrollo. Estos fallos preceden a esta pieza; no se restableció esa base.
