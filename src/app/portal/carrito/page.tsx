import { AUTH_LABELS } from '@/features/auth'

export const metadata = { title: `${AUTH_LABELS.clientCartTitle} | ${AUTH_LABELS.clientPortalTitle} LASHARY` }

export default function ClientCarritoPage() {
  return (
    <div className="space-y-4">
      <div className="border-b border-brand-border pb-4">
        <h1 className="font-serif text-2xl md:text-3xl font-bold text-brand-dark">{AUTH_LABELS.clientCartTitle}</h1>
        <p className="text-sm text-brand-muted mt-1">{AUTH_LABELS.clientCartSubtitle}</p>
      </div>
      <div className="rounded-xl border border-brand-border bg-brand-surface p-6 shadow-sm">
        <p className="text-sm text-brand-muted">{AUTH_LABELS.clientCartPlaceholder}</p>
      </div>
    </div>
  )
}
