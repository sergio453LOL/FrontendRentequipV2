import type { QuoteData } from '../components/quotes/QuotePDF'
import { quoteCode } from './quoteCode'

/**
 * Builds the quotation PDF in the browser and starts the download. The PDF library is large, so it is only
 * loaded the first time somebody asks for a quotation.
 */
export async function downloadQuote(data: Omit<QuoteData, 'photo'>): Promise<void> {
  const { createQuoteBlob } = await import('../components/quotes/renderQuote')
  const blob = await createQuoteBlob(data)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `cotizacion-${quoteCode(data.equipment.id, data.issuedAt)}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
}
