import type {
  AbandonedQuote,
  AbandonedSignup,
  AdminAlert,
  AdminCity,
  AdminCompany,
  AdminDashboard,
  AdminEquipment,
  AdminFinance,
  AdminKpi,
  AdminWorkType,
  AiTelemetry,
  AuditEvent,
  AuditEventType,
  Campaign,
  CompanyRentalRecord,
  CompanySide,
  DailyRentals,
  EscrowHold,
  FleetAvailability,
  KybDocument,
  KybStatus,
  LiveBooking,
  OnboardingStep,
  Payout,
} from '../types/admin'
import type { IsoDate, IsoDateTime } from '../types'
import { toIsoDate } from '../utils/format'

/*
 * Demonstration data for the platform panel, for every module the backend does not serve yet. Company
 * names, RUCs and people are invented (the RUCs pass SUNAT's check digit but belong to nobody); cities,
 * districts and machine models are real ones of the Peruvian market. Everything is generated from a fixed
 * seed, so the numbers are the same on every load, and totals are computed from the rows they summarise.
 */

// --- Deterministic randomness ---

function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}

const random = mulberry32(20_261_126)
const between = (min: number, max: number) => Math.floor(min + random() * (max - min + 1))
const pick = <T,>(items: readonly T[]): T => items[Math.floor(random() * items.length)]
const roundTo = (value: number, step: number) => Math.round(value / step) * step

/** Reference moment of the demo: the screens read "hace 4 minutos" from the real clock. */
const NOW = new Date()

