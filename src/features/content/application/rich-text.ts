import {
  RICH_TEXT_MAX_DEPTH,
  type RichTextBlock,
  type RichTextInline,
  type RichTextListItem,
} from '../domain/rich-text'
import { field, link } from './cms-values'

// Lectura del richtext de uno-cms (un documento de ProseMirror) contra el contrato. Nunca
// lanza, y lo que devuelve solo contiene lo que el contrato admite: lo demás se descarta aquí,
// así que nada fuera de `content` ve un nodo que no esperaba (SEC-009).

const EMPTY: Pick<RichTextBlock, 'level' | 'inlines' | 'children' | 'items'> = {
  level: null,
  inlines: [],
  children: [],
  items: [],
}

const childrenOf = (node: unknown): unknown[] => {
  const content = field(node, 'content')
  return Array.isArray(content) ? content : []
}

function toInline(node: unknown): RichTextInline | null {
  const kind = field(node, 'type')
  if (kind === 'hardBreak') {
    return { kind: 'break', text: '', bold: false, italic: false, href: null }
  }
  if (kind !== 'text') return null

  const text = field(node, 'text')
  if (typeof text !== 'string' || text === '') return null

  const marks = field(node, 'marks')
  let bold = false
  let italic = false
  let href: string | null = null
  for (const mark of Array.isArray(marks) ? marks : []) {
    const markKind = field(mark, 'type')
    if (markKind === 'bold') bold = true
    else if (markKind === 'italic') italic = true
    // Un destino que `s.link` no aceptaría deja el texto sin enlace.
    else if (markKind === 'link') href = link(field(field(mark, 'attrs'), 'href'))
  }
  return { kind: 'text', text, bold, italic, href }
}

function toInlines(node: unknown): RichTextInline[] {
  return childrenOf(node)
    .map(toInline)
    .filter((inline): inline is RichTextInline => inline !== null)
}

function toListItems(node: unknown, depth: number): RichTextListItem[] {
  return childrenOf(node)
    .filter((child) => field(child, 'type') === 'listItem')
    .map((child) => ({ blocks: toBlocks(childrenOf(child), depth + 1) }))
    .filter((item) => item.blocks.length > 0)
}

function toBlock(node: unknown, depth: number): RichTextBlock | null {
  switch (field(node, 'type')) {
    case 'paragraph': {
      const inlines = toInlines(node)
      return inlines.length > 0 ? { ...EMPTY, kind: 'paragraph', inlines } : null
    }
    case 'heading': {
      const inlines = toInlines(node)
      if (inlines.length === 0) return null
      const level = field(field(node, 'attrs'), 'level')
      return { ...EMPTY, kind: 'heading', level: level === 3 || level === 4 ? level : 2, inlines }
    }
    case 'blockquote': {
      const children = toBlocks(childrenOf(node), depth + 1)
      return children.length > 0 ? { ...EMPTY, kind: 'quote', children } : null
    }
    case 'bulletList':
    case 'orderedList': {
      const items = toListItems(node, depth)
      if (items.length === 0) return null
      return { ...EMPTY, kind: field(node, 'type') === 'bulletList' ? 'bullets' : 'numbers', items }
    }
    default:
      return null
  }
}

function toBlocks(nodes: unknown[], depth: number): RichTextBlock[] {
  if (depth > RICH_TEXT_MAX_DEPTH) return []
  return nodes
    .map((node) => toBlock(node, depth))
    .filter((block): block is RichTextBlock => block !== null)
}

// Los bloques que se pueden pintar de un valor `s.richtext`. Lo que no es un documento, o un
// documento sin nada admitido, es una lista vacía.
export function toRichText(value: unknown): RichTextBlock[] {
  if (field(value, 'type') !== 'doc') return []
  return toBlocks(childrenOf(value), 0)
}
