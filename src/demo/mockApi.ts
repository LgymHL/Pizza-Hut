import { UNITS, allowedUnitIds, getCurrentUser } from './profiles'
import {
  addDays,
  dailySales,
  datesBetween,
  monthlyPeriods,
  periodSummary,
  salesPeriods,
  todayISO,
  unitName,
  wasteRecords,
  yesterdayISO,
  type DailySale,
  type Period,
} from './data'
import { NOVEMBER_PRODUCTS, OCTOBER, REAL_FILES } from './real'

/**
 * API simulada: intercepta o fetch para a API do Pizza Hut BI e responde
 * com dados fictícios, no mesmo formato que o backend real devolveria.
 * Assim as telas originais funcionam sem backend.
 */

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '')

type Ctx = {
  method: string
  path: string
  query: URLSearchParams
  body: unknown
}

type Handler = (ctx: Ctx, match: RegExpMatchArray) => unknown

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// ---------- estado em memória (mutável pelas telas) ----------

// mesmo array usado pelos gráficos, para edições aparecerem em todas as telas
const salesStore: DailySale[] = dailySales

type PlanningEvent = {
  id: string
  title: string
  description: string | null
  date: string
  unitId: string | null
}

const planningEvents: PlanningEvent[] = [
  {
    id: 'ev-1',
    title: 'Alta demanda prevista (avaliação manual)',
    description: 'Jogo decisivo do campeonato à noite.',
    date: addDays(todayISO(), 4),
    unitId: null,
  },
  {
    id: 'ev-2',
    title: 'Campanha iFood: frete grátis',
    description: 'Ação promocional do aplicativo.',
    date: addDays(todayISO(), 9),
    unitId: 'unit-renascenca',
  },
]

type ImportItem = {
  id: string
  fileName: string
  source: 'GMAIL' | 'MANUAL'
  status: 'RECEIVED' | 'PROCESSING' | 'PROCESSED' | 'FAILED'
  reportType: 'SALES' | 'WASTE' | 'PRODUCTS' | 'OTHER'
  receivedAt: string
  processedAt: string | null
  lastAttemptAt: string | null
  errorMessage: string | null
  periodStart: string | null
  periodEnd: string | null
  unit: { id: string; name: string; slug: string } | null
}

const imports: ImportItem[] = buildImportHistory()

function buildImportHistory(): ImportItem[] {
  // Arquivos reais enviados pelo cliente
  return REAL_FILES.map((f, i) => {
    const unit = f.unitId ? UNITS.find((u) => u.id === f.unitId) ?? null : null
    const at = `${f.at}.000-03:00`
    return {
      id: `imp-real-${i + 1}`,
      fileName: f.file,
      source: 'MANUAL' as const,
      status: 'PROCESSED' as const,
      reportType: f.type,
      receivedAt: at,
      processedAt: at,
      lastAttemptAt: at,
      errorMessage: null,
      periodStart: f.start,
      periodEnd: f.end,
      unit: unit ? { ...unit } : null,
    }
  }).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
}

type DemoUser = {
  id: string
  name: string
  email: string
  role: 'GENERAL_MANAGER' | 'UNIT_MANAGER'
  active: boolean
  createdAt: string
  units: { id: string; name: string; slug: string }[]
}

const users: DemoUser[] = [
  { id: 'demo-geral', name: 'Gerente Geral', email: 'gerente.geral@demo.local', role: 'GENERAL_MANAGER', active: true, createdAt: '2026-09-01T12:00:00.000Z', units: [...UNITS] },
  { id: 'demo-holandeses', name: 'Gerente Holandeses', email: 'gerente.holandeses@demo.local', role: 'UNIT_MANAGER', active: true, createdAt: '2026-09-02T12:00:00.000Z', units: [UNITS[0]] },
  { id: 'demo-renascenca', name: 'Gerente Renascença', email: 'gerente.renascenca@demo.local', role: 'UNIT_MANAGER', active: true, createdAt: '2026-09-02T12:00:00.000Z', units: [UNITS[1]] },
]

type Invitation = {
  id: string
  name: string
  email: string
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REVOKED'
  createdAt: string
  expiresAt: string | null
  unit: { id: string; name: string; slug: string }
}

