import { RefreshCw } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { unitColor } from '../components/demo/DemoUi'
import { Kpi, Painel, Vazio } from '../components/painel/ui'
import { formatBRL, formatNumber, useMonthlyDashboard } from '../hooks/useMonthlyDashboard'
import SalesReportDetails from '../components/sales/SalesReportDetails'

function formatPeriod(startDate: string, endDate: string) {
  const format = (date: string) => {
    const [year, month, day] = date.split('-')
    return `${day}/${month}/${year}`
  }

  return `${format(startDate)} a ${format(endDate)}`
}

/** Valor arredondado para o balão do gráfico: 459.812 → "R$ 460 mil". */
function formatRoundedBRL(value: number) {
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  }
  if (value >= 1_000) {
    return `R$ ${Math.round(value / 1_000).toLocaleString('pt-BR')} mil`
  }
  return `R$ ${Math.round(value).toLocaleString('pt-BR')}`
}

/**
 * Vendas: fechamento do mês (números + gráfico e tabela lado a lado)
 * e, embaixo, o detalhe dos relatórios do PDV.
 * @author Gabriel (organização visual ajustada na Atualização 1)
 */
export default function SalesDashboard() {
  const { data, loading, error, refresh } = useMonthlyDashboard()

  const units = data?.units ?? []
  const periodLabel = units.length ? formatPeriod(units[0].periodStart, units[0].periodEnd) : 'Nenhum período disponível'
  const tickets = units.reduce((sum, unit) => sum + unit.ticketCount, 0)
  const totalCents = units.reduce((sum, unit) => sum + unit.approximateDailySumCents, 0)
  const chartData = units.map((unit) => ({ name: unit.unitName, value: unit.approximateDailySumCents / 100 }))

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vendas</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Fechamento do mês · {loading ? 'carregando…' : periodLabel}</p>
        </div>
        <button type="button" onClick={refresh} disabled={loading} aria-label="Atualizar fechamento mensal" title="Atualizar"
          className="cursor-pointer rounded-md border border-input p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <Vazio>Carregando fechamento mensal…</Vazio>
      ) : error ? (
        <Vazio>{error}</Vazio>
      ) : units.length === 0 ? (
        <Vazio>Não existem dados mensais para os filtros selecionados.</Vazio>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Kpi titulo="Faturamento do mês" valor={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalCents / 100)} detalhe={units.length > 1 ? 'Soma das lojas' : units[0].unitName} />
            <Kpi titulo="Tickets" valor={formatNumber(tickets)} detalhe={units.map((u) => `${u.unitName}: ${formatNumber(u.ticketCount)}`).join(' · ')} />
            <Kpi titulo="Ticket médio" valor={formatBRL(tickets ? Math.round(totalCents / tickets) : 0)} detalhe="Faturamento ÷ tickets" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Painel titulo="Faturamento por loja" subtitulo="No período do fechamento">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ left: 0, right: 8 }}>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={48}
                      tickFormatter={(value) => new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value))} />
                    <Tooltip
                      cursor={{ fill: 'var(--border)', opacity: 0.3 }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const item = payload[0].payload as { name: string; value: number }
                        return (
                          <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
                            <span className="font-semibold">{item.name}</span>
                            <span className="text-muted-foreground"> · {formatRoundedBRL(item.value)}</span>
                          </div>
                        )
                      }} />
                    <Bar dataKey="value" name="Faturamento" radius={[4, 4, 0, 0]} maxBarSize={88}>
                      {chartData.map((item) => <Cell key={item.name} fill={unitColor(item.name)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Painel>

            <Painel titulo="Resumo por loja" subtitulo="Tickets, ticket médio e participação">
              <ul className="divide-y divide-border">
                {units.map((unit) => (
                  <li key={unit.snapshotId} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="flex items-center gap-2 font-semibold">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: unitColor(unit.unitId) }} />
                        {unit.unitName}
                      </p>
                      <p className="num font-semibold">{formatBRL(unit.approximateDailySumCents)}</p>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Tickets</p>
                        <p className="num">{formatNumber(unit.ticketCount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Ticket médio</p>
                        <p className="num">{formatBRL(unit.averageTicketCents)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Participação</p>
                        <p className="num">{totalCents ? ((unit.approximateDailySumCents / totalCents) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : 0}%</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </Painel>
          </div>
        </>
      )}

      <SalesReportDetails />
    </div>
  )
}
