import { Document, Font, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { Equipment } from '../../types'
import { quoteCode } from '../../utils/quoteCode'

// Whole words only: react-pdf's default hyphenation is English and breaks Spanish words badly ("Herramien-tas").
Font.registerHyphenationCallback((word) => [word])

const ASPHALT = '#0f172a'
const MACHINE = '#f5b800'
const INK = '#1f2933'
const MUTED = '#616e7c'
const SOFT = '#f4f5f7'

const s = StyleSheet.create({
  page: { paddingTop: 72, paddingBottom: 60, fontFamily: 'Helvetica', fontSize: 9.5, color: INK, lineHeight: 1.45 },
  header: { position: 'absolute', top: 0, left: 0, right: 0 },
  band: { backgroundColor: ASPHALT, paddingVertical: 14, paddingHorizontal: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { color: '#ffffff', fontSize: 14, fontFamily: 'Helvetica-Bold' },
  brandAccent: { color: MACHINE },
  bandRight: { color: '#c9ccd1', fontSize: 9 },
  stripe: { height: 4, backgroundColor: MACHINE },
  body: { paddingHorizontal: 40 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 20 },
  kicker: { fontSize: 9.5, color: MUTED },
  title: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: ASPHALT, marginTop: 2, lineHeight: 1.15, maxWidth: 330 },
  meta: { width: 170, textAlign: 'right' },
  metaLabel: { fontSize: 8, color: MUTED },
  metaValue: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: ASPHALT, marginBottom: 5 },
  heroRow: { flexDirection: 'row', gap: 16, marginTop: 14 },
  photo: { width: 230, height: 150, objectFit: 'cover', borderRadius: 6 },
  infoBox: { flex: 1, backgroundColor: SOFT, borderRadius: 6, padding: 12 },
  boxTitle: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', color: ASPHALT, marginBottom: 6 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5, gap: 10 },
  k: { color: MUTED },
  v: { fontFamily: 'Helvetica-Bold', color: ASPHALT, textAlign: 'right', flexShrink: 1 },
  h2: { fontSize: 12.5, fontFamily: 'Helvetica-Bold', color: ASPHALT, marginTop: 18, marginBottom: 7 },
  table: { borderRadius: 6, overflow: 'hidden' },
  thRow: { flexDirection: 'row', backgroundColor: ASPHALT, paddingVertical: 6, paddingHorizontal: 10 },
  th: { color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 8.5 },
  tdRow: { flexDirection: 'row', paddingVertical: 7, paddingHorizontal: 10, backgroundColor: SOFT, marginTop: 2 },
  colConcept: { flex: 1 },
  colQty: { width: 70, textAlign: 'right' },
  colUnit: { width: 90, textAlign: 'right' },
  colAmount: { width: 90, textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: MACHINE, paddingVertical: 9, paddingHorizontal: 10, marginTop: 2 },
  totalLabel: { fontSize: 11.5, fontFamily: 'Helvetica-Bold', color: ASPHALT },
  totalValue: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: ASPHALT },
  usd: { fontSize: 8.5, color: MUTED, textAlign: 'right', marginTop: 4 },
  item: { flexDirection: 'row', marginBottom: 3.5 },
  bullet: { width: 12, color: '#b98900', fontFamily: 'Helvetica-Bold' },
  itemText: { flex: 1 },
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, fontSize: 7.5, color: MUTED },
})

export interface QuoteData {
  equipment: Equipment
  days: number
  /** ISO dates picked on the calendar; null when the quote is by number of days only. */
  startDate: string | null
  endDate: string | null
  /** Soles per dollar of the day, for the reference amount in dollars. */
  penPerUsd: number | null
  preparedFor: { company: string; person: string } | null
  issuedAt: Date
  /** The main photo as a data URL; null when it could not be loaded. */
  photo: string | null
}

const VALID_DAYS = 7

function money(amount: number, currency: string) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency }).format(amount)
}

function day(date: Date) {
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
}

function isoDay(iso: string) {
  const [year, month, dayOfMonth] = iso.split('-').map(Number)
  return day(new Date(year, month - 1, dayOfMonth))
}

function List({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((text, index) => (
        <View key={index} style={s.item} wrap={false}>
          <Text style={s.bullet}>•</Text>
          <Text style={s.itemText}>{text}</Text>
        </View>
      ))}
    </View>
  )
}

function Pair({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.kv}>
      <Text style={s.k}>{label}</Text>
      <Text style={s.v}>{value}</Text>
    </View>
  )
}

/**
 * The quotation a renter downloads from a machine's page: who rents it out, the price for the chosen days and
 * the conditions, in one page to pass on to the site office. Written in Spanish, the language of the contracts.
 */
