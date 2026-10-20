import { createHmac, timingSafeEqual } from 'node:crypto'
import { revalidateTag } from 'next/cache'
import { landingCacheTags } from './landing-source'
import { techniqueMediaCacheTag } from './technique-media-source'
import { galleryCacheTag } from './gallery-source'
import { studioCacheTags } from './studio-source'
import { loyaltyCacheTags } from './loyalty-source'
import { contactCacheTags } from './contact-source'
import { blogCacheTag } from './blog-source'

export const WEBHOOK_WINDOW_MS = 5 * 60 * 1000
const MIN_SECRET_LENGTH = 32

export type WebhookInput = {
  rawBody: string
  timestamp: string | null
  signature: string | null
  secret: string | undefined
  now: number
}

export type WebhookOutcome =
  | { status: 200; tags: string[] }
  | { status: 400 | 401 | 503; reason: string }

function signatureMatches(secret: string, timestamp: string, rawBody: string, header: string) {
  const match = /^sha256=([0-9a-f]{64})$/i.exec(header)
  if (!match) return false
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest()
  return timingSafeEqual(expected, Buffer.from(match[1], 'hex'))
}

const knownTags: readonly string[] = [
  ...landingCacheTags,
  techniqueMediaCacheTag,
  galleryCacheTag,
  ...studioCacheTags,
  ...loyaltyCacheTags,
  ...contactCacheTags,
  blogCacheTag,
]

export function evaluateCmsWebhook({ rawBody, timestamp, signature, secret, now }: WebhookInput): WebhookOutcome {
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    return { status: 503, reason: 'aviso sin configurar' }
  }
  if (!timestamp || !/^\d{1,16}$/.test(timestamp) || !signature) {
    return { status: 401, reason: 'firma ausente' }
  }
  if (!signatureMatches(secret, timestamp, rawBody, signature)) {
    return { status: 401, reason: 'firma inválida' }
  }
  if (Math.abs(now - Number(timestamp)) > WEBHOOK_WINDOW_MS) {
    return { status: 401, reason: 'aviso fuera de la ventana' }
  }

  let body: unknown
  try {
    body = JSON.parse(rawBody)
  } catch {
    return { status: 400, reason: 'JSON inválido' }
  }
  const tags = typeof body === 'object' && body !== null ? (body as { tags?: unknown }).tags : undefined
  const known = Array.isArray(tags)
    ? [...new Set(tags.filter((tag): tag is string => typeof tag === 'string' && knownTags.includes(tag)))]
    : []
  return { status: 200, tags: known }
}

export async function receiveCmsWebhook(request: Request): Promise<Response> {
  const outcome = evaluateCmsWebhook({
    rawBody: await request.text(),
    timestamp: request.headers.get('x-unocms-ts'),
    signature: request.headers.get('x-unocms-firma'),
    secret: process.env.CMS_WEBHOOK_SECRET,
    now: Date.now(),
  })

  if (outcome.status !== 200) {
    console.warn(`[content] aviso del CMS rechazado: ${outcome.reason}`)
    return Response.json({ error: outcome.reason }, { status: outcome.status })
  }
  for (const tag of outcome.tags) revalidateTag(tag, { expire: 0 })
  return Response.json({ revalidated: outcome.tags })
}
