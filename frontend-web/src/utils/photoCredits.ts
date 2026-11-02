import i18n from '../i18n'

/**
 * Authors of the demo catalogue photos (Wikimedia Commons). CC BY and CC BY-SA require crediting them
 * wherever the photo is shown. Same list as backend demo-images/CREDITS.md.
 */
const DEMO_PHOTO_CREDITS: Record<string, { author: string; license: string }> = {
  'andamio-layher.jpg': { author: 'Fumikas Sagisavas', license: 'CC0' },
  'excavadora-caterpillar-320.jpg': { author: 'J. Smith', license: 'CC BY-SA 3.0' },
  'excavadora-komatsu-pc200.jpg': { author: 'FBenjr123', license: 'CC BY-SA 4.0' },
  'generador-caterpillar.jpg': { author: 'Gregsedits', license: 'CC BY-SA 3.0' },
  'martillo-demoledor.jpg': { author: 'sarang', license: 'PD' },
  'minicargador-bobcat-s650.jpg': { author: 'Daderot', license: 'CC0' },
  'plancha-wacker-dpu6555.jpg': { author: 'Reise Reise', license: 'CC BY-SA 4.0' },
  'retroexcavadora-jcb-3cx.jpg': { author: 'Daderot', license: 'CC0' },
  'rodillo-dynapac-ca151.jpg': { author: 'Calle Eklund/V-wolf', license: 'CC BY 3.0' },
  'rompepavimentos.jpg': { author: 'Josh Parris', license: 'PD' },
  'rotomartillo-makita-hr3210.jpg': { author: 'Mark Hunter', license: 'CC BY 2.0' },
  'taladro-dewalt-dcd985.jpg': { author: 'Mark Hunter', license: 'CC BY 2.0' },
  'telehandler-jcb-540.jpg': { author: 'Georg Pik', license: 'CC0' },
  'vibrador-concreto.jpg': { author: 'Lievers holland', license: 'CC0' },
}

/** "Foto: author · license · Wikimedia Commons" for a demo photo, or null for photos the owner uploaded. */
export function photoCredit(url: string | null | undefined): string | null {
  const match = url?.match(/\/demo-images\/([a-z0-9-]+\.jpg)$/)
  const credit = match ? DEMO_PHOTO_CREDITS[match[1]] : undefined
  if (!credit) return null
  const license = credit.license === 'PD' ? i18n.t('photo.publicDomain') : credit.license
  return i18n.t('photo.credit', { author: credit.author, license })
}
