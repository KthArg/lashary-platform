<!-- Capa 5 — checklist humano. Cita reglas por ID; la compuerta bloqueante sigue siendo CI. -->

## Qué cambia

- **Historia(s):** US-XXX-NN
- **Feature(s):** (máx. 2 — INT-002)
- Resumen en dos frases:

## El bucle corrió (docs/process/WORK_LOOP.md)

- [ ] Paso 4 ejecutado: salida de `scripts/verify.sh` y de las pruebas **pegada abajo** — no descrita, pegada.
- [ ] Cada criterio de aceptación tocado está mapeado a la prueba que lo demuestra (lista abajo). Criterio sin prueba = no cumplido.
- [ ] `SPEC.md` de las features tocadas actualizado; `STATUS.md` regenerado (EST-002/003).
- [ ] Deuda tomada registrada con su costo; lo incompleto dice exactamente dónde se detiene (EST-006).

```
<salida de verify.sh + pruebas aquí>
```

| Criterio | Prueba que lo demuestra |
|---|---|
| | |

## Revisión

- [ ] Rebasado sobre main; rama ≤ 3 días (INT-001/005).
- [ ] Máximo una migración, forward-only (INT-008).
- [ ] Sin imports ilegales entre features (ARCH-003/004).
- [ ] Si toca auth, RLS, uploads, migraciones, dinero o expediente: checklist de `lashary-seguridad` corrido; RLS con su test de aislamiento (SEC-002).
- [ ] Si es excepción de proceso: etiqueta `excepcion-proceso` + justificación escrita (INTEGRATION.md, escape legítimo).
- [ ] Revisores: 2 aprobaciones, al menos 1 externa a la feature (INT-005).
