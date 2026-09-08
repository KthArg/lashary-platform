# store — US-PROD-02 (incremento inicial)

Este incremento implementa la base de la historia `US-PROD-02`:

- Modelo público de producto (`domain/product.ts`)
- Caso de uso de listado para grid público (`application/get-public-product-grid.ts`)
- Adaptador de lectura desde CMS (`http/cms-public-product-catalog.ts`)
- Render del grid y estados de UI (`ui/public-product-grid.tsx`)
- Textos externos en español (`ui/public-product-grid.strings.es.ts`)

## Alcance pendiente

- Integración en rutas/páginas reales de Next.js
- Integración con cliente real del CMS
- Pruebas automatizadas de integración/UI
