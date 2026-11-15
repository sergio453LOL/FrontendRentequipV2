/** The backend's password policy (8-64 characters, lower, upper and a digit), checked as the user types. */
export const PASSWORD_RULES = [
  { label: 'length', test: (value: string) => value.length >= 8 && value.length <= 64 },
  { label: 'lower', test: (value: string) => /[a-z]/.test(value) },
  { label: 'upper', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'digit', test: (value: string) => /\d/.test(value) },
] as const

export const meetsPasswordRules = (value: string) => PASSWORD_RULES.every((rule) => rule.test(value))
