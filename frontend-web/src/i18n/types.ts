import type { es } from './es'

/** Same shape as the Spanish copy, with any text in each leaf: every other language must fill in every key. */
type Shape<T> = T extends string ? string : T extends readonly string[] ? string[] : { [K in keyof T]: Shape<T[K]> }

export type Translations = Shape<typeof es>
