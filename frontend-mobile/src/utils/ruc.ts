const WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]

/** SUNAT's modulo-11 check digit: only a well-formed RUC is looked up. Prefixes 20 (company) and 10 (person). */
export function isValidRuc(ruc: string): boolean {
  if (!/^(10|15|16|17|20)\d{9}$/.test(ruc)) return false
  const sum = WEIGHTS.reduce((total, weight, index) => total + weight * Number(ruc[index]), 0)
  let check = 11 - (sum % 11)
  if (check === 10) check = 0
  if (check === 11) check = 1
  return check === Number(ruc[10])
}

export interface RucInfo {
  ruc: string
  name: string | null
  state: string | null
  condition: string | null
  address: string | null
  district: string | null
  province: string | null
  department: string | null
  type: 'LEGAL_ENTITY' | 'NATURAL_PERSON' | 'OTHER'
}

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

/** The app's city that matches SUNAT's province, department or district. */
export function cityNameFromSunat(info: RucInfo, cityNames: readonly string[]): string | undefined {
  const places = [info.province, info.department, info.district].filter((place): place is string => Boolean(place)).map(normalize)
  return cityNames.find((name) => places.includes(normalize(name)))
}
