/** "COT-000013-20261122": the machine and the day, so a quotation can be told apart when it comes back. */
export function quoteCode(equipmentId: number, issuedAt: Date) {
  const stamp = `${issuedAt.getFullYear()}${String(issuedAt.getMonth() + 1).padStart(2, '0')}${String(issuedAt.getDate()).padStart(2, '0')}`
  return `COT-${String(equipmentId).padStart(6, '0')}-${stamp}`
}
