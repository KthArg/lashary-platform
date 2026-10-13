import { describe, it, expect } from 'vitest'
import { RICH_TEXT_MAX_DEPTH } from '../../domain/rich-text'
import { toRichText } from '../rich-text'

const text = (value: string, marks?: unknown[]) => ({ type: 'text', text: value, ...(marks ? { marks } : {}) })
const paragraph = (...content: unknown[]) => ({ type: 'paragraph', content })
const doc = (...content: unknown[]) => ({ type: 'doc', content })

const plain = (value: string) => ({ kind: 'text', text: value, bold: false, italic: false, href: null })
const block = (overrides: Record<string, unknown>) => ({
  level: null,
  inlines: [],
  children: [],
  items: [],
  ...overrides,
})

describe('toRichText — el cuerpo de una publicación contra el contrato', () => {
  it('un párrafo de texto', () => {
    expect(toRichText(doc(paragraph(text('Hola'))))).toEqual([
      block({ kind: 'paragraph', inlines: [plain('Hola')] }),
    ])
  })

  it('negrita, cursiva y un salto de línea dentro del párrafo', () => {
    const [first] = toRichText(
      doc(
        paragraph(
          text('fuerte', [{ type: 'bold' }]),
          { type: 'hardBreak' },
          text('las dos', [{ type: 'bold' }, { type: 'italic' }]),
        ),
      ),
    )
    expect(first.inlines).toEqual([
      { ...plain('fuerte'), bold: true },
      { kind: 'break', text: '', bold: false, italic: false, href: null },
      { ...plain('las dos'), bold: true, italic: true },
    ])
  })

  it('encabezados de nivel 2 a 4; cualquier otro nivel pasa a 2', () => {
    const heading = (level: unknown) => ({ type: 'heading', attrs: { level }, content: [text('Título')] })
    const levels = toRichText(doc(heading(2), heading(3), heading(4), heading(1), heading(6), heading('3')))
    expect(levels.map((item) => [item.kind, item.level])).toEqual([
      ['heading', 2],
      ['heading', 3],
      ['heading', 4],
      ['heading', 2],
      ['heading', 2],
      ['heading', 2],
    ])
  })

  it('listas con viñetas y numeradas, con sus elementos', () => {
    const item = (value: string) => ({ type: 'listItem', content: [paragraph(text(value))] })
    const [bullets, numbers] = toRichText(
      doc(
        { type: 'bulletList', content: [item('uno'), item('dos')] },
        { type: 'orderedList', content: [item('primero')] },
      ),
    )
    expect(bullets.kind).toBe('bullets')
    expect(bullets.items.map((entry) => entry.blocks[0].inlines[0].text)).toEqual(['uno', 'dos'])
    expect(numbers.kind).toBe('numbers')
    expect(numbers.items).toHaveLength(1)
  })

  it('una cita con sus párrafos', () => {
    const [quote] = toRichText(doc({ type: 'blockquote', content: [paragraph(text('Citado'))] }))
    expect(quote.kind).toBe('quote')
    expect(quote.children).toEqual([block({ kind: 'paragraph', inlines: [plain('Citado')] })])
  })

  it('un enlace entra solo con un destino que el contrato acepta', () => {
    const linked = (href: unknown) => text('enlace', [{ type: 'link', attrs: { href } }])
    const [first] = toRichText(
      doc(
        paragraph(
          linked('https://lashary.test/cuidados'),
          linked('/blog'),
          linked('mailto:hola@lashary.test'),
          linked('javascript:alert(1)'),
          linked('data:text/html,<script>alert(1)</script>'),
          linked('//otro.test'),
          linked(7),
        ),
      ),
    )
    expect(first.inlines.map((inline) => inline.href)).toEqual([
      'https://lashary.test/cuidados',
      '/blog',
      'mailto:hola@lashary.test',
      null,
      null,
      null,
      null,
    ])
    // El texto del enlace rechazado no se pierde.
    expect(first.inlines.every((inline) => inline.text === 'enlace')).toBe(true)
  })

  it('un nodo que el contrato no admite se descarta con su contenido', () => {
    const blocks = toRichText(
      doc(
        { type: 'image', attrs: { src: 'https://cdn.test/a.jpg' } },
        { type: 'codeBlock', content: [text('<script>alert(1)</script>')] },
        { type: 'table', content: [paragraph(text('dentro de la tabla'))] },
        paragraph(text('lo que queda')),
      ),
    )
    expect(blocks).toEqual([block({ kind: 'paragraph', inlines: [plain('lo que queda')] })])
  })

  it('una marca desconocida se ignora y el texto se conserva', () => {
    const [first] = toRichText(doc(paragraph(text('subrayado', [{ type: 'underline' }, { type: 'bold' }]))))
    expect(first.inlines).toEqual([{ ...plain('subrayado'), bold: true }])
  })

  it('párrafos, listas y citas vacíos no dejan bloques', () => {
    expect(
      toRichText(
        doc(
          paragraph(),
          paragraph(text('')),
          { type: 'bulletList', content: [{ type: 'listItem', content: [] }] },
          { type: 'blockquote', content: [] },
          { type: 'heading', attrs: { level: 2 } },
        ),
      ),
    ).toEqual([])
  })

  it('lo que no es un documento es un cuerpo vacío', () => {
    for (const value of [null, undefined, 'texto', 7, [], {}, { type: 'paragraph' }, { type: 'doc' }]) {
      expect(toRichText(value)).toEqual([])
    }
  })

  it('una cita anidada más allá del límite se corta en vez de reventar', () => {
    let nested: unknown = paragraph(text('fondo'))
    for (let i = 0; i < RICH_TEXT_MAX_DEPTH + 20; i += 1) nested = { type: 'blockquote', content: [nested] }

    expect(() => toRichText(doc(nested))).not.toThrow()
    expect(JSON.stringify(toRichText(doc(nested)))).not.toContain('fondo')
  })
})
