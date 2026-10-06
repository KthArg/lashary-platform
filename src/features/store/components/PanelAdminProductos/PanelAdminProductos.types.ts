export type PanelAdminProductosSearchParams = { edit?: string; new?: string }

export type PanelAdminProductosProps = {
  searchParams?: Promise<PanelAdminProductosSearchParams>
}
