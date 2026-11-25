# Contrato — API pública de fidelidad

> **Autoridad:** qué expone la feature `loyalty` a las demás features y bajo qué garantías, y qué les pide. Es un contrato **de demanda**: nace de lo que necesitan el cierre de cita de `scheduling` (criterios 5 y 6 de US-LAND-06), el perfil de la clienta en `clients` y la vista de cuenta de `account` (criterio 4), y la sección de fidelidad de la landing (US-LAND-05, que hoy lee los niveles del CMS). Se versiona aquí antes de cualquier cambio (INT-003). **Lectores:** features `scheduling`, `payments`, `clients`, `account` y `landing`. **Estado:** pactado en la pieza 1 de US-LAND-06; nada implementado todavía. **Actualizado:** 2026-11-24.

## Qué es

`loyalty` es dueña de los niveles del programa (`loyalty_levels`), de las visitas contadas (`loyalty_visits`) y de los beneficios ganados y aplicados (`loyalty_benefits`) (ARCH-006). Ninguna otra feature consulta esas tablas (ARCH-005): lo que necesiten lo piden por la superficie de este documento. `loyalty` no lee citas ni el ledger: `scheduling` le avisa cada visita al cerrar la cita, y el descuento lo asienta `payments`.

## Reglas del programa

Decisiones del 2026-11-24, comunicadas por Bayron y registradas en [DEPENDENCIES.md](../process/DEPENDENCIES.md). Falta que el PO las confirme.

1. **Una visita es una cita cerrada como `completed`** (US-AGE-12). Una ausencia (`no_show`) no cuenta. Cada cita cuenta una sola vez, la cuente el cierre o la migración del historial.
2. **Un nivel** es un número de visita (1 a 50, sin repetir) con su beneficio. El beneficio es de uno de tres tipos:
   - `percent_discount`: un porcentaje del cargo de la cita (1 a 100). Se redondea hacia abajo, al colón entero, a favor de la clienta (ADR-0004, DOM-001).
   - `fixed_discount`: un monto en colones (1 o más). Si es mayor que el cargo, se descuenta solo el cargo.
   - `free_service`: el cargo completo de la cita en que se aplica, sin importar la técnica o el paquete.
3. **Ciclo.** El ciclo dura tantas visitas como el número de visita del último nivel. La visita que sigue a la última del ciclo es la 1 de un ciclo nuevo, y los beneficios se pueden volver a ganar. Si cambian los niveles, la posición de las visitas ya contadas no cambia: solo se ven afectadas las siguientes. Si la última visita contada ya llegó o pasó el último nivel, la siguiente abre un ciclo nuevo. Sin niveles no hay ciclo: la posición sigue subiendo.
4. **Se gana en la visita, se aplica al cerrarla.** La visita cuya posición coincide con un nivel gana ese beneficio. Al cerrar esa misma cita, la administradora ve que corresponde y lo confirma; recién entonces se aplica (criterio 5).
5. **Un beneficio sin confirmar no se pierde.** Queda pendiente y se ofrece en la siguiente cita completada, hasta que se aplica.
6. **Uno por visita.** Si hay varios pendientes, se ofrece el más antiguo. Los beneficios no se acumulan en una misma cita.
7. **La regla queda congelada al ganarla** (criterio 7, DOM-002). El beneficio guarda el tipo y el valor del nivel en la visita en que se ganó. Editar o borrar el nivel después no cambia un beneficio ya ganado, esté pendiente o aplicado. Si se aplica en la misma visita en que se gana, es la regla vigente al aplicarlo.
8. **Sobre el cargo de la cita.** El descuento se calcula sobre el cargo que registra el cierre (el precio congelado al reservar, con su promoción si la tuvo, o el de la técnica prestada si fue otra). Nunca supera ese cargo. El anticipo se acredita aparte, como siempre, así que la cita puede quedar con saldo a favor.
9. **Aplicado una sola vez** (criterio 6). Un beneficio aplicado guarda la cita, el monto y quién y cuándo lo aplicó, y no se vuelve a ofrecer.
10. **El historial cuenta.** Al activarse el motor, las citas ya completadas se cuentan en orden de cierre. Los beneficios que alcancen quedan pendientes y se ofrecen en la siguiente cita.

