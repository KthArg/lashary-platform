import type { MyAccount } from '@/features/delinquency'

export type AccountStatementViewProps = { account: MyAccount } | { error: string }
