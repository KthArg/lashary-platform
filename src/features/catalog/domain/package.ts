import { Money } from '@/shared/money'
import { ok, err, type Result } from '@/shared/result'
import { PackageValidationError } from './errors'

// Vista pública de un paquete (contrato: docs/contracts/catalog-api.md). Monto en colones
// enteros para no arrastrar Money a través de la frontera de la feature. La duración total no
// vive acá: se calcula uniendo las técnicas miembro (application/db), no se congela en el
// paquete — el paquete es composición viva del catálogo, no un histórico (a diferencia de
// TechniqueSnapshot, DOM-002 aplica recién cuando US-AGE-04 confirme una cita con paquete).
export type PackageView = {
  id: string
  name: string
  techniqueIds: string[]
  price: number
  isActive: boolean
}

export type PackageInput = {
  id: string
  name: string
  techniqueIds: string[]
  price: Money
  isActive?: boolean
}

type PackageProps = {
  id: string
  name: string
  techniqueIds: string[]
  price: Money
  isActive: boolean
}

export class Package {
  private constructor(private readonly props: PackageProps) {}

  // Constructor validado (DOM-007): un paquete inválido no puede existir. La validación de
  // formato del borde (Zod) ocurre antes; acá viven los invariantes de negocio, incluido el
  // criterio 1 (mínimo dos técnicas existentes, sin duplicados).
  static create(input: PackageInput): Result<Package, PackageValidationError> {
    const problems: string[] = []

    const name = input.name.trim()
    if (name.length === 0) problems.push('el nombre no puede estar vacío')

    const uniqueTechniqueIds = Array.from(new Set(input.techniqueIds))
    if (uniqueTechniqueIds.length !== input.techniqueIds.length) {
      problems.push('la lista de técnicas no puede repetir la misma técnica')
    }
    if (uniqueTechniqueIds.length < 2) {
      problems.push('un paquete necesita al menos dos técnicas')
    }

    if (!input.price.isPositive()) {
      problems.push('el precio del paquete debe ser mayor que cero')
    }

    if (problems.length > 0) {
      return err(new PackageValidationError(problems))
    }

    return ok(
      new Package({
        id: input.id,
        name,
        techniqueIds: uniqueTechniqueIds,
        price: input.price,
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
  get techniqueIds(): string[] {
    return this.props.techniqueIds
  }
  get price(): Money {
    return this.props.price
  }
  get isActive(): boolean {
    return this.props.isActive
  }

  deactivate(): Package {
    return new Package({ ...this.props, isActive: false })
  }

  toView(): PackageView {
    return {
      id: this.props.id,
      name: this.props.name,
      techniqueIds: this.props.techniqueIds,
      price: this.props.price.colones,
      isActive: this.props.isActive,
    }
  }
}
