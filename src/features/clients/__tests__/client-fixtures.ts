import type { ClientListItem, ClientRecord } from '@/features/clients'

export const CLIENT_FIXTURES: readonly ClientRecord[] = [
  { id: 'cli-001', fullName: 'María Fernández Rojas', phone: '+50688881234', email: 'maria.fernandez@correo.com', notes: 'Prefiere citas por la tarde.' },
  { id: 'cli-002', fullName: 'Ana Lucía Vargas Mora', phone: '+50670125566', email: 'analucia.vargas@correo.com', notes: '' },
]

export const CLIENT_LIST_FIXTURES: readonly ClientListItem[] = [
  { ...CLIENT_FIXTURES[0], lastVisitAtMs: Date.parse('2026-07-01T05:30:00Z') },
  { ...CLIENT_FIXTURES[1], lastVisitAtMs: null },
]
