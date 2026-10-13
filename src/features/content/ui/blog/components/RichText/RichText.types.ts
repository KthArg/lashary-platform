import type { RichTextBlock } from '../../../../domain/rich-text'

export interface RichTextProps {
  blocks: readonly RichTextBlock[]
}