const invitations: Invitation[] = [
  { id: 'inv-1', name: 'Supervisor de turno', email: 'supervisor@demo.local', status: 'SENT', createdAt: '2026-11-10T12:00:00.000Z', expiresAt: '2026-12-10T12:00:00.000Z', unit: UNITS[0] },
]

// ---------- auxiliares ----------

function requireGeneralManager() {
  if (getCurrentUser().role !== 'GENERAL_MANAGER') {
    throw new HttpError(403, 'Acesso permitido apenas ao Gerente Geral.')
  }
}

function scopedUnits(query: URLSearchParams) {
  const ids = allowedUnitIds(query.get('unitId'))
  if (query.get('unitId') && ids.length === 0) {
    throw new HttpError(403, 'Você não possui acesso a essa unidade.')
  }
  return UNITS.filter((u) => ids.includes(u.id))
}

function pickPeriod(query: URLSearchParams, list: Period[]): Period | null {
  const start = query.get('startDate')
  const end = query.get('endDate')
  if (start && end) return { startDate: start, endDate: end }
  return list[0] ?? null
}

// ---------- handlers ----------

const routes: [string, RegExp, Handler][] = [
  ['GET', /^\/health$/, () => ({ status: 'ok', database: 'connected', service: 'demo (relatórios reais carregados no navegador)' })],

  ['GET', /^\/auth\/me$/, () => getCurrentUser()],

  ['GET', /^\/units$/, () => [...UNITS]],

  ['GET', /^\/dashboard\/periods$/, ({ query }) => {
    return query.get('source') === 'MONTHLY' ? monthlyPeriods() : salesPeriods()
  }],

  ['GET', /^\/dashboard\/overview$/, ({ query }) => {
    const units = scopedUnits(query)
    const period = pickPeriod(query, salesPeriods())
    const missingAll = () => ({ status: 'NO_DATA', expectedCount: units.length, availableCount: 0, missingCount: units.length, availableUnits: [], missingUnits: units.map((u) => ({ id: u.id, name: u.name })) })
    if (!period) {
      return { periodStart: null, periodEnd: null, totalSales: 0, totalTickets: 0, averageTicket: 0, units: [], coverage: missingAll() }
    }

    // Dados REAIS: relatório do período (novembro) ou soma dos dias (outubro)
    const rows = units
      .map((unit) => {
        const s = periodSummary(unit.id, period.startDate, period.endDate)
        if (!s) return null
        const r = s.report
        return {
          id: `ov-${unit.id}-${period.startDate}-${period.endDate}`,
          unit,
          periodStart: period.startDate,
          periodEnd: period.endDate,
          grossSales: r?.gross ?? s.invoiced,
          discounts: r?.discounts ?? 0,
          invoicedSales: s.invoiced,
          storeSales: r?.storeSales ?? s.invoiced,
          ticketCount: s.tickets,
          averageTicket: s.tickets ? s.invoiced / s.tickets : 0,
          ifoodSharePercent: r?.ifoodSharePct ?? null,
          ticketsEstimated: s.ticketsEstimated,
          canceledOrders: r?.canceledOrders ?? null,
          source: r?.source ?? OCTOBER.source,
        }
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)

    const totalSales = rows.reduce((s, r) => s + r.invoicedSales, 0)
    const totalTickets = rows.reduce((s, r) => s + r.ticketCount, 0)
    const missing = units
      .filter((u) => !rows.some((r) => r.unit.id === u.id))
      .map((u) => ({ id: u.id, name: u.name }))

    return {
      periodStart: period.startDate,
      periodEnd: period.endDate,
      totalSales,
      totalTickets,
      averageTicket: totalTickets ? totalSales / totalTickets : 0,
      units: rows,
      coverage: {
        status: rows.length === 0 ? 'NO_DATA' : missing.length ? 'PARTIAL' : 'COMPLETE',
        expectedCount: units.length,
        availableCount: rows.length,
        missingCount: missing.length,
        availableUnits: rows.map((r) => ({ id: r.unit.id, name: r.unit.name })),
        missingUnits: missing,
      },
    }
  }],

  ['GET', /^\/dashboard\/units$/, ({ query }) => scopedUnits(query).map((u) => ({ id: u.id, unit: u }))],

  // Fechamento mensal REAL: outubro (Power BI) e novembro parcial (01 a 23)
  ['GET', /^\/dashboard\/monthly$/, ({ query }) => {
    const units = scopedUnits(query)
    const unitRows: Record<string, string | number | null>[] = []
    const products: Record<string, string | number>[] = []

    for (const period of monthlyPeriods()) {
      for (const unit of units) {
        const s = periodSummary(unit.id, period.startDate, period.endDate)
        if (!s) continue
        const isOct = period.startDate.startsWith('2026-10')
        const list: [string, number][] = isOct
          ? OCTOBER.units[unit.id].topProducts
          : (NOVEMBER_PRODUCTS[unit.id] ?? []).map((p) => [p.nome, p.qtd])
        const cents = Math.round(s.invoiced * 100)
        unitRows.push({
          snapshotId: `m-${unit.id}-${period.startDate}`,
          unitId: unit.id,
          unitName: unit.name,
          periodStart: period.startDate,
          periodEnd: period.endDate,
          ticketCount: s.tickets,
          averageTicketCents: isOct ? Math.round(OCTOBER.units[unit.id].averageTicket * 100) : Math.round(cents / s.tickets),
          displayedMainValueCents: cents,
          approximateDailySumCents: isOct
            ? dailySales.filter((r) => r.unitId === unit.id).reduce((t, r) => t + r.salesCents, 0)
            : cents,
          productCount: list.length,
        })
        list.forEach(([name, qty], index) => {
          products.push({
            unitId: unit.id,
            unitName: unit.name,
            periodStart: period.startDate,
            periodEnd: period.endDate,
            productName: name,
            quantity: qty,
            rankingPosition: index + 1,
          })
        })
      }
    }

    return {
      overview: {
        snapshotCount: unitRows.length,
        ticketCount: unitRows.reduce((s, u) => s + Number(u.ticketCount), 0),
        approximateDailySumCents: unitRows.reduce((s, u) => s + Number(u.approximateDailySumCents), 0),
      },
      units: unitRows,
      products,
    }
  }],

  // Detalhe REAL do relatório de vendas (pagamentos, canais, cancelamentos)
  ['GET', /^\/dashboard\/sales-details$/, ({ query }) => {
    const units = scopedUnits(query)
    const period = pickPeriod(query, salesPeriods())
    if (!period) return { forbidden: false, period: null, units: [] }

    const rows = units.flatMap((unit) => {
      const s = periodSummary(unit.id, period.startDate, period.endDate)
      if (!s) return []
      const r = s.report
      const cents = (v: number) => Math.round(v * 100)
      return [{
        id: `sd-${unit.id}-${period.startDate}-${period.endDate}`,
        unitId: unit.id,
        unitName: unit.name,
        grossSalesCents: cents(r?.gross ?? s.invoiced),
        discountsCents: cents(r?.discounts ?? 0),
        invoicedSalesCents: cents(s.invoiced),
        storeSalesCents: cents(r?.storeSales ?? s.invoiced),
        ticketCount: s.tickets,
        averageTicketCents: s.tickets ? Math.round(cents(s.invoiced) / s.tickets) : 0,
        ifoodSharePercent: r?.ifoodSharePct ?? null,
        details: !r ? null : {
          payments: (r.payments ?? []).map((p) => ({
            method: p.method,
            totalCents: cents(p.total),
            breakdown: p.breakdown
              ? p.breakdown.map((b) => ({ brand: b.brand, count: b.count, totalCents: cents(b.total) }))
              : [{ brand: p.method, count: p.count, totalCents: cents(p.total) }],
          })),
          channels: r.channels.map((c) => ({ name: c.name, level: 0, tickets: c.tickets, grossCents: cents(c.gross), discountsCents: cents(c.discount), totalCents: cents(c.total) })),
          cancellations: {
            orders: { count: r.canceledOrders?.count ?? -1, totalCents: cents(r.canceledOrders?.total ?? 0) },
            canceledCoupons: { count: r.canceledWithCoupons.count ?? -1, totalCents: cents(r.canceledWithCoupons.total) },
            uncanceledCoupons: { count: r.canceledWithoutCoupons.count ?? -1, totalCents: cents(r.canceledWithoutCoupons.total) },
          },
          tipsCents: cents(r.tips),
          generatedAt: `${r.generatedAt}.000-03:00`,
          lastSaleProcessedAt: `${r.lastSaleAt}.000-03:00`,
        },
      }]
    })

    return { forbidden: false, period: { start: period.startDate, end: period.endDate }, units: rows }
  }],

  // Desperdício REAL (27/10 a 02/11/2026)
  ['GET', /^\/dashboard\/waste\/full$/, ({ query }) => {
    const ids: string[] = scopedUnits(query).map((u) => u.id)
    const start = query.get('startDate')
    const end = query.get('endDate')
    const list = wasteRecords.filter(
      (w) => ids.includes(w.unitId) && (!start || w.date >= start) && (!end || w.date <= end),
    )

    const group = (keyOf: (w: typeof list[number]) => string, extra: (w: typeof list[number]) => Record<string, string>) => {
      const map = new Map<string, { occurrences: number; lossCents: number } & Record<string, string | number>>()
      for (const w of list) {
        const k = keyOf(w)
        const cur = map.get(k) ?? { occurrences: 0, lossCents: 0, ...extra(w) }
        cur.occurrences += 1
        cur.lossCents += w.lossCents
        map.set(k, cur)
      }
      return [...map.values()].sort((a, b) => b.lossCents - a.lossCents)
    }

    return {
      overview: {
        occurrences: list.length,
        totalLossCents: list.reduce((s, w) => s + w.lossCents, 0),
      },
      units: group((w) => w.unitId, (w) => ({ unitId: w.unitId, unitName: w.unitName })),
      reasons: group((w) => w.reason, (w) => ({ reason: w.reason })),
      products: group((w) => w.productCode, (w) => ({ productCode: w.productCode, productName: w.productName })),
      trend: group((w) => w.date, (w) => ({ date: w.date })).sort((a, b) => String(a.date).localeCompare(String(b.date))),
      shifts: group((w) => w.shift, (w) => ({ shift: w.shift })),
      types: group((w) => w.type, (w) => ({ type: w.type, typeDescription: w.typeDescription })),
      occurrences: [...list].sort((a, b) => b.date.localeCompare(a.date)),
    }
  }],
  ['GET', /^\/daily-sales$/, ({ query }) => {
    const ids: string[] = scopedUnits(query).map((u) => u.id)
    const month = query.get('month') ?? todayISO().slice(0, 7)
    const records = salesStore
      .filter((r) => ids.includes(r.unitId) && r.date.startsWith(month))
      .sort((a, b) => b.date.localeCompare(a.date) || a.unitName.localeCompare(b.unitName))
    return { month, totalRecords: records.length, records }
  }],

  ['POST', /^\/daily-sales$/, ({ body }) => {
    requireGeneralManager()
    const input = body as { unitId: string; date: string; ticketCount: number; salesCents: number }
    if (salesStore.some((r) => r.unitId === input.unitId && r.date === input.date)) {
      throw new HttpError(409, 'Já existe um registro para essa unidade nessa data.')
    }
    const record: DailySale = {
      id: `ds-manual-${Date.now()}`,
      unitId: input.unitId,
      unitName: unitName(input.unitId),
      date: input.date,
      ticketCount: input.ticketCount,
      salesCents: input.salesCents,
      source: 'MANUAL',
    }
    salesStore.push(record)
    return record
  }],

  ['PATCH|PUT', /^\/daily-sales\/([^/]+)$/, ({ body }, m) => {
    requireGeneralManager()
    const record = salesStore.find((r) => r.id === decodeURIComponent(m[1]))
    if (!record) throw new HttpError(404, 'Registro não encontrado.')
    Object.assign(record, body as Partial<DailySale>)
    return record
  }],

  ['DELETE', /^\/daily-sales\/([^/]+)$/, (_ctx, m) => {
    requireGeneralManager()
    const index = salesStore.findIndex((r) => r.id === decodeURIComponent(m[1]))
    if (index < 0) throw new HttpError(404, 'Registro não encontrado.')
    salesStore.splice(index, 1)
    return { message: 'Registro excluído.' }
  }],

  // ----- planejamento -----

  ['GET', /^\/planning\/calendar$/, ({ query }) => {
    const ids = allowedUnitIds(query.get('unitId'))
    const month = query.get('month') ?? todayISO().slice(0, 7)
    const [y, m] = month.split('-').map(Number)
    const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)

    const days = datesBetween(`${month}-01`, last).map((date) => {
      const weekDay = new Date(`${date}T12:00:00Z`).getUTCDay()
      const holiday = holidayOn(date)
      const events = planningEvents.filter(
        (e) => e.date === date && (e.unitId === null || ids.includes(e.unitId)),
      )
      const reasons: string[] = []
      if (weekDay === 5 || weekDay === 6) reasons.push('Fim de semana: histórico de maior movimento')
      if (holiday) reasons.push(`Feriado: ${holiday.title}`)
      if (events.length) reasons.push('Evento cadastrado')
      return {
        date,
        weekDay,
        weekend: weekDay === 0 || weekDay === 6,
        holiday,
        events,
        attention: reasons.length > 0,
        reasons,
      }
    })

    return { month, holidayCalendarVerified: true, forecastAvailable: true, days }
  }],

  ['POST', /^\/planning\/events$/, ({ body }) => {
    requireGeneralManager()
    const input = body as Omit<PlanningEvent, 'id'>
    const event = { ...input, id: `ev-${Date.now()}` }
    planningEvents.push(event)
    return event
  }],

  ['DELETE', /^\/planning\/events\/([^/]+)$/, (_ctx, m) => {
    requireGeneralManager()
    const index = planningEvents.findIndex((e) => e.id === decodeURIComponent(m[1]))
    if (index >= 0) planningEvents.splice(index, 1)
    return { message: 'Evento excluído.' }
  }],

  // ----- importações -----

  ['GET', /^\/imports$/, ({ query }) => {
    const ids = allowedUnitIds(null)
    const status = query.get('status')
    const type = query.get('reportType')
    const page = Number(query.get('page') ?? 1) || 1
    const pageSize = Number(query.get('pageSize') ?? 10) || 10

    const visible = imports.filter((i) => !i.unit || ids.includes(i.unit.id))
    const filtered = visible.filter(
      (i) => (!status || i.status === status) && (!type || i.reportType === type),
    )

    return {
      data: filtered.slice((page - 1) * pageSize, page * pageSize),
      pagination: { page, pageSize, total: filtered.length, totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)) },
      summary: {
        received: visible.filter((i) => i.status === 'RECEIVED').length,
        processing: visible.filter((i) => i.status === 'PROCESSING').length,
        processed: visible.filter((i) => i.status === 'PROCESSED').length,
        failed: visible.filter((i) => i.status === 'FAILED').length,
      },
    }
  }],

  ['POST', /^\/imports\/([^/]+)\/retry$/, (_ctx, m) => {
    requireGeneralManager()
    const item = imports.find((i) => i.id === decodeURIComponent(m[1]))
    if (!item) throw new HttpError(404, 'Importação não encontrada.')
    item.status = 'PROCESSED'
    item.errorMessage = null
    item.processedAt = new Date().toISOString()
    item.lastAttemptAt = item.processedAt
    return { message: 'Reprocessamento concluído.', data: { status: 'PROCESSED', message: 'Relatório processado (demonstração).' } }
  }],

  ['POST', /^\/imports\/upload$/, ({ body }) => {
    requireGeneralManager()
    const file = body instanceof FormData ? body.get('file') : null
    const fileName = file instanceof File ? file.name : 'arquivo.pdf'
    const lower = fileName.toLowerCase()
    const item: ImportItem = {
      id: `imp-upload-${Date.now()}`,
      fileName,
      source: 'MANUAL',
      status: 'PROCESSED',
      reportType: lower.includes('desperd') || lower.endsWith('.html') ? 'WASTE' : 'SALES',
      receivedAt: new Date().toISOString(),
      processedAt: new Date().toISOString(),
      lastAttemptAt: new Date().toISOString(),
      errorMessage: null,
      periodStart: null,
      periodEnd: null,
      unit: null,
    }
    imports.unshift(item)
    return {
      message: 'Arquivo recebido (demonstração: nenhum dado real foi gravado).',
      data: { id: item.id, fileName, status: 'PROCESSED', duplicated: false },
    }
  }],

  // ----- usuários -----

  ['GET', /^\/admin\/users$/, () => { requireGeneralManager(); return { data: users } }],
  ['GET', /^\/admin\/users\/invitations$/, () => { requireGeneralManager(); return { data: invitations } }],

  ['POST', /^\/admin\/users\/invitations$/, ({ body }) => {
    requireGeneralManager()
    const input = body as { name: string; email: string; unitId: string }
    const unit = UNITS.find((u) => u.id === input.unitId) ?? UNITS[0]
    const invitation: Invitation = {
      id: `inv-${Date.now()}`,
      name: input.name,
      email: input.email,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      expiresAt: null,
      unit,
    }
    invitations.unshift(invitation)
    return { message: 'Convite criado (demonstração).', data: invitation }
  }],

  ['POST', /^\/admin\/users\/invitations\/([^/]+)\/send$/, (_ctx, m) => {
    requireGeneralManager()
    const inv = invitations.find((i) => i.id === decodeURIComponent(m[1]))
    if (inv) inv.status = 'SENT'
    return { message: 'Na demonstração nenhum e-mail é enviado.', status: 'SENT' }
  }],

  ['PATCH', /^\/admin\/users\/invitations\/([^/]+)\/revoke$/, (_ctx, m) => {
    requireGeneralManager()
    const inv = invitations.find((i) => i.id === decodeURIComponent(m[1]))
    if (inv) inv.status = 'REVOKED'
    return { message: 'Convite revogado.' }
  }],

  ['PATCH', /^\/admin\/users\/([^/]+)$/, ({ body }, m) => {
    requireGeneralManager()
    const user = users.find((u) => u.id === decodeURIComponent(m[1]))
    if (!user) throw new HttpError(404, 'Usuário não encontrado.')
    const input = body as { name?: string; active?: boolean; unitId?: string }
    if (input.name) user.name = input.name
    if (typeof input.active === 'boolean') user.active = input.active
    if (input.unitId) {
      const unit = UNITS.find((u) => u.id === input.unitId)
      if (unit) user.units = [unit]
    }
    return { message: 'Usuário atualizado.' }
  }],
]

