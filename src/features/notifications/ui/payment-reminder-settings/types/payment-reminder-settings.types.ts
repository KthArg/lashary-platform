export type PaymentReminderSettingsScreen = { status: 'ready'; frequencyDays: number } | { status: 'error' }

export type SetFrequencyDaysActionResult = { ok: true; frequencyDays: number } | { ok: false; error: string }
