// El cuerpo de una publicación, ya validado contra los nodos y marcas que admite el contrato
// (docs/contracts/cms-api.md § Formas de valor, `s.richtext`). Son datos planos: nada de aquí
// es HTML, y quien lo pinta lo hace elemento por elemento.

// Un tramo de texto con sus marcas, o un salto de línea dentro del mismo párrafo.
export interface RichTextInline {
  readonly kind: 'text' | 'break'
  readonly text: string
  readonly bold: boolean
  readonly italic: boolean
  // Destino ya comprobado; `null` cuando el tramo no es un enlace.
  readonly href: string | null
}

export interface RichTextListItem {
  readonly blocks: readonly RichTextBlock[]
}

// Un bloque usa solo la parte que le toca: `inlines` los párrafos y encabezados, `children`
// la cita, `items` las listas. Las demás quedan vacías.
export interface RichTextBlock {
  readonly kind: 'paragraph' | 'heading' | 'quote' | 'bullets' | 'numbers'
  // Solo en `heading`. El nivel 1 es de la página, no del contenido.
  readonly level: 2 | 3 | 4 | null
  readonly inlines: readonly RichTextInline[]
  readonly children: readonly RichTextBlock[]
  readonly items: readonly RichTextListItem[]
}

// Cuánto se puede anidar una lista o una cita antes de descartar lo que sigue.
export const RICH_TEXT_MAX_DEPTH = 6