function holidayOn(date: string) {
  const md = date.slice(5)
  const list: Record<string, { title: string; type: 'NATIONAL' | 'STATE' | 'MUNICIPAL' }> = {
    '01-01': { title: 'Confraternização Universal', type: 'NATIONAL' },
    '04-21': { title: 'Tiradentes', type: 'NATIONAL' },
    '05-01': { title: 'Dia do Trabalho', type: 'NATIONAL' },
    '07-28': { title: 'Adesão do Maranhão à Independência', type: 'STATE' },
    '09-07': { title: 'Independência do Brasil', type: 'NATIONAL' },
    '09-08': { title: 'Aniversário de São Luís', type: 'MUNICIPAL' },
    '10-12': { title: 'Nossa Senhora Aparecida', type: 'NATIONAL' },
    '11-02': { title: 'Finados', type: 'NATIONAL' },
    '11-15': { title: 'Proclamação da República', type: 'NATIONAL' },
    '11-20': { title: 'Dia da Consciência Negra', type: 'NATIONAL' },
    '12-08': { title: 'Nossa Senhora da Conceição', type: 'MUNICIPAL' },
    '12-25': { title: 'Natal', type: 'NATIONAL' },
  }
  const found = list[md]
  return found ? { date, ...found } : null
}

// ---------- instalação ----------

