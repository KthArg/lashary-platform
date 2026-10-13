import type { ComponentType } from 'react'
import { getRetryButton, type RetryButtonModel } from '../PublicProductsGrid/PublicProductsGrid.data'
import { RetryButtonActive } from '../RetryButtonActive'
import { RetryButtonInactive } from '../RetryButtonInactive'
import { publicProductsGridStyles as STYLES } from '../PublicProductsGrid/PublicProductsGrid.styles'
import type { GridErrorStateProps } from './GridErrorState.types'

const RETRY_BUTTONS: Record<RetryButtonModel['mode'], ComponentType<any>> = {
  active: RetryButtonActive,
  inactive: RetryButtonInactive,
}

export function GridErrorState({ state, retryUrl }: GridErrorStateProps) {
  const button = getRetryButton(retryUrl)
  const RetryButton = RETRY_BUTTONS[button.mode]

  return (
    <section className={STYLES.alertError} role="alert">
      <div>
        <h2 className={STYLES.alertTitle}>{state.title}</h2>
        <p>{state.description}</p>
        <RetryButton button={button} label={state.retryLabel} />
      </div>
    </section>
  )
}
