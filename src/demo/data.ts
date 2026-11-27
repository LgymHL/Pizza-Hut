import { UNITS } from './profiles'
import { LAST_IMPORT_AT, OCTOBER, REAL_WASTE, SALES_REPORTS, type SalesReport } from './real'

/**
 * Dados da demonstração.
 *
 * REAIS (arquivos do cliente, ver real.ts):
 *  - vendas de outubro/2026 (por dia) e de novembro/2026 (01–04 e 01–23, por período);
 *  - produtos vendidos, canais, pagamentos e cancelamentos;
 *  - desperdício de 27/10 a 02/11/2026.
 *
 * FICTÍCIOS (ainda sem fonte):
 *  - Selo Super do iFood (avaliação, acordos) e Entrega (tempos do motoboy).
 */

export const DEMO_NOTICE =
  'Dados fictícios para validação do MVP. Serão trocados pelos relatórios reais.'

// ---------- utilidades ----------

function hash(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Número pseudoaleatório estável entre 0 e 1 (só para as partes fictícias). */
export function rand(key: string) {
  let t = hash(key) + 0x6d2b79f5
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export function between(key: string, min: number, max: number) {
  return min + rand(key) * (max - min)
}

export function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return isoDate(date)
}

export function todayISO() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

export function yesterdayISO() {
  return addDays(todayISO(), -1)
}

export function datesBetween(start: string, end: string) {
  const out: string[] = []
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d)
  return out
}

