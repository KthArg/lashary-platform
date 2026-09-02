'use client'

// Ver nota en loading.tsx: el texto viene del módulo de mensajes, no del index.ts.
import { catalogMessages } from '@/features/catalog/ui/messages'

const m = catalogMessages.admin.error

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <h1 className="font-serif text-2xl">{catalogMessages.admin.title}</h1>
      <div role="alert" className="rounded-box border border-error/40 p-10 text-center">
        <h2 className="font-serif text-lg">{m.title}</h2>
        <p className="mt-2 text-sm text-base-content/70">{m.body}</p>
        <button type="button" onClick={reset} className="btn btn-outline btn-sm mt-4">
          {m.retry}
        </button>
      </div>
    </main>
  )
}
