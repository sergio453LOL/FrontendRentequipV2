const WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]

/**
 * SUNAT's modulo-11 check digit: catches a mistyped RUC before the form asks SUNAT. Prefixes: 20 legal
 * entity, 10 natural person with a business, 15/16/17 other registrations.
 */
export function isValidRuc(ruc: string): boolean {
  if (!/^(10|15|16|17|20)\d{9}$/.test(ruc)) return false
  const sum = WEIGHTS.reduce((total, weight, index) => total + weight * Number(ruc[index]), 0)
  let check = 11 - (sum % 11)
  if (check === 10) check = 0
  if (check === 11) check = 1
  return check === Number(ruc[10])
}

export type RucType = 'LEGAL_ENTITY' | 'NATURAL_PERSON' | 'OTHER'
