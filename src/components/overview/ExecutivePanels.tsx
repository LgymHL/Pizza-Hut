import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, ChevronRight, Pencil, RotateCcw } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import {
  cmvFor, deliveryForUnit, loadGoals, monthProgress, periodSummary, resetCmv, saveCmv, seloForUnit, todayISO, upcomingHolidays, weeklyWaste,
} from '../../demo/data'
import { unitColor } from '../demo/DemoUi'
import { Farol, Painel, SeloExemplo, SeloReal, cn, type EstadoMeta } from '../painel/ui'

/** R$ 418,5 mil */
const mil = (v: number) =>
  `R$ ${(v / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mil`
const brl0 = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
const pct0 = (v: number) => `${Math.round(v).toLocaleString('pt-BR')}%`
const pct1 = (v: number) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
const one = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
const WEEK = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']
const weekday = (iso: string) => WEEK[new Date(`${iso}T12:00:00Z`).getUTCDay()]

type Unit = { id: string; name: string }

function Dot({ unitId }: { unitId: string }) {
  return <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: unitColor(unitId) }} />
}

// ---------------------------------------------------------------------------
// Alerta de feriado (pedido do gestor: "não precisa gráfico, só me alerta")
// ---------------------------------------------------------------------------

export function HolidayAlert() {
  const [primeiro] = upcomingHolidays(30)
  if (!primeiro) return null
  const dia = weekday(primeiro.date)
  const artigo = dia === 'sábado' || dia === 'domingo' ? 'no' : 'na'
  const faltam = Math.round(
    (Date.parse(`${primeiro.date}T12:00:00Z`) - Date.parse(`${todayISO()}T12:00:00Z`)) / 86_400_000,
  )
  const quando = faltam <= 0 ? 'é hoje' : faltam === 1 ? 'é amanhã' : `faltam ${faltam} dias`
  return (
    <div role="status" className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/[0.07] px-4 py-3 text-sm text-warning">
      <CalendarClock className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0">
        <p className="font-semibold">
          Feriado {artigo} {dia}, dia {dm(primeiro.date)} ({quando})
        </p>
        <p className="mt-0.5 text-foreground/90">{primeiro.title}.</p>
        <p className="mt-0.5 text-warning/85">
          Prepare-se: reforce as compras e a produção e ajuste a escala da equipe para o movimento do feriado.
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Metas do mês: barra horizontal (realizado + projeção) contra a meta
// ---------------------------------------------------------------------------

export function GoalsProjection({ units, endDate }: { units: Unit[]; endDate: string }) {
  const goals = loadGoals()
  const mes = new Date(`${endDate.slice(0, 7)}-15T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' })

  return (
    <Painel titulo={`Metas de faturamento — ${mes}`} subtitulo={`Realizado até ${dm(endDate)} e projeção para o fim do mês, no ritmo atual`}>
      <div className="space-y-6">
        {units.map((u) => {
          const p = monthProgress(u.id, endDate, goals.revenue[u.id])
          if (!p.goal || p.mtd == null || p.projected == null) {
            return <p key={u.id} className="text-sm text-muted-foreground">{u.name}: sem meta ou sem dado.</p>
          }
          const estado: EstadoMeta = (p.closed ? p.mtd >= p.goal : p.onTrack) ? 'dentro' : 'fora'
          const real = Math.min(100, (p.mtd / p.goal) * 100)
          const proj = Math.min(100, (p.projected / p.goal) * 100)
          const faltam = Math.max(0, p.goal - p.mtd)
          const dias = p.daysInMonth - p.daysElapsed
          return (
            <div key={u.id}>
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 font-semibold"><Dot unitId={u.id} />{u.name}</p>
                <Farol estado={estado} />
              </div>

              {/* barra: cheio = realizado; claro = projeção até o fim do mês; fim da barra = meta */}
              <div className="mt-3 flex items-center gap-3">
                <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-muted">
                  {!p.closed && (
                    <div className="absolute inset-y-0 left-0 rounded-full opacity-35" style={{ width: `${proj}%`, background: unitColor(u.id) }} />
                  )}
                  <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${real}%`, background: unitColor(u.id) }} />
                </div>
                <span className="num w-12 text-right text-sm font-semibold">{pct0((p.mtd / p.goal) * 100)}</span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Realizado</p>
                  <p className="num font-semibold">{mil(p.mtd)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Meta</p>
                  <p className="num font-semibold">{mil(p.goal)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{p.closed ? 'Fechou em' : 'Projeção'}</p>
                  <p className="num font-semibold">{mil(p.projected)} <span className="text-xs font-normal text-muted-foreground">({pct0((p.projected / p.goal) * 100)})</span></p>
                </div>
              </div>

              {!p.closed && faltam > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Para bater a meta: <span className="num text-foreground">{mil(faltam / Math.max(1, dias))}</span> por dia nos {dias} dias restantes.
                </p>
              )}
            </div>
          )
        })}
      </div>
      <p className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-foreground/80" /> realizado</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-foreground/30" /> projeção até o fim do mês</span>
        <span>fim da barra = meta</span>
      </p>
    </Painel>
  )
}

