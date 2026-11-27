import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'

import { useAuth } from '../../contexts/AuthContext'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '')

const HIGH_DEMAND_TITLE = 'Alta demanda prevista (avaliação manual)'

const WEEK_DAYS = [
  'Dom',
  'Seg',
  'Ter',
  'Qua',
  'Qui',
  'Sex',
  'Sáb',
]

type PlanningEvent = {
  id: string
  title: string
  description: string | null
  date: string
  unitId: string | null
}

type CalendarDay = {
  date: string
  weekDay: number
  weekend: boolean
  holiday: {
    date: string
    title: string
    type: 'NATIONAL' | 'STATE' | 'MUNICIPAL'
  } | null
  events: PlanningEvent[]
  attention: boolean
  reasons: string[]
}

type CalendarResponse = {
  month: string
  holidayCalendarVerified: boolean
  forecastAvailable: boolean
  days: CalendarDay[]
}

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
  totalRecords: number
  records: DailySalesRecord[]
}

function currentMonth() {
  const now = new Date()

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1,
  ).padStart(2, '0')}`
}

function changeMonth(value: string, offset: number) {
  const [year, month] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1 + offset, 1))

  return date.toISOString().slice(0, 7)
}

function formatMonth(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}-01T12:00:00Z`))
}

function dateKey(value: string) {
  return value.slice(0, 10)
}

function formatDay(value: string) {
  const [year, month, day] = dateKey(value).split('-')

  return `${day}/${month}/${year}`
}

function formatBRL(cents: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR').format(value)
}

function isHighDemandEvent(event: PlanningEvent) {
  return event.title === HIGH_DEMAND_TITLE
}

/**
 * @author Gabriel
 * @example
 * <ProductionCalendar />
 */
