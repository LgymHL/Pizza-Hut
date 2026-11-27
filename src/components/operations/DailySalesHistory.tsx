import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight, Pencil, RefreshCw, Save, Trash2, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import DailySalesForm from './DailySalesForm'
import DailySalesCoverage from './DailySalesCoverage'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '')

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
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
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

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR').format(value)
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const date = new Date(`${value}T00:00:00.000Z`)

  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
}

/**
 * @author Gabriel
 * @example
 * <DailySalesHistory />
 */
export default function DailySalesHistory() {
  const { token, user } = useAuth()
  const [searchParams] = useSearchParams()

  const requestedUnitId = searchParams.get('unitId') || ''

  const allowedUnit = user?.role === 'GENERAL_MANAGER' || user?.units.some((unit) => unit.id === requestedUnitId)

  const unitId = requestedUnitId && allowedUnit ? requestedUnitId : ''

  const isGeneralManager = user?.role === 'GENERAL_MANAGER'

  const [month, setMonth] = useState(currentMonth)
  const [data, setData] = useState<DailySalesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const [editing, setEditing] = useState<DailySalesRecord | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editTickets, setEditTickets] = useState('')
  const [editSales, setEditSales] = useState('')

  function refresh() {
    setRefreshKey((value) => value + 1)
  }

  useEffect(() => {
    if (!token) {
      setData(null)
      setError('Sessão não encontrada.')
      setLoading(false)
      return
    }

    const controller = new AbortController()

    async function load() {
      setLoading(true)
      setError('')
      setData(null)

      const params = new URLSearchParams({ month })

      if (unitId) params.set('unitId', unitId)

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
                : 'Não foi possível carregar o histórico.',
          )
        }

        const result = (await response.json()) as DailySalesResponse

        if (!controller.signal.aborted) {
          setData(result)
        }
      } catch (err) {
        if (controller.signal.aborted) return

        setError(
          err instanceof Error
            ? err.message
            : 'Erro ao carregar histórico diário.',
        )
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => controller.abort()
  }, [token, unitId, month, refreshKey])

  const records = data?.records ?? []

  const visibleUnits = (user?.units ?? []).filter(
    (unit) => !unitId || unit.id === unitId,
  )

  const totals = useMemo(() => {
    return records.reduce(
      (total, record) => ({
        tickets: total.tickets + record.ticketCount,
        salesCents: total.salesCents + record.salesCents,
      }),
      { tickets: 0, salesCents: 0 },
    )
  }, [records])

  function startEdit(record: DailySalesRecord) {
    if (!isGeneralManager || record.source !== 'MANUAL') return

    setEditing(record)
    setEditDate(record.date.slice(0, 10))
    setEditTickets(String(record.ticketCount))
    setEditSales((record.salesCents / 100).toFixed(2))
    setError('')
    setMessage('')
  }

  function cancelEdit() {
    setEditing(null)
    setError('')
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!token || !editing || !isGeneralManager || saving) return

    const ticketCount = Number(editTickets)
    const amount = Number(editSales)
    const salesCents = Math.round(amount * 100)

    if (
      !validDate(editDate) ||
      !Number.isSafeInteger(ticketCount) ||
      ticketCount < 0 ||
      !Number.isFinite(amount) ||
      amount < 0 ||
      !Number.isSafeInteger(salesCents) ||
      Math.abs(amount * 100 - salesCents) > 0.000001 ||
      (ticketCount === 0 && salesCents > 0)
    ) {
      setError('Confira a data, os tickets e o faturamento.')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch(`${API_URL}/daily-sales/${editing.id}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            date: editDate,
            ticketCount,
            salesCents,
          }),
        },
      )

      if (!response.ok) {
        const payload = await response.json().catch(() => null)

        throw new Error(
          payload?.message || 'Não foi possível atualizar o registro.',
        )
      }

      setEditing(null)
      setMessage('Registro atualizado com sucesso.')

      if (editDate.slice(0, 7) !== month) {
        setMonth(editDate.slice(0, 7))
      } else {
        refresh()
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao atualizar registro.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function deleteRecord(record: DailySalesRecord) {
    if (
      !token ||
      !isGeneralManager ||
      record.source !== 'MANUAL' ||
      saving
    ) {
      return
    }

    const confirmed = window.confirm(
      `Excluir as vendas de ${record.unitName} em ${formatDate(record.date)}?\n\nEsta ação não poderá ser desfeita.`,
    )

    if (!confirmed) return

    setSaving(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch(`${API_URL}/daily-sales/${record.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!response.ok) {
        const payload = await response.json().catch(() => null)

        throw new Error(
          payload?.message || 'Não foi possível excluir o registro.',
        )
      }

      setMessage('Registro excluído com sucesso.')
      refresh()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao excluir registro.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-hut-card p-5 md:p-6">
      <div className="mb-5">
        <DailySalesForm onSaved={refresh} />
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays size={20} className="text-hut-red" />

            <h3 className="text-base font-semibold text-gray-900">
              Histórico diário de vendas
            </h3>
          </div>

          <p className="mt-2 text-xs text-gray-500">
            Consulte e gerencie os registros diários de vendas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button type="button"
            onClick={() => setMonth((value) => changeMonth(value, -1))}
            aria-label="Mês anterior" className="cursor-pointer rounded-lg border border-gray-200 p-2 hover:bg-gray-50">
            <ChevronLeft size={17} />
          </button>

          <span className="min-w-36 text-center text-xs font-semibold capitalize text-gray-900">
            {formatMonth(month)}
          </span>

          <button type="button"
            onClick={() => setMonth((value) => changeMonth(value, 1))}
            aria-label="Próximo mês" className="cursor-pointer rounded-lg border border-gray-200 p-2 hover:bg-gray-50">
            <ChevronRight size={17} />
          </button>

          <button type="button" onClick={refresh} disabled={loading}
            aria-label="Atualizar histórico" className="cursor-pointer rounded-lg border border-gray-200 p-2 hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw size={17} />
          </button>
        </div>
      </div>

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

      {editing && (
        <form onSubmit={saveEdit} className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-5">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">
                Editar vendas diárias
              </h4>

              <p className="mt-1 text-xs text-gray-500">
                {editing.unitName}
              </p>
            </div>

            <button type="button" onClick={cancelEdit} disabled={saving}
              aria-label="Cancelar edição" className="cursor-pointer text-gray-500">
              <X size={18} />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-xs font-medium text-gray-700">
              Data
              <input type="date" value={editDate}
                onChange={(event) => setEditDate(event.target.value)} required
                className="mt-2 w-full rounded-lg border border-gray-200 bg-hut-card px-3 py-3" />
            </label>

            <label className="text-xs font-medium text-gray-700">
              Tickets
              <input type="number" min="0" step="1" value={editTickets}
                onChange={(event) => setEditTickets(event.target.value)}
                required className="mt-2 w-full rounded-lg border border-gray-200 bg-hut-card px-3 py-3" />
            </label>

            <label className="text-xs font-medium text-gray-700">
              Vendas faturadas (R$)
              <input type="number" min="0" step="0.01" value={editSales}
                onChange={(event) => setEditSales(event.target.value)}
                required className="mt-2 w-full rounded-lg border border-gray-200 bg-hut-card px-3 py-3" />
            </label>
          </div>

          <button type="submit" disabled={saving}
            className="mt-5 flex cursor-pointer items-center gap-2 rounded-lg bg-hut-red px-4 py-3 text-xs font-semibold text-white disabled:opacity-50">
            <Save size={16} />
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </form>
      )}

      {!loading && !error && data && (
        <DailySalesCoverage month={month} records={records} units={visibleUnits} />
      )}

      {loading ? (
        <p className="py-12 text-center text-sm text-gray-500">
          Carregando histórico diário...
        </p>
      ) : !error && records.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
          <CalendarDays size={28} className="mx-auto text-gray-400" />

          <h4 className="mt-3 text-sm font-semibold text-gray-900">
            Nenhum registro diário disponível
          </h4>

          <p className="mt-2 text-xs text-gray-500">
            Não existem dados para o mês e a unidade selecionados.
          </p>
        </div>
      ) : !error && (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Registros disponíveis', value: formatNumber(records.length) },
              { label: 'Tickets registrados', value: formatNumber(totals.tickets) },
              { label: 'Vendas faturadas', value: formatMoney(totals.salesCents) },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-gray-50 p-4">
                <p className="text-xs text-gray-500">{item.label}</p>
                <strong className="mt-2 block text-xl text-gray-900">
                  {item.value}
                </strong>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Unidade</th>
                  <th className="px-4 py-3 text-right font-medium">Tickets</th>
                  <th className="px-4 py-3 text-right font-medium">Vendas faturadas</th>
                  <th className="px-4 py-3 font-medium">Origem</th>
                  {isGeneralManager && (
                    <th className="px-4 py-3 text-right font-medium">Ações</th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">
                      {formatDate(record.date)}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {record.unitName}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {formatNumber(record.ticketCount)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800">
                      {formatMoney(record.salesCents)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {record.source === 'GMAIL' ? 'E-mail' : 'Manual'}
                    </td>

                    {isGeneralManager && (
                      <td className="px-4 py-3">
                        {record.source === 'MANUAL' ? (
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => startEdit(record)}
                              disabled={saving} aria-label={`Editar vendas de ${formatDate(record.date)} da unidade ${record.unitName}`}
                              className="cursor-pointer rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50">
                              <Pencil size={15} />
                            </button>

                            <button type="button" onClick={() => deleteRecord(record)}
                              disabled={saving} aria-label={`Excluir vendas de ${formatDate(record.date)} da unidade ${record.unitName}`}
                              className="cursor-pointer rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ) : (
                          <span className="block text-right text-gray-400">
                            Protegido
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs leading-5 text-gray-500">
            Totais calculados apenas sobre os dias registrados.
            Registros importados ficam protegidos contra alterações manuais.
          </p>
        </>
      )}
    </section>
  )
}
