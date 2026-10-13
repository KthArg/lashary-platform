// El número de página que pide la dirección. Lo que no sea un entero positivo es la primera;
// si pide una que no existe, `getBlogPage` la lleva a la más cercana.
export function requestedPage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value
  return raw !== undefined && /^[1-9]\d{0,5}$/.test(raw) ? Number(raw) : 1
}
