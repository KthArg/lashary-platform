import type { ClientRecord } from '@/features/clients'

/**
 * Clientas de prueba. Reemplazan a SAMPLE_CLIENTS, que era dato quemado de produccion: vivian en
 * constants/ y la pantalla los renderizaba. Estos existen solo dentro de __tests__ y nadie los
 * importa desde src/app ni desde un componente.
 */
export const TEST_CLIENTS: readonly ClientRecord[] = [
  { id: 'cli-001', fullName: 'María Fernández Rojas', phone: '+506 8888 1234', email: 'maria.fernandez@correo.com', notes: 'Prefiere citas por la tarde.' },
  { id: 'cli-002', fullName: 'Ana Lucía Vargas Mora', phone: '+506 7012 5566', email: 'analucia.vargas@correo.com', notes: 'Alérgica al adhesivo con formaldehído.' },
  { id: 'cli-003', fullName: 'Gabriela Solano Ureña', phone: '+506 6244 9080', email: 'gabriela.solano@correo.com', notes: '' },
  { id: 'cli-004', fullName: 'Karla Jiménez Castro', phone: '+506 8391 4477', email: 'karla.jimenez@correo.com', notes: 'Referida por María Fernández.' },
] as const
