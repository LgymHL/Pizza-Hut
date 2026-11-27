import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { DayBars } from '../charts/DayBars'
import { useAuth } from '../../contexts/AuthContext'
import { UNITS } from '../../demo/profiles'
import { dailySales, deliveryForUnit, loadGoals, monthProgress, periodSummary, salesPeriods, seloForUnit, weeklyWaste } from '../../demo/data'
import { AvisoFicticio, Farol, Vazio, type EstadoMeta } from '../painel/ui'

/** Cores fixas das lojas (tokens do Lovable). */
export const UNIT_COLORS: Record<string, string> = {
  'unit-holandeses': 'var(--loja-holandeses)',
  'unit-renascenca': 'var(--loja-renascenca)',
  Holandeses: 'var(--loja-holandeses)',
  Renascença: 'var(--loja-renascenca)',
}

export const CHANNEL_COLORS: Record<string, string> = {
  Delivery: 'var(--chart-1)',
  Balcão: 'var(--chart-2)',
  Salão: 'var(--chart-3)',
}

export function unitColor(idOrName: string) {
  return UNIT_COLORS[idOrName] ?? 'var(--chart-3)'
}

export const DemoNotice = AvisoFicticio

export function GoalPill({ ok }: { ok: boolean }) {
  return <Farol estado={ok ? 'dentro' : 'fora'} />
}

export function UnitDot({ unitId }: { unitId: string }) {
  return <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: unitColor(unitId) }} />
}

/**
 * Período escolhido no cabeçalho (ou o último disponível) e as unidades
 * que o perfil atual pode ver.
 */
export function usePeriodAndUnits() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()

  const latest = salesPeriods()[0]
  const startDate = searchParams.get('startDate') ?? latest?.startDate ?? ''
  const endDate = searchParams.get('endDate') ?? latest?.endDate ?? ''
  const requested = searchParams.get('unitId')

  const own = user?.units.map((u) => u.id) ?? []
  const unitIds = requested && own.includes(requested) ? [requested] : own

  return {
    startDate,
    endDate,
    /** true quando a pessoa escolheu um período no filtro (não é o padrão) */
    explicit: Boolean(searchParams.get('startDate') && searchParams.get('endDate')),
    units: UNITS.filter((u) => unitIds.includes(u.id)),
  }
}

