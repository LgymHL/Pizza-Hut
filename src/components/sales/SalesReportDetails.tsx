
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowDownRight,
  CalendarDays,
  CreditCard,
  RefreshCw,
  ShoppingBag,
  Store,
  Wallet,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useAuth } from '../../contexts/AuthContext'

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:3000'
).replace(/\/$/, '')

type Payment = {
  method: string
  totalCents: number
  breakdown: {
    brand: string
    count: number
    totalCents: number
  }[]
}

type Channel = {
  name: string
  level: number
  tickets: number
  grossCents: number
  discountsCents: number
  totalCents: number
}

type Cancellation = {
  count: number
  totalCents: number
}

type SalesDetails = {
  payments: Payment[]
  channels: Channel[]
  cancellations: {
    orders: Cancellation
    canceledCoupons: Cancellation
    uncanceledCoupons: Cancellation
  }
  tipsCents: number
  generatedAt: string | null
  lastSaleProcessedAt: string | null
}

type SalesUnit = {
  id: string
  unitId: string
  unitName: string

  grossSalesCents: number
  discountsCents: number
  invoicedSalesCents: number
  storeSalesCents: number

  ticketCount: number
  averageTicketCents: number
  ifoodSharePercent: number | null

  details: SalesDetails | null
}

type SalesResponse = {
  forbidden: boolean
  period: {
    start: string
    end: string
  } | null
  units: SalesUnit[]
}

const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value / 100)

const number = (value: number) =>
  new Intl.NumberFormat('pt-BR').format(value)

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}

function compactCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

function Kpi({
  label,
  value,
  description,
}: {
  label: string
  value: string
  description?: string
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <p className="text-xs text-gray-500">{label}</p>

      <strong className="mt-2 block text-lg font-semibold text-gray-900">
        {value}
      </strong>

      {description && (
        <p className="mt-1 text-[11px] leading-5 text-gray-400">
          {description}
        </p>
      )}
    </div>
  )
}

/**
 * @author Gabriel
 * @example
 * <SalesReportDetails />
 */