function daysInMonth(isoAnyDay: string) {
  const [y, m] = isoAnyDay.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

export function unitName(id: string) {
  return UNITS.find((u) => u.id === id)?.name ?? id
}

// ---------- perfil fictício (só Selo Super e Entrega) ----------

type UnitProfile = {
  rating: number
  agreementsPct: number
  cancellationPct: number
  reviewsPerDay: number
  motoboyMin: number
  productionMin: number
  counterWaitMin: number
  lateDeliveryPct: number
}

export const UNIT_PROFILE: Record<string, UnitProfile> = {
  'unit-holandeses': { rating: 4.62, agreementsPct: 2.9, cancellationPct: 1.25, reviewsPerDay: 13, motoboyMin: 16.8, productionMin: 12.4, counterWaitMin: 4.1, lateDeliveryPct: 11.9 },
  'unit-renascenca': { rating: 4.81, agreementsPct: 1.8, cancellationPct: 0.7, reviewsPerDay: 9, motoboyMin: 13.9, productionMin: 11.2, counterWaitMin: 3.6, lateDeliveryPct: 7.2 },
}

// ---------- vendas diárias (REAIS: outubro/2026, Power BI) ----------

export type DailySale = {
  id: string
  unitId: string
  unitName: string
  date: string
  ticketCount: number
  salesCents: number
  source: 'GMAIL' | 'MANUAL'
}

/**
 * Faturamento por dia de outubro (real, arredondado a R$ 100 pelo Power BI).
 * O relatório não traz tickets por dia: a quantidade é estimada pelo ticket médio do mês.
 */
function octoberDailySales(): DailySale[] {
  const out: DailySale[] = []
  for (const unit of UNITS) {
    const oct = OCTOBER.units[unit.id]
    oct.dailyThousands.forEach((k, i) => {
      const date = `2026-10-${String(i + 1).padStart(2, '0')}`
      const value = Math.round(k * 1000)
      out.push({
        id: `ds-${unit.slug}-${date}`,
        unitId: unit.id,
        unitName: unit.name,
        date,
        ticketCount: Math.max(1, Math.round(value / oct.averageTicket)),
        salesCents: value * 100,
        source: 'GMAIL',
      })
    })
  }
  return out
}

export const dailySales: DailySale[] = octoberDailySales()

// ---------- períodos disponíveis ----------

export type Period = { startDate: string; endDate: string }

/** Períodos com relatório de vendas real, do mais recente para o mais antigo. */
export function salesPeriods(): Period[] {
  return [
    { startDate: '2026-11-01', endDate: '2026-11-23' },
    { startDate: '2026-11-01', endDate: '2026-11-04' },
    { startDate: '2026-10-01', endDate: '2026-10-31' },
  ]
}

/** Fechamentos mensais (novembro ainda parcial). */
export function monthlyPeriods(): Period[] {
  return [
    { startDate: '2026-11-01', endDate: '2026-11-23' },
    { startDate: '2026-10-01', endDate: '2026-10-31' },
  ]
}

/** Data/hora do relatório real mais recente. */
export function lastImportLabel() {
  const [d, t] = LAST_IMPORT_AT.split('T')
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}, ${t.slice(0, 5)}`
}

/**
 * Resumo REAL de vendas de uma loja num período:
 *  - relatório exato (novembro 01–04 ou 01–23), ou
 *  - soma dos dias de outubro (total oficial quando cobre o mês inteiro).
 * Sem dado real → null.
 */
export type PeriodSummary = {
  invoiced: number
  tickets: number
  ticketsEstimated: boolean
  report: SalesReport | null
  hasDaily: boolean
}

export function periodSummary(unitId: string, start: string, end: string): PeriodSummary | null {
  const report = SALES_REPORTS.find((r) => r.unitId === unitId && r.start === start && r.end === end)
  if (report) return { invoiced: report.invoiced, tickets: report.tickets, ticketsEstimated: false, report, hasDaily: false }

  if (start >= '2026-10-01' && end <= '2026-10-31') {
    const oct = OCTOBER.units[unitId]
    if (start === '2026-10-01' && end === '2026-10-31') {
      return { invoiced: oct.total, tickets: oct.tickets, ticketsEstimated: unitId === 'unit-renascenca', report: null, hasDaily: true }
    }
    const days = dailySales.filter((r) => r.unitId === unitId && r.date >= start && r.date <= end)
    if (!days.length) return null
    return {
      invoiced: days.reduce((s, r) => s + r.salesCents, 0) / 100,
      tickets: days.reduce((s, r) => s + r.ticketCount, 0),
      ticketsEstimated: true,
      report: null,
      hasDaily: true,
    }
  }
  return null
}

/** Canais reais do período (Delivery, Balcão, Salão), quando o relatório traz. */
export function periodChannels(unitIds: string[], start: string, end: string) {
  const totals: Record<string, number> = {}
  let found = false
  for (const id of unitIds) {
    const r = periodSummary(id, start, end)?.report
    if (!r) continue
    found = true
    for (const c of r.channels) totals[c.name] = (totals[c.name] ?? 0) + c.tickets
  }
  return found ? totals : null
}

// ---------- desperdício (REAL: 27/10 a 02/11/2026) ----------

export type WasteRecord = {
  id: string
  unitId: string
  unitName: string
  date: string
  shift: string
  type: string
  typeDescription: string
  productCode: string
  productName: string
  reason: string
  quantity: number
  lossCents: number
}

export const wasteRecords: WasteRecord[] = REAL_WASTE.map((w, i) => ({
  ...w,
  id: `w-${i + 1}`,
  unitName: unitName(w.unitId),
}))

export const WASTE_COVERAGE = {
  start: wasteRecords.reduce((m, w) => (w.date < m ? w.date : m), '9999-12-31'),
  end: wasteRecords.reduce((m, w) => (w.date > m ? w.date : m), '0000-01-01'),
}

// ---------- Selo Super e entrega (FICTÍCIOS, por período) ----------

function periodKey(unitId: string, start: string, end: string) {
  return `${unitId}-${start}-${end}`
}

export function seloForUnit(unitId: string, start: string, end: string) {
  const p = UNIT_PROFILE[unitId]
  const key = periodKey(unitId, start, end)
  const days = datesBetween(start, end).length
  const orders = periodSummary(unitId, start, end)?.tickets ?? 0

  return {
    unitId,
    unitName: unitName(unitId),
    reviews: Math.round(p.reviewsPerDay * days * between(`${key}-rv`, 0.85, 1.15)),
    rating: Math.round((p.rating + between(`${key}-rt`, -0.08, 0.08)) * 10) / 10,
    agreementsPct: Math.round((p.agreementsPct + between(`${key}-ag`, -0.3, 0.3)) * 10) / 10,
    cancellationPct: Math.round((p.cancellationPct + between(`${key}-cn`, -0.2, 0.2)) * 10) / 10,
    orders,
  }
}

export function deliveryForUnit(unitId: string, start: string, end: string) {
  const p = UNIT_PROFILE[unitId]
  const key = periodKey(unitId, start, end)
  const summary = periodSummary(unitId, start, end)
  // entregas: canal Delivery do relatório real quando existe
  const deliveryChannel = summary?.report?.channels.find((c) => c.name === 'Delivery')?.tickets
  const deliveries = deliveryChannel ?? Math.round((summary?.tickets ?? 0) * 0.6)
  const latePct = p.lateDeliveryPct + between(`${key}-lt`, -1, 1)
  const motoboy = p.motoboyMin + between(`${key}-mb`, -0.6, 0.6)
  const production = p.productionMin + between(`${key}-pr`, -0.5, 0.5)

  return {
    unitId,
    unitName: unitName(unitId),
    motoboyMin: Math.round(motoboy * 10) / 10,
    productionMin: Math.round(production * 10) / 10,
    totalMin: Math.round((motoboy + production + p.counterWaitMin) * 10) / 10,
    counterWaitMin: p.counterWaitMin,
    deliveries,
    lateDeliveries: Math.round((deliveries * latePct) / 100),
    daily: datesBetween(start, end).map((date) => ({
      date,
      motoboyMin: Math.round((p.motoboyMin + between(`${unitId}-${date}-mbd`, -2.2, 2.2)) * 10) / 10,
    })),
  }
}

// ---------- metas ----------

export type Goals = {
  revenue: Record<string, number>
  ratingMin: number
  cancellationMaxPct: number
  agreementsMaxPct: number
  motoboyMaxMin: number
  weeklyWasteMax: number | null
  /** Faixa de CMV exigida pela franquia (% das vendas faturadas) */
  cmvMinPct: number
  cmvMaxPct: number
  updatedAt: string | null
}

export const DEFAULT_GOALS: Goals = {
  revenue: {
    'unit-holandeses': 550000,
    'unit-renascenca': 230000,
  },
  ratingMin: 4.7,
  cancellationMaxPct: 1,
  agreementsMaxPct: 2.5,
  motoboyMaxMin: 15,
  // Valor sugerido no Lovable; a regra ainda precisa ser confirmada com o cliente.
  weeklyWasteMax: 300,
  // dito pelo gestor na reunião de 30/10: a franquia exige CMV entre 28% e 32% por loja
  cmvMinPct: 28,
  cmvMaxPct: 32,
  updatedAt: null,
}

const GOALS_KEY = 'pizza-hut-demo-goals'

export function loadGoals(): Goals {
  try {
    const raw = localStorage.getItem(GOALS_KEY)
    if (raw) return { ...DEFAULT_GOALS, ...(JSON.parse(raw) as Partial<Goals>) }
  } catch {
    // usa o padrão
  }
  return DEFAULT_GOALS
}

export function saveGoals(goals: Goals) {
  const value = { ...goals, updatedAt: new Date().toISOString() }
  try {
    localStorage.setItem(GOALS_KEY, JSON.stringify(value))
  } catch {
    // sem persistência: vale só nesta sessão
  }
  return value
}

// ---------- comparação com as metas (dados reais) ----------

/**
 * Faturamento do mês até a data final do período, comparado com a meta mensal.
 * O farol usa a PROJEÇÃO: no ritmo atual, a loja fecha o mês acima da meta?
 */
export function monthProgress(unitId: string, endDate: string, goal: number | undefined) {
  const monthStart = `${endDate.slice(0, 7)}-01`
  const dim = daysInMonth(endDate)
  const daysElapsed = Number(endDate.slice(8, 10))
  const mtd = periodSummary(unitId, monthStart, endDate)?.invoiced ?? null
  const projected = mtd != null && daysElapsed ? (mtd / daysElapsed) * dim : null
  return {
    mtd,
    goal: goal ?? null,
    pct: goal && mtd != null ? mtd / goal : null,
    projected,
    daysElapsed,
    daysInMonth: dim,
    closed: daysElapsed === dim,
    onTrack: goal && projected != null ? projected >= goal : null,
  }
}

/**
 * Desperdício por semana da loja (R$).
 * Usa os dias do período que têm registro; se houver menos de 7 dias registrados
 * no período, usa a semana registrada inteira (27/10 a 02/11).
 */
export function weeklyWaste(unitId: string, start: string, end: string) {
  let from = start > WASTE_COVERAGE.start ? start : WASTE_COVERAGE.start
  let to = end < WASTE_COVERAGE.end ? end : WASTE_COVERAGE.end
  // menos de uma semana registrada dentro do período: usa a semana registrada inteira
  // (projetar 1 ou 2 dias para a semana distorce o número)
  if (from > to || datesBetween(from, to).length < 7) {
    from = WASTE_COVERAGE.start
    to = WASTE_COVERAGE.end
  }
  const total = wasteRecords
    .filter((w) => w.unitId === unitId && w.date >= from && w.date <= to)
    .reduce((s, w) => s + w.lossCents, 0) / 100
  const days = Math.max(1, datesBetween(from, to).length)
  return { total, perWeek: (total / days) * 7, days, from, to }
}

// ---------- feriados (São Luís/MA) ----------

export type Holiday = { date: string; title: string; type: 'NATIONAL' | 'STATE' | 'MUNICIPAL' }

const HOLIDAY_DAYS: Record<string, { title: string; type: Holiday['type'] }> = {
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
  '12-24': { title: 'Véspera de Natal (meio expediente)', type: 'NATIONAL' },
  '12-25': { title: 'Natal', type: 'NATIONAL' },
  '12-31': { title: 'Véspera de Ano-Novo (meio expediente)', type: 'NATIONAL' },
}

export function holidayOn(date: string): Holiday | null {
  const h = HOLIDAY_DAYS[date.slice(5)]
  return h ? { date, ...h } : null
}

/** Feriados de hoje até `days` dias à frente. */
export function upcomingHolidays(days = 30, from = todayISO()): Holiday[] {
  return datesBetween(from, addDays(from, days))
    .map(holidayOn)
    .filter((h): h is Holiday => h !== null)
}

// ---------- CMV (custo da mercadoria vendida) ----------

/**
 * CMV = estoque inicial + compras − estoque final (planilha manual da Teresa).
 * Ainda não recebemos essa planilha: os valores iniciais abaixo são EXEMPLO
 * e podem ser trocados na própria Visão geral pelo Gerente Geral.
 */
export type CmvEntry = {
  estoqueInicial: number
  compras: number
  estoqueFinal: number
  exemplo: boolean
}

type CmvStore = Record<string, Record<string, CmvEntry>> // mês (AAAA-MM) → loja → valores

const CMV_KEY = 'pizza-hut-demo-cmv'

/** Exemplo coerente com o faturamento real de cada mês (Holandeses ~30%, Renascença ~33%). */
function cmvExample(unitId: string, month: string): CmvEntry | null {
  const fat = periodSummary(unitId, `${month}-01`, month === '2026-10' ? '2026-10-31' : '2026-11-23')?.invoiced
  if (!fat) return null
  const target = unitId === 'unit-holandeses' ? 0.304 : 0.331
  const estoqueInicial = Math.round(fat * 0.12)
  const estoqueFinal = Math.round(fat * 0.11)
  const compras = Math.round(fat * target - estoqueInicial + estoqueFinal)
  return { estoqueInicial, compras, estoqueFinal, exemplo: true }
}

function readCmv(): CmvStore {
  try {
    const raw = localStorage.getItem(CMV_KEY)
    return raw ? (JSON.parse(raw) as CmvStore) : {}
  } catch {
    return {}
  }
}

export function loadCmv(unitId: string, month: string): CmvEntry | null {
  return readCmv()[month]?.[unitId] ?? cmvExample(unitId, month)
}

export function saveCmv(unitId: string, month: string, entry: Omit<CmvEntry, 'exemplo'>) {
  const store = readCmv()
  store[month] = { ...(store[month] ?? {}), [unitId]: { ...entry, exemplo: false } }
  try {
    localStorage.setItem(CMV_KEY, JSON.stringify(store))
  } catch {
    // sem persistência
  }
}

export function resetCmv(unitId: string, month: string) {
  const store = readCmv()
  if (store[month]) delete store[month][unitId]
  try {
    localStorage.setItem(CMV_KEY, JSON.stringify(store))
  } catch {
    // ignora
  }
}

/** CMV em R$ e em % das vendas faturadas do mesmo período. */
export function cmvFor(unitId: string, month: string, endDate: string) {
  const entry = loadCmv(unitId, month)
  const fat = periodSummary(unitId, `${month}-01`, endDate)?.invoiced ?? null
  if (!entry || !fat) return null
  const valor = entry.estoqueInicial + entry.compras - entry.estoqueFinal
  return { ...entry, valor, faturamento: fat, pct: (valor / fat) * 100 }
}
