-- Notas generales de la administradora sobre la clienta (US-CLI-05, criterio 1)
-- Nullable: no toda clienta tiene notas, y las filas existentes no requieren backfill.
ALTER TABLE public.clients_profiles ADD COLUMN IF NOT EXISTS notes TEXT;
