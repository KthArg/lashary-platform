// Money — value object de dinero (DOM-001 / ADR-0004).
// Todo monto es un entero de colones (CRC, exponente 0). El float es irrepresentable aquí:
// el bug de "centavos perdidos" no puede ocurrir. Sin reglas de negocio (ARCH-007) — los
// límites "precio > 0" o "anticipo >= 0" viven en las entidades de dominio, no acá.

export class Money {
  private constructor(public readonly colones: number) {}

  static fromColones(value: number): Money {
    if (!Number.isInteger(value)) {
      throw new RangeError(
        `Money exige un entero de colones (CRC, exponente 0); recibió ${value}`,
      )
    }
    return new Money(value)
  }

  static zero(): Money {
    return new Money(0)
  }

  plus(other: Money): Money {
    return new Money(this.colones + other.colones)
  }

  minus(other: Money): Money {
    return new Money(this.colones - other.colones)
  }

  equals(other: Money): boolean {
    return this.colones === other.colones
  }

  isZero(): boolean {
    return this.colones === 0
  }

  isPositive(): boolean {
    return this.colones > 0
  }

  isNegative(): boolean {
    return this.colones < 0
  }

  toString(): string {
    return `₡${this.colones.toLocaleString('es-CR')}`
  }
}

export function moneyFromColones(value: number): Money {
  return Money.fromColones(value)
}

export function zeroMoney(): Money {
  return Money.zero()
}

export function addMoney(left: Money, right: Money): Money {
  return left.plus(right)
}

export function subtractMoney(left: Money, right: Money): Money {
  return left.minus(right)
}

export function moneyEquals(left: Money, right: Money): boolean {
  return left.equals(right)
}

export function isZeroMoney(money: Money): boolean {
  return money.isZero()
}

export function isPositiveMoney(money: Money): boolean {
  return money.isPositive()
}

export function isNegativeMoney(money: Money): boolean {
  return money.isNegative()
}

export function formatMoney(money: Money): string {
  return money.toString()
}
