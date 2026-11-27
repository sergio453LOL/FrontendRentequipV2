import { Check, FileText, Mail, MessageCircle, Phone, Plus, Send, TicketPercent, UserRound, type LucideIcon } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { AdminPageHeader, Bar, BlockError, EmptyBlock, Panel, PanelHeader, Pill, Segmented, SelectField, SourceBadge, type PillTone } from '../../components/admin/AdminUi'
import { Button } from '../../components/common/Button'
import { Modal } from '../../components/common/Modal'
import { ONBOARDING_STEPS } from '../../data/adminMockData'
import { useAdminQuery } from '../../hooks/useAdminQuery'
import { useToast } from '../../hooks/useToast'
import { adminInsightsService } from '../../services/adminInsightsService'
import type { AbandonedQuote, AbandonedSignup, Campaign, CampaignSegment, CampaignStatus } from '../../types'
import { formatCount, formatDateTime, formatPercent, formatSoles } from '../../utils/adminFormat'
import { cn } from '../../utils/cn'
import { timeAgo } from '../../utils/timeAgo'

type Tab = 'newsletters' | 'quotes' | 'signups'
const TABS: Tab[] = ['newsletters', 'quotes', 'signups']
const SEGMENTS: CampaignSegment[] = ['RENTERS_LIMA', 'OWNERS_ALL', 'INACTIVE_90D', 'MINING_SOUTH', 'NEW_SIGNUPS']
/** Companies in each segment of the demo audience. */
const SEGMENT_SIZE: Record<CampaignSegment, number> = { RENTERS_LIMA: 3_412, OWNERS_ALL: 642, INACTIVE_90D: 2_096, MINING_SOUTH: 1_284, NEW_SIGNUPS: 318 }
const CAMPAIGN_TONES: Record<CampaignStatus, PillTone> = { SENT: 'green', SCHEDULED: 'blue', DRAFT: 'slate' }

const average = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null)

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="min-w-0 px-4 py-3.5 sm:px-5">
      <p className="text-[13px] font-medium text-slate-600">{label}</p>
      <p className="num mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {note && <p className="mt-0.5 text-xs text-slate-500">{note}</p>}
    </div>
  )
}

