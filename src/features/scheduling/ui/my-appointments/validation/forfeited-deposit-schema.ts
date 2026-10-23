import { z } from 'zod'

export const forfeitedDepositSchema = z.number().int().min(0)
