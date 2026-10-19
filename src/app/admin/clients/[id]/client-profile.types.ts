import type { ReactNode } from 'react'

export interface ClientProfileLayoutProps {
  children: ReactNode
  params: Promise<{ id: string }>
}

export interface ClientProfileTab {
  label: string
  href: string
}

export interface ClientProfileTabsProps {
  label: string
  tabs: readonly ClientProfileTab[]
}
