// Sin ninguna dependencia de `catalog`: lo comparten `technique-view.ts` (servidor) y
// `TechniqueList` (cliente) — si viviera junto a `toLandingTechnique`, cualquier import de
// `catalog` ahí (p. ej. `applyDiscount`) arrastraría el cliente de Supabase de servidor al
// bundle del cliente a través de este mismo archivo.
const colonFormatter = new Intl.NumberFormat('es-CR', {
  style: 'currency',
  currency: 'CRC',
  maximumFractionDigits: 0,
})

export const formatColones = (value: number): string => colonFormatter.format(value)
