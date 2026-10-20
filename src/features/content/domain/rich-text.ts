export interface RichTextInline {
  readonly kind: 'text' | 'break'
  readonly text: string
  readonly bold: boolean
  readonly italic: boolean
  readonly href: string | null
}

export interface RichTextListItem {
  readonly blocks: readonly RichTextBlock[]
}

export interface RichTextBlock {
  readonly kind: 'paragraph' | 'heading' | 'quote' | 'bullets' | 'numbers'
  readonly level: 2 | 3 | 4 | null
  readonly inlines: readonly RichTextInline[]
  readonly children: readonly RichTextBlock[]
  readonly items: readonly RichTextListItem[]
}

export const RICH_TEXT_MAX_DEPTH = 6
