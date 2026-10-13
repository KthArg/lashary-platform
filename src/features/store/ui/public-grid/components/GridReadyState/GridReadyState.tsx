import { PUBLIC_GRID_STRINGS } from '../../constants/public-grid-strings'
import { publicProductsGridStyles as STYLES } from '../PublicProductsGrid/PublicProductsGrid.styles'
import { ProductCard } from '../ProductCard'
import type { GridReadyStateProps } from './GridReadyState.types'

export function GridReadyState({ state }: GridReadyStateProps) {
  return (
    <section aria-label={PUBLIC_GRID_STRINGS.catalogAriaLabel} className={STYLES.grid}>
      {state.cards.map((card) => (
        <ProductCard key={card.id} card={card} />
      ))}
    </section>
  )
}
