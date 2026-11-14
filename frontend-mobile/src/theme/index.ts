export interface Palette {
  brand: string
  brandDark: string
  brandSoft: string
  ink: string
  text: string
  muted: string
  border: string
  background: string
  surface: string
  /** Inputs and chips that sit on a surface, a step lighter or darker than it. */
  raised: string
  success: string
  successSoft: string
  danger: string
  dangerSoft: string
  info: string
  infoSoft: string
  infoText: string
  warningSoft: string
  /** Text on the brand colour (buttons, avatar). */
  onBrand: string
}

export const lightColors: Palette = {
  brand: '#F59E0B',
  brandDark: '#B45309',
  brandSoft: '#FEF3C7',
  ink: '#0F172A',
  text: '#334155',
  muted: '#64748B',
  border: '#E2E8F0',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  raised: '#F1F5F9',
  success: '#059669',
  successSoft: '#ECFDF5',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  info: '#0284C7',
  infoSoft: '#F0F9FF',
  infoText: '#075985',
  warningSoft: '#FFFBEB',
  onBrand: '#0F172A',
}

/** Slate night: same brand amber, surfaces lifted from the background, text kept above 4.5:1 contrast. */
export const darkColors: Palette = {
  brand: '#F59E0B',
  brandDark: '#FBBF24',
  brandSoft: '#3B2A0B',
  ink: '#F1F5F9',
  text: '#CBD5E1',
  muted: '#94A3B8',
  border: '#334155',
  background: '#0B1220',
  surface: '#111827',
  raised: '#1E293B',
  success: '#34D399',
  successSoft: '#052E22',
  danger: '#F87171',
  dangerSoft: '#3B1212',
  info: '#38BDF8',
  infoSoft: '#0C2333',
  infoText: '#BAE6FD',
  warningSoft: '#2A2110',
  onBrand: '#0F172A',
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const

export function typographyFor(colors: Palette) {
  return {
    title: { fontSize: 24, fontWeight: '700', color: colors.ink },
    heading: { fontSize: 18, fontWeight: '700', color: colors.ink },
    body: { fontSize: 15, color: colors.text },
    caption: { fontSize: 13, color: colors.muted },
  } as const
}

export type Typography = ReturnType<typeof typographyFor>

