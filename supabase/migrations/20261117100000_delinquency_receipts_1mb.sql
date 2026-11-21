-- 20261117100000_delinquency_receipts_1mb.sql
-- US-MOR-03 · feature delinquency — el bucket de comprobantes baja su tope de 4 MB a 1 MB (contrato:
-- docs/contracts/delinquency-api.md, «El comprobante»).
-- Decisión de la clienta (dueña del estudio), 2026-11-18, comunicada por Jose Lorenzo: un comprobante de SINPE o
-- del banco no pasa de 1 MB (docs/process/DEPENDENCIES.md). La aplicación valida el mismo tope en el servidor
-- (domain/receipt.ts, DOM-008); el bucket lo repite como segunda barrera. Los comprobantes ya guardados no se tocan.
-- Cumplimiento: DOM-008, INT-008.

UPDATE storage.buckets
   SET file_size_limit = 1048576
 WHERE id = 'delinquency-receipts';
