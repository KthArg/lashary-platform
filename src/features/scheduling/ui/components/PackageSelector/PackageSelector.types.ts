export interface PackageSelectorOption {
  readonly id: string
  readonly name: string
  readonly durationTotalMin: number
}

export interface PackageSelectorProps {
  readonly packages: PackageSelectorOption[]
}
