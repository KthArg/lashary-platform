const moneyBrand: unique symbol = Symbol('Money')

export interface Money {
  readonly colones: number
  readonly [moneyBrand]: true
}

function buildMoney(colones: number): Money {
  return { colones, [moneyBrand]: true }
}

export function moneyFromColones(value: number): Money {
  if (!Number.isInteger(value)) {
    throw new RangeError(`Money exige un entero de colones (CRC, exponente 0); recibió ${value}`)
  }
  return buildMoney(value)
}

export function zeroMoney(): Money {
  return buildMoney(0)
}

export function addMoney(left: Money, right: Money): Money {
  return buildMoney(left.colones + right.colones)
}

export function subtractMoney(left: Money, right: Money): Money {
  return buildMoney(left.colones - right.colones)
}

export function moneyEquals(left: Money, right: Money): boolean {
  return left.colones === right.colones
}

export function isZeroMoney(money: Money): boolean {
  return money.colones === 0
}

export function isPositiveMoney(money: Money): boolean {
  return money.colones > 0
}

export function isNegativeMoney(money: Money): boolean {
  return money.colones < 0
}

export function formatMoney(money: Money): string {
  return `₡${money.colones.toLocaleString('es-CR')}`
}
