import type { User } from '@supabase/supabase-js'

export interface ClientSession {
  user: User
  role: string
  profile?: {
    full_name?: string | null
    phone?: string | null
    [key: string]: unknown
  } | null
}

export interface ClientSidebarProps {
  session: ClientSession
}
