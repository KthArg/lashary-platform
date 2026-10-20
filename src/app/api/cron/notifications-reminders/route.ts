import { receiveReminderCronRequest } from '@/features/notifications'

// Disparado por Vercel Cron (vercel.json). La autorización y el ciclo viven en notifications.
export const POST = receiveReminderCronRequest
export const GET = receiveReminderCronRequest
