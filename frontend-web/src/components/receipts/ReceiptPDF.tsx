import { Document, Page, Path, Rect, StyleSheet, Svg, Text, View } from '@react-pdf/renderer'
import i18n, { currentLanguage } from '../../i18n'
import type { Payment, Reservation } from '../../types'
import { formatCurrency, formatDate, reservationCode } from '../../utils/format'

const BRAND = '#a86f0c'
const INK = '#131416'
const MUTED = '#5d5f60'
const LINE = '#e2e8f0'
const LOGO_AMBER = '#f59e0b'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: INK, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  brandBlock: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 40, height: 40, marginRight: 10, padding: 6, backgroundColor: INK, borderRadius: 8 },
  brand: { fontSize: 20, fontFamily: 'Helvetica-Bold' },
  brandAccent: { color: BRAND },
  tagline: { color: MUTED, marginTop: 2 },
  docTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  code: { fontSize: 16, fontFamily: 'Helvetica-Bold', textAlign: 'right', marginTop: 2 },
  issued: { color: MUTED, textAlign: 'right', marginTop: 2 },
  band: { height: 4, backgroundColor: BRAND, marginBottom: 20 },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: MUTED, textTransform: 'uppercase', marginBottom: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '50%', marginBottom: 8 },
  label: { color: MUTED, fontSize: 8, marginBottom: 2 },
  value: { fontSize: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: LINE },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, marginTop: 4 },
  totalLabel: { fontSize: 12, fontFamily: 'Helvetica-Bold' },
  totalValue: { fontSize: 12, fontFamily: 'Helvetica-Bold' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', paddingVertical: 5, paddingHorizontal: 4 },
  tableRow: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: LINE },
  colType: { width: '28%' },
  colStatus: { width: '18%' },
  colRef: { width: '34%', fontSize: 8 },
  colAmount: { width: '20%', textAlign: 'right' },
  th: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: MUTED },
  footer: { position: 'absolute', bottom: 32, left: 40, right: 40, color: MUTED, fontSize: 8, textAlign: 'center' },
})

/** The excavator mark of the web header (BrandMark), redrawn with react-pdf's SVG primitives. */
function BrandLogo() {
  return (
    <View style={styles.logo}>
      <Svg viewBox="0 0 24 24" width={28} height={28}>
        <Rect x={1.5} y={17} width={13} height={4.5} rx={2.25} fill={LOGO_AMBER} />
        <Rect x={3} y={10.5} width={7.5} height={5.5} rx={1} fill={LOGO_AMBER} />
        <Path d="M9.5 12.5 15.5 5.5l5 4.5" fill="none" stroke={LOGO_AMBER} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
        <Path d="M18.8 10.2h4l-1.3 5.3-3.6-1.6z" fill={LOGO_AMBER} />
      </Svg>
    </View>
  )
}

interface ReceiptDocumentProps {
  reservation: Reservation
  payments: Payment[]
  issuedAt: Date
}

/**
 * Rendered by react-pdf outside the app's React tree, so it reads the active language from i18n directly.
 * The PDF fonts (Helvetica) have no Chinese glyphs, so a Chinese session gets the receipt in English.
 */
export function ReceiptDocument({ reservation, payments, issuedAt }: ReceiptDocumentProps) {
  const language = currentLanguage() === 'zh' ? 'en' : currentLanguage()
  const locale = language === 'en' ? 'en-US' : 'es-PE'
  const t = i18n.getFixedT(language)
  const money = (amount: number) => formatCurrency(amount, reservation.currency)
  const depositHold = payments.find((payment) => payment.type === 'SECURITY_DEPOSIT')

  return (
    <Document title={t('receipt.pdf.title', { code: reservationCode(reservation.id) })} author="RentEquip" language={language}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brandBlock}>
            <BrandLogo />
            <View>
              <Text style={styles.brand}>
                Rent<Text style={styles.brandAccent}>Equip</Text>
              </Text>
              <Text style={styles.tagline}>{t('receipt.pdf.tagline')}</Text>
            </View>
          </View>
          <View>
            <Text style={styles.docTitle}>{t('receipt.pdf.docTitle')}</Text>
            <Text style={styles.code}>{reservationCode(reservation.id)}</Text>
            <Text style={styles.issued}>
              {t('receipt.pdf.issued', { date: issuedAt.toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' }) })}
            </Text>
          </View>
        </View>
        <View style={styles.band} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('receipt.pdf.details')}</Text>
          <View style={styles.grid}>
            <Field label={t('receipt.pdf.renter')} value={reservation.renterCompanyName} />
            <Field label={t('receipt.pdf.equipment')} value={reservation.equipmentName} />
            <Field label={t('receipt.pdf.start')} value={formatDate(reservation.startDate, locale)} />
            <Field label={t('receipt.pdf.end')} value={formatDate(reservation.endDate, locale)} />
            <Field label={t('receipt.pdf.duration')} value={t('common.day', { count: reservation.totalDays })} />
            <Field label={t('receipt.pdf.dailyRate')} value={money(reservation.dailyRate)} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('receipt.pdf.breakdown')}</Text>
          <View style={styles.row}>
            <Text>
              {t('receipt.pdf.rental', { rate: money(reservation.dailyRate), days: reservation.totalDays })}
            </Text>
            <Text>{money(reservation.rentalAmount)}</Text>
          </View>
          <View style={styles.row}>
            <Text>
              {t('receipt.pdf.deposit')}{' '}
              {depositHold ? `(${t(`receipt.pdf.statuses.${depositHold.status}`).toLowerCase()})` : ''}
            </Text>
            <Text>{money(reservation.securityDeposit)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('receipt.pdf.total')}</Text>
            <Text style={styles.totalValue}>{money(reservation.totalAmount)}</Text>
          </View>
        </View>

        {payments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('receipt.pdf.movements')}</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, styles.colType]}>{t('receipt.pdf.concept')}</Text>
              <Text style={[styles.th, styles.colStatus]}>{t('receipt.pdf.status')}</Text>
              <Text style={[styles.th, styles.colRef]}>{t('receipt.pdf.reference')}</Text>
              <Text style={[styles.th, styles.colAmount]}>{t('receipt.pdf.amount')}</Text>
            </View>
            {payments.map((payment) => (
              <View key={payment.id} style={styles.tableRow}>
                <Text style={styles.colType}>{t(`receipt.pdf.types.${payment.type}`)}</Text>
                <Text style={styles.colStatus}>{t(`receipt.pdf.statuses.${payment.status}`)}</Text>
                <Text style={styles.colRef}>{payment.providerReference ?? '—'}</Text>
                <Text style={styles.colAmount}>{money(payment.amount)}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.footer} fixed>
          {t('receipt.pdf.footer')}
        </Text>
      </Page>
    </Document>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  )
}

