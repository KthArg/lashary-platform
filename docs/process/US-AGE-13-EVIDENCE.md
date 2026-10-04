# Evidencia de US-AGE-13

Fecha: 2026-10-04. Estado: en progreso; implementación publicada, pendiente de integración y revisión.

## Piezas del anticipo por paquete

| Posición | PR | Contenido | Líneas modificadas |
|---|---|---|---|
| 16/20 | [#178](https://github.com/KthArg/lashary-platform/pull/178) | Contrato de catalog y plan | 51 |
| 17/20 | [#179](https://github.com/KthArg/lashary-platform/pull/179) | Columna deposit, RPC y pruebas SQL | 89 |
| 18/20 | [#180](https://github.com/KthArg/lashary-platform/pull/180) | Dominio, comandos y repositorio | 138 |
| 19/20 | [#181](https://github.com/KthArg/lashary-platform/pull/181) | Formulario, listado y protección de precisión | 134 |
| 20/20 | Esta pieza | Evidencia y estado de la historia | Menos de 400 |

Integrar primero #173 → #174 → #175; después #178 → #179 → #180 → #181. Las piezas de la pila original de payments siguen su orden 1/20–15/20; esta pieza 20/20 se basa en #177 y documenta la integración pendiente de la pila de catalog. Usar merge commit entre piezas según INT-005.

## Verificación realizada

- 72 pruebas unitarias y de interfaz: ingreso y envío del anticipo, creación, edición, lectura, desactivación y errores.
- 17 aserciones pgTAP en una base local temporal: monto independiente, compatibilidad del RPC previo, cero, valores inválidos, rango entero seguro, permisos y rollback completo después del guardado previo.
- Tipado de src correcto y reglas de verify.sh aprobadas antes de publicar cada pieza.
- Revisión independiente: el redondeo de entradas extremas fue detectado, reproducido, corregido y revisado sin hallazgos pendientes.
- Las tres pruebas HTTP existentes no pudieron pasar porque el Supabase de desarrollo no tiene las tablas de paquetes. No se restableció esa base ni se ejecutaron migraciones remotas.

## Pendientes para cerrar

- Integrar las dependencias de paquetes y las piezas de US-AGE-13; comprobar los checks de CI y obtener las aprobaciones exigidas.
- Revisar ADR-0009 con el equipo y aplicar/verificar una migración nueva que proteja las exoneraciones frente al borrado de perfiles. #118 conserva por ahora ON DELETE CASCADE; la propuesta documental no cambia esa conducta.
- Los criterios originales 2 y 3 pertenecen a US-AGE-05 y el 4 a US-AGE-12, con aprobación del PO registrada el 2026-10-03. No se vuelven a exigir para cerrar US-AGE-13.

El criterio original 1 queda implementado en los PR de catalog; todavía no se declara integrado. El criterio original 5 cuenta con el flujo de exoneración y bitácora de la pila de payments. Esta evidencia no equivale a aprobación formal ni autoriza merges.