function Composer({ isOpen, onClose, onCreate }: { isOpen: boolean; onClose: () => void; onCreate: (campaign: Campaign) => void }) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [segment, setSegment] = useState<CampaignSegment>('RENTERS_LIMA')
  const [when, setWhen] = useState<'now' | 'schedule'>('schedule')
  const [date, setDate] = useState('')
  const [tried, setTried] = useState(false)
  const isValid = subject.trim() !== '' && body.trim() !== '' && (when === 'now' || date !== '')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTried(true)
    if (!isValid) return
    const now = new Date()
    const pad = (value: number) => String(value).padStart(2, '0')
    const nowIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:00`
    onCreate({
      id: `cmp-${Date.now()}`,
      name: name.trim() || subject.trim(),
      subject: subject.trim(),
      body: body.trim(),
      segment,
      status: when === 'now' ? 'SENT' : 'SCHEDULED',
      recipients: SEGMENT_SIZE[segment],
      openRate: null,
      clickRate: null,
      date: when === 'now' ? nowIso : `${date}:00`,
    })
    setName('')
    setSubject('')
    setBody('')
    setDate('')
    setTried(false)
  }

  const field = 'w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('admin.marketing.composer.title')}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="action" type="submit" form="composer" leftIcon={<Send className="size-4" />}>
            {when === 'now' ? t('admin.marketing.composer.send') : t('admin.marketing.composer.scheduleAction')}
          </Button>
        </>
      }
    >
      <form id="composer" onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
        <div className="space-y-3.5">
          <div>
            <label htmlFor="cmp-name" className="text-sm font-medium text-slate-800">{t('admin.marketing.composer.name')}</label>
            <input id="cmp-name" value={name} onChange={(event) => setName(event.target.value)} className={cn(field, 'mt-1.5 h-9')} />
          </div>
          <div>
            <label htmlFor="cmp-segment" className="text-sm font-medium text-slate-800">{t('admin.marketing.composer.segment')}</label>
            <SelectField
              id="cmp-segment"
              label={t('admin.marketing.composer.segment')}
              value={segment}
              onChange={setSegment}
              options={SEGMENTS.map((value) => ({ value, label: t(`admin.marketing.segments.${value}`) }))}
              className="mt-1.5"
            />
            <p className="num mt-1 text-xs text-slate-500">{t('admin.marketing.composer.audience', { count: SEGMENT_SIZE[segment], formatted: formatCount(SEGMENT_SIZE[segment]) })}</p>
          </div>
          <div>
            <label htmlFor="cmp-subject" className="text-sm font-medium text-slate-800">{t('admin.marketing.composer.subject')}</label>
            <input id="cmp-subject" value={subject} maxLength={120} onChange={(event) => setSubject(event.target.value)} className={cn(field, 'mt-1.5 h-9')} />
          </div>
          <div>
            <label htmlFor="cmp-body" className="text-sm font-medium text-slate-800">{t('admin.marketing.composer.body')}</label>
            <textarea id="cmp-body" value={body} rows={5} maxLength={1200} onChange={(event) => setBody(event.target.value)} className={cn(field, 'mt-1.5 py-2')} />
          </div>
          <fieldset>
            <legend className="text-sm font-medium text-slate-800">{t('admin.marketing.composer.when')}</legend>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Segmented
                layoutId="composer-when"
                label={t('admin.marketing.composer.when')}
                value={when}
                onChange={setWhen}
                options={[
                  { value: 'schedule', label: t('admin.marketing.composer.schedule') },
                  { value: 'now', label: t('admin.marketing.composer.now') },
                ]}
              />
              {when === 'schedule' && (
                <input
                  type="datetime-local"
                  aria-label={t('admin.marketing.composer.date')}
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className={cn(field, 'h-8 w-auto')}
                />
              )}
            </div>
          </fieldset>
          {tried && !isValid && <p className="text-xs text-negative">{t('admin.marketing.composer.required')}</p>}
        </div>

        <div>
          <p className="text-sm font-medium text-slate-800">{t('admin.marketing.composer.preview')}</p>
          <div className="mt-1.5 overflow-hidden rounded-md border border-slate-200">
            <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <p className="truncate">{t('admin.marketing.composer.from')}</p>
              <p className="mt-0.5 truncate font-semibold text-slate-900">{subject || t('admin.marketing.composer.subjectPlaceholder')}</p>
            </div>
            <div className="theme-light bg-white px-4 py-4">
              <div className="flex items-center gap-2">
                <span className="size-5 rounded bg-brand" aria-hidden="true" />
                <span className="text-sm font-bold text-[#0f172a]">RentEquip</span>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed whitespace-pre-line text-slate-700">{body || t('admin.marketing.composer.bodyPlaceholder')}</p>
              <span className="mt-4 inline-flex h-8 items-center rounded-md bg-action px-3 text-xs font-semibold text-white">{t('admin.marketing.composer.cta')}</span>
              <p className="mt-4 text-[11px] text-slate-500">{t('admin.marketing.composer.footer')}</p>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  )
}

function Newsletters() {
  const { t } = useTranslation()
  const toast = useToast()
  const { data, error, isLoading, reload, setData } = useAdminQuery(adminInsightsService.campaigns)
  const [isComposing, setIsComposing] = useState(false)
  const sent = (data ?? []).filter((campaign) => campaign.status === 'SENT' && campaign.openRate !== null)
  const openRate = average(sent.map((campaign) => campaign.openRate ?? 0))
  const clickRate = average(sent.map((campaign) => campaign.clickRate ?? 0))

  return (
    <>
      <Panel className="grid grid-cols-2 divide-slate-200/80 sm:grid-cols-3 sm:divide-x">
        <Metric label={t('admin.marketing.openRate')} value={openRate !== null ? formatPercent(openRate) : '—'} note={t('admin.marketing.averageOf', { count: sent.length })} />
        <Metric label={t('admin.marketing.clickRate')} value={clickRate !== null ? formatPercent(clickRate) : '—'} note={t('admin.marketing.averageOf', { count: sent.length })} />
        <div className="col-span-2 border-t border-slate-200/80 sm:col-span-1 sm:border-t-0">
          <Metric label={t('admin.marketing.reached')} value={formatCount(sent.reduce((sum, campaign) => sum + campaign.recipients, 0))} note={t('admin.marketing.reachedNote')} />
        </div>
      </Panel>

      <Panel className="mt-4" aria-labelledby="campaigns-title">
        <PanelHeader
          id="campaigns-title"
          title={t('admin.marketing.campaigns')}
          actions={
            <Button variant="action" size="sm" leftIcon={<Plus className="size-4" />} onClick={() => setIsComposing(true)}>
              {t('admin.marketing.newCampaign')}
            </Button>
          }
        />
        <div className="hidden grid-cols-[minmax(0,1fr)_96px_96px_96px_124px] gap-x-4 border-t border-slate-200/80 px-5 py-2 text-xs text-slate-500 md:grid">
          <span>{t('admin.marketing.columnsHint')}</span>
          <span className="text-right">{t('admin.marketing.recipients')}</span>
          <span className="text-right">{t('admin.marketing.open')}</span>
          <span className="text-right">{t('admin.marketing.clicks')}</span>
          <span className="text-right">{t('admin.marketing.date')}</span>
        </div>
        {error && <BlockError message={error.message} onRetry={reload} />}
        {isLoading && !data ? (
          <div className="space-y-2 px-4 pb-4 sm:px-5">
            {Array.from({ length: 5 }, (_, index) => <Bar key={index} className="h-12" />)}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 border-t border-slate-100 md:border-t-0">
            {(data ?? []).map((campaign) => (
              <li key={campaign.id} className="grid gap-x-4 gap-y-1.5 px-4 py-3 sm:px-5 md:grid-cols-[minmax(0,1fr)_96px_96px_96px_124px] md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-slate-900">{campaign.name}</p>
                    <Pill tone={CAMPAIGN_TONES[campaign.status]}>{t(`admin.marketing.campaignStatus.${campaign.status}`)}</Pill>
                  </div>
                  <p className="mt-0.5 truncate text-[13px] text-slate-600" title={campaign.subject}>
                    {t(`admin.marketing.segments.${campaign.segment}`)} · {campaign.subject}
                  </p>
                </div>
                <p className="num text-sm text-slate-700 md:text-right">
                  <span className="text-xs text-slate-500 md:hidden">{t('admin.marketing.recipients')} </span>
                  {campaign.recipients ? formatCount(campaign.recipients) : <span className="text-slate-400">—</span>}
                </p>
                <p className="num text-sm text-slate-900 md:text-right">
                  <span className="text-xs text-slate-500 md:hidden">{t('admin.marketing.open')} </span>
                  {campaign.openRate !== null ? formatPercent(campaign.openRate) : <span className="text-slate-400">—</span>}
                </p>
                <p className="num text-sm text-slate-900 md:text-right">
                  <span className="text-xs text-slate-500 md:hidden">{t('admin.marketing.clicks')} </span>
                  {campaign.clickRate !== null ? formatPercent(campaign.clickRate) : <span className="text-slate-400">—</span>}
                </p>
                <p className="num text-[13px] text-slate-500 md:text-right">{formatDateTime(campaign.date)}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Composer
        isOpen={isComposing}
        onClose={() => setIsComposing(false)}
        onCreate={(campaign) => {
          setData((current) => [campaign, ...(current ?? [])])
          setIsComposing(false)
          toast.success(t(campaign.status === 'SENT' ? 'admin.marketing.composer.sent' : 'admin.marketing.composer.created', { name: campaign.name }))
        }}
      />
    </>
  )
}

function whatsappLink(phone: string, message: string): string {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
}

function Quotes() {
  const { t } = useTranslation()
  const toast = useToast()
  const { data, error, isLoading, reload, setData } = useAdminQuery(adminInsightsService.abandonedQuotes)
  const [coupons, setCoupons] = useState<Set<string>>(new Set())
  const quotes = data ?? []
  const pending = quotes.filter((quote) => quote.status === 'PENDING')
  const recovered = quotes.filter((quote) => quote.status === 'RECOVERED')
  const sum = (items: AbandonedQuote[]) => items.reduce((total, quote) => total + quote.amount, 0)

  function markRecovered(id: string) {
    setData((current) => (current ?? []).map((quote) => (quote.id === id ? { ...quote, status: 'RECOVERED' } : quote)))
  }

  return (
    <>
      <Panel className="grid grid-cols-2 sm:grid-cols-3 sm:divide-x sm:divide-slate-200/80">
        <Metric label={t('admin.marketing.quotes.potential')} value={formatSoles(sum(pending))} note={t('admin.marketing.quotes.pendingCount', { count: pending.length })} />
        <Metric label={t('admin.marketing.quotes.recovered')} value={formatSoles(sum(recovered))} note={t('admin.marketing.quotes.recoveredCount', { count: recovered.length })} />
        <div className="col-span-2 border-t border-slate-200/80 sm:col-span-1 sm:border-t-0">
          <Metric
            label={t('admin.marketing.quotes.recoveryRate')}
            value={quotes.length ? formatPercent((recovered.length / quotes.length) * 100) : '—'}
            note={t('admin.marketing.quotes.recoveryNote', { count: quotes.length })}
          />
        </div>
      </Panel>
      <Panel className="mt-4" aria-labelledby="quotes-title">
        <PanelHeader id="quotes-title" title={t('admin.marketing.tabs.quotes')} meta={t('admin.marketing.quotes.meta')} />
        {error && <BlockError message={error.message} onRetry={reload} />}
        {isLoading && !data ? (
          <div className="space-y-2 px-4 pb-4 sm:px-5">{Array.from({ length: 5 }, (_, index) => <Bar key={index} className="h-14" />)}</div>
        ) : quotes.length === 0 ? (
          <EmptyBlock>{t('admin.marketing.quotes.empty')}</EmptyBlock>
        ) : (
          <ul className="divide-y divide-slate-100 border-t border-slate-200/80">
            {[...quotes].sort((a, b) => Number(a.status === 'RECOVERED') - Number(b.status === 'RECOVERED') || b.amount - a.amount).map((quote) => {
              const couponSent = coupons.has(quote.id)
              const isRecovered = quote.status === 'RECOVERED'
              return (
                <li key={quote.id} className="grid gap-x-4 gap-y-2 px-4 py-3 sm:px-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_96px_440px] xl:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{quote.company}</p>
                    <p className="truncate text-[13px] text-slate-600">
                      {quote.contact} · <span className="num">{quote.phone}</span>
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-800">{quote.equipment}</p>
                    <p className="text-[13px] text-slate-600">
                      {quote.city} · {t('common.day', { count: quote.days })} · {timeAgo(quote.abandonedAt)}
                    </p>
                  </div>
                  <p className="num text-sm font-semibold text-slate-900 xl:text-right">{formatSoles(quote.amount)}</p>
                  <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                    <Pill tone={isRecovered ? 'green' : 'amber'}>{t(`admin.marketing.quotes.status.${quote.status}`)}</Pill>
                    {!isRecovered && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={couponSent}
                          leftIcon={couponSent ? <Check className="size-4" /> : <TicketPercent className="size-4" />}
                          onClick={() => {
                            setCoupons((current) => new Set(current).add(quote.id))
                            toast.success(t('admin.marketing.quotes.couponSent', { name: quote.contact }))
                          }}
                        >
                          {couponSent ? t('admin.marketing.quotes.couponDone') : t('admin.marketing.quotes.coupon')}
                        </Button>
                        <a
                          href={whatsappLink(quote.phone, t('admin.marketing.quotes.whatsappText', { name: quote.contact.split(' ')[0], equipment: quote.equipment }))}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                        >
                          <MessageCircle className="size-4" aria-hidden="true" />
                          {t('admin.marketing.quotes.whatsapp')}
                        </a>
                        <button type="button" onClick={() => markRecovered(quote.id)} className="h-8 px-1 text-sm font-medium text-slate-600 hover:text-slate-900 hover:underline">
                          {t('admin.marketing.quotes.markRecovered')}
                        </button>
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
    </>
  )
}

/** One fact the company left in the form: an icon, its label for screen readers, the value. */
function ContactFact({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <dt className="shrink-0">
        <Icon className="size-3.5 text-slate-400" strokeWidth={1.75} aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </dt>
      <dd className="min-w-0 truncate text-[13px] text-slate-700">{children}</dd>
    </div>
  )
}

const contactLink = 'text-slate-800 underline-offset-2 hover:text-slate-950 hover:underline'

function Signups() {
  const { t } = useTranslation()
  const toast = useToast()
  const { data, error, isLoading, reload, setData } = useAdminQuery(adminInsightsService.abandonedSignups)
  const total = ONBOARDING_STEPS.length

  function followUp(signup: AbandonedSignup) {
    setData((current) => (current ?? []).map((item) => (item.id === signup.id ? { ...item, followedUp: true } : item)))
    toast.success(t('admin.marketing.signups.followToast', { name: signup.contactName }))
  }

  return (
    <Panel aria-labelledby="signups-title">
      <PanelHeader id="signups-title" title={t('admin.marketing.tabs.signups')} meta={t('admin.marketing.signups.meta', { count: data?.length ?? 0 })} />
      {error && <BlockError message={error.message} onRetry={reload} />}
      {isLoading && !data ? (
        <div className="space-y-2 px-4 pb-4 sm:px-5">{Array.from({ length: 5 }, (_, index) => <Bar key={index} className="h-24" />)}</div>
      ) : (data ?? []).length === 0 ? (
        <EmptyBlock>{t('admin.marketing.signups.empty')}</EmptyBlock>
      ) : (
        <>
          <div className="hidden grid-cols-[minmax(0,0.8fr)_minmax(0,1.1fr)_minmax(0,1.1fr)_232px] gap-x-6 border-t border-slate-200/80 px-5 py-2 text-xs text-slate-500 xl:grid">
            <span>{t('admin.marketing.signups.columns.company')}</span>
            <span>{t('admin.marketing.signups.columns.data')}</span>
            <span>{t('admin.marketing.signups.columns.progress')}</span>
            <span className="text-right">{t('admin.marketing.signups.columns.actions')}</span>
          </div>
          <ul className="divide-y divide-slate-100 border-t border-slate-200/80 xl:border-slate-100">
            {(data ?? []).map((signup) => {
              const next = ONBOARDING_STEPS[signup.completed]
              const firstName = signup.contactName.split(' ')[0]
              const stepName = next ? t(`admin.marketing.signups.steps.${next}`) : ''
              const message = t('admin.marketing.signups.messageText', { name: firstName, company: signup.company, step: stepName })
              const mailto = `mailto:${signup.email}?subject=${encodeURIComponent(t('admin.marketing.signups.emailSubject'))}&body=${encodeURIComponent(message)}`
              return (
                <li key={signup.id} className="grid gap-x-6 gap-y-3 px-4 py-3.5 sm:px-5 md:grid-cols-2 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.1fr)_minmax(0,1.1fr)_232px] xl:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{signup.company}</p>
                    <p className="mt-0.5 text-[13px] text-slate-600">
                      {signup.city} · {t(`admin.marketing.signups.channels.${signup.channel}`)}
                    </p>
                    <p className="text-xs text-slate-500">{t('admin.marketing.signups.lastSeen', { when: timeAgo(signup.lastSeenAt) })}</p>
                  </div>

                  <dl className="grid min-w-0 gap-1" aria-label={t('admin.marketing.signups.columns.data')}>
                    <ContactFact icon={UserRound} label={t('admin.marketing.signups.fields.contact')}>
                      <span className="font-medium text-slate-900">{signup.contactName}</span>
                      <span className="text-slate-500"> · {signup.contactRole}</span>
                    </ContactFact>
                    <ContactFact icon={Phone} label={t('admin.marketing.signups.fields.phone')}>
                      <a href={`tel:${signup.phone.replace(/\s/g, '')}`} className={cn('num', contactLink)}>
                        {signup.phone}
                      </a>
                    </ContactFact>
                    <ContactFact icon={Mail} label={t('admin.marketing.signups.fields.email')}>
                      <a href={`mailto:${signup.email}`} className={contactLink} title={signup.email}>
                        {signup.email}
                      </a>
                    </ContactFact>
                    <ContactFact icon={FileText} label={t('admin.marketing.signups.fields.ruc')}>
                      {signup.ruc ? <span className="num">{signup.ruc}</span> : <span className="text-slate-500">{t('admin.marketing.signups.rucMissing')}</span>}
                    </ContactFact>
                  </dl>

                  <div className="min-w-0">
                    <div className="flex items-baseline justify-between gap-3 text-[13px]">
                      <span className="truncate text-slate-700">{next ? t('admin.marketing.signups.stoppedAt', { step: stepName }) : ''}</span>
                      <span className="num shrink-0 text-slate-500">{t('admin.marketing.signups.stepCount', { done: signup.completed, total })}</span>
                    </div>
                    <div className="mt-1.5 grid gap-1" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }} role="img" aria-label={t('admin.marketing.signups.stepCount', { done: signup.completed, total })}>
                      {ONBOARDING_STEPS.map((step, index) => (
                        <span key={step} title={t(`admin.marketing.signups.steps.${step}`)} className={cn('h-1.5 rounded-full', index < signup.completed ? 'bg-brand' : 'bg-slate-200')} />
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                    <a
                      href={whatsappLink(signup.phone, message)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => !signup.followedUp && followUp(signup)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                    >
                      <MessageCircle className="size-4" aria-hidden="true" />
                      {t('admin.marketing.signups.whatsapp')}
                    </a>
                    <a
                      href={mailto}
                      onClick={() => !signup.followedUp && followUp(signup)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                    >
                      <Mail className="size-4" aria-hidden="true" />
                      {t('admin.marketing.signups.email')}
                    </a>
                    {signup.followedUp && (
                      <span className="inline-flex h-8 basis-full items-center gap-1.5 text-xs text-slate-600 xl:justify-end">
                        <Check className="size-3.5 text-positive" aria-hidden="true" />
                        {t('admin.marketing.signups.followedUp')}
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </Panel>
  )
}

export default function AdminMarketingPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('tab')
  const tab: Tab = TABS.includes(requested as Tab) ? (requested as Tab) : 'newsletters'

  function changeTab(next: Tab) {
    setSearchParams(
      (params) => {
        if (next === 'newsletters') params.delete('tab')
        else params.set('tab', next)
        return params
      },
      { replace: true },
    )
  }

  return (
    <>
      <AdminPageHeader title={t('admin.marketing.title')} subtitle={t('admin.marketing.subtitle')} source={<SourceBadge kind="demo" />} />
      <Segmented
        variant="underline"
        layoutId="marketing-tab"
        label={t('admin.marketing.tabsLabel')}
        value={tab}
        onChange={changeTab}
        options={TABS.map((value) => ({ value, label: t(`admin.marketing.tabs.${value}`) }))}
        className="mb-4"
      />
      {tab === 'newsletters' && <Newsletters />}
      {tab === 'quotes' && <Quotes />}
      {tab === 'signups' && <Signups />}
    </>
  )
}
