import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertCircle, BarChart3, CalendarDays, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '')

const WEEKDAYS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
]

type DailySalesRecord = {
  id: string
  unitId: string
  unitName: string
  date: string
  ticketCount: number
  salesCents: number
  source: 'GMAIL' | 'MANUAL'
}

type DailySalesResponse = {
  month: string
  records: DailySalesRecord[]
}

type WeekdayStats = {
  day: string
  weekday: number
  count: number
  totalTickets: number
  totalSalesCents: number
  averageTickets: number | null
  averageSalesCents: number | null
}

type UnitAnalysis = {
  unitId: string
  unitName: string
  recordCount: number
  importedCount: number
  manualCount: number
  totalTickets: number
  totalSalesCents: number
  days: WeekdayStats[]
}

function todayInFortaleza() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? ''

  return `${value('year')}-${value('month')}-${value('day')}`
}

function currentMonth() {
  return todayInFortaleza().slice(0, 7)
}

function changeMonth(value: string, offset: number) {
  const [year, month] = value.split('-').map(Number)

  return new Date(Date.UTC(year, month - 1 + offset, 1))
    .toISOString()
    .slice(0, 7)
}

function formatMonth(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}-01T12:00:00Z`))
}

function formatBRL(cents: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 1,
  }).format(value)
}

function getWeekday(date: string) {
  return new Date(
    `${date.slice(0, 10)}T12:00:00Z`,
  ).getUTCDay()
}

function elapsedDatesOfMonth(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)

  const lastDay = new Date(
    Date.UTC(year, monthNumber, 0),
  ).getUTCDate()

  const today = todayInFortaleza()

  return Array.from({ length: lastDay }, (_, index) => {
    const day = String(index + 1).padStart(2, '0')
    return `${month}-${day}`
  }).filter((date) => date < today)
}

function isValidRecord(record: DailySalesRecord) {
  return (
    typeof record.id === 'string' &&
    typeof record.unitId === 'string' &&
    typeof record.unitName === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(record.date.slice(0, 10)) &&
    Number.isSafeInteger(record.ticketCount) &&
    record.ticketCount >= 0 &&
    Number.isSafeInteger(record.salesCents) &&
    record.salesCents >= 0
  )
}

function Metric({ label, value } : {
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <strong className="mt-2 block text-lg font-semibold text-gray-900">
        {value}
      </strong>
    </div>
  )
}

/**
 * @author Gabriel
 * @example
 * <DemandAnalysis />
 */
export default function DemandAnalysis() {
  const { token, user } = useAuth()
  const [searchParams] = useSearchParams()

  const requestedUnitId = searchParams.get('unitId') ?? ''
  const isGeneralManager = user?.role === 'GENERAL_MANAGER'

  const unitAuthorized =
    !requestedUnitId ||
    isGeneralManager ||
    (user?.units ?? []).some(
      (unit) => unit.id === requestedUnitId,
    )

  const [month, setMonth] = useState(currentMonth)
  const [records, setRecords] = useState<DailySalesRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!token) {
      setRecords([])
      setError('Sessão não encontrada.')
      setLoading(false)
      return
    }

    if (!unitAuthorized) {
      setRecords([])
      setError('Você não tem acesso à unidade selecionada.')
      setLoading(false)
      return
    }

    const controller = new AbortController()

    async function load() {
      setLoading(true)
      setError('')
      setRecords([])

      const params = new URLSearchParams({ month })

      if (requestedUnitId) {
        params.set('unitId', requestedUnitId)
      }

      try {
        const response = await fetch(`${API_URL}/daily-sales?${params.toString()}`,
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
              ? 'Você não tem acesso a esses dados.' : response.status === 401
                ? 'Sessão inválida ou expirada.' : `Erro ao consultar vendas diárias (${response.status}).`,
          )
        }

        const result =
          (await response.json()) as DailySalesResponse

        if (controller.signal.aborted) return

        if (!Array.isArray(result.records)) {
          throw new Error('Resposta inválida da API.')
        }

        const today = todayInFortaleza()

        const validRecords = result.records.filter(
          (record) =>
            isValidRecord(record) &&
            record.date.slice(0, 7) === month &&
            record.date.slice(0, 10) < today,
        )

        if (validRecords.length !== result.records.length) {
          console.warn(
            '[DEMAND] Registros inválidos, futuros ou do dia atual foram excluídos da análise.',
          )
        }

        setRecords(validRecords)
      } catch (err) {
        if (controller.signal.aborted) return

        setError(
          err instanceof Error
            ? err.message
            : 'Erro ao analisar os dados.',
        )
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => controller.abort()
  }, [
    token,
    requestedUnitId,
    unitAuthorized,
    month,
    refreshKey,
  ])

  const analyses = useMemo<UnitAnalysis[]>(() => {
    const byUnit = new Map<string, DailySalesRecord[]>()

    for (const record of records) {
      const current = byUnit.get(record.unitId) ?? []
      current.push(record)
      byUnit.set(record.unitId, current)
    }

    return [...byUnit.entries()]
      .map(([unitId, unitRecords]) => {
        const days = WEEKDAYS.map((day, weekday) => {
          const matches = unitRecords.filter(
            (record) => getWeekday(record.date) === weekday,
          )

          const count = matches.length

          const totalTickets = matches.reduce(
            (sum, record) => sum + record.ticketCount,
            0,
          )

          const totalSalesCents = matches.reduce(
            (sum, record) => sum + record.salesCents,
            0,
          )

          return {
            day,
            weekday,
            count,
            totalTickets,
            totalSalesCents,
            averageTickets:
              count > 0 ? totalTickets / count : null,
            averageSalesCents:
              count > 0 ? totalSalesCents / count : null,
          }
        })

        return {
          unitId,
          unitName: unitRecords[0].unitName,
          recordCount: unitRecords.length,
          importedCount: unitRecords.filter(
            (record) => record.source === 'GMAIL',
          ).length,
          manualCount: unitRecords.filter(
            (record) => record.source === 'MANUAL',
          ).length,
          totalTickets: unitRecords.reduce(
            (sum, record) => sum + record.ticketCount,
            0,
          ),
          totalSalesCents: unitRecords.reduce(
            (sum, record) => sum + record.salesCents,
            0,
          ),
          days,
        }
      })
      .sort((a, b) => a.unitName.localeCompare(b.unitName))
  }, [records])

  const elapsedDates = useMemo(
    () => elapsedDatesOfMonth(month),
    [month],
  )

  const elapsedByWeekday = WEEKDAYS.map((day, index) => ({
    day,
    expected: elapsedDates.filter(
      (date) => getWeekday(date) === index,
    ).length,
  }))

  return (
    <section className="rounded-xl border border-gray-200 bg-hut-card p-5 md:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 size={20} className="text-hut-red" />

            <h3 className="text-base font-semibold text-gray-900">
              Análise de demanda
            </h3>
          </div>

          <p className="mt-2 max-w-2xl text-xs leading-5 text-gray-500">
            Médias observadas de vendas por dia da semana,
            calculadas exclusivamente a partir dos lançamentos
            diários registrados no banco de dados.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button type="button"
            onClick={() =>
              setMonth((value) => changeMonth(value, -1))
            }
            aria-label="Mês anterior"
            className="cursor-pointer rounded-lg border border-gray-200 p-2 hover:bg-gray-50">
            <ChevronLeft size={17} />
          </button>

          <span className="min-w-36 text-center text-xs font-semibold capitalize text-gray-900">
            {formatMonth(month)}
          </span>

          <button type="button"
            onClick={() =>
              setMonth((value) => changeMonth(value, 1))
            }
            aria-label="Próximo mês"
            className="cursor-pointer rounded-lg border border-gray-200 p-2 hover:bg-gray-50" >
            <ChevronRight size={17} />
          </button>

          <button type="button" disabled={loading}
            onClick={() => setRefreshKey((value) => value + 1)}
            aria-label="Atualizar análise"
            className="cursor-pointer rounded-lg border border-gray-200 p-2 hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="mb-5 flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
        <CalendarDays size={16} className="mt-0.5 shrink-0 text-gray-500" />
        <p className="text-xs leading-5 text-gray-600">
          Período analisado: <strong>{formatMonth(month)}</strong>.
          O dia atual e os dias futuros não entram no cálculo.
          Dias sem lançamento não são considerados vendas zero.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-gray-500">
          Consultando os dados reais de vendas...
        </div>
      ) : error ? (
        <div role="alert"
          className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-xs text-red-700">
          <AlertCircle size={16} />
          {error}
        </div>
      ) : analyses.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
          <BarChart3 size={30} className="mx-auto text-gray-400" />
          <h4 className="mt-3 text-sm font-semibold text-gray-900">
            Sem dados diários suficientes
          </h4>
          <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-gray-500">
            Não existem lançamentos diários encerrados para
            o mês e as unidades selecionados. Os relatórios
            consolidados do PDV não foram convertidos
            artificialmente em vendas por dia.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {analyses.map((unit) => {
            const observedDays = unit.days.filter(
              (day) => day.count > 0,
            )

            const maxTickets = Math.max(
              1,
              ...observedDays.map(
                (day) => day.averageTickets ?? 0,
              ),
            )

            const hasEnoughRecords = unit.days.every(
              (day) => day.count >= 3,
            )

            const strongestDay = [...observedDays].sort(
              (a, b) =>
                (b.averageTickets ?? 0) -
                (a.averageTickets ?? 0),
            )[0]

            return (
              <article key={unit.unitId} className="rounded-xl border border-gray-200 p-4 md:p-5">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">
                      {unit.unitName}
                    </h4>

                    <p className="mt-1 text-xs text-gray-500">
                      {unit.recordCount} dia(s) com dados reais
                    </p>
                  </div>

                  <span className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700">
                    {hasEnoughRecords
                      ? 'Amostra mínima de 3 por dia da semana' : 'Amostra limitada'}
                  </span>
                </div>

                <div className="mb-5 grid gap-3 sm:grid-cols-3">
                  <Metric label="Tickets registrados" value={formatNumber(unit.totalTickets)} />
                  <Metric label="Vendas registradas" value={formatBRL(unit.totalSalesCents)} />
                  <Metric label="Maior média observada"
                    value={
                      strongestDay
                        ? strongestDay.day : 'Sem dados'
                    } />
                </div>

                <p className="mb-5 text-xs text-gray-500">
                  Origem dos registros: {unit.importedCount} importado(s)
                  e {unit.manualCount} manual(is).
                </p>

                {!hasEnoughRecords && (
                  <div className="mb-5 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <p>
                      O histórico ainda é limitado. As médias abaixo
                      descrevem somente os dias registrados e não
                      constituem uma previsão confiável de demanda.
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  {unit.days.map((day) => {
                    const width =
                      day.averageTickets !== null
                        ? (day.averageTickets / maxTickets) * 100 : 0

                    return (
                      <div key={day.weekday}
                        className="grid gap-2 md:grid-cols-[110px_1fr_120px]">
                        <span className="text-xs font-medium text-gray-700">
                          {day.day}
                        </span>

                        <div>
                          <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                            {day.count > 0 && (
                              <div className="h-full rounded-full bg-hut-red"
                                style={{ width: `${width}%` }} />
                            )}
                          </div>

                          <p className="mt-1 text-[11px] text-gray-500">
                            {day.count === 0
                              ? 'Sem dados'
                              : `${day.count} registro(s) · Média faturada: ${formatBRL(
                                  day.averageSalesCents ?? 0,
                                )}`}
                          </p>
                        </div>

                        <strong className="text-right text-xs text-gray-900">
                          {day.averageTickets !== null
                            ? `${formatNumber(
                                day.averageTickets,
                              )} tickets`
                            : '—'}
                        </strong>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-5 overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full min-w-[600px] text-left text-xs">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        <th className="px-3 py-3 font-medium">
                          Dia da semana
                        </th>
                        <th className="px-3 py-3 text-right font-medium">
                          Datas encerradas
                        </th>
                        <th className="px-3 py-3 text-right font-medium">
                          Com registro
                        </th>
                        <th className="px-3 py-3 text-right font-medium">
                          Sem dados
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {unit.days.map((day) => {
                        const expected =
                          elapsedByWeekday[day.weekday].expected

                        return (
                          <tr key={day.weekday}>
                            <td className="px-3 py-3 text-gray-700">
                              {day.day}
                            </td>

                            <td className="px-3 py-3 text-right text-gray-600">
                              {expected}
                            </td>

                            <td className="px-3 py-3 text-right text-gray-600">
                              {day.count}
                            </td>

                            <td className="px-3 py-3 text-right text-gray-600">
                              {Math.max(0, expected - day.count)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <p className="mt-5 border-t border-gray-100 pt-4 text-[11px] leading-5 text-gray-500">
                  As médias são descritivas e usam apenas registros
                  diários existentes. A classificação de amostra
                  mínima não garante confiabilidade estatística,
                  representatividade do período ou qualidade
                  suficiente para previsão. Nenhum valor futuro
                  é gerado por este componente.
                </p>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}