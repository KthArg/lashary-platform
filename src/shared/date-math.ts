export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000)
}

export function addDays(date: Date, days: number): Date {
  return addHours(date, days * 24)
}
