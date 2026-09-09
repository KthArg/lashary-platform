// DEUDA (EST-006): datos quemados. US-CLI-05 criterio 2 necesita clientas existentes para editar, pero la migracion (columna de notas, RLS de administradora) todavia no existe, asi que no hay
// nada que leer de la base. Este archivo se borra completo cuando el server action lea de public.clients_profiles; mientras tanto la pantalla no prueba el acceso a datos, solo la edicion.

import type { ClientRecord } from '../types/client.types'

export const SAMPLE_CLIENTS: readonly ClientRecord[] = [
  { id: 'cli-001', fullName: 'María Fernández Rojas', phone: '+506 8888 1234', email: 'maria.fernandez@correo.com', notes: 'Prefiere citas por la tarde. Llegó por Instagram.' },
  { id: 'cli-002', fullName: 'Ana Lucía Vargas Mora', phone: '+506 7012 5566', email: 'analucia.vargas@correo.com', notes: 'Alérgica al adhesivo con formaldehído.' },
  { id: 'cli-003', fullName: 'Gabriela Solano Ureña', phone: '+506 6244 9080', email: 'gabriela.solano@correo.com', notes: '' },
  { id: 'cli-004', fullName: 'Karla Jiménez Castro', phone: '+506 8391 4477', email: 'karla.jimenez@correo.com', notes: 'Referida por María Fernández.' },
] as const