// ---------------------------------------------------------------------------
// CMV: número grande + status em palavras (faixa da franquia: 28% a 32%)
// ---------------------------------------------------------------------------

function CmvForm({ unitId, month, initial, onDone }: {
  unitId: string
  month: string
  initial: { estoqueInicial: number; compras: number; estoqueFinal: number }
  onDone: () => void
}) {
  const [v, setV] = useState({
    estoqueInicial: String(initial.estoqueInicial),
    compras: String(initial.compras),
    estoqueFinal: String(initial.estoqueFinal),
  })
  const [error, setError] = useState('')
  const num = (s: string) => Number(s.replace(/\./g, '').replace(',', '.'))

  function submit(e: FormEvent) {
    e.preventDefault()
    const values = { estoqueInicial: num(v.estoqueInicial), compras: num(v.compras), estoqueFinal: num(v.estoqueFinal) }
    if (Object.values(values).some((x) => !Number.isFinite(x) || x < 0)) return setError('Use apenas números maiores ou iguais a zero.')
    saveCmv(unitId, month, values)
    onDone()
  }

  const field = (key: keyof typeof v, label: string) => (
    <label className="block space-y-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <input inputMode="decimal" value={v[key]} onChange={(e) => { setV({ ...v, [key]: e.target.value }); setError('') }}
        className="num w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
    </label>
  )

  return (
    <form onSubmit={submit} className="mt-3 space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {field('estoqueInicial', 'Estoque inicial')}
        {field('compras', '+ Compras')}
        {field('estoqueFinal', '− Estoque final')}
      </div>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="cursor-pointer rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">Salvar</button>
        <button type="button" onClick={onDone} className="cursor-pointer rounded-md border border-input px-3 py-1.5 text-xs hover:bg-accent">Cancelar</button>
      </div>
    </form>
  )
}

export function CmvPanel({ units, endDate }: { units: Unit[]; endDate: string }) {
  const { user } = useAuth()
  const canEdit = user?.role === 'GENERAL_MANAGER'
  const goals = loadGoals()
  const month = endDate.slice(0, 7)
  const [editing, setEditing] = useState<string | null>(null)
  const [, refresh] = useState(0)

  const rows = units.map((u) => ({ u, c: cmvFor(u.id, month, endDate) }))
  const algumExemplo = rows.some((r) => r.c?.exemplo)

  return (
    <Painel titulo="CMV do mês" subtitulo={`Custo da mercadoria vendida ÷ faturamento. A franquia exige entre ${pct0(goals.cmvMinPct)} e ${pct0(goals.cmvMaxPct)}.`} exemplo={algumExemplo}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        {rows.map(({ u, c }) => {
          if (!c) return <p key={u.id} className="text-sm text-muted-foreground">{u.name}: sem faturamento no mês.</p>
          const acima = c.pct > goals.cmvMaxPct
          const abaixo = c.pct < goals.cmvMinPct
          const ok = !acima && !abaixo
          return (
            <div key={u.id} className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold"><Dot unitId={u.id} />{u.name}</p>
              <p className="num mt-2 text-3xl font-semibold">{pct1(c.pct)}</p>
              <span className={cn(
                'mt-2 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium',
                ok ? 'border-success/40 bg-success/10 text-success' : 'border-destructive/40 bg-destructive/10 text-destructive',
              )}>
                <span className={cn('h-2 w-2 rounded-full', ok ? 'bg-success' : 'bg-destructive')} />
                {ok ? 'Dentro da faixa' : acima ? `Acima da faixa (+${one(c.pct - goals.cmvMaxPct)} p.p.)` : `Abaixo da faixa (−${one(goals.cmvMinPct - c.pct)} p.p.)`}
              </span>
              <p className="mt-3 text-xs text-muted-foreground">
                Custo <span className="num text-foreground">{mil(c.valor)}</span> · faturamento <span className="num text-foreground">{mil(c.faturamento)}</span>
              </p>
              {canEdit && editing !== u.id && (
                <div className="mt-2 flex gap-3 text-xs">
                  <button type="button" onClick={() => setEditing(u.id)} className="inline-flex cursor-pointer items-center gap-1 text-muted-foreground hover:text-foreground">
                    <Pencil className="h-3 w-3" /> {c.exemplo ? 'Informar valores reais' : 'Editar'}
                  </button>
                  {!c.exemplo && (
                    <button type="button" onClick={() => { resetCmv(u.id, month); refresh((x) => x + 1) }} className="inline-flex cursor-pointer items-center gap-1 text-muted-foreground hover:text-foreground">
                      <RotateCcw className="h-3 w-3" /> Exemplo
                    </button>
                  )}
                </div>
              )}
              {canEdit && editing === u.id && (
                <CmvForm unitId={u.id} month={month} initial={c} onDone={() => { setEditing(null); refresh((x) => x + 1) }} />
              )}
            </div>
          )
        })}
      </div>
    </Painel>
  )
}

