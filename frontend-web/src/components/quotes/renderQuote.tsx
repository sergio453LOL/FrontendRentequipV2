import { pdf } from '@react-pdf/renderer'
import { QuoteDocument, type QuoteData } from './QuotePDF'

/** The photo travels inside the PDF as a data URL; a photo that cannot be fetched is left out, not fatal. */
async function toDataUrl(url: string | undefined): Promise<string | null> {
  if (!url) return null
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const blob = await response.blob()
    if (!/^image\/(jpeg|png)$/.test(blob.type)) return null
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export async function createQuoteBlob(data: Omit<QuoteData, 'photo'>): Promise<Blob> {
  const photo = await toDataUrl(data.equipment.imageUrls[0])
  return pdf(<QuoteDocument {...data} photo={photo} />).toBlob()
}