## Superficie expuesta (`src/features/loyalty/index.ts`)

### `listLoyaltyLevels() => Promise<Result<LoyaltyLevel[], StorageFailed>>`

Los niveles vigentes, ordenados por número de visita.

```ts
type LoyaltyBenefit =
  | { kind: 'percent_discount'; percent: number }
  | { kind: 'fixed_discount'; amount: Money }
  | { kind: 'free_service' }

interface LoyaltyLevel {
  visitNumber: number
  benefit: LoyaltyBenefit
}
```

- Los niveles son públicos: los lee `anon`, porque la landing los muestra a quien no inició sesión.
- Sin niveles devuelve una lista vacía, no un error.
- Quien la necesita: la sección de fidelidad de la landing (US-LAND-05), que hoy lee la colección provisional `niveles-fidelidad` del CMS ([cms-api.md](cms-api.md), v1.4) y pasa a leer esta.

### `getLoyaltyProgress(clientId) => Promise<Result<LoyaltyProgress, StorageFailed>>`

El progreso de una clienta (criterio 4).

```ts
interface LoyaltyProgress {
  visitsCounted: number
  cycle: number
  position: number
  cycleLength: number | null
  nextLevel: LoyaltyLevel | null
  pendingBenefits: number
}
```

- `visitsCounted` son todas las visitas contadas. `cycle` y `position` son las de la última (0 y 0 si no tiene ninguna). `cycleLength` es el número de visita del último nivel, o `null` si no hay niveles.
- `nextLevel` es el próximo beneficio que puede ganar: el primer nivel por encima de `position` o, si ya completó el ciclo, el primero del ciclo nuevo. Es `null` sin niveles.
- `pendingBenefits` cuenta los beneficios ganados que aún no se aplicaron.
- Lee con la sesión de quien llama: el personal ve a cualquier clienta, una clienta solo a sí misma. Con el id de otra clienta, una clienta recibe un progreso vacío (sin visitas), no un error. Comprobar que la clienta existe es de quien llama (SEC-005).
- Quien la necesita: el perfil de la clienta en el panel (`clients`) y «Mi cuenta» (`/portal/cuenta`, `account`).

### `quoteLoyaltyBenefits(clientIds) => Promise<Result<LoyaltyBenefitQuote[], StorageFailed | TooManyClientIds>>`

Qué beneficio se le ofrecería a cada clienta en su próxima cita completada (criterio 5), para que el cierre lo muestre antes de confirmar.

```ts
interface LoyaltyBenefitQuote {
  clientId: string
  source: 'pending' | 'this_visit'
  visitNumber: number
  benefit: LoyaltyBenefit
}
```

- `pending` es un beneficio ganado antes y no aplicado; `this_visit` es el que gana la visita que se está por cerrar. Si hay pendientes, gana el más antiguo.
- Una clienta sin beneficio que ofrecer no devuelve fila.
- Solo el personal: una clienta o `anon` reciben lista vacía. Se pide con las clientas de toda la lista de citas sin cerrar en una sola llamada (PERF-005); más de 200 ids es `TooManyClientIds`.
- Quien la necesita: la sección «Citas pasadas sin cerrar» de la agenda diaria (`scheduling`, US-AGE-12).

## Funciones SQL

### `public.loyalty_client_progress(p_client_ids uuid[]) => TABLE (client_id uuid, visits_counted integer, cycle integer, position integer, cycle_length integer, next_visit_number integer, next_benefit_kind text, next_benefit_value bigint, pending_benefits integer)`

La base de `getLoyaltyProgress`. Devuelve una fila por cada id pedido, incluso sin visitas. Es `SECURITY INVOKER` y `STABLE`: la RLS de `loyalty_visits` y `loyalty_benefits` decide qué se ve. Solo `authenticated` tiene `EXECUTE`. Más de 200 ids es `loyalty_too_many_ids` (SQLSTATE `54000`).

### `public.loyalty_quote_benefits(p_client_ids uuid[]) => TABLE (client_id uuid, source text, visit_number integer, benefit_kind text, benefit_value bigint)`

