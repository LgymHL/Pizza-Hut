import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useDashboardPeriods } from '../../hooks/useDashboardPeriods'
import AccountMenu from '../account/AccountMenu'

const monthlyPages = new Set(['/vendas', '/produtos', '/operacao'])

const filteredPages = new Set([
  '/',
  '/selo-super',
  '/entrega',
  '/vendas',
  '/produtos',
  '/operacao',
  '/desperdicios',
])

function formatDate(value: string) {
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

/** Campo da barra de filtros, igual ao `Filtro` do Lovable. */
function Filtro({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 ${className ?? ''}`}>
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

/** Select nativo com a aparência do SelectTrigger do shadcn. */
function Select({ value, onChange, children, className, disabled, ariaLabel }: {
  value: string
  onChange: (value: string) => void
  children: ReactNode
  className?: string
  disabled?: boolean
  ariaLabel: string
}) {
  return (
    <div className={`relative ${className ?? ''}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label={ariaLabel}
        className="h-9 w-full cursor-pointer appearance-none rounded-md border border-input bg-transparent pl-3 pr-9 text-sm text-foreground shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
    </div>
  )
}

/** Barra de filtros do topo (BarraFiltros do Lovable) + troca de perfil. */
export default function Header() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()

  const availableUnits = user?.units ?? []
  const isGeneralManager = user?.role === 'GENERAL_MANAGER'
  const showFilters = filteredPages.has(location.pathname)
  const source = monthlyPages.has(location.pathname) ? 'MONTHLY' : 'SALES'

  const requestedUnit = searchParams.get('unitId')
  const selectedUnit = requestedUnit && availableUnits.some((unit) => unit.id === requestedUnit)
    ? requestedUnit
    : 'all'

  const { periods, loading, error } = useDashboardPeriods(
    selectedUnit === 'all' ? undefined : selectedUnit,
    source,
  )

  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const key = (p: { startDate: string; endDate: string }) => `${p.startDate}:${p.endDate}`
  const requested = startDate && endDate ? `${startDate}:${endDate}` : null
  const selectedPeriod = requested && periods.some((p) => key(p) === requested)
    ? requested
    : periods[0] ? key(periods[0]) : ''

  function handleUnitChange(unitId: string) {
    const params = new URLSearchParams(searchParams)
    if (unitId === 'all') params.delete('unitId')
    else params.set('unitId', unitId)
    params.delete('startDate')
    params.delete('endDate')
    setSearchParams(params)
  }

  function handlePeriodChange(value: string) {
    const params = new URLSearchParams(searchParams)
    const period = periods.find((item) => key(item) === value)
    if (!period) {
      params.delete('startDate')
      params.delete('endDate')
      setSearchParams(params)
      return
    }
    params.set('startDate', period.startDate)
    params.set('endDate', period.endDate)
    setSearchParams(params)
  }

  return (
    // celular: loja, período e conta numa linha só
    <div className="flex items-end gap-2 px-4 py-3 lg:px-8">
      {showFilters && (
        <>
          <Filtro label="Loja" className="flex-1 sm:flex-none">
            <Select value={selectedUnit} onChange={handleUnitChange} className="w-full sm:w-40" ariaLabel="Filtrar por loja">
              {(isGeneralManager || availableUnits.length > 1) && <option value="all">Todas</option>}
              {availableUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>{unit.name}</option>
              ))}
            </Select>
          </Filtro>

          {/* Período sem rótulo em cima, como no modelo; "Período" = último período disponível */}
          <Select
            value={requested && periods.some((p) => key(p) === requested) ? selectedPeriod : ''}
            onChange={handlePeriodChange}
            disabled={loading || Boolean(error) || periods.length === 0}
            className="min-w-0 flex-1 sm:w-auto sm:min-w-34 sm:flex-none"
            ariaLabel="Filtrar por período"
          >
            <option value="">{error ? 'Erro ao carregar períodos' : periods.length ? 'Período' : 'Sem dados importados'}</option>
            {periods.map((period) => (
              <option key={key(period)} value={key(period)}>
                {formatDate(period.startDate)} a {formatDate(period.endDate)}
              </option>
            ))}
          </Select>
        </>
      )}

      <div className="ml-auto shrink-0 sm:self-center">
        <AccountMenu />
      </div>
    </div>
  )
}
