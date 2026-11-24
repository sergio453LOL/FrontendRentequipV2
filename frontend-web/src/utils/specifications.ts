export interface Specification {
  label: string
  value: string
}

/** The backend stores specifications as free text; lines written as "Key: value" become table rows. */
export function parseSpecifications(text: string): { rows: Specification[]; notes: string[] } {
  const rows: Specification[] = []
  const notes: string[] = []
  for (const line of text.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)) {
    const separator = line.indexOf(':')
    if (separator > 0 && separator < line.length - 1) {
      rows.push({ label: line.slice(0, separator).trim(), value: line.slice(separator + 1).trim() })
    } else {
      notes.push(line)
    }
  }
  return { rows, notes }
}
