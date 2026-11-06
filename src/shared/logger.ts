export type LogDetail = string | number | boolean | null | undefined

export const logError = (scope: string, message: string, detail?: LogDetail): void => {
  const line = `[${scope}] ${message}`
  if (detail === undefined) console.error(line)
  else console.error(line, detail)
}
