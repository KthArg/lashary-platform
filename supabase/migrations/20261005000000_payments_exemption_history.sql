-- US-AGE-13 · ADR-0009: proteger el historial sin cambiar las políticas RLS.
-- INT-008: migración nueva y atómica; no modifica la migración original.
BEGIN;

ALTER TABLE public.payments_deposit_exemptions
  DROP CONSTRAINT payments_deposit_exemptions_client_id_fkey,
  ADD CONSTRAINT payments_deposit_exemptions_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES public.clients_profiles(id) ON DELETE RESTRICT;

COMMIT;
