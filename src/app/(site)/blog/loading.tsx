import { blogMessages } from '@/features/content/client'
import { blogRouteStyles as STYLES } from './blog.styles'

export default function Loading() {
  return (
    <main role="status" aria-live="polite" className={STYLES.loadingBox}>
      {blogMessages.loading}
    </main>
  )
}
