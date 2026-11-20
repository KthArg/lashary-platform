-- 20261120000002_delinquency_cases_settled_constraints.sql
-- US-MOR-05 · feature delinquency — los CHECK de estado de delinquency_cases admiten `settled`, el estado
-- que pone la aprobación de una regularización cuando el saldo de la cita llega a cero (US-MOR-03).
-- 20261120000001 dejó la lista de estados y los CHECK de excepción sin `settled`; como esa migración se
-- aplica después de las de US-MOR-03 por número de versión, aprobar una regularización que salda la cita
-- habría fallado con violación de CHECK. Aquí se redefinen como la unión de las dos historias.
-- `settled` puede llevar exception_reason y exception_amount: una morosidad con condonación parcial
-- previa que la clienta termina de pagar queda `settled` con lo ya condonado (criterio 4: el historial
-- no se pierde). Es seguro aplicarla sin US-MOR-03: `settled` simplemente no ocurre.
-- Orden de merge: US-MOR-03 debe entrar a main antes que US-MOR-05. Si no, sus migraciones (fecha anterior)
-- se aplican después con `db push --include-all` y reescriben estos CHECK sin `lifted` ni `forgiven`.
-- Cumplimiento: DOM-005, DOM-012, SEC-001, INT-003, INT-008.

ALTER TABLE public.delinquency_cases
  DROP CONSTRAINT delinquency_cases_decision_matches_state,
  DROP CONSTRAINT delinquency_cases_state_check,
  DROP CONSTRAINT delinquency_cases_exception_reason_by_state,
  DROP CONSTRAINT delinquency_cases_exception_amount_by_state;

ALTER TABLE public.delinquency_cases
  ADD CONSTRAINT delinquency_cases_state_check
    CHECK (state IN ('pending_review', 'active', 'dismissed', 'lifted', 'forgiven', 'settled')),
  ADD CONSTRAINT delinquency_cases_decision_matches_state CHECK (
    (state = 'pending_review' AND decided_at IS NULL AND decided_by IS NULL)
    OR (state IN ('active', 'dismissed', 'lifted', 'forgiven', 'settled') AND decided_at IS NOT NULL AND decided_by IS NOT NULL)
  ),
  ADD CONSTRAINT delinquency_cases_exception_reason_by_state CHECK (
    (state IN ('pending_review', 'dismissed') AND exception_reason IS NULL)
    OR (state IN ('lifted', 'forgiven') AND exception_reason IS NOT NULL)
    OR state IN ('active', 'settled')
  ),
  ADD CONSTRAINT delinquency_cases_exception_amount_by_state CHECK (
    (state IN ('pending_review', 'dismissed', 'lifted') AND exception_amount IS NULL)
    OR (state = 'forgiven' AND exception_amount IS NOT NULL)
    OR state IN ('active', 'settled')
  );