function parseBody(init?: RequestInit): unknown {
  const body = init?.body
  if (!body) return null
  if (typeof body === 'string') {
    try {
      return JSON.parse(body)
    } catch {
      return body
    }
  }
  return body
}

export function installMockApi() {
  const realFetch = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url

    if (!raw.startsWith(API_BASE)) {
      return realFetch(input, init)
    }

    const url = new URL(raw, window.location.href)
    const base = new URL(API_BASE, window.location.href)
    const path = url.pathname.slice(base.pathname.replace(/\/$/, '').length) || '/'
    const method = (init?.method ?? 'GET').toUpperCase()

    // pequena espera para parecer uma chamada real
    await new Promise((resolve) => setTimeout(resolve, 120))

    if (init?.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }

    for (const [verbs, pattern, handler] of routes) {
      if (!verbs.split('|').includes(method)) continue
      const match = path.match(pattern)
      if (!match) continue

      try {
        const data = handler({ method, path, query: url.searchParams, body: parseBody(init) }, match)
        return json(data)
      } catch (error) {
        if (error instanceof HttpError) {
          return json({ message: error.message }, error.status)
        }
        console.error('[demo api]', error)
        return json({ message: 'Erro na API de demonstração.' }, 500)
      }
    }

    return json({ message: `Rota não simulada na demonstração: ${method} ${path}` }, 404)
  }
}

export { yesterdayISO }
