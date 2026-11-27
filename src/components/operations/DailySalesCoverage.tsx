import { useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Database, FileWarning } from 'lucide-react'

type SalesRecord = {
  unitId: string
  date: string
  source?: 'GMAIL' | 'MANUAL'
}

type Unit = {
  id: string
  name: string
}

type Props = {
  month: string
  records: SalesRecord[]
  units: Unit[]
}

function todayInFortaleza() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? ''

  return `${get('year')}-${get('month')}-${get('day')}`
}

function formatDate(date: string) {
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year}`
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR').format(value)
}

/**
 * @author Gabriel
 * @example
 * <DailySalesCoverage month="2026-11" records={[]} units={[]} />
 */
export default function DailySalesCoverage({ month, records, units } : Props) {
  const [expanded, setExpanded] = useState(false)

  const coverage = useMemo(() => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return []
    }

    const today = todayInFortaleza()
    const [year, monthNumber] = month.split('-').map(Number)

    const lastDay = new Date(
      Date.UTC(year, monthNumber, 0),
    ).getUTCDate()

    // Considerar somente dias já encerrados.
    const elapsedDates = Array.from(
      { length: lastDay },
      (_, index) => {
        const day = String(index + 1).padStart(2, '0')
        return `${month}-${day}`
      },
    ).filter((date) => date < today)

    const monthRecords = records.filter(
      (record) =>
        record.date.slice(0, 7) === month &&
        elapsedDates.includes(record.date.slice(0, 10)),
    )

    return units.map((unit) => {
      const unitRecords = monthRecords.filter(
        (record) => record.unitId === unit.id,
      )

      const registeredDates = new Set(
        unitRecords.map((record) => record.date.slice(0, 10)),
      )

      const missing = elapsedDates.filter(
        (date) => !registeredDates.has(date),
      )

      const expected = elapsedDates.length
      const registered = registeredDates.size

      const imported = unitRecords.filter(
        (record) => record.source === 'GMAIL',
      ).length

      const manual = unitRecords.filter(
        (record) => record.source === 'MANUAL',
      ).length

      const percentage =
        expected > 0
          ? (registered / expected) * 100
          : 0

      return {
        ...unit,
        expected,
        registered,
        missing,
        imported,
        manual,
        percentage,
      }
    })
  }, [month, records, units])

  const totalRegistered = coverage.reduce(
    (sum, unit) => sum + unit.registered,
    0,
  )

  const totalExpected = coverage.reduce(
    (sum, unit) => sum + unit.expected,
    0,
  )

  const totalMissing = coverage.reduce(
    (sum, unit) => sum + unit.missing.length,
    0,
  )

  if (units.length === 0) return null

  return (
    <section className="mb-6 rounded-xl border border-gray-200 bg-hut-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Database size={18} className="text-hut-red" />

            <h3 className="text-base font-semibold text-gray-900">
              Cobertura dos dados diários
            </h3>
          </div>

          <p className="mt-2 max-w-xl text-xs leading-5 text-gray-500">
            Verifica quais dias possuem lançamentos individuais
            de vendas. Dias sem registro são considerados
            sem dados, não dias com faturamento zero.
          </p>
        </div>

        <div className="rounded-lg bg-gray-50 px-4 py-3 text-right">
          <p className="text-[11px] text-gray-500">
            Dias/unidade com registro
          </p>

          <strong className="mt-1 block text-lg font-semibold text-gray-900">
            {formatNumber(totalRegistered)}
            {' / '}
            {formatNumber(totalExpected)}
          </strong>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {coverage.map((unit) => (
          <article key={unit.id}
            className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-gray-900">
                  {unit.name}
                </p>

                <p className="mt-1 text-[11px] text-gray-500">
                  {unit.expected} dia(s) encerrado(s)
                  no mês selecionado
                </p>
              </div>

              <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                {unit.percentage.toFixed(1).replace('.', ',')}%
              </span>
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <strong className="text-2xl font-semibold text-gray-900">
                {unit.registered}
              </strong>

              <span className="text-xs text-gray-500">
                de {unit.expected} dias com lançamento
              </span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-hut-red transition-all"
                style={{
                  width: `${unit.percentage}%`,
                }} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-[11px] text-gray-500">
                  Importados
                </p>

                <strong className="mt-1 block text-sm text-gray-900">
                  {formatNumber(unit.imported)}
                </strong>
              </div>

              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-[11px] text-gray-500">
                  Manuais
                </p>

                <strong className="mt-1 block text-sm text-gray-900">
                  {formatNumber(unit.manual)}
                </strong>
              </div>
            </div>

            <div className="mt-4">
              {unit.expected === 0 ? (
                <p className="flex items-center gap-2 text-xs text-gray-500">
                  <Database size={15} />
                  Nenhum dia encerrado neste mês.
                </p>
              ) : unit.missing.length === 0 ? (
                <p className="flex items-center gap-2 text-xs text-green-700">
                  <CheckCircle2 size={15} />
                  Todos os dias possuem lançamento.
                </p>
              ) : (
                <p className="flex items-center gap-2 text-xs text-amber-700">
                  <AlertCircle size={15} />
                  {unit.missing.length} dia(s) sem dados diários.
                </p>
              )}

              {expanded && unit.missing.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {unit.missing.map((date) => (
                    <span key={date}
                      className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] text-gray-600">
                      {formatDate(date)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>

      {totalMissing > 0 && (
        <button type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-5 flex cursor-pointer items-center gap-2 text-xs font-medium text-hut-red">
          {expanded ? (
            <ChevronUp size={16} />
          ) : (
            <ChevronDown size={16} />
          )}

          {expanded
            ? 'Ocultar datas sem dados' : `Ver ${totalMissing} dia(s)/unidade sem dados`}
        </button>
      )}

      <div className="mt-5 flex items-start gap-3 border-t border-gray-100 pt-4">
        <FileWarning size={17} className="mt-0.5 shrink-0 text-amber-600" />

        <p className="text-[11px] leading-5 text-gray-500">
          Esta cobertura considera apenas registros individuais
          existentes em vendas diárias. Relatórios de PDV que
          consolidam vários dias não são desmembrados
          automaticamente. A ausência de lançamento não
          comprova que a loja estava fechada, sem vendas ou
          com dados perdidos.
        </p>
      </div>
    </section>
  )
}
