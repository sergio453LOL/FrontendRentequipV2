import i18n from '.'

/**
 * Form messages are i18n keys when they come from our Zod schemas ("validation.emailRequired") and plain
 * text when they come from the backend: translate the former, show the latter as they are.
 */
export function translateMessage(message: string | undefined): string | undefined {
  if (!message || !i18n.exists(message)) return message
  return i18n.t(message as never)
}