export default function ProductionCalendar() {
  const { token, user } = useAuth()
  const [searchParams] = useSearchParams()

  const isGeneralManager = user?.role === 'GENERAL_MANAGER'
  const requestedUnitId = searchParams.get('unitId') || ''

  const unitId =
    requestedUnitId &&
    (
      isGeneralManager ||
      user?.units.some((unit) => unit.id === requestedUnitId)
    )
      ? requestedUnitId : ''

  const [month, setMonth] = useState(currentMonth)
  const [calendar, setCalendar] = useState<CalendarResponse | null>(null)
  const [dailySales, setDailySales] = useState<DailySalesRecord[]>([])

  const [selectedDate, setSelectedDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [dailyLoading, setDailyLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')
  const [dailyError, setDailyError] = useState('')
  const [message, setMessage] = useState('')

  const [refreshKey, setRefreshKey] = useState(0)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventUnitId, setEventUnitId] = useState('')

  const [highDemandMode, setHighDemandMode] = useState(false)

  // CALENDÁRIO

  useEffect(() => {
    if (!token) {
      setCalendar(null)
      setError('Sessão não encontrada.')
      setLoading(false)
      return
    }

    const controller = new AbortController()

    async function loadCalendar() {
      setLoading(true)
      setError('')
      setCalendar(null)

      const params = new URLSearchParams({ month })

      if (unitId) {
        params.set('unitId', unitId)
      }

      try {
        const response = await fetch(`${API_URL}/planning/calendar?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          },
        )

        if (!response.ok) {
          throw new Error(
            `Não foi possível carregar o calendário (${response.status}).`,
          )
        }

        const result =
          (await response.json()) as CalendarResponse

        if (!controller.signal.aborted) {
          setCalendar(result)
        }
      } catch (err) {
        if (controller.signal.aborted) return

        setCalendar(null)

        setError(
          err instanceof Error
            ? err.message
            : 'Erro ao carregar calendário.',
        )
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadCalendar()

    return () => controller.abort()
  }, [token, month, unitId, refreshKey])

  // HISTÓRICO DIÁRIO

  useEffect(() => {
    if (!token) {
      setDailySales([])
      setDailyError('')
      setDailyLoading(false)
      return
    }

    const controller = new AbortController()

    async function loadDailySales() {
      setDailyLoading(true)
      setDailyError('')
      setDailySales([])

      const params = new URLSearchParams({ month })

      if (unitId) {
        params.set('unitId', unitId)
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
              ? 'Você não tem acesso a esses dados.'
              : response.status === 401
                ? 'Sessão inválida ou expirada.'
                : `Erro ao consultar vendas diárias (${response.status}).`,
          )
        }

        const result = (await response.json()) as DailySalesResponse

        if (!controller.signal.aborted) {
          setDailySales(result.records)
        }
      } catch (err) {
        if (controller.signal.aborted) return

        setDailySales([])

        setDailyError(
          err instanceof Error
            ? err.message : 'Não foi possível carregar as vendas diárias.',
        )
      } finally {
        if (!controller.signal.aborted) {
          setDailyLoading(false)
        }
      }
    }

    void loadDailySales()

    return () => controller.abort()
  }, [token, month, unitId, refreshKey])

  // DADOS PROCESSADOS

  const cells = useMemo(() => {
    const days = calendar?.days ?? []

    if (!days.length) return []

    return [
      ...Array<CalendarDay | null>(
        days[0].weekDay,
      ).fill(null),
      ...days,
    ]
  }, [calendar])

  const salesByDate = useMemo(() => {
    const grouped = new Map<string, DailySalesRecord[]>()

    for (const record of dailySales) {
      const key = dateKey(record.date)
      const current = grouped.get(key) ?? []

      current.push(record)
      grouped.set(key, current)
    }

    return grouped
  }, [dailySales])

  const selectedDay =
    calendar?.days.find(
      (day) => day.date === selectedDate,
    ) ?? null

  const selectedSales = selectedDay
    ? salesByDate.get(selectedDay.date) ?? []
    : []

  const selectedTickets = selectedSales.reduce(
    (total, record) => total + record.ticketCount,
    0,
  )

  const selectedSalesCents = selectedSales.reduce(
    (total, record) => total + record.salesCents,
    0,
  )

  const attentionDays = calendar?.days.filter((day) => day.attention).length ?? 0

  const holidays = calendar?.days.filter((day) => day.holiday).length ?? 0

  const registeredEvents =
    calendar?.days.reduce(
      (total, day) => total + day.events.length,
      0,
    ) ?? 0

  const highDemandDates =
    calendar?.days.filter((day) =>
      day.events.some(isHighDemandEvent),
    ).length ?? 0

  // NAVEGAÇÃO

  function navigateMonth(offset: number) {
    setMonth((value) => changeMonth(value, offset))
    setSelectedDate('')
    setMessage('')
    setTitle('')
    setDescription('')
    setEventUnitId('')
    setHighDemandMode(false)
  }

  function selectDate(date: string) {
    setSelectedDate(date)
    setMessage('')
    setError('')
    setTitle('')
    setDescription('')
    setEventUnitId(unitId)
    setHighDemandMode(false)
  }

  // CADASTRO DE EVENTOS

  function prepareHighDemand() {
    if (!isGeneralManager || !selectedDay) return

    setHighDemandMode(true)
    setTitle(HIGH_DEMAND_TITLE)
    setDescription('')
    setEventUnitId(unitId)
    setError('')
    setMessage('')
  }

  function prepareNormalEvent() {
    setHighDemandMode(false)
    setTitle('')
    setDescription('')
    setError('')
    setMessage('')
  }

  async function saveEvent() {
    const eventTitle = highDemandMode
      ? HIGH_DEMAND_TITLE
      : title.trim()

    if (
      !token ||
      !isGeneralManager ||
      !selectedDay ||
      eventTitle.length < 3 ||
      saving
    ) {
      return
    }

    if (highDemandMode && !description.trim()) {
      setError('Informe a justificativa para a alta demanda.')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch(`${API_URL}/planning/events`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: eventTitle,
            description: description.trim() || null,
            date: selectedDay.date,
            unitId: eventUnitId || null,
          }),
        },
      )

      if (!response.ok) {
        const payload = await response.json().catch(() => null)

        throw new Error(
          payload?.message || 'Erro ao cadastrar evento.',
        )
      }

      setTitle('')
      setDescription('')
      setEventUnitId('')
      setHighDemandMode(false)

      setMessage(
        highDemandMode
          ? 'Alta demanda prevista registrada com sucesso.' : 'Evento cadastrado com sucesso.',
      )

      setRefreshKey((value) => value + 1)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao cadastrar evento.',
      )
    } finally {
      setSaving(false)
    }
  }

  // EXCLUSÃO DE EVENTOS

  async function deleteEvent(eventId: string) {
    if (!token || !isGeneralManager || saving) return

    setSaving(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch(`${API_URL}/planning/events/${eventId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!response.ok) {
        throw new Error(
          'Não foi possível excluir o evento.',
        )
      }

      setMessage('Registro excluído com sucesso.')
      setRefreshKey((value) => value + 1)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao excluir evento.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-hut-card p-5 md:p-6">
      {/* CABEÇALHO */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays size={20} className="text-hut-red" />
            <h3 className="text-base font-semibold text-gray-900">
              Calendário de produção
            </h3>
          </div>

          <p className="mt-2 text-xs leading-5 text-gray-500">
            Feriados, eventos, histórico operacional e datas
            que exigem atenção no planejamento.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button type="button"
            onClick={() => navigateMonth(-1)}
            aria-label="Mês anterior" className="cursor-pointer rounded-lg border border-gray-200 p-2 hover:bg-gray-50">
            <ChevronLeft size={17} />
          </button>

          <span className="min-w-36 text-center text-sm font-semibold capitalize text-gray-900">
            {formatMonth(month)}
          </span>

          <button type="button"
            onClick={() => navigateMonth(1)}
            aria-label="Próximo mês" className="cursor-pointer rounded-lg border border-gray-200 p-2 hover:bg-gray-50">
            <ChevronRight size={17} />
          </button>
        </div>
      </div>

      {/* MENSAGENS */}

      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700">
          {error}
        </p>
      )}

      {message && (
        <p role="status" className="mb-4 rounded-lg bg-green-50 p-3 text-xs text-green-700">
          {message}
        </p>
      )}

      {/* INDICADORES */}

      {!loading && calendar && (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              label: 'Dias com atenção',
              value: attentionDays,
            },
            {
              label: 'Feriados',
              value: holidays,
            },
            {
              label: 'Eventos cadastrados',
              value: registeredEvents,
            },
            {
              label: 'Dias de alta demanda prevista',
              value: highDemandDates,
            },
          ].map((item) => (
            <div key={item.label} className="rounded-lg bg-gray-50 p-3">
              <p className="text-[11px] text-gray-500">
                {item.label}
              </p>

              <strong className="mt-2 block text-xl text-gray-900">
                {formatNumber(item.value)}
              </strong>
            </div>
          ))}
        </div>
      )}

      {/* CALENDÁRIO */}

      {loading ? (
        <p className="py-16 text-center text-sm text-gray-500">
          Carregando calendário...
        </p>
      ) : calendar ? (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="mb-2 grid grid-cols-7 gap-1">
              {WEEK_DAYS.map((name, index) => (
                <div key={`${name}-${index}`} className="py-2 text-center text-xs font-medium text-gray-500">
                  {name}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, index) => {
                if (!day) {
                  return <div key={`empty-${index}`} />
                }

                const hasHighDemand =
                  day.events.some(isHighDemandEvent)

                const hasRegularEvent =
                  day.events.some(
                    (event) => !isHighDemandEvent(event),
                  )

                const hasSales =
                  salesByDate.has(day.date)

                return (
                  <button key={day.date} type="button"
                    onClick={() => selectDate(day.date)}
                    aria-label={`Selecionar ${formatDay(day.date)}`} aria-pressed={selectedDate === day.date}
                    className={[
                      'relative flex min-h-16 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border p-2 text-xs transition',
                      selectedDate === day.date
                        ? 'border-hut-red bg-red-50' : hasHighDemand
                          ? 'border-amber-300 bg-amber-50' : 'border-gray-100 hover:border-gray-300',
                      day.holiday
                        ? 'text-red-700' : 'text-gray-700',
                    ].join(' ')}>
                    <span className="font-semibold">
                      {Number(day.date.slice(-2))}
                    </span>

                    <div className="flex flex-wrap justify-center gap-1">
                      {day.holiday && (
                        <span title="Feriado" className="h-2 w-2 rounded-full bg-red-600" />
                      )}

                      {day.weekend && !day.holiday && (
                        <span title="Fim de semana" className="h-2 w-2 rounded-full bg-amber-400" />
                      )}

                      {hasRegularEvent && (
                        <span title="Evento cadastrado" className="h-2 w-2 rounded-full bg-blue-500" />
                      )}

                      {hasHighDemand && (
                        <span title="Alta demanda prevista manualmente" className="h-2 w-2 rounded-full bg-orange-600" />
                      )}

                      {!dailyLoading && !dailyError && hasSales && (
                        <span title="Vendas registradas" className="h-2 w-2 rounded-full bg-green-500" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* LEGENDA */}

            <div className="mt-5 flex flex-wrap gap-4 text-[11px] text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-600" />
                Feriado
              </span>

              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Fim de semana
              </span>

              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Evento
              </span>

              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-orange-600" />
                Alta demanda prevista
              </span>

              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Vendas registradas
              </span>
            </div>

            {!calendar.holidayCalendarVerified && (
              <p className="mt-4 text-xs text-amber-700">
                Os dados oficiais de feriados não puderam
                ser totalmente verificados neste período.
              </p>
            )}
          </div>

          {/* DETALHES DO DIA */}

          <aside className="rounded-lg border border-gray-200 bg-gray-50 p-5">
            {!selectedDay ? (
              <div className="py-8 text-center">
                <CalendarDays size={28} className="mx-auto text-gray-400" />

                <p className="mt-3 text-xs text-gray-500">
                  Selecione uma data para consultar
                  os detalhes e cadastrar eventos.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* DATA E ALERTAS */}

                <div>
                  <h4 className="text-sm font-semibold text-gray-900">
                    {formatDay(selectedDay.date)}
                  </h4>

                  {selectedDay.attention ? (
                    <p className="mt-2 flex items-center gap-2 text-xs text-amber-700">
                      <AlertTriangle size={15} />
                      Atenção ao planejamento
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-gray-500">
                      Nenhum alerta de planejamento para esta data.
                    </p>
                  )}
                </div>

                {selectedDay.reasons.length > 0 && (
                  <div className="space-y-2">
                    {selectedDay.reasons.map((reason) => (
                      <p key={reason} className="rounded-lg bg-hut-card px-3 py-2 text-xs text-gray-700">
                        {reason}
                      </p>
                    ))}
                  </div>
                )}

                {/* HISTÓRICO OPERACIONAL */}

                <div className="border-t border-gray-200 pt-4">
                  <h5 className="mb-3 text-xs font-semibold text-gray-900">
                    Histórico operacional do dia
                  </h5>

                  {dailyLoading ? (
                    <p className="text-xs text-gray-500">
                      Carregando vendas diárias...
                    </p>
                  ) : dailyError ? (
                    <p role="alert" className="text-xs text-red-600">
                      {dailyError}
                    </p>
                  ) : selectedSales.length === 0 ? (
                    <p className="text-xs leading-5 text-gray-500">
                      Sem dados diários disponíveis para esta data.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg bg-hut-card p-3">
                          <p className="text-[11px] text-gray-500">
                            Tickets registrados
                          </p>

                          <strong className="mt-2 block text-lg text-gray-900">
                            {formatNumber(selectedTickets)}
                          </strong>
                        </div>

                        <div className="rounded-lg bg-hut-card p-3">
                          <p className="text-[11px] text-gray-500">
                            Vendas faturadas
                          </p>

                          <strong className="mt-2 block text-sm text-gray-900">
                            {formatBRL(selectedSalesCents)}
                          </strong>
                        </div>
                      </div>

                      {selectedSales.map((record) => (
                        <div key={record.id} className="rounded-lg border border-gray-200 bg-hut-card p-3">
                          <p className="text-xs font-semibold text-gray-900">
                            {record.unitName}
                          </p>

                          <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-gray-600">
                            <span>
                              {formatNumber(record.ticketCount)} tickets
                            </span>

                            <span>
                              {formatBRL(record.salesCents)}
                            </span>
                          </div>

                          <p className="mt-2 text-[11px] text-gray-400">
                            Origem: {record.source === 'GMAIL'
                              ? 'E-mail' : 'Manual'}
                          </p>
                        </div>
                      ))}

                      <p className="text-[11px] leading-5 text-gray-500">
                        Os valores representam somente os
                        registros disponíveis, não uma previsão.
                      </p>
                    </div>
                  )}
                </div>

                {/* EVENTOS E PREVISÕES MANUAIS */}

                {selectedDay.events.length > 0 && (
                  <div className="space-y-3 border-t border-gray-200 pt-4">
                    <h5 className="text-xs font-semibold text-gray-900">
                      Eventos e sinalizações
                    </h5>

                    {selectedDay.events.map((event) => {
                      const highDemand = isHighDemandEvent(event)

                      return (
                        <div key={event.id}
                          className={[
                            'rounded-lg border p-3',
                            highDemand
                              ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-hut-card',
                          ].join(' ')}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p
                                className={[
                                  'text-xs font-semibold',
                                  highDemand
                                    ? 'text-amber-900' : 'text-gray-900',
                                ].join(' ')}>
                                {event.title}
                              </p>

                              {highDemand && (
                                <span className="mt-2 inline-block rounded-md bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-800">
                                  Avaliação manual
                                </span>
                              )}

                              {event.description && (
                                <p className="mt-2 text-xs leading-5 text-gray-600">
                                  {event.description}
                                </p>
                              )}

                              {event.unitId && (
                                <p className="mt-2 text-[11px] text-gray-500">
                                  Unidade: {
                                    user?.units.find(
                                      (unit) => unit.id === event.unitId,
                                    )?.name ?? 'Unidade específica'
                                  }
                                </p>
                              )}
                            </div>

                            {isGeneralManager && (
                              <button type="button"
                                onClick={() => deleteEvent(event.id)}
                                disabled={saving} aria-label={`Excluir ${event.title}`}
                                className="cursor-pointer text-gray-400 hover:text-red-600 disabled:opacity-50">
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* FORMULÁRIO DO GERENTE GERAL */}

                {isGeneralManager && (
                  <div className="space-y-3 border-t border-gray-200 pt-5">
                    <h5 className="text-xs font-semibold text-gray-900">
                      Planejamento da data
                    </h5>

                    <div className="grid grid-cols-1 gap-2">
                      <button type="button"
                        onClick={prepareHighDemand}
                        className={[
                          'flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 py-3 text-xs font-semibold',
                          highDemandMode
                            ? 'border-amber-400 bg-amber-100 text-amber-900' : 'border-amber-200 bg-hut-card text-amber-800 hover:bg-amber-50',
                        ].join(' ')}>
                        <AlertTriangle size={16} />
                        Marcar alta demanda prevista
                      </button>

                      {highDemandMode && (
                        <button type="button"
                          onClick={prepareNormalEvent}
                          className="cursor-pointer rounded-lg border border-gray-200 bg-hut-card px-4 py-3 text-xs font-medium text-gray-700 hover:bg-gray-50">
                          Voltar para evento comum
                        </button>
                      )}
                    </div>

                    {highDemandMode ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                        <p className="text-xs font-semibold text-amber-900">
                          Alta demanda prevista
                        </p>

                        <p className="mt-1 text-xs leading-5 text-amber-800">
                          Essa marcação representa a avaliação
                          do gerente. Não é uma previsão automática.
                        </p>
                      </div>
                    ) : (
                      <input value={title}
                        onChange={(event) => setTitle(event.target.value)} maxLength={120}
                        placeholder="Nome do evento" className="w-full rounded-lg border border-gray-200 bg-hut-card px-3 py-2.5 text-xs outline-none focus:border-hut-red" />
                    )}

                    <textarea value={description}
                      onChange={(event) =>
                        setDescription(event.target.value)
                      }
                      maxLength={1000}
                      placeholder={
                        highDemandMode
                          ? 'Justificativa da alta demanda (obrigatória)' : 'Descrição (opcional)'
                      }
                      rows={3} className="w-full rounded-lg border border-gray-200 bg-hut-card px-3 py-2.5 text-xs outline-none focus:border-hut-red" />

                    <select value={eventUnitId}
                      onChange={(event) =>
                        setEventUnitId(event.target.value)
                      }
                      className="w-full rounded-lg border border-gray-200 bg-hut-card px-3 py-2.5 text-xs" >
                      <option value="">
                        Todas as unidades
                      </option>

                      {(user?.units ?? []).map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.name}
                        </option>
                      ))}
                    </select>

                    <button type="button"
                      onClick={saveEvent}
                      disabled={
                        saving ||
                        (highDemandMode
                          ? !description.trim() : title.trim().length < 3)
                      }
                      className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-hut-red px-4 py-3 text-xs font-semibold text-white disabled:opacity-50">
                      <Plus size={16} />

                      {saving
                        ? 'Salvando...' : highDemandMode
                          ? 'Registrar alta demanda' : 'Adicionar evento'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      ) : null}

      <p className="mt-6 text-xs leading-5 text-gray-500">
        As marcações de alta demanda são avaliações manuais
        do gerente. Feriados e fins de semana indicam datas
        que merecem atenção, mas não garantem aumento de vendas.
        Previsões automáticas dependerão de histórico suficiente.
      </p>
    </section>
  )
}
