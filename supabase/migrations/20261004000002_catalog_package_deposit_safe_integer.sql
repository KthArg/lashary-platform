-- Mantener montos exactos al intercambiarlos con JavaScript.
ALTER TABLE public.catalog_packages
  ADD CONSTRAINT catalog_packages_deposit_safe_integer
  CHECK (deposit <= 9007199254740991);
