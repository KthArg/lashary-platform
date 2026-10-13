import type { User } from '@supabase/supabase-js'

export interface AdminSession {
  user: User
  role: string
  profile?: unknown
}

export interface AdminSidebarProps {
  session: AdminSession
}
