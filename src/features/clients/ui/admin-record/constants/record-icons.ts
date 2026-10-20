export const RECORD_ICON_PATHS = {
  study: 'M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1z M8 6H6a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-2 M9 12h6 M9 16h4',
  shield: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z',
  shieldAlert: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z M12 8v4 M12 16h.01',
  heartPulse: 'M20.8 8.6a5 5 0 0 0-8.8-3.2 5 5 0 0 0-8.8 3.2c0 5.4 8.8 11.4 8.8 11.4s8.8-6 8.8-11.4z M3.5 12h4l2-3 3 6 2-3h6',
  clipboard: 'M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1z M8 6H6a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-2 M9 11l1.5 1.5L15 9 M9 16h6',
  image: 'M4 5h16v14H4z M4 16l5-5 4 4 2-2 5 5 M15 9.5h.01',
  history: 'M3 12a9 9 0 1 0 3-6.7L3 8 M3 3v5h5 M12 7v5l3 2',
  plus: 'M12 5v14 M5 12h14',
  close: 'M6 6l12 12 M18 6L6 18',
  previous: 'M15 18l-6-6 6-6',
  next: 'M9 18l6-6-6-6',
} as const

export type RecordIconName = keyof typeof RECORD_ICON_PATHS

export const PRECAUTION_CATEGORY_ICONS: Readonly<Record<string, RecordIconName>> = {
  Alergia: 'shieldAlert',
  Sensibilidad: 'heartPulse',
  'Condición relevante': 'clipboard',
}

export const DEFAULT_PRECAUTION_ICON: RecordIconName = 'shield'
