const ACCENT_MARKS = /[̀-ͯ]/g
const NON_SLUG_CHARACTERS = /[^a-z0-9]+/g
const EDGE_HYPHENS = /^-+|-+$/g

export function slugFromName(name: string): string {
  return name
    .normalize('NFD')
    .replace(ACCENT_MARKS, '')
    .toLowerCase()
    .replace(NON_SLUG_CHARACTERS, '-')
    .replace(EDGE_HYPHENS, '')
}

export function firstAvailableSlug(baseSlug: string, takenSlugs: readonly string[]): string {
  const taken = new Set(takenSlugs)
  let suffix = 1
  let candidate = baseSlug
  while (taken.has(candidate)) {
    suffix += 1
    candidate = `${baseSlug}-${suffix}`
  }
  return candidate
}