La base de `quoteLoyaltyBenefits`. Calcula la posición de la próxima visita con la misma función interna que `loyalty_record_visit`, así que lo que se ofrece es lo que se aplicaría. Es `SECURITY INVOKER` y `STABLE`. Solo `authenticated` tiene `EXECUTE`, y la RLS deja ver solo al personal. Mismo tope de 200 ids.

### `public.loyalty_record_visit(p_appointment_id uuid, p_client_id uuid, p_charge bigint, p_apply_benefit boolean) => bigint`

Cuenta una visita y, si se pidió, aplica un beneficio. Devuelve el monto acreditado: 0 si no se aplicó ninguno.

- Cuenta la visita con su ciclo y su posición (regla 3). Si esa posición coincide con un nivel, deja el beneficio ganado con la regla congelada (regla 7).
- Con `p_apply_benefit = true`, aplica el pendiente más antiguo, que puede ser el que acaba de ganar. Calcula el monto sobre `p_charge` (reglas 2 y 8), lo asienta con `payments_record_loyalty_credit` ([payments-api.md](payments-api.md)) y marca el beneficio como aplicado en esa cita. Si no hay ninguno que aplicar, es `loyalty_benefit_not_available` (SQLSTATE `22023`): la administradora confirmó algo que ya no está. Si el monto da 0 (un porcentaje sobre un cargo de menos de 100 colones), el beneficio queda aplicado sin asiento.
- Una cita ya contada es `loyalty_visit_already_counted` (`23505`).
- Toma un lock por clienta, así que dos cierres simultáneos de la misma clienta no comparten posición. La unicidad de `(client_id, cycle, position)` es el respaldo.
- **Nadie con sesión la ejecuta directo:** `EXECUTE` revocado de `anon` y `authenticated`. Es `SECURITY INVOKER`. Solo la llama `scheduling_close_appointment` (`SECURITY DEFINER`), que corre como su dueña, igual que `payments_record_close_entries` ([scheduling-api.md](scheduling-api.md#fidelidad-al-cerrar-us-land-06)). También la llama la migración que cuenta el historial.

## Lo que pide a otras features

- **`scheduling`:** que el cierre como `completed` llame a `loyalty_record_visit` en la misma transacción y reciba de la administradora si aplica el beneficio. Que la migración del historial cuente las citas ya completadas. Detalle en [scheduling-api.md](scheduling-api.md#fidelidad-al-cerrar-us-land-06).
- **`payments`:** el asiento `loyalty_credit`. Detalle en [payments-api.md](payments-api.md#descuento-de-fidelidad-us-land-06).

## Garantías

1. **La forma es contrato:** un cambio de campos o de firma se versiona aquí antes del cambio (INT-003).
2. **La RLS es la frontera de acceso (SEC-001):** las funciones de lectura no la saltan. Los niveles los lee cualquiera y solo los escribe el personal. Las visitas y los beneficios los lee el personal y la propia clienta, y nadie con sesión los escribe: solo `loyalty_record_visit`.
3. **Un beneficio aplicado no cambia nunca** (DOM-002, DOM-005). Guarda la regla, el monto, la cita, quién y cuándo. Una corrección sería un contra-asiento en el ledger, no un cambio a esta fila.
4. **Contar y aplicar van con el cierre:** si `loyalty_record_visit` falla, el cierre falla entero y no queda la cita cerrada sin contar ni el cargo sin su descuento. A diferencia de las indicaciones de cuidado de US-CLI-06, este error no se atrapa: es dinero y el conteo del criterio 6.
5. **Sin datos de contacto ni de la cita:** salen ids, números y el beneficio. El nombre de la clienta se pide a `clients`.

## Pruebas (previstas)

pgTAP por tabla y por función, en `supabase/tests/database/`: la RLS de las tres tablas (SEC-002), el ciclo y su reinicio, el beneficio ganado y pendiente, el más antiguo primero, el cálculo y los topes de cada tipo, la regla congelada al editar o borrar el nivel, la visita contada dos veces, la concurrencia por clienta, y que nadie con sesión llame a `loyalty_record_visit`. Vitest para el dominio (`src/features/loyalty/domain/`) y los casos de uso.
