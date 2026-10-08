import { publicProductsGridStyles as STYLES } from '../PublicProductsGrid/PublicProductsGrid.styles'
import type { GridEmptyStateProps } from './GridEmptyState.types'

export function GridEmptyState({ state }: GridEmptyStateProps) {
  return (
    <section className={STYLES.alert} role="status">
      <div>
        <h2 className={STYLES.alertTitle}>{state.title}</h2>
        <p>{state.description}</p>
      </div>
    </section>
  )
}
