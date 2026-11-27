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
  // Galleries: photos 2 and 3 of ten machines (backend DemoGallerySeeder).
  'andamio-layher-2.jpg': { author: 'Friedrich Haag (derivada: Pizza mal pi)', license: 'CC BY-SA 4.0' },
  'andamio-layher-3.jpg': { author: 'Basil Jean', license: 'CC BY-SA 4.0' },
  'excavadora-caterpillar-320-2.jpg': { author: 'Bene Riobó', license: 'CC BY-SA 4.0' },
  'excavadora-caterpillar-320-3.jpg': { author: 'Huangdan2060', license: 'CC BY 3.0' },
  'excavadora-komatsu-pc200-2.jpg': { author: 'FBenjr123', license: 'CC BY-SA 4.0' },
  'excavadora-komatsu-pc200-3.jpg': { author: 'Bijay Chaurasia', license: 'CC BY-SA 4.0' },
  'minicargador-bobcat-s650-2.jpg': { author: 'Reise Reise', license: 'CC BY-SA 4.0' },
  'minicargador-bobcat-s650-3.jpg': { author: 'Bob Adams', license: 'CC BY-SA 2.0' },
  'plancha-wacker-dpu6555-2.jpg': { author: 'Baumeister 99', license: 'CC BY-SA 3.0' },
  'plancha-wacker-dpu6555-3.jpg': { author: 'LutzBruno', license: 'CC BY 3.0' },
  'retroexcavadora-jcb-3cx-2.jpg': { author: 'Andrey Butko', license: 'CC BY-SA 3.0' },
  'retroexcavadora-jcb-3cx-3.jpg': { author: 'Ismael Olea', license: 'CC BY 4.0' },
  'rodillo-dynapac-ca151-2.jpg': { author: 'Calle Eklund/V-wolf', license: 'CC BY 3.0' },
  'rodillo-dynapac-ca151-3.jpg': { author: 'SwarmCheng', license: 'CC BY-SA 4.0' },
  'rotomartillo-makita-hr3210-2.jpg': { author: 'Dmitry G', license: 'PD' },
  'rotomartillo-makita-hr3210-3.jpg': { author: 'Dmitry G', license: 'CC BY-SA 3.0' },
  'taladro-dewalt-dcd985-2.jpg': { author: 'Puddin Tain', license: 'CC BY-SA 2.0' },
  'taladro-dewalt-dcd985-3.jpg': { author: 'TaurusEmerald', license: 'CC BY-SA 4.0' },
  'telehandler-jcb-540-2.jpg': { author: 'Tiia Monto', license: 'CC BY-SA 3.0' },
  'telehandler-jcb-540-3.jpg': { author: 'Alexandre Prevot', license: 'CC BY-SA 4.0' },
}

/** "Foto: author · license · Wikimedia Commons" for a demo photo, or null for photos the owner uploaded. */
export function photoCredit(url: string | null | undefined): string | null {
  const match = url?.match(/\/demo-images\/([a-z0-9-]+\.jpg)$/)
  const credit = match ? DEMO_PHOTO_CREDITS[match[1]] : undefined
  if (!credit) return null
  const license = credit.license === 'PD' ? i18n.t('photo.publicDomain') : credit.license
  return i18n.t('photo.credit', { author: credit.author, license })
}
