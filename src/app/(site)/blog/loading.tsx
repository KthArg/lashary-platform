import { blogMessages } from '@/features/content/client'
import { blogRouteStyles as s } from './blog.styles'

export default function Loading() {
  return (
    <main role="status" aria-live="polite" className={s.loadingBox}>
      {blogMessages.loading}
    </main>
  )
}
