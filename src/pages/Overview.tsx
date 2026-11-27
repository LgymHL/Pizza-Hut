import { RefreshCw } from 'lucide-react'
import { useDashboard } from '../hooks/useDashboard'
import type { SalesCoverage } from '../types/dashboard'
import { CHANNEL_COLORS, DailyRevenueChart, GoalAlerts, hasDailyData, unitColor } from '../components/demo/DemoUi'
import { AreasSummary, CmvPanel, GoalsProjection, HolidayAlert } from '../components/overview/ExecutivePanels'
import { Farol, Kpi, Painel, Rosca, SeloReal, Vazio, type EstadoMeta } from '../components/painel/ui'
import { loadGoals, monthProgress, periodChannels } from '../demo/data'

const brl0 = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)
const brl = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
const int = (value: number) => new Intl.NumberFormat('pt-BR').format(value)
const pct = (value: number) => `${(value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`

function formatDate(value: string) {
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

/** Aviso de cobertura dos relatórios (só aparece quando falta loja). */
function CoverageNotice({ coverage }: { coverage: SalesCoverage }) {
  if (coverage.status === 'COMPLETE') return null
  const missing = coverage.missingUnits.map((u) => u.name).join(', ')
  return (
    <div className="rounded-lg border border-warning/30 bg-warning/[0.07] px-4 py-2.5 text-sm text-warning">
      {coverage.status === 'PARTIAL'
        ? `Sem relatório de ${missing || 'uma loja'} neste período: o total do grupo está incompleto.`
        : 'Nenhum relatório disponível para o período escolhido.'}
    </div>
  )
}

/**
 * Visão geral — o essencial primeiro (pedido do gestor em 25/11):
 * feriado → números do período → metas e CMV → o que está fora da meta → gráficos.
 */
export default function Overview() {
  const { data, loading, refreshing, error, refreshError, lastUpdated, refresh } = useDashboard()

  if (loading) return <Vazio>Carregando dados…</Vazio>
  if (error) return <Vazio>Não foi possível carregar os dados: {error}</Vazio>
  if (!data || !data.periodStart || !data.periodEnd || data.units.length === 0) {
    return <Vazio>Nenhum dado de vendas importado ainda. Use a tela Importar dados.</Vazio>
  }

  const inicio = data.periodStart
  const fim = data.periodEnd
  const units = [...data.units].sort((a, b) => b.invoicedSales - a.invoicedSales)
  const unitList = units.map((u) => u.unit)
  const total = data.totalSales
  const goals = loadGoals()
  // farol do faturamento: o mês vai bater a meta? (projeção no ritmo atual)
  const estadoFat = (unitId: string): EstadoMeta => {
    const p = monthProgress(unitId, fim, goals.revenue[unitId])
    if (!p.goal || p.mtd == null) return 'neutro'
    return (p.closed ? p.mtd >= p.goal : p.onTrack) ? 'dentro' : 'fora'
  }

  const porCanal = periodChannels(units.map((u) => u.unit.id), inicio, fim)
  const canais = porCanal
    ? Object.entries(porCanal).map(([nome, valor]) => ({ nome, valor, cor: CHANNEL_COLORS[nome] ?? 'var(--chart-4)' }))
    : []
  const fontes = [...new Set(units.map((u) => u.source).filter(Boolean))].join(', ')
  const estimados = units.filter((u) => u.ticketsEstimated).map((u) => u.unit.name)
  const diario = hasDailyData(inicio, fim)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Visão geral</h1>
            <SeloReal />
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {formatDate(inicio)} a {formatDate(fim)} · Fonte: {fontes || 'relatórios das lojas'}
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          aria-label="Atualizar dados"
          title={lastUpdated ? `Atualizado às ${lastUpdated.toLocaleTimeString('pt-BR')}` : 'Atualizar dados'}
          className="cursor-pointer rounded-md border border-input p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {refreshError && (
        <div role="alert" className="rounded-lg border border-warning/30 bg-warning/[0.07] px-4 py-2.5 text-sm text-warning">
          Não foi possível atualizar agora. Os últimos dados foram mantidos.
        </div>
      )}

      <CoverageNotice coverage={data.coverage} />
      <HolidayAlert />

      {/* 1. Números do período (grupo e cada loja) */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi titulo={units.length > 1 ? 'Faturamento do grupo' : `Faturamento ${units[0].unit.name}`} valor={brl0(total)} detalhe="Vendas faturadas no período" />
        {units.length > 1 && units.map((u) => (
          <Kpi key={u.unit.id} titulo={`Faturamento ${u.unit.name}`} valor={brl0(u.invoicedSales)} cor={unitColor(u.unit.id)}
            detalhe={`${pct(total ? u.invoicedSales / total : 0)} do grupo`}>
            <Farol estado={estadoFat(u.unit.id)} />
          </Kpi>
        ))}
        <Kpi titulo="Pedidos" valor={int(data.totalTickets)}
          detalhe={estimados.length ? `${estimados.join(' e ')}: estimado pelo ticket médio` : units.map((u) => `${u.unit.name}: ${int(u.ticketCount)}`).join(' · ')} />
        <Kpi titulo="Ticket médio" valor={brl(data.averageTicket)} detalhe={units.map((u) => `${u.unit.name}: ${brl(u.averageTicket)}`).join(' · ')} />
      </div>

      {/* 2. Metas do mês e CMV */}
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <GoalsProjection units={unitList} endDate={fim} />
        <CmvPanel units={unitList} endDate={fim} />
      </div>

      {/* 3. Resumo das outras telas */}
      <div>
        <h2 className="mb-3 text-base font-semibold">Operação em resumo</h2>
        <AreasSummary units={unitList} startDate={inicio} endDate={fim} />
      </div>

      {/* 4. O que está fora da meta */}
      <GoalAlerts />

      {/* 5. Gráficos */}
      {diario && (
        <Painel titulo="Faturamento por dia" subtitulo="Por loja, em R$ (Power BI de fechamento)">
          <DailyRevenueChart />
        </Painel>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Painel titulo="Participação no faturamento" subtitulo="Por loja">
          <Rosca dados={units.map((u) => ({ nome: u.unit.name, valor: u.invoicedSales, cor: unitColor(u.unit.id) }))} formatar={brl0} />
        </Painel>
        <Painel titulo="Pedidos por canal" subtitulo="Delivery, balcão e salão">
          {canais.length
            ? <Rosca dados={canais} formatar={(v) => `${int(v)} pedidos`} />
            : <Vazio>Este período não tem detalhamento por canal.</Vazio>}
        </Painel>
      </div>

      <Painel titulo="Comparativo entre lojas">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Loja</th>
                <th className="px-3 py-2 text-right font-medium">Faturamento</th>
                <th className="px-3 py-2 text-right font-medium">Pedidos</th>
                <th className="px-3 py-2 text-right font-medium">Ticket médio</th>
                <th className="px-3 py-2 text-right font-medium">iFood</th>
                <th className="py-2 pl-3 text-right font-medium">Participação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {units.map((u) => (
                <tr key={u.unit.id}>
                  <td className="py-2.5 pr-3">
                    <span className="flex items-center gap-2 font-medium">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: unitColor(u.unit.id) }} />
                      {u.unit.name}
                    </span>
                  </td>
                  <td className="num px-3 py-2.5 text-right">{brl0(u.invoicedSales)}</td>
                  <td className="num px-3 py-2.5 text-right">{int(u.ticketCount)}</td>
                  <td className="num px-3 py-2.5 text-right">{brl(u.averageTicket)}</td>
                  <td className="num px-3 py-2.5 text-right">{u.ifoodSharePercent == null ? '—' : u.ifoodSharePercent.toLocaleString('pt-BR') + '%'}</td>
                  <td className="num py-2.5 pl-3 text-right">{pct(total ? u.invoicedSales / total : 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Painel>
    </div>
  )
}