function minutesAgo(minutes: number): IsoDateTime {
  const date = new Date(NOW.getTime() - minutes * 60_000)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${toIsoDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function daysAgo(days: number): IsoDate {
  const date = new Date(NOW)
  date.setDate(date.getDate() - days)
  return toIsoDate(date)
}

function daysAhead(days: number): IsoDate {
  return daysAgo(-days)
}

const RUC_WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]

/** A legal-entity RUC (prefix 20) with SUNAT's modulo-11 check digit. */
function rucFrom(seed: number): string {
  const body = `20${String(500_000_000 + seed * 7_919).slice(-8)}`
  const sum = RUC_WEIGHTS.reduce((total, weight, index) => total + weight * Number(body[index]), 0)
  let check = 11 - (sum % 11)
  if (check === 10) check = 0
  if (check === 11) check = 1
  return `${body}${check}`
}

// --- Vocabulary of the Peruvian market ---

export const ADMIN_CITIES: readonly AdminCity[] = ['Lima', 'Callao', 'Arequipa', 'Trujillo', 'Piura', 'Cusco', 'Chiclayo', 'Huancayo', 'Ica']

const CITY_WEIGHTS: readonly AdminCity[] = [
  'Lima', 'Lima', 'Lima', 'Lima', 'Lima', 'Callao', 'Callao', 'Arequipa', 'Arequipa', 'Arequipa',
  'Trujillo', 'Trujillo', 'Piura', 'Cusco', 'Chiclayo', 'Huancayo', 'Ica',
]

const COMPANY_FORMS = ['Constructora', 'Inversiones', 'Contratistas', 'Ingeniería y Obras', 'Edificaciones', 'Corporación', 'Grupo', 'Maquinarias', 'Alquileres']
const COMPANY_PLACES = [
  'Rímac', 'Huallaga', 'Misti', 'Chan Chan', 'Pachacámac', 'Mantaro', 'Chicama', 'Paracas', 'Huascarán', 'Vilcanota',
  'Marañón', 'Sechura', 'Moche', 'Lurín', 'Colca', 'Chillón', 'Sipán', 'Ausangate', 'Nazca', 'Chachani',
  'Salaverry', 'Cañete', 'Majes', 'Tumbes', 'Chavín', 'Huaraz', 'Pisco', 'Olmos', 'Tacna', 'Ilo',
]
const LEGAL_FORMS = ['S.A.C.', 'S.A.C.', 'S.A.C.', 'E.I.R.L.', 'S.A.']

const FIRST_NAMES = ['Lucía', 'Jorge', 'María Elena', 'Carlos', 'Rosa', 'Luis Alberto', 'Patricia', 'Miguel', 'Ana Sofía', 'Renzo', 'Milagros', 'César', 'Gabriela', 'Víctor', 'Karina', 'Diego']
const LAST_NAMES = ['Quispe', 'Huamán', 'Flores', 'Mendoza', 'Rojas', 'Vargas', 'Chávez', 'Torres', 'Ramírez', 'Paredes', 'Salazar', 'Cárdenas', 'Gutiérrez', 'Zevallos', 'Ccahuana', 'Benavides']

const personName = () => `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)} ${pick(LAST_NAMES)}`
const slug = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')

/** Real models rented on Peruvian sites, by family of work, with a typical daily rate in soles. */
const MACHINE_MODELS: readonly { workType: AdminWorkType; name: string; brand: string; model: string; rate: number }[] = [
  { workType: 'earthworks', name: 'Excavadora hidráulica', brand: 'Caterpillar', model: '320 GC', rate: 1_850 },
  { workType: 'earthworks', name: 'Excavadora hidráulica', brand: 'Komatsu', model: 'PC200-8', rate: 1_750 },
  { workType: 'earthworks', name: 'Retroexcavadora', brand: 'JCB', model: '3CX', rate: 980 },
  { workType: 'earthworks', name: 'Retroexcavadora', brand: 'Caterpillar', model: '416F2', rate: 1_050 },
  { workType: 'earthworks', name: 'Minicargador', brand: 'Bobcat', model: 'S650', rate: 620 },
  { workType: 'earthworks', name: 'Cargador frontal', brand: 'Volvo', model: 'L90H', rate: 1_600 },
  { workType: 'earthworks', name: 'Tractor de orugas', brand: 'Komatsu', model: 'D65EX', rate: 2_400 },
  { workType: 'earthworks', name: 'Motoniveladora', brand: 'Caterpillar', model: '140K', rate: 2_150 },
  { workType: 'lifting', name: 'Manipulador telescópico', brand: 'Genie', model: 'GTH-4018', rate: 890 },
  { workType: 'lifting', name: 'Manipulador telescópico', brand: 'JCB', model: '540-170', rate: 1_150 },
  { workType: 'lifting', name: 'Plataforma tijera', brand: 'Genie', model: 'GS-3246', rate: 420 },
  { workType: 'lifting', name: 'Grúa sobre camión', brand: 'Hiab', model: 'X-HiPro 232', rate: 2_800 },
  { workType: 'lifting', name: 'Andamio multidireccional', brand: 'Ulma', model: 'Brio 70 m²', rate: 180 },
  { workType: 'compaction', name: 'Rodillo vibratorio', brand: 'Dynapac', model: 'CA2500D', rate: 1_250 },
  { workType: 'compaction', name: 'Rodillo tándem', brand: 'Bomag', model: 'BW 120 AD-5', rate: 690 },
  { workType: 'compaction', name: 'Plancha compactadora', brand: 'Wacker Neuson', model: 'VP1550', rate: 95 },
  { workType: 'compaction', name: 'Apisonador', brand: 'Wacker Neuson', model: 'BS60-4s', rate: 110 },
  { workType: 'compaction', name: 'Mezcladora de concreto', brand: 'Kenwood Perú', model: '11 p³', rate: 140 },
  { workType: 'manual', name: 'Martillo demoledor', brand: 'Bosch', model: 'GSH 27 VC', rate: 120 },
  { workType: 'manual', name: 'Generador diésel', brand: 'Cummins', model: 'C60 D5', rate: 380 },
  { workType: 'manual', name: 'Cortadora de concreto', brand: 'Husqvarna', model: 'FS 400 LV', rate: 160 },
  { workType: 'manual', name: 'Rotomartillo', brand: 'Hilti', model: 'TE 60-ATC', rate: 85 },
  { workType: 'manual', name: 'Compresora de aire', brand: 'Atlas Copco', model: 'XAS 185', rate: 340 },
]

const machineLabel = (machine: (typeof MACHINE_MODELS)[number]) => `${machine.name} ${machine.brand} ${machine.model}`

// --- Companies and KYB ---

/** Demo directory: 68 verified, 3 waiting for the RUC check and 5 suspended. */
const STATUS_PLAN: readonly KybStatus[] = [
  ...Array<KybStatus>(68).fill('VERIFIED'),
  ...Array<KybStatus>(3).fill('IN_REVIEW'),
  ...Array<KybStatus>(5).fill('SUSPENDED'),
]

function documentsFor(status: KybStatus, createdAt: IsoDate): KybDocument[] {
  if (status === 'VERIFIED') {
    return [
      { kind: 'RUC_RECORD', status: 'APPROVED', uploadedAt: createdAt },
      { kind: 'POWER_OF_ATTORNEY', status: 'APPROVED', uploadedAt: createdAt },
      { kind: 'REPRESENTATIVE_ID', status: 'APPROVED', uploadedAt: createdAt },
      { kind: 'SCTR_POLICY', status: random() > 0.2 ? 'APPROVED' : 'PENDING', uploadedAt: createdAt },
    ]
  }
  if (status === 'IN_REVIEW') {
    return [
      { kind: 'RUC_RECORD', status: 'PENDING', uploadedAt: createdAt },
      { kind: 'POWER_OF_ATTORNEY', status: 'PENDING', uploadedAt: createdAt },
      { kind: 'REPRESENTATIVE_ID', status: 'APPROVED', uploadedAt: createdAt },
      { kind: 'SCTR_POLICY', status: 'MISSING', uploadedAt: null },
    ]
  }
  return [
    { kind: 'RUC_RECORD', status: 'REJECTED', uploadedAt: createdAt },
    { kind: 'POWER_OF_ATTORNEY', status: 'APPROVED', uploadedAt: createdAt },
    { kind: 'REPRESENTATIVE_ID', status: 'APPROVED', uploadedAt: createdAt },
    { kind: 'SCTR_POLICY', status: 'MISSING', uploadedAt: null },
  ]
}

function historyFor(side: CompanySide, count: number, seed: number): CompanyRentalRecord[] {
  return Array.from({ length: count }, (_, index) => {
    const machine = pick(MACHINE_MODELS)
    const start = between(4, 160)
    const days = between(2, 21)
    return {
      code: `RE-${String(4_100 + seed * 13 + index * 7).padStart(6, '0')}`,
      equipment: machineLabel(machine),
      city: pick(CITY_WEIGHTS),
      startDate: daysAgo(start),
      endDate: daysAgo(Math.max(start - days, 0)),
      amount: machine.rate * days,
      role: side === 'BOTH' ? (index % 2 === 0 ? 'OWNER' : 'RENTER') : side,
    }
  }).sort((a, b) => b.startDate.localeCompare(a.startDate))
}

function buildCompanies(): AdminCompany[] {
  return STATUS_PLAN.map((status, index) => {
    const form = COMPANY_FORMS[index % COMPANY_FORMS.length]
    const place = COMPANY_PLACES[(index * 7) % COMPANY_PLACES.length]
    const legal = LEGAL_FORMS[index % LEGAL_FORMS.length]
    const variant = index >= COMPANY_PLACES.length ? (index >= COMPANY_PLACES.length * 2 ? ' del Sur' : ' Andina') : ''
    const name = `${form} ${place}${variant} ${legal}`
    const side: CompanySide = form === 'Maquinarias' || form === 'Alquileres' ? 'OWNER' : index % 5 === 0 ? 'BOTH' : 'RENTER'
    const createdAt = status === 'IN_REVIEW' ? daysAgo(between(0, 3)) : daysAgo(between(20, 420))
    const representative = personName()
    const history = status === 'IN_REVIEW' ? [] : historyFor(side, between(1, 6), index)
    const reviewCount = status === 'IN_REVIEW' ? 0 : between(0, 24)
    return {
      key: `demo-${index + 1}`,
      backendId: null,
      source: 'demo',
      name,
      ruc: rucFrom(index + 1),
      city: pick(CITY_WEIGHTS),
      side,
      status,
      taxStatus: status === 'SUSPENDED' ? 'SUSPENSION TEMPORAL / HABIDO' : status === 'IN_REVIEW' ? null : 'ACTIVO / HABIDO',
      representative: {
        name: representative,
        email: `${slug(representative.split(' ')[0])}.${slug(representative.split(' ').at(-2) ?? '')}@${slug(`${form}${place}`)}.pe`,
        phone: `+51 9${between(10, 99)} ${between(100, 999)} ${between(100, 999)}`,
      },
      createdAt,
      documents: documentsFor(status, createdAt),
      history,
      rating: reviewCount === 0 ? null : Math.round((3.6 + random() * 1.4) * 10) / 10,
      reviewCount,
      equipmentCount: side === 'RENTER' ? 0 : between(3, 38),
    }
  })
}

export const MOCK_COMPANIES: readonly AdminCompany[] = buildCompanies()

// --- Catalogue: demo fleet of the owners above ---

function buildFleet(): AdminEquipment[] {
  const owners = MOCK_COMPANIES.filter((company) => company.side !== 'RENTER' && company.status !== 'SUSPENDED')
  const items: AdminEquipment[] = []
  owners.forEach((owner, ownerIndex) => {
    const units = Math.min(owner.equipmentCount, 6)
    for (let unit = 0; unit < units; unit++) {
      const machine = MACHINE_MODELS[(ownerIndex * 5 + unit * 3) % MACHINE_MODELS.length]
      const roll = random()
      const availability: FleetAvailability = roll < 0.36 ? 'ON_SITE' : roll < 0.9 ? 'AVAILABLE' : 'MAINTENANCE'
      items.push({
        key: `demo-eq-${items.length + 1}`,
        backendId: null,
        source: 'demo',
        name: machine.name,
        brand: machine.brand,
        model: machine.model,
        workType: machine.workType,
        owner: owner.name,
        city: owner.city,
        dailyRate: roundTo(machine.rate * (0.85 + random() * 0.3), 10),
        year: between(2014, 2024),
        imageUrl: null,
        published: random() > 0.07,
        featured: random() > 0.88,
        aiSuggested: random() > 0.8,
        availability,
      })
    }
  })
  return items
}

export const MOCK_FLEET: readonly AdminEquipment[] = buildFleet()

// --- Dashboard ---

const RENTAL_MIX: Record<AdminWorkType, number> = { earthworks: 0.44, lifting: 0.21, compaction: 0.17, manual: 0.18 }

function buildDailyRentals(): DailyRentals[] {
  return Array.from({ length: 90 }, (_, index) => {
    const offset = 89 - index
    const date = new Date(NOW)
    date.setDate(date.getDate() - offset)
    const weekday = date.getDay()
    // Sites rent on weekdays; Sunday is close to zero and Saturday half a day.
    const dayFactor = weekday === 0 ? 0.15 : weekday === 6 ? 0.55 : 1
    const growth = 0.75 + (index / 89) * 0.4
    const base = 14 * dayFactor * growth
    const value = (share: number) => Math.max(0, Math.round(base * share * (0.7 + random() * 0.6)))
    return {
      date: toIsoDate(date),
      earthworks: value(RENTAL_MIX.earthworks),
      lifting: value(RENTAL_MIX.lifting),
      compaction: value(RENTAL_MIX.compaction),
      manual: value(RENTAL_MIX.manual),
    }
  })
}

const LIVE_BOOKINGS: LiveBooking[] = [
  { id: 'lb-1', company: 'Constructora Rímac S.A.C.', equipment: 'Excavadora Caterpillar 320 GC', city: 'Lima', amount: 12_950, days: 7, stage: 'PAID', at: minutesAgo(4) },
  { id: 'lb-2', company: 'Edificaciones Misti S.A.C.', equipment: 'Rodillo vibratorio Dynapac CA2500D', city: 'Arequipa', amount: 6_250, days: 5, stage: 'REQUESTED', at: minutesAgo(11) },
  { id: 'lb-3', company: 'Contratistas Salaverry E.I.R.L.', equipment: 'Manipulador telescópico Genie GTH-4018', city: 'Callao', amount: 8_010, days: 9, stage: 'ON_SITE', at: minutesAgo(23) },
  { id: 'lb-4', company: 'Grupo Chan Chan S.A.', equipment: 'Retroexcavadora JCB 3CX', city: 'Trujillo', amount: 4_900, days: 5, stage: 'PAID', at: minutesAgo(38) },
  { id: 'lb-5', company: 'Inversiones Lurín S.A.C.', equipment: 'Minicargador Bobcat S650', city: 'Lima', amount: 1_860, days: 3, stage: 'REQUESTED', at: minutesAgo(52) },
  { id: 'lb-6', company: 'Ingeniería y Obras Majes S.A.C.', equipment: 'Generador diésel Cummins C60 D5', city: 'Arequipa', amount: 3_800, days: 10, stage: 'ON_SITE', at: minutesAgo(74) },
  { id: 'lb-7', company: 'Corporación Pachacámac S.A.C.', equipment: 'Plataforma tijera Genie GS-3246', city: 'Lima', amount: 2_520, days: 6, stage: 'PAID', at: minutesAgo(97) },
  { id: 'lb-8', company: 'Constructora Moche S.A.C.', equipment: 'Cargador frontal Volvo L90H', city: 'Trujillo', amount: 9_600, days: 6, stage: 'REQUESTED', at: minutesAgo(131) },
]

const GMV_SERIES = [118_200, 124_900, 121_400, 131_800, 138_600, 135_100, 142_700, 149_300, 147_800, 156_350, 171_900, 184_500]
const ACTIVE_SERIES = [24, 27, 26, 29, 31, 30, 33, 35, 34, 37, 40, 42]
const VERIFIED_SERIES = [39, 42, 44, 47, 49, 52, 54, 57, 59, 61, 65, 68]
const AI_SERIES = [24.1, 25.3, 26.0, 26.8, 27.9, 28.4, 29.6, 30.2, 30.7, 31.0, 32.9, 34.2]

const kpi = (id: AdminKpi['id'], unit: AdminKpi['unit'], series: number[]): AdminKpi => ({
  id,
  unit,
  series,
  value: series[series.length - 1],
  previous: series[series.length - 3],
})

// --- Marketing ---

const CAMPAIGNS: Campaign[] = [
  {
    id: 'cmp-1',
    name: 'Temporada de lluvias en la sierra',
    subject: 'Motoniveladoras y rodillos listos para la temporada de lluvias',
    body: 'Las obras viales del sur arrancan antes de enero. Reserva hoy motoniveladoras Caterpillar 140K y rodillos Dynapac con operador certificado y entrega en Arequipa, Cusco y Puno.',
    segment: 'MINING_SOUTH',
    status: 'SENT',
    recipients: 1_284,
    openRate: 46.1,
    clickRate: 13.2,
    date: minutesAgo(60 * 24 * 6),
  },
  {
    id: 'cmp-2',
    name: 'Arrendatarios de Lima: noviembre',
    subject: 'Excavadoras desde S/ 1,650 por día en Lima y Callao',
    body: 'Más de 60 excavadoras verificadas en Lima Metropolitana y Callao. Compara tarifas, revisa la disponibilidad real y paga con garantía: el dinero queda retenido hasta la devolución.',
    segment: 'RENTERS_LIMA',
    status: 'SENT',
    recipients: 3_412,
    openRate: 41.7,
    clickRate: 10.8,
    date: minutesAgo(60 * 24 * 13),
  },
  {
    id: 'cmp-3',
    name: 'Reactivación de cuentas inactivas',
    subject: 'Tu próxima obra empieza con una cotización en 2 minutos',
    body: 'Hace tres meses que no cotizas en RentEquip. El copiloto IA ahora arma la lista de equipos de tu obra a partir de una descripción y te dice qué está libre esta semana.',
    segment: 'INACTIVE_90D',
    status: 'SENT',
    recipients: 2_096,
    openRate: 40.6,
    clickRate: 10.2,
    date: minutesAgo(60 * 24 * 21),
  },
  {
    id: 'cmp-4',
    name: 'Arrendadores: tarifas de diciembre',
    subject: 'La demanda de manipuladores telescópicos subió en Callao',
    body: 'Hubo 37 búsquedas sin stock de manipuladores telescópicos en Callao este mes. Publica tu equipo o ajusta la tarifa para aparecer primero en las recomendaciones del copiloto.',
    segment: 'OWNERS_ALL',
    status: 'SCHEDULED',
    recipients: 642,
    openRate: null,
    clickRate: null,
    date: minutesAgo(-60 * 24 * 2),
  },
  {
    id: 'cmp-5',
    name: 'Bienvenida a empresas nuevas',
    subject: 'Tres pasos para verificar tu empresa y reservar tu primer equipo',
    body: 'Sube la ficha RUC, la vigencia de poder y el DNI del representante. Con la insignia verificada las empresas arrendadoras responden tus solicitudes hasta 3 veces más rápido.',
    segment: 'NEW_SIGNUPS',
    status: 'DRAFT',
    recipients: 0,
    openRate: null,
    clickRate: null,
    date: minutesAgo(60 * 5),
  },
]

const ABANDONED_QUOTES: AbandonedQuote[] = [
  { id: 'aq-1', company: 'Constructora Huallaga S.A.C.', contact: 'Jorge Rojas', phone: '+51 987 412 330', equipment: 'Excavadora Komatsu PC200-8', city: 'Lima', days: 10, amount: 17_500, abandonedAt: minutesAgo(60 * 20), status: 'PENDING' },
  { id: 'aq-2', company: 'Edificaciones Colca S.A.C.', contact: 'Milagros Ccahuana', phone: '+51 954 118 207', equipment: 'Grúa sobre camión Hiab X-HiPro 232', city: 'Arequipa', days: 2, amount: 5_600, abandonedAt: minutesAgo(60 * 31), status: 'PENDING' },
  { id: 'aq-3', company: 'Inversiones Sipán E.I.R.L.', contact: 'Renzo Paredes', phone: '+51 976 330 114', equipment: 'Rodillo tándem Bomag BW 120 AD-5', city: 'Chiclayo', days: 4, amount: 2_760, abandonedAt: minutesAgo(60 * 46), status: 'PENDING' },
  { id: 'aq-4', company: 'Grupo Nazca S.A.', contact: 'Patricia Salazar', phone: '+51 945 220 981', equipment: 'Minicargador Bobcat S650', city: 'Ica', days: 3, amount: 1_860, abandonedAt: minutesAgo(60 * 52), status: 'RECOVERED' },
  { id: 'aq-5', company: 'Contratistas Olmos S.A.C.', contact: 'César Benavides', phone: '+51 969 007 452', equipment: 'Plancha compactadora Wacker Neuson VP1550', city: 'Piura', days: 12, amount: 1_140, abandonedAt: minutesAgo(60 * 70), status: 'PENDING' },
  { id: 'aq-6', company: 'Corporación Tacna S.A.C.', contact: 'Gabriela Zevallos', phone: '+51 952 640 773', equipment: 'Manipulador telescópico JCB 540-170', city: 'Callao', days: 6, amount: 6_900, abandonedAt: minutesAgo(60 * 96), status: 'RECOVERED' },
]

export const ONBOARDING_STEPS: readonly OnboardingStep[] = ['ACCOUNT', 'RUC', 'REPRESENTATIVE', 'DOCUMENTS', 'FIRST_LISTING']

const ABANDONED_SIGNUPS: AbandonedSignup[] = [
  { id: 'as-1', company: 'Constructora Ausangate S.A.C.', email: 'operaciones@ausangate.pe', city: 'Cusco', completed: 3, lastSeenAt: minutesAgo(60 * 9), followedUp: false },
  { id: 'as-2', company: 'Inversiones Chillón E.I.R.L.', email: 'logistica@chillon.pe', city: 'Lima', completed: 1, lastSeenAt: minutesAgo(60 * 27), followedUp: false },
  { id: 'as-3', company: 'Maquinarias Chachani S.A.C.', email: 'alquiler@chachani.pe', city: 'Arequipa', completed: 4, lastSeenAt: minutesAgo(60 * 40), followedUp: true },
  { id: 'as-4', company: 'Edificaciones Pisco S.A.', email: 'compras@edifpisco.pe', city: 'Ica', completed: 2, lastSeenAt: minutesAgo(60 * 75), followedUp: false },
  { id: 'as-5', company: 'Contratistas Huaraz S.A.C.', email: 'gerencia@chuaraz.pe', city: 'Huancayo', completed: 2, lastSeenAt: minutesAgo(60 * 120), followedUp: true },
]

// --- AI copilot ---

const AI_TELEMETRY: AiTelemetry = {
  topQueries: [
    { query: 'excavadora para zanja de 2 metros en Lima por una semana', count: 412, conversion: 41.3, previousCount: 356 },
    { query: 'rodillo para asfaltar una vía de 800 metros en Arequipa', count: 287, conversion: 38.6, previousCount: 301 },
    { query: 'qué necesito para vaciar una losa de 120 m²', count: 254, conversion: 29.1, previousCount: 198 },
    { query: 'manipulador telescópico con operador en Callao', count: 233, conversion: 36.9, previousCount: 175 },
    { query: 'minicargador barato para limpieza de obra en Trujillo', count: 196, conversion: 33.2, previousCount: 188 },
    { query: 'generador de 60 kVA para campamento minero', count: 171, conversion: 27.5, previousCount: 122 },
    { query: 'plataforma para pintar fachada de 4 pisos', count: 149, conversion: 31.5, previousCount: 160 },
    { query: 'compactar relleno de terreno de 500 m² en Piura', count: 118, conversion: 24.6, previousCount: 97 },
  ],
  gaps: [
    { city: 'Callao', workType: 'lifting', unmetSearches: 37, availableUnits: 2, lostRevenue: 98_000 },
    { city: 'Arequipa', workType: 'earthworks', unmetSearches: 29, availableUnits: 4, lostRevenue: 121_500 },
    { city: 'Cusco', workType: 'compaction', unmetSearches: 22, availableUnits: 1, lostRevenue: 41_200 },
    { city: 'Trujillo', workType: 'earthworks', unmetSearches: 18, availableUnits: 3, lostRevenue: 63_800 },
    { city: 'Piura', workType: 'manual', unmetSearches: 14, availableUnits: 2, lostRevenue: 9_700 },
    { city: 'Huancayo', workType: 'lifting', unmetSearches: 11, availableUnits: 0, lostRevenue: 27_300 },
  ],
  weeks: [
    { week: daysAgo(77), shown: 1_820, clicked: 512, booked: 139 },
    { week: daysAgo(70), shown: 1_904, clicked: 548, booked: 152 },
    { week: daysAgo(63), shown: 2_011, clicked: 601, booked: 171 },
    { week: daysAgo(56), shown: 2_145, clicked: 655, booked: 188 },
    { week: daysAgo(49), shown: 2_090, clicked: 641, booked: 186 },
    { week: daysAgo(42), shown: 2_260, clicked: 713, booked: 214 },
    { week: daysAgo(35), shown: 2_388, clicked: 760, booked: 231 },
    { week: daysAgo(28), shown: 2_402, clicked: 791, booked: 249 },
    { week: daysAgo(21), shown: 2_517, clicked: 846, booked: 270 },
    { week: daysAgo(14), shown: 2_633, clicked: 902, booked: 294 },
    { week: daysAgo(7), shown: 2_711, clicked: 951, booked: 316 },
    { week: daysAgo(0), shown: 2_840, clicked: 1_012, booked: 346 },
  ],
}

// --- Finance ---

const COMMISSION_RATE = 0.08

const ESCROW: EscrowHold[] = [
  { code: 'RE-004812', renter: 'Constructora Rímac S.A.C.', owner: 'Maquinarias Huascarán S.A.C.', equipment: 'Excavadora Caterpillar 320 GC', rental: 12_950, deposit: 6_000, releaseOn: daysAhead(7), status: 'HELD' },
  { code: 'RE-004809', renter: 'Edificaciones Misti S.A.C.', owner: 'Alquileres Chachani S.A.C.', equipment: 'Rodillo vibratorio Dynapac CA2500D', rental: 6_250, deposit: 3_500, releaseOn: daysAhead(5), status: 'HELD' },
  { code: 'RE-004797', renter: 'Contratistas Salaverry E.I.R.L.', owner: 'Maquinarias Paracas S.A.', equipment: 'Manipulador telescópico Genie GTH-4018', rental: 8_010, deposit: 4_000, releaseOn: daysAhead(1), status: 'RELEASE_SCHEDULED' },
  { code: 'RE-004781', renter: 'Grupo Chan Chan S.A.', owner: 'Alquileres Moche E.I.R.L.', equipment: 'Retroexcavadora JCB 3CX', rental: 4_900, deposit: 2_500, releaseOn: daysAgo(2), status: 'DISPUTED' },
  { code: 'RE-004776', renter: 'Ingeniería y Obras Majes S.A.C.', owner: 'Maquinarias Colca S.A.C.', equipment: 'Generador diésel Cummins C60 D5', rental: 3_800, deposit: 1_500, releaseOn: daysAhead(3), status: 'HELD' },
  { code: 'RE-004770', renter: 'Corporación Pachacámac S.A.C.', owner: 'Alquileres Lurín S.A.C.', equipment: 'Plataforma tijera Genie GS-3246', rental: 2_520, deposit: 1_200, releaseOn: daysAhead(0), status: 'RELEASE_SCHEDULED' },
  { code: 'RE-004762', renter: 'Constructora Moche S.A.C.', owner: 'Maquinarias Huascarán S.A.C.', equipment: 'Cargador frontal Volvo L90H', rental: 9_600, deposit: 5_000, releaseOn: daysAhead(9), status: 'HELD' },
]

const payout = (id: string, owner: string, bank: Payout['bank'], gross: number, status: Payout['status'], date: IsoDate): Payout => ({
  id,
  owner,
  bank,
  gross,
  commission: Math.round(gross * COMMISSION_RATE * 100) / 100,
  status,
  date,
})

const PAYOUTS: Payout[] = [
  payout('PO-2611-07', 'Maquinarias Huascarán S.A.C.', 'BCP', 38_420, 'SCHEDULED', daysAhead(2)),
  payout('PO-2611-06', 'Alquileres Chachani S.A.C.', 'BBVA', 21_760, 'PROCESSING', daysAgo(0)),
  payout('PO-2611-05', 'Maquinarias Paracas S.A.', 'Interbank', 16_300, 'PROCESSING', daysAgo(0)),
  payout('PO-2611-04', 'Alquileres Moche E.I.R.L.', 'BCP', 9_850, 'ON_HOLD', daysAgo(2)),
  payout('PO-2611-03', 'Maquinarias Colca S.A.C.', 'Scotiabank', 12_940, 'PAID', daysAgo(4)),
  payout('PO-2611-02', 'Alquileres Lurín S.A.C.', 'BCP', 7_380, 'PAID', daysAgo(7)),
  payout('PO-2611-01', 'Maquinarias Huascarán S.A.C.', 'BCP', 41_200, 'PAID', daysAgo(11)),
]

function monthStart(monthsBack: number): IsoDate {
  const date = new Date(NOW.getFullYear(), NOW.getMonth() - monthsBack, 1)
  return toIsoDate(date)
}

// --- Movements ---

const EVENT_DETAILS: Record<AuditEventType, () => { detail: string; amount: number | null }> = {
  RESERVATION_CREATED: () => {
    const machine = pick(MACHINE_MODELS)
    const days = between(2, 14)
    return { detail: `Solicitó ${machineLabel(machine)} por ${days} días`, amount: machine.rate * days }
  },
  ESCROW_PAYMENT: () => {
    const amount = roundTo(between(1_200, 18_000), 10)
    return { detail: `Pago con tarjeta retenido en garantía (${pick(['Visa', 'Mastercard', 'Amex'])})`, amount }
  },
  AI_QUERY: () => ({ detail: `Consulta al copiloto: "${pick(AI_TELEMETRY.topQueries).query}"`, amount: null }),
  EQUIPMENT_PUBLISHED: () => {
    const machine = pick(MACHINE_MODELS)
    return { detail: `Publicó ${machineLabel(machine)} a S/ ${machine.rate.toLocaleString('es-PE')} por día`, amount: null }
  },
  STATUS_CHANGED: () => ({
    detail: pick([
      'Reserva pasó de Confirmada a En obra',
      'Reserva pasó de En obra a Completada',
      'Equipo pasó de Disponible a Mantenimiento',
      'Solicitud rechazada por el arrendador',
    ]),
    amount: null,
  }),
  REVIEW: () => ({ detail: `Calificó el equipo con ${between(3, 5)} de 5 estrellas`, amount: null }),
  LOGIN: () => ({ detail: pick(['Inicio de sesión con contraseña y 2FA', 'Inicio de sesión con Google', 'Inicio de sesión desde la app móvil']), amount: null }),
}

const EVENT_WEIGHTS: readonly AuditEventType[] = [
  'LOGIN', 'LOGIN', 'LOGIN', 'AI_QUERY', 'AI_QUERY', 'AI_QUERY', 'RESERVATION_CREATED', 'RESERVATION_CREATED',
  'ESCROW_PAYMENT', 'ESCROW_PAYMENT', 'STATUS_CHANGED', 'STATUS_CHANGED', 'EQUIPMENT_PUBLISHED', 'REVIEW',
]

function buildEvents(): AuditEvent[] {
  const active = MOCK_COMPANIES.filter((company) => company.status !== 'IN_REVIEW')
  let minutes = 2
  return Array.from({ length: 180 }, (_, index) => {
    const type = pick(EVENT_WEIGHTS)
    const company = pick(active)
    const { detail, amount } = EVENT_DETAILS[type]()
    minutes += between(3, 55)
    return {
      id: `ev-${String(9_000 - index)}`,
      type,
      at: minutesAgo(minutes),
      company: company.name,
      actor: company.representative?.name ?? '—',
      detail,
      amount,
      ip: `190.${between(40, 239)}.${between(0, 255)}.${between(1, 254)}`,
    }
  })
}

// --- Assembled datasets (each built once per load) ---

export function mockDashboard(): AdminDashboard {
  const pendingKyb = MOCK_COMPANIES.filter((company) => company.status === 'IN_REVIEW').length
  const bigAbandoned = ABANDONED_QUOTES.filter((quote) => quote.status === 'PENDING' && quote.amount > 3_000)
  const topGap = [...AI_TELEMETRY.gaps].sort((a, b) => b.unmetSearches - a.unmetSearches)[0]
  const onHold = PAYOUTS.filter((item) => item.status === 'ON_HOLD')
  const alerts: AdminAlert[] = [
    { kind: 'KYB_PENDING', count: pendingKyb, amount: null, detail: null },
    { kind: 'ABANDONED_QUOTES', count: bigAbandoned.length, amount: bigAbandoned.reduce((sum, quote) => sum + quote.amount, 0), detail: '3,000' },
    { kind: 'DEMAND_GAP', count: topGap.unmetSearches, amount: topGap.lostRevenue, detail: topGap.city },
    { kind: 'PAYOUT_ON_HOLD', count: onHold.length, amount: onHold.reduce((sum, item) => sum + item.gross, 0), detail: null },
  ]
  return {
    kpis: [
      kpi('gmv', 'PEN', GMV_SERIES),
      kpi('activeRentals', 'count', ACTIVE_SERIES),
      { ...kpi('verifiedCompanies', 'count', VERIFIED_SERIES), value: MOCK_COMPANIES.filter((company) => company.status === 'VERIFIED').length },
      kpi('aiConversion', 'percent', AI_SERIES),
    ],
    dailyRentals: DAILY_RENTALS,
    liveBookings: LIVE_BOOKINGS,
    alerts,
  }
}

const DAILY_RENTALS = buildDailyRentals()
const EVENTS = buildEvents()

export const mockEvents = (): AuditEvent[] => EVENTS
export const mockCampaigns = (): Campaign[] => CAMPAIGNS.map((campaign) => ({ ...campaign }))
export const mockAbandonedQuotes = (): AbandonedQuote[] => ABANDONED_QUOTES.map((quote) => ({ ...quote }))
export const mockAbandonedSignups = (): AbandonedSignup[] => ABANDONED_SIGNUPS.map((signup) => ({ ...signup }))
export const mockAiTelemetry = (): AiTelemetry => AI_TELEMETRY

export function mockFinance(): AdminFinance {
  // GMV of the last six months, ending on the dashboard's 156,350 → 184,500: the commission is its 8%.
  const monthly = [111_000, 121_900, 129_800, 140_700, 156_350, GMV_SERIES[GMV_SERIES.length - 1]].map((gmv, index) => ({
    month: monthStart(5 - index),
    amount: Math.round(gmv * COMMISSION_RATE),
  }))
  return { escrow: ESCROW, payouts: PAYOUTS, commissionRate: COMMISSION_RATE, monthlyCommission: monthly }
}

// The KPI and the directory must tell the same story: the verified count is read from the rows.
console.assert(
  mockDashboard().kpis.find((item) => item.id === 'verifiedCompanies')?.value === 68,
  'adminMockData: the demo directory should hold 68 verified companies',
)