// ---------------------------------------------------------------------------
// Resumo das outras telas, para o gestor não precisar abrir cada uma
// ---------------------------------------------------------------------------

type Linha = { unitId: string; name: string; valor: string; ok: boolean | null }

function AreaCard({ titulo, meta, to, real, linhas, vazio }: {
  titulo: string
  meta: string
  to: string
  real: boolean
  linhas: Linha[]
  vazio?: string
}) {
  return (
    <section className="flex flex-col rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{titulo}</h3>
        {real ? <SeloReal /> : <SeloExemplo />}
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">{meta}</p>
      {linhas.length ? (
        <ul className="mt-3 space-y-2">
          {linhas.map((l) => (
            <li key={l.unitId} className="flex items-center gap-2 text-sm">
              <Dot unitId={l.unitId} />
              <span className="flex-1 text-muted-foreground">{l.name}</span>
              <span className="num font-semibold">{l.valor}</span>
              {l.ok != null && <span className={cn('h-2 w-2 rounded-full', l.ok ? 'bg-success' : 'bg-destructive')} title={l.ok ? 'Dentro da meta' : 'Fora da meta'} />}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{vazio}</p>
      )}
      <Link to={to} className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-medium text-muted-foreground hover:text-foreground">
        Ver detalhes <ChevronRight className="h-3 w-3" />
      </Link>
    </section>
  )
}

export function AreasSummary({ units, startDate, endDate }: { units: Unit[]; startDate: string; endDate: string }) {
  const g = loadGoals()

  const entrega = units.map((u) => {
    const d = deliveryForUnit(u.id, startDate, endDate)
    return { unitId: u.id, name: u.name, valor: `${one(d.motoboyMin)} min`, ok: d.motoboyMin <= g.motoboyMaxMin }
  })
  const perdas = units.map((u) => {
    const w = weeklyWaste(u.id, startDate, endDate)
    return { unitId: u.id, name: u.name, valor: `${brl0(w.perWeek)}/sem`, ok: g.weeklyWasteMax == null ? null : w.perWeek <= g.weeklyWasteMax }
  })
  const wasteRange = weeklyWaste(units[0]?.id ?? '', startDate, endDate)
  const selo = units.map((u) => {
    const s = seloForUnit(u.id, startDate, endDate)
    const ok = s.rating >= g.ratingMin && s.agreementsPct <= g.agreementsMaxPct && s.cancellationPct <= g.cancellationMaxPct
    return { unitId: u.id, name: u.name, valor: ok ? 'Cumpre' : 'Em risco', ok }
  })
  const cancel = units.flatMap((u) => {
    const r = periodSummary(u.id, startDate, endDate)?.report
    if (!r?.canceledOrders) return []
    const taxa = (r.canceledOrders.count / r.tickets) * 100
    return [{ unitId: u.id, name: u.name, valor: pct1(taxa), ok: taxa <= g.cancellationMaxPct }]
  })

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <AreaCard titulo="Entrega" meta={`Tempo do motoboy · meta até ${g.motoboyMaxMin} min`} to="/entrega" real={false} linhas={entrega} />
      <AreaCard titulo="Desperdício" meta={`${dm(wasteRange.from)} a ${dm(wasteRange.to)} · meta até ${g.weeklyWasteMax == null ? '—' : brl0(g.weeklyWasteMax)}/sem`} to="/desperdicios" real linhas={perdas} />
      <AreaCard titulo="Selo Super (iFood)" meta="Avaliação, acordos e cancelamento" to="/selo-super" real={false} linhas={selo} />
      <AreaCard titulo="Cancelamento" meta={`Pedidos cancelados · meta até ${one(g.cancellationMaxPct)}%`} to="/vendas" real linhas={cancel}
        vazio="O relatório deste período não traz pedidos cancelados (só o de 01 a 04/11)." />
    </div>
  )
}
