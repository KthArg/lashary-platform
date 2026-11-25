---
feature: loyalty
dri: pendiente
estado: en_progreso
actualizado: 2026-11-24
historias:
  - id: US-LAND-06
    estado: en_progreso
    falta: "Solo existe el contrato (docs/contracts/loyalty-api.md y las secciones de US-LAND-06 en payments-api.md y scheduling-api.md). Faltan las tablas loyalty_levels, loyalty_visits y loyalty_benefits con su RLS y la siembra inicial, las funciones loyalty_record_visit, loyalty_quote_benefits y loyalty_client_progress, el asiento loyalty_credit de payments, el cierre de cita que cuenta la visita y aplica el beneficio, la pantalla de niveles del panel, el progreso en el perfil de la clienta y en /portal/cuenta, y que la landing lea los niveles del motor en vez del CMS."
    evidencia: "Arranca 2026-11-24 en us/US-LAND-06. Decisiones de alcance del 2026-11-24, comunicadas por Bayron y registradas en docs/process/DEPENDENCIES.md, pendientes de confirmacion del PO: los niveles iniciales se copian de la coleccion provisional niveles-fidelidad del CMS (US-CMS-05 no existe en el backlog); al pasar el ultimo nivel el ciclo vuelve a empezar; un beneficio sin confirmar queda pendiente para la siguiente cita completada; servicio gratuito es el cargo entero de la visita; las citas ya completadas se cuentan al activar el motor; la regla del beneficio se congela al ganarlo."
flags: []
deuda: []
defectos: []
---

# loyalty

Motor de fidelidad: niveles configurables, conteo sobre citas completadas, reglas congeladas al ganar el beneficio.

## Qué hace hoy

Hoy: no existe código. El contrato está pactado en [docs/contracts/loyalty-api.md](../../../docs/contracts/loyalty-api.md) (pieza 1 de US-LAND-06), con las reglas del programa.

## Contrato público

[docs/contracts/loyalty-api.md](../../../docs/contracts/loyalty-api.md). Entra por `index.ts` (ARCH-003): `listLoyaltyLevels`, `getLoyaltyProgress` y `quoteLoyaltyBenefits`, y las funciones SQL `loyalty_client_progress`, `loyalty_quote_benefits` y `loyalty_record_visit`.

## Dependencias

- `payments`: `payments_record_loyalty_credit` asienta el descuento ([payments-api.md](../../../docs/contracts/payments-api.md#descuento-de-fidelidad-us-land-06)).
- `scheduling` la llama al cerrar una cita, no al revés: `loyalty` no lee citas ([scheduling-api.md](../../../docs/contracts/scheduling-api.md#fidelidad-al-cerrar-us-land-06)).

## Plan de US-LAND-06

Piezas estimadas al arrancar, todas contra `us/US-LAND-06`:

1. Contratos y decisiones (esta pieza).
2. `loyalty_levels`: tabla, RLS (lectura pública, escritura del personal) y siembra con los niveles publicados hoy en el CMS.
3. `loyalty_visits` y `loyalty_benefits`: tablas y RLS.
4. `loyalty_record_visit`, `loyalty_quote_benefits` y `loyalty_client_progress`.
5. `payments`: asiento `loyalty_credit` y `payments_record_loyalty_credit`.
6. `scheduling_close_appointment` cuenta la visita y aplica el beneficio; la misma migración cuenta el historial.
7. Dominio de `loyalty`.
8. Repositorios y casos de uso de `loyalty`.
9. y 10. Pantalla de niveles del panel: lógica y vista.
11. El diálogo de cierre muestra el beneficio y la casilla para aplicarlo.
12. El progreso en el perfil de la clienta (`clients`).
13. El progreso en «Mi cuenta» (`account`).
14. La landing lee los niveles del motor (expand de `cms-api.md` v1.4).
15. Cierre de la historia.