export function QuoteDocument({ equipment, days, startDate, endDate, penPerUsd, preparedFor, issuedAt, photo }: QuoteData) {
  const currency = equipment.currency
  const rental = days * equipment.dailyRate
  const total = rental + equipment.securityDeposit
  const usd = penPerUsd && currency === 'PEN' ? total / penPerUsd : null
  const validUntil = new Date(issuedAt.getTime() + VALID_DAYS * 86_400_000)
  const code = quoteCode(equipment.id, issuedAt)
  const period = startDate && endDate ? `Del ${isoDay(startDate)} al ${isoDay(endDate)}` : `${days} ${days === 1 ? 'día' : 'días'} (fechas por definir)`

  return (
    <Document title={`Cotización ${code} · ${equipment.name}`} author="RentEquip" subject="Cotización de alquiler" language="es">
      <Page size="A4" style={s.page}>
        <View style={s.header} fixed>
          <View style={s.band}>
            <Text style={s.brand}>
              Rent<Text style={s.brandAccent}>Equip</Text>
            </Text>
            <Text style={s.bandRight}>Cotización {code}</Text>
          </View>
          <View style={s.stripe} />
        </View>

        <View style={s.body}>
          <View style={s.topRow}>
            <View>
              <Text style={s.kicker}>Cotización de alquiler</Text>
              <Text style={s.title}>{equipment.name}</Text>
              <Text style={[s.kicker, { marginTop: 3 }]}>
                {equipment.brand} · {equipment.model}
                {equipment.manufactureYear ? ` · ${equipment.manufactureYear}` : ''}
              </Text>
            </View>
            <View style={s.meta}>
              <Text style={s.metaLabel}>Fecha de emisión</Text>
              <Text style={s.metaValue}>{day(issuedAt)}</Text>
              <Text style={s.metaLabel}>Válida hasta</Text>
              <Text style={s.metaValue}>{day(validUntil)}</Text>
              {preparedFor && (
                <>
                  <Text style={s.metaLabel}>Preparada para</Text>
                  <Text style={s.metaValue}>
                    {preparedFor.company}
                    {'\n'}
                    <Text style={{ fontFamily: 'Helvetica', color: INK }}>{preparedFor.person}</Text>
                  </Text>
                </>
              )}
            </View>
          </View>

          <View style={s.heroRow}>
            {photo && <Image src={photo} style={s.photo} />}
            <View style={s.infoBox}>
              <Text style={s.boxTitle}>Quién alquila el equipo</Text>
              <Pair label="Empresa" value={`${equipment.ownerCompanyName}${equipment.ownerCompanyVerified ? ' (verificada)' : ''}`} />
              <Pair label="Dirección" value={[equipment.address, equipment.city].filter(Boolean).join(', ')} />
              <Pair label="Estado" value={equipment.status === 'AVAILABLE' ? 'Disponible' : equipment.status} />
              <Pair label="Tarifa por día" value={money(equipment.dailyRate, currency)} />
              {equipment.weeklyRate !== null && <Pair label="Tarifa por semana" value={money(equipment.weeklyRate, currency)} />}
            </View>
          </View>

          <Text style={s.h2}>Cotización</Text>
          <Text style={{ marginBottom: 6 }}>
            Periodo: <Text style={{ fontFamily: 'Helvetica-Bold' }}>{period}</Text>
          </Text>
          <View style={s.table} wrap={false}>
            <View style={s.thRow}>
              <Text style={[s.th, s.colConcept]}>Concepto</Text>
              <Text style={[s.th, s.colQty]}>Cantidad</Text>
              <Text style={[s.th, s.colUnit]}>Precio unitario</Text>
              <Text style={[s.th, s.colAmount]}>Importe</Text>
            </View>
            <View style={s.tdRow}>
              <Text style={s.colConcept}>Alquiler por día</Text>
              <Text style={s.colQty}>
                {days} {days === 1 ? 'día' : 'días'}
              </Text>
              <Text style={s.colUnit}>{money(equipment.dailyRate, currency)}</Text>
              <Text style={s.colAmount}>{money(rental, currency)}</Text>
            </View>
            <View style={s.tdRow}>
              <Text style={s.colConcept}>Garantía reembolsable (se libera al devolver el equipo)</Text>
              <Text style={s.colQty}>1</Text>
              <Text style={s.colUnit}>{money(equipment.securityDeposit, currency)}</Text>
              <Text style={s.colAmount}>{money(equipment.securityDeposit, currency)}</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total a pagar al reservar</Text>
              <Text style={s.totalValue}>{money(total, currency)}</Text>
            </View>
            {usd !== null && <Text style={s.usd}>Aprox. {money(usd, 'USD')} al tipo de cambio del día ({penPerUsd!.toFixed(3)} soles por dólar)</Text>}
          </View>

          <Text style={s.h2}>Condiciones</Text>
          <List
            items={[
              'El total se paga en línea al reservar. La garantía se retiene en la tarjeta y se libera al devolver el equipo en el estado en que se recibió.',
              'Cotización referencial: las fechas y el precio se confirman al reservar, según la disponibilidad del equipo.',
              'La entrega y la devolución se registran con fotos y horómetro en la reserva.',
            ]}
          />
        </View>

        <Text style={s.footer} fixed>
          {`Cotización ${code} generada en RentEquip el ${day(issuedAt)}. No es una reserva: las fechas se confirman al reservar y pagar.`}
        </Text>
      </Page>
    </Document>
  )
}
