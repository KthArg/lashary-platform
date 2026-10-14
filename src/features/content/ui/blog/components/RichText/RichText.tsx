import type { ReactNode } from 'react'
import type { RichTextBlock, RichTextInline } from '../../../../domain/rich-text'
import { blogMessages } from '../../../constants/blog-strings'
import { richTextStyles as STYLES } from './RichText.styles'
import type { RichTextProps } from './RichText.types'

const HEADING_STYLES = { 2: STYLES.heading2, 3: STYLES.heading3, 4: STYLES.heading4 }

const isExternal = (href: string): boolean => /^https?:\/\//i.test(href)

// Cada tramo se pinta como elemento de React: el texto del CMS nunca se interpreta como HTML.
function Inline({ inline }: { inline: RichTextInline }) {
  if (inline.kind === 'break') return <br />

  let content: ReactNode = inline.text
  if (inline.italic) content = <em>{content}</em>
  if (inline.bold) content = <strong>{content}</strong>
  if (inline.href === null) return <>{content}</>

  return isExternal(inline.href) ? (
    <a href={inline.href} target="_blank" rel="noopener noreferrer" className={STYLES.link}>
      {content}
      <span className="sr-only"> {blogMessages.article.newTab}</span>
    </a>
  ) : (
    <a href={inline.href} className={STYLES.link}>
      {content}
    </a>
  )
}

function Inlines({ inlines }: { inlines: readonly RichTextInline[] }) {
  return (
    <>
      {inlines.map((inline, index) => (
        <Inline key={index} inline={inline} />
      ))}
    </>
  )
}

function Block({ block }: { block: RichTextBlock }) {
  switch (block.kind) {
    case 'heading': {
      const level = block.level ?? 2
      const Heading = `h${level}` as 'h2' | 'h3' | 'h4'
      return (
        <Heading className={HEADING_STYLES[level]}>
          <Inlines inlines={block.inlines} />
        </Heading>
      )
    }
    case 'quote':
      return (
        <blockquote className={STYLES.quote}>
          <Blocks blocks={block.children} />
        </blockquote>
      )
    case 'bullets':
    case 'numbers': {
      const List = block.kind === 'bullets' ? 'ul' : 'ol'
      return (
        <List className={block.kind === 'bullets' ? STYLES.bullets : STYLES.numbers}>
          {block.items.map((item, index) => (
            <li key={index} className={STYLES.item}>
              <Blocks blocks={item.blocks} />
            </li>
          ))}
        </List>
      )
    }
    default:
      return (
        <p className={STYLES.paragraph}>
          <Inlines inlines={block.inlines} />
        </p>
      )
  }
}

function Blocks({ blocks }: { blocks: readonly RichTextBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => (
        <Block key={index} block={block} />
      ))}
    </>
  )
}

export function RichText({ blocks }: RichTextProps) {
  return (
    <div className={STYLES.root}>
      <Blocks blocks={blocks} />
    </div>
  )
}