export default function SalesReportDetails() {
  const { token } = useAuth()
  const [searchParams] = useSearchParams()

  const unitId = searchParams.get('unitId') || ''
  const startDate = searchParams.get('startDate') || ''
  const endDate = searchParams.get('endDate') || ''

  const [data, setData] = useState<SalesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!token) {
      setLoading(false)
      setError('Sessão não encontrada.')
      setData(null)
      return
    }

    const controller = new AbortController()

    async function load() {
      setLoading(true)
      setError('')
      setData(null)

      const params = new URLSearchParams()

      if (unitId) params.set('unitId', unitId)

      if (startDate && endDate) {
        params.set('startDate', startDate)
        params.set('endDate', endDate)
      }

      try {
        const response = await fetch(
          `${API_URL}/dashboard/sales-details?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
            signal: controller.signal,
          },
        )

        if (!response.ok) {
          throw new Error(
            response.status === 403
              ? 'Você não tem acesso aos dados dessa unidade.'
              : response.status === 401
                ? 'Sessão inválida ou expirada.'
                : 'Não foi possível carregar as vendas detalhadas.',
          )
        }

        const result = (await response.json()) as SalesResponse

        if (!controller.signal.aborted) {
          setData(result)
        }
      } catch (err) {
        if (controller.signal.aborted) return

        setError(
          err instanceof Error
            ? err.message
            : 'Erro ao consultar vendas detalhadas.',
        )
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => controller.abort()
  }, [token, unitId, startDate, endDate, refreshKey])

  const units = data?.units ?? []

  const totals = useMemo(() => {
    return units.reduce(
      (acc, unit) => ({
        tickets: acc.tickets + unit.ticketCount,
        sales: acc.sales + unit.invoicedSalesCents,
        discounts: acc.discounts + unit.discountsCents,
      }),
      { tickets: 0, sales: 0, discounts: 0 },
    )
  }, [units])

  return (
    <section className="rounded-xl border border-gray-200 bg-hut-card p-5 md:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-hut-red" />

            <h2 className="text-base font-semibold text-gray-900">
              Vendas detalhadas — PDV
            </h2>
          </div>

          <p className="mt-2 text-xs leading-5 text-gray-500">
            Indicadores exatos dos relatórios por dia de negócio.
            Os valores correspondem ao período inteiro informado
            no arquivo, não a vendas individuais por dia.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setRefreshKey((value) => value + 1)}
          disabled={loading}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw
            size={15}
            className={loading ? 'animate-spin' : ''}
          />
          Atualizar
        </button>
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-gray-500">
          Carregando dados do PDV...
        </p>
      ) : error ? (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-xs text-red-700"
        >
          <AlertCircle size={17} />
          {error}
        </div>
      ) : !data?.period || units.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
          <Store size={28} className="mx-auto text-gray-400" />

          <h3 className="mt-3 text-base font-semibold text-gray-900">
            Nenhum relatório de vendas encontrado
          </h3>

          <p className="mt-2 text-xs text-gray-500">
            Não há relatórios de PDV para o período
            e a unidade selecionados.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
            <CalendarDays size={16} className="text-hut-red" />
            Período dos relatórios:
            <strong className="text-gray-900">
              {formatDate(data.period.start)} a{' '}
              {formatDate(data.period.end)}
            </strong>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Kpi
              label="Vendas faturadas"
              value={money(totals.sales)}
              description="Soma das unidades no mesmo período"
            />

            <Kpi
              label="Tickets"
              value={number(totals.tickets)}
            />

            <Kpi
              label="Descontos"
              value={money(totals.discounts)}
            />
          </div>

          {units.map((unit) => {
            const details = unit.details

            const channels = (details?.channels ?? [])
              .filter((channel) => channel.level === 0)
              .filter(
                (channel) =>
                  channel.tickets > 0 || channel.totalCents > 0,
              )

            const payments = (details?.payments ?? [])
              .filter((payment) => payment.totalCents > 0)
              .sort((a, b) => b.totalCents - a.totalCents)

            const chartData = channels.map((channel) => ({
              name: channel.name,
              sales: channel.totalCents / 100,
            }))

            return (
              <article
                key={unit.id}
                className="rounded-xl border border-gray-200 p-4 md:p-5"
              >
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                      <Store size={17} className="text-hut-red" />
                      {unit.unitName}
                    </h3>

                    <p className="mt-2 text-xs text-gray-500">
                      Relatório consolidado do período selecionado
                    </p>
                  </div>

                  <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700">
                    iFood: {unit.ifoodSharePercent == null ? 'não informado no relatório' : unit.ifoodSharePercent.toFixed(2).replace('.', ',') + '%'}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Kpi
                    label="Vendas faturadas"
                    value={money(unit.invoicedSalesCents)}
                  />
                  <Kpi
                    label="Vendas da loja"
                    value={money(unit.storeSalesCents)}
                  />
                  <Kpi
                    label="Tickets"
                    value={number(unit.ticketCount)}
                  />
                  <Kpi
                    label="Ticket médio informado"
                    value={money(unit.averageTicketCents)}
                  />
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <Kpi
                    label="Venda bruta"
                    value={money(unit.grossSalesCents)}
                  />
                  <Kpi
                    label="Descontos"
                    value={money(unit.discountsCents)}
                  />
                  <Kpi
                    label="Gorjetas"
                    value={
                      details
                        ? money(details.tipsCents)
                        : 'Indisponível'
                    }
                  />
                </div>

                {!details ? (
                  <div className="mt-5 flex items-start gap-2 rounded-lg bg-amber-50 p-4 text-xs leading-5 text-amber-800">
                    <AlertCircle size={17} className="shrink-0" />
                    Os indicadores principais foram importados,
                    mas os detalhes ainda não estão disponíveis.
                    Verifique o backfill do campo details.
                  </div>
                ) : (
                  <>
                    <div className="mt-6 grid gap-5 xl:grid-cols-2">
                      <div className="rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center gap-2">
                          <ShoppingBag
                            size={17}
                            className="text-hut-red"
                          />
                          <h4 className="text-sm font-semibold text-gray-900">
                            Canais de venda
                          </h4>
                        </div>

                        {channels.length > 0 ? (
                          <>
                            <div className="mt-5 h-64">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={chartData}
                                  margin={{
                                    top: 5,
                                    right: 5,
                                    bottom: 25,
                                    left: 0,
                                  }}
                                >
                                  <CartesianGrid
                                    stroke="var(--border)"
                                    vertical={false}
                                  />

                                  <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 10 }}
                                    interval={0}
                                    angle={-15}
                                    textAnchor="end"
                                    height={50}
                                  />

                                  <YAxis
                                    tick={{ fontSize: 10 }}
                                    tickFormatter={(value) =>
                                      compactCurrency(Number(value))
                                    }
                                  />

                                  <Tooltip
                                    formatter={(value) =>
                                      money(Math.round(Number(value) * 100))
                                    }
                                  />

                                  <Bar
                                    dataKey="sales"
                                    name="Vendas faturadas"
                                    fill="var(--chart-1)"
                                    radius={[5, 5, 0, 0]}
                                  />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>

                            <div className="mt-3 space-y-3">
                              {channels.map((channel, index) => (
                                <div
                                  key={`${channel.name}-${index}`}
                                  className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3 text-xs last:border-0"
                                >
                                  <div>
                                    <p className="font-medium text-gray-800">
                                      {channel.name}
                                    </p>
                                    <p className="mt-1 text-gray-500">
                                      {number(channel.tickets)} tickets
                                    </p>
                                  </div>

                                  <strong className="text-gray-900">
                                    {money(channel.totalCents)}
                                  </strong>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <p className="py-8 text-center text-xs text-gray-500">
                            Nenhum canal disponível.
                          </p>
                        )}
                      </div>

                      <div className="rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center gap-2">
                          <CreditCard
                            size={17}
                            className="text-hut-red"
                          />
                          <h4 className="text-sm font-semibold text-gray-900">
                            Formas de pagamento
                          </h4>
                        </div>

                        <div className="mt-5 space-y-4">
                          {payments.map((payment) => {
                            const percentage =
                              unit.invoicedSalesCents > 0
                                ? (
                                    payment.totalCents /
                                    unit.invoicedSalesCents
                                  ) * 100
                                : 0

                            return (
                              <div key={payment.method}>
                                <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                                  <span className="font-medium text-gray-700">
                                    {payment.method}
                                  </span>
                                  <span className="font-semibold text-gray-900">
                                    {money(payment.totalCents)}
                                  </span>
                                </div>

                                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                                  <div
                                    className="h-full rounded-full bg-hut-red"
                                    style={{
                                      width: `${Math.min(100, percentage)}%`,
                                    }}
                                  />
                                </div>

                                <p className="mt-1 text-right text-[11px] text-gray-400">
                                  {percentage.toFixed(1).replace('.', ',')}%
                                </p>
                              </div>
                            )
                          })}
                        </div>

                        {payments.length === 0 && (
                          <p className="py-8 text-center text-xs text-gray-500">
                            Nenhuma forma de pagamento disponível.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center gap-2">
                        <ArrowDownRight
                          size={17}
                          className="text-hut-red"
                        />

                        <h4 className="text-sm font-semibold text-gray-900">
                          Cancelamentos
                        </h4>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <Kpi
                          label="Pedidos cancelados"
                          value={details.cancellations.orders.count < 0 ? '—' : number(details.cancellations.orders.count)}
                          description={
                            details.cancellations.orders.count < 0
                              ? 'Não informado neste relatório'
                              : money(details.cancellations.orders.totalCents) + ' informado no relatório'
                          }
                        />

                        <Kpi
                          label="Cupons cancelados"
                          value={details.cancellations.canceledCoupons.count < 0 ? 'Valor' : number(details.cancellations.canceledCoupons.count)}
                          description={money(
                            details.cancellations.canceledCoupons.totalCents,
                          )}
                        />

                        <Kpi
                          label="Cupons não cancelados"
                          value={details.cancellations.uncanceledCoupons.count < 0 ? 'Valor' : number(details.cancellations.uncanceledCoupons.count)}
                          description={money(
                            details.cancellations.uncanceledCoupons.totalCents,
                          )}
                        />
                      </div>
                    </div>

                    {payments.some((payment) => payment.breakdown.length > 0) && (
                      <details className="mt-5 rounded-lg border border-gray-200 p-4">
                        <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-gray-800">
                          <Wallet size={16} className="text-hut-red" />
                          Ver bandeiras e detalhamento de pagamentos
                        </summary>

                        <div className="mt-4 space-y-4">
                          {payments
                            .filter((payment) => payment.breakdown.length > 0)
                            .map((payment) => (
                              <div key={payment.method}>
                                <p className="mb-2 text-xs font-semibold text-gray-800">
                                  {payment.method}
                                </p>

                                <div className="space-y-2">
                                  {payment.breakdown.map((part, index) => (
                                    <div
                                      key={`${part.brand}-${index}`}
                                      className="flex justify-between gap-3 text-xs text-gray-600"
                                    >
                                      <span>
                                        {part.brand === '-'
                                          ? 'Sem bandeira informada'
                                          : part.brand}
                                        {' · '}
                                        {number(part.count)} transações
                                      </span>

                                      <span className="font-medium">
                                        {money(part.totalCents)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                        </div>
                      </details>
                    )}

                    <p className="mt-5 text-[11px] leading-5 text-gray-400">
                      Dados importados do PDF do PDV. Os canais secundários
                      não são somados novamente, para evitar duplicidade.
                      O percentual do iFood é o indicador informado pelo
                      relatório original.
                      {details.generatedAt && (
                        <> Relatório gerado em {formatDate(details.generatedAt)}.</>
                      )}
                    </p>
                  </>
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