const pct = (value: number) => `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
const one = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
const brl0 = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)

/** Todos os indicadores com meta no período (fora da meta primeiro). */
export function useGoalAlerts() {
  const { startDate, endDate, units } = usePeriodAndUnits()
  const goals = loadGoals()
  const key = units.map((u) => u.id).join()

  return useMemo(() => {
    // exemplo = indicador ainda sem fonte real (marcado no texto)
    const list: { texto: string; estado: EstadoMeta; exemplo?: boolean }[] = []
    const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
    for (const unit of units) {
      // Faturamento (REAL): acumulado do mês e projeção
      const fat = monthProgress(unit.id, endDate, goals.revenue[unit.id])
      if (fat.goal && fat.mtd != null && fat.projected != null) {
        list.push({
          estado: fat.onTrack ? 'dentro' : 'fora',
          texto: fat.closed
            ? `Faturamento ${unit.name} no mês: ${brl0(fat.mtd)} de ${brl0(fat.goal)} (${pct((fat.pct ?? 0) * 100)}) · mês fechado`
            : `Faturamento ${unit.name} no mês: ${brl0(fat.mtd)} de ${brl0(fat.goal)} (${pct((fat.pct ?? 0) * 100)}) · projeção ${brl0(fat.projected)}`,
        })
      }
      // Cancelamento (REAL): "Pedidos cancelados" do relatório, quando existe
      const report = periodSummary(unit.id, startDate, endDate)?.report
      if (report?.canceledOrders) {
        const taxa = (report.canceledOrders.count / report.tickets) * 100
        list.push({
          estado: taxa <= goals.cancellationMaxPct ? 'dentro' : 'fora',
          texto: `Cancelamento ${unit.name}: ${pct(taxa)} (${report.canceledOrders.count} de ${report.tickets.toLocaleString('pt-BR')} pedidos) · meta até ${one(goals.cancellationMaxPct)}%`,
        })
      }
      // Desperdício (REAL): semana registrada mais próxima do período
      if (goals.weeklyWasteMax != null) {
        const w = weeklyWaste(unit.id, startDate, endDate)
        list.push({
          estado: w.perWeek <= goals.weeklyWasteMax ? 'dentro' : 'fora',
          texto: `Desperdício ${unit.name} (${dm(w.from)} a ${dm(w.to)}): ${brl0(w.perWeek)} por semana · meta até ${brl0(goals.weeklyWasteMax)}`,
        })
      }
      // Selo Super e entrega: ainda FICTÍCIOS
      const selo = seloForUnit(unit.id, startDate, endDate)
      const delivery = deliveryForUnit(unit.id, startDate, endDate)
      list.push({
        exemplo: true,
        estado: selo.rating >= goals.ratingMin ? 'dentro' : 'fora',
        texto: `Avaliação iFood ${unit.name}: ${one(selo.rating)} · meta acima de ${one(goals.ratingMin)}`,
      })
      list.push({
        exemplo: true,
        estado: selo.agreementsPct <= goals.agreementsMaxPct ? 'dentro' : 'fora',
        texto: `Acordos iFood ${unit.name}: ${pct(selo.agreementsPct)} · meta até ${one(goals.agreementsMaxPct)}%`,
      })
      list.push({
        exemplo: true,
        estado: delivery.motoboyMin <= goals.motoboyMaxMin ? 'dentro' : 'fora',
        texto: `Tempo do motoboy ${unit.name}: ${one(delivery.motoboyMin)} min · meta até ${goals.motoboyMaxMin} min`,
      })
    }
    return [...list.filter((a) => a.estado === 'fora'), ...list.filter((a) => a.estado !== 'fora')]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, key])
}

/** O período tem faturamento por dia? (hoje, só outubro) */
export function hasDailyData(start: string, end: string) {
  return dailySales.some((r) => r.date >= start && r.date <= end)
}

/**
 * Indicadores fora da meta. Mostra só o que pede atenção;
 * os que estão dentro da meta ficam recolhidos em "ver todos".
 */
export function GoalAlerts() {
  const alertas = useGoalAlerts()
  const fora = alertas.filter((a) => a.estado === 'fora')
  const [todos, setTodos] = useState(false)
  const visiveis = todos ? alertas : fora
  const dentro = alertas.length - fora.length

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
        {fora.length
          ? <AlertTriangle className="h-4 w-4 text-destructive" />
          : <CheckCircle2 className="h-4 w-4 text-success" />}
        {fora.length ? `${fora.length} indicador(es) pedem atenção` : 'Tudo dentro da meta neste período'}
        {dentro > 0 && (
          <button type="button" onClick={() => setTodos((v) => !v)} className="ml-auto cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
            {todos ? 'Mostrar só os de atenção' : `Ver também os ${dentro} dentro da meta`}
          </button>
        )}
      </div>
      {visiveis.length > 0 && (
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {visiveis.map((a) => (
            <li key={a.texto} className="flex flex-col gap-1.5 rounded-md bg-muted/50 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="min-w-0">
                {a.texto}
                {a.exemplo && <span className="ml-1.5 text-xs text-warning">(exemplo)</span>}
              </span>
              <Farol estado={a.estado} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Faturamento por dia, uma barra por loja. */
export function DailyRevenueChart() {
  const { startDate, endDate, units } = usePeriodAndUnits()

  const data = useMemo(() => {
    const map = new Map<string, Record<string, number | string>>()
    for (const record of dailySales) {
      if (record.date < startDate || record.date > endDate) continue
      if (!units.some((u) => u.id === record.unitId)) continue
      const row = map.get(record.date) ?? { dia: `${record.date.slice(8, 10)}/${record.date.slice(5, 7)}` }
      row[record.unitName] = record.salesCents / 100
      map.set(record.date, row)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, row]) => row)
  }, [startDate, endDate, units])

  if (!data.length) {
    return (
      <Vazio>
        O relatório deste período traz apenas o total, sem o valor de cada dia. Escolha o período de outubro (01/10 a 31/10) para ver o gráfico diário.
      </Vazio>
    )
  }

  return (
    <DayBars
      data={data}
      series={units.map((unit) => ({ key: unit.name, name: unit.name, color: unitColor(unit.id) }))}
      format={brl0}
      height={300}
      yWidth={40}
      yFormat={(v) => `${Math.round(v / 1000)}k`}
    />
  )
}
