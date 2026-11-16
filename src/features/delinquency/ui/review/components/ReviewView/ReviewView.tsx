import { reviewMessages as copy } from '@/features/delinquency/ui/review/constants/review-strings'
import { ReviewBody } from '../ReviewBody'
import { reviewViewStyles as STYLES } from './ReviewView.styles'
import type { ReviewViewProps } from './ReviewView.types'

export function ReviewView({ model }: ReviewViewProps) {
  return (
    <div className={STYLES.main}>
      <header className={STYLES.header}>
        <h1 className={STYLES.title}>{copy.title}</h1>
        <p className={STYLES.subtitle}>{copy.subtitle}</p>
      </header>
      <ReviewBody model={model} />
    </div>
  )
}
