ALTER TABLE public.store_products
  ADD COLUMN IF NOT EXISTS existencias INTEGER NOT NULL DEFAULT 0
  CONSTRAINT store_products_existencias_no_negativas CHECK (existencias >= 0);
