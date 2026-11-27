import { useState, type FormEvent } from 'react'
import { Plus, Save, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '')

type Props = {
  onSaved: () => void
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
 * <DailySalesForm onSaved={() => {}} />
 */
export default function DailySalesForm({ onSaved }: Props) {
  const { token, user } = useAuth()

  const [open, setOpen] = useState(false)
  const [unitId, setUnitId] = useState('')
  const [date, setDate] = useState('')
  const [ticketCount, setTicketCount] = useState('')
  const [salesValue, setSalesValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  if (user?.role !== 'GENERAL_MANAGER') return null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!token || saving) return

    setError('')
    setMessage('')

    const tickets = Number(ticketCount)
    const amount = Number(salesValue)
    const salesCents = Math.round(amount * 100)

    if (
      !unitId ||
      !validDate(date) ||
      !Number.isSafeInteger(tickets) ||
      tickets < 0 ||
      !Number.isFinite(amount) ||
      amount < 0 ||
      !Number.isSafeInteger(salesCents) ||
      Math.abs(amount * 100 - salesCents) > 0.000001 ||
      (tickets === 0 && salesCents > 0)
    ) {
      setError('Confira a unidade, data, tickets e valor das vendas.')
      return
    }

    setSaving(true)

    try {
      const response = await fetch(`${API_URL}/daily-sales`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          unitId,
          date,
          ticketCount: tickets,
          salesCents,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)

        throw new Error(
          payload?.message ||
          `Não foi possível cadastrar o registro (${response.status}).`,
        )
      }

      setMessage('Registro diário cadastrado com sucesso.')
      setTicketCount('')
      setSalesValue('')
      onSaved()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message : 'Erro ao cadastrar vendas diárias.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <button type="button"
        onClick={() => {
          setOpen((value) => !value)
          setError('')
          setMessage('')
        }} className="flex cursor-pointer items-center gap-2 rounded-lg bg-hut-red px-4 py-2.5 text-xs font-semibold text-white hover:opacity-90">
        {open ? <X size={16} /> : <Plus size={16} />}
        {open ? 'Fechar cadastro' : 'Cadastrar vendas'}
      </button>

      {open && (
        <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-5">
          <h4 className="text-sm font-semibold text-gray-900">
            Novo registro diário
          </h4>

          <p className="mt-1 text-xs text-gray-500">
            Informe os valores reais de vendas faturadas e tickets
            de uma unidade em uma data específica.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="sales-unit" className="mb-2 block text-xs font-medium text-gray-700">
                Unidade
              </label>

              <select id="sales-unit" value={unitId}
                onChange={(event) => setUnitId(event.target.value)} required
                className="w-full rounded-lg border border-gray-200 bg-hut-card px-3 py-3 text-xs outline-none focus:border-hut-red">
                <option value="">Selecione a unidade</option>

                {(user?.units ?? []).map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="sales-date" className="mb-2 block text-xs font-medium text-gray-700">
                Data
              </label>

              <input id="sales-date" type="date" value={date}
                onChange={(event) => setDate(event.target.value)} required
                className="w-full rounded-lg border border-gray-200 bg-hut-card px-3 py-3 text-xs outline-none focus:border-hut-red"/>
            </div>

            <div>
              <label htmlFor="sales-tickets" className="mb-2 block text-xs font-medium text-gray-700" >
                Quantidade de tickets
              </label>

              <input id="sales-tickets" type="number" min="0" step="1"
                value={ticketCount}
                onChange={(event) => setTicketCount(event.target.value)}
                placeholder="Ex.: 150"required
                className="w-full rounded-lg border border-gray-200 bg-hut-card px-3 py-3 text-xs outline-none focus:border-hut-red" />
            </div>

            <div>
              <label htmlFor="sales-amount" className="mb-2 block text-xs font-medium text-gray-700">
                Vendas faturadas (R$)
              </label>

              <input id="sales-amount" type="number" min="0"  step="0.01"
                value={salesValue}
                onChange={(event) => setSalesValue(event.target.value)}
                placeholder="Ex.: 8500,00 (digite 8500.00)" required
                className="w-full rounded-lg border border-gray-200 bg-hut-card px-3 py-3 text-xs outline-none focus:border-hut-red" />
            </div>

            {error && (
              <p role="alert" className="text-xs text-red-600 md:col-span-2">
                {error}
              </p>
            )}

            {message && (
              <p role="status" className="text-xs text-green-700 md:col-span-2">
                {message}
              </p>
            )}

            <div className="flex justify-end md:col-span-2">
              <button type="submit" disabled={saving}
                className="flex cursor-pointer items-center gap-2 rounded-lg bg-hut-red px-5 py-3 text-xs font-semibold text-white disabled:opacity-50">
                <Save size={16} />
                {saving ? 'Salvando...' : 'Salvar registro'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
