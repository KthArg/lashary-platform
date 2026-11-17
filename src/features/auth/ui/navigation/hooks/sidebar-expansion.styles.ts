import type { SidebarMode } from './useSidebarExpansion'

// Clases por modo de la barra lateral. En «auto» deciden los breakpoints (cerrada en teléfono, abierta desde md);
// escritas completas para que Tailwind las genere.
export const sidebarExpansionStyles: Readonly<Record<'width' | 'inline' | 'block' | 'whenExpanded' | 'whenCollapsed', Record<SidebarMode, string>>> = {
  width: { auto: 'w-20 md:w-64', expanded: 'w-64', collapsed: 'w-20' },
  inline: { auto: 'hidden md:inline', expanded: '', collapsed: 'hidden' },
  block: { auto: 'hidden md:block', expanded: '', collapsed: 'hidden' },
  // El ícono del botón: «cerrar» cuando está abierta y «abrir» cuando está cerrada.
  whenExpanded: { auto: 'hidden md:inline', expanded: '', collapsed: 'hidden' },
  whenCollapsed: { auto: 'md:hidden', expanded: 'hidden', collapsed: '' },
}
