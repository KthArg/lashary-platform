export type ReapplicationSettingsScreen = { status: 'ready'; anticipationDays: number } | { status: 'error' }

export type SetAnticipationDaysActionResult = { ok: true; anticipationDays: number } | { ok: false; error: string }
