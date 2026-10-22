export interface ReleaseBlockFormProps {
  id: string
  // Nombre accesible del botón: dice de qué bloqueo se libera el final.
  label: string
  endsAtIso: string
  releaseEnds: string[]
}
