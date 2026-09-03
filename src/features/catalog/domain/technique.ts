import { Money } from '@/shared/money'
import { ok, err, type Result } from '@/shared/result'
import { TechniqueValidationError } from './errors'

// Familias de servicio del estudio (criterio 2 de US-AGE-08). Coincide con el enum
// public.catalog_service_family. Enum plano: el volumen de pestañas va dentro del valor (D1).
export const SERVICE_FAMILIES = [
  'lash_classic',
  'lash_volume',
  'lash_extra_volume',
  'brow_design',
  'brow_lamination',
  'henna',
  'waxing',
  'lips',
] as const

export type ServiceFamily = (typeof SERVICE_FAMILIES)[number]

// Vista pública de una técnica (contrato: docs/contracts/catalog-api.md). Montos en colones
// enteros para no arrastrar el value object Money a través de la frontera de la feature.
export type TechniqueView = {
  id: string
  name: string
  family: ServiceFamily
  priceFirstTime: number
  priceRetouch: number | null
  durationFirstTimeMin: number
  durationRetouchMin: number | null
  bufferMin: number
  reapplicationIntervalDays: number | null
  deposit: number
  aftercareText: string
  isActive: boolean
}

// Lo que la cita copia al confirmarse (DOM-002). Subconjunto estable de la técnica.
export type TechniqueSnapshot = {
  techniqueId: string
  name: string
  family: ServiceFamily
  priceFirstTime: number
  priceRetouch: number | null
  durationFirstTimeMin: number
  durationRetouchMin: number | null
  bufferMin: number
  deposit: number
}

export type TechniqueInput = {
  id: string
  name: string
  family: ServiceFamily
  priceFirstTime: Money
  priceRetouch?: Money | null
  durationFirstTimeMin: number
  durationRetouchMin?: number | null
  bufferMin: number
  reapplicationIntervalDays?: number | null
  deposit: Money
  aftercareText: string
  isActive?: boolean
}

type TechniqueProps = {
  id: string
  name: string
  family: ServiceFamily
  priceFirstTime: Money
  priceRetouch: Money | null
  durationFirstTimeMin: number
  durationRetouchMin: number | null
  bufferMin: number
  reapplicationIntervalDays: number | null
  deposit: Money
  aftercareText: string
  isActive: boolean
}

const isPositiveInt = (n: number): boolean => Number.isInteger(n) && n > 0
const isNonNegativeInt = (n: number): boolean => Number.isInteger(n) && n >= 0

export class Technique {
  private constructor(private readonly props: TechniqueProps) {}

  // Constructor validado (DOM-007): una técnica inválida no puede existir. La validación de
  // formato del borde (Zod) ocurre antes; acá viven los invariantes de negocio.
  static create(
    input: TechniqueInput,
  ): Result<Technique, TechniqueValidationError> {
    const problems: string[] = []

    const name = input.name.trim()
    if (name.length === 0) problems.push('el nombre no puede estar vacío')

    if (!SERVICE_FAMILIES.includes(input.family)) {
      problems.push(`familia inválida: ${String(input.family)}`)
    }

    if (!input.priceFirstTime.isPositive()) {
      problems.push('el precio de primera vez debe ser mayor que cero')
    }

    const priceRetouch = input.priceRetouch ?? null
    if (priceRetouch !== null && !priceRetouch.isPositive()) {
      problems.push('el precio de retoque debe ser mayor que cero')
    }

    if (!isPositiveInt(input.durationFirstTimeMin)) {
      problems.push('la duración de primera vez debe ser un entero de minutos mayor que cero')
    }

    const durationRetouchMin = input.durationRetouchMin ?? null
    if (durationRetouchMin !== null && !isPositiveInt(durationRetouchMin)) {
      problems.push('la duración de retoque debe ser un entero de minutos mayor que cero')
    }

    if (!isNonNegativeInt(input.bufferMin)) {
      problems.push('el tiempo de preparación y limpieza debe ser un entero de minutos no negativo')
    }

    const reapplicationIntervalDays = input.reapplicationIntervalDays ?? null
    if (reapplicationIntervalDays !== null && !isPositiveInt(reapplicationIntervalDays)) {
      problems.push('el intervalo de re-aplicación debe ser un entero de días mayor que cero')
    }

    if (input.deposit.isNegative()) {
      problems.push('el anticipo no puede ser negativo')
    }

    const aftercareText = input.aftercareText.trim()
    if (aftercareText.length === 0) {
      problems.push('el texto de cuidados posteriores no puede estar vacío')
    }

    // D10 — el retoque va con precio y duración, o ninguno de los dos.
    if ((priceRetouch === null) !== (durationRetouchMin === null)) {
      problems.push('el retoque requiere precio y duración, o ninguno de los dos')
    }

    if (problems.length > 0) {
      return err(new TechniqueValidationError(problems))
    }

    return ok(
      new Technique({
        id: input.id,
        name,
        family: input.family,
        priceFirstTime: input.priceFirstTime,
        priceRetouch,
        durationFirstTimeMin: input.durationFirstTimeMin,
        durationRetouchMin,
        bufferMin: input.bufferMin,
        reapplicationIntervalDays,
        deposit: input.deposit,
        aftercareText,
        isActive: input.isActive ?? true,
      }),
    )
  }

  get id(): string {
    return this.props.id
  }
  get name(): string {
    return this.props.name
  }
  get family(): ServiceFamily {
    return this.props.family
  }
  get priceFirstTime(): Money {
    return this.props.priceFirstTime
  }
  get priceRetouch(): Money | null {
    return this.props.priceRetouch
  }
  get durationFirstTimeMin(): number {
    return this.props.durationFirstTimeMin
  }
  get durationRetouchMin(): number | null {
    return this.props.durationRetouchMin
  }
  get bufferMin(): number {
    return this.props.bufferMin
  }
  get reapplicationIntervalDays(): number | null {
    return this.props.reapplicationIntervalDays
  }
  get deposit(): Money {
    return this.props.deposit
  }
  get aftercareText(): string {
    return this.props.aftercareText
  }
  get isActive(): boolean {
    return this.props.isActive
  }

  get offersRetouch(): boolean {
    return this.props.priceRetouch !== null
  }

  deactivate(): Technique {
    return new Technique({ ...this.props, isActive: false })
  }

  toView(): TechniqueView {
    return {
      id: this.props.id,
      name: this.props.name,
      family: this.props.family,
      priceFirstTime: this.props.priceFirstTime.colones,
      priceRetouch: this.props.priceRetouch?.colones ?? null,
      durationFirstTimeMin: this.props.durationFirstTimeMin,
      durationRetouchMin: this.props.durationRetouchMin,
      bufferMin: this.props.bufferMin,
      reapplicationIntervalDays: this.props.reapplicationIntervalDays,
      deposit: this.props.deposit.colones,
      aftercareText: this.props.aftercareText,
      isActive: this.props.isActive,
    }
  }

  snapshot(): TechniqueSnapshot {
    return {
      techniqueId: this.props.id,
      name: this.props.name,
      family: this.props.family,
      priceFirstTime: this.props.priceFirstTime.colones,
      priceRetouch: this.props.priceRetouch?.colones ?? null,
      durationFirstTimeMin: this.props.durationFirstTimeMin,
      durationRetouchMin: this.props.durationRetouchMin,
      bufferMin: this.props.bufferMin,
      deposit: this.props.deposit.colones,
    }
  }
}
