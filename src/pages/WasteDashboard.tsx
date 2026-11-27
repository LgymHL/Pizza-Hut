import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { DayBars } from '../components/charts/DayBars'
import { useAuth } from '../contexts/AuthContext'
import { unitColor, usePeriodAndUnits } from '../components/demo/DemoUi'
import { Farol, Kpi, Painel, Rosca, SeloReal, Vazio, cn } from '../components/painel/ui'
import { loadGoals } from '../demo/data'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '')

type Occurrence = {
  id: string
  unitId: string
  unitName: string
  date: string
  shift: string
  type: string
  typeDescription: string
  productCode: string
  productName: string
  reason: string
  quantity: number
  lossCents: number
}

type WasteResponse = { occurrences: Occurrence[] }

// 6 cores distintas (a rosca mostra até 6 fatias)
const CORES = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'oklch(0.62 0.12 300)']
const PAGE_SIZE = 12

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
const int = (v: number) => new Intl.NumberFormat('pt-BR').format(v)
const qty = (v: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(v)

/** Cor da etiqueta de tipo: produto pronto (neutro), insumo (âmbar), pizza motoboy (azul-acinzentado). */
const TIPO_COR: Record<string, string> = {
  Completo: 'border-border text-foreground/80',
  Incompleto: 'border-warning/40 text-warning',
  Motoboy: 'border-chart-3/50 text-chart-3',
}

function diaSemana(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'UTC' })
}

function fmtData(value: string) {
  const [y, m, d] = value.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

/**
 * Desperdício: layout da tela do Lovable (KPIs, roscas por tipo/loja/motivo/turno,
 * barras por dia e produtos com maior perda) + a busca de ocorrências do Pizza Hut BI.
 */
export default function WasteDashboard() {
  const { token } = useAuth()
  const { startDate: pStart, endDate: pEnd, explicit, units } = usePeriodAndUnits()
  const unitKey = units.map((u) => u.id).join()

  const [all, setAll] = useState<Occurrence[] | null>(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // Carrega todo o desperdício das lojas visíveis (a cobertura é calculada sobre tudo).
  useEffect(() => {
    const controller = new AbortController()
    setAll(null)
    setError('')
    const params = new URLSearchParams()
    if (units.length === 1) params.set('unitId', units[0].id)
    fetch(`${API_URL}/dashboard/waste/full?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Erro ao consultar desperdícios (${r.status}).`)
        return (await r.json()) as WasteResponse
      })
      .then((data) => setAll(data.occurrences))
      .catch((e: unknown) => {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Erro ao carregar.')
      })
    return () => controller.abort()
  }, [token, unitKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setPage(1), [search, pStart, pEnd, unitKey])

  // Sem período escolhido no filtro: mostra todo o desperdício registrado
  const datas = (all ?? []).map((r) => r.date).sort()
  const covIni = datas[0] ?? ''
  const covFim = datas[datas.length - 1] ?? ''
  const startDate = explicit ? pStart : covIni
  const endDate = explicit ? pEnd : covFim
  const rows = useMemo(
    () => (all ?? []).filter((r) => r.date >= startDate && r.date <= endDate),
    [all, startDate, endDate],
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((r) =>
      [r.productName, r.productCode, r.reason, r.typeDescription, r.shift, r.unitName].some((v) => v.toLowerCase().includes(term)),
    )
  }, [rows, search])

  if (error) return <Vazio>Não foi possível carregar: {error}</Vazio>
  if (!all) return <Vazio>Carregando dados…</Vazio>
  if (!all.length) return <Vazio>Nenhum desperdício registrado. Use a tela Importar dados.</Vazio>

  const cobertura = `Desperdício registrado de ${fmtData(covIni)} a ${fmtData(covFim)}`
  const parcial = startDate > covIni || endDate < covFim

  const header = (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Desperdício</h1>
        <SeloReal />
      </div>
      <p className="text-sm text-muted-foreground">{cobertura}</p>
      {parcial && (
        <p className="mt-1 text-xs text-warning">
          O período escolhido ({fmtData(startDate)} a {fmtData(endDate)}) cobre só parte do desperdício registrado. Os valores abaixo consideram apenas esse trecho.
        </p>
      )}
    </div>
  )

  if (!rows.length) {
    return (
      <div className="space-y-4">
        {header}
        <Vazio>Nenhum desperdício registrado no período escolhido.</Vazio>
      </div>
    )
  }

  const valor = (r: Occurrence) => r.lossCents / 100
  const total = rows.reduce((s, r) => s + valor(r), 0)
  const metaSemanal = loadGoals().weeklyWasteMax
  const dias = Math.max(1, Math.round((Date.parse(`${endDate}T12:00:00Z`) - Date.parse(`${startDate}T12:00:00Z`)) / 86400000) + 1)

  const soma = (k: (r: Occurrence) => string) => {
    const m = new Map<string, number>()
    for (const r of rows) m.set(k(r), (m.get(k(r)) ?? 0) + valor(r))
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }
  const rosca = (itens: [string, number][]) => itens.map(([nome, v], i) => ({ nome, valor: v, cor: CORES[i % CORES.length] }))

  const porDia = new Map<string, Record<string, number | string>>()
  for (const r of rows) {
    const d = porDia.get(r.date) ?? { dia: fmtData(r.date).slice(0, 5) }
    d[r.unitName] = Number(d[r.unitName] ?? 0) + valor(r)
    porDia.set(r.date, d)
  }
  const serieDia = [...porDia.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, d]) => d)
  const produtos = soma((r) => r.productName)

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, totalPages)
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
  // agrupa a página atual por dia (mais recente primeiro)
  const grupos = [...visible.reduce((m, r) => m.set(r.date, [...(m.get(r.date) ?? []), r]), new Map<string, Occurrence[]>())]
    .sort(([a], [b]) => b.localeCompare(a))
  const filteredTotal = filtered.reduce((s, r) => s + valor(r), 0)

  return (
    <div className="space-y-6">
      {header}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi titulo="Desperdício total" valor={brl(total)} detalhe={`${int(rows.length)} registros`} />
        {units.map((u) => {
          const da = rows.filter((r) => r.unitId === u.id)
          const soma = da.reduce((s, r) => s + valor(r), 0)
          // média por semana no período, comparada com a meta semanal da tela Metas
          const porSemana = (soma / dias) * 7
          return (
            <Kpi key={u.id} titulo={u.name} valor={brl(soma)} cor={unitColor(u.id)}
              detalhe={<>{int(da.length)} registros · <span className="num text-foreground">{brl(porSemana)}</span> por semana{metaSemanal != null && <> · meta até {brl(metaSemanal)}</>}</>}>
              <Farol estado={metaSemanal == null ? 'neutro' : porSemana <= metaSemanal ? 'dentro' : 'fora'} />
            </Kpi>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Painel titulo="Por tipo" subtitulo="Em R$">
          <Rosca dados={rosca(soma((r) => r.typeDescription))} formatar={brl} />
        </Painel>
        <Painel titulo="Por loja" subtitulo="Em R$">
          <Rosca dados={soma((r) => r.unitId).map(([id, v]) => ({ nome: units.find((u) => u.id === id)?.name ?? id, valor: v, cor: unitColor(id) }))} formatar={brl} />
        </Painel>
        <Painel titulo="Por motivo" subtitulo="Em R$">
          <Rosca dados={rosca(soma((r) => r.reason))} formatar={brl} />
        </Painel>
        <Painel titulo="Por turno" subtitulo="Em R$">
          <Rosca dados={rosca(soma((r) => r.shift))} formatar={brl} />
        </Painel>
      </div>

      <Painel titulo="Por dia" subtitulo="Uma barra por loja, em R$">
        <DayBars
          data={serieDia}
          series={units.map((u) => ({ key: u.name, name: u.name, color: unitColor(u.id) }))}
          format={brl}
          height={260}
        />
      </Painel>

      <Painel titulo="Produtos com maior perda" subtitulo="Os 10 maiores valores">
        <ul className="divide-y divide-border">
          {produtos.slice(0, 10).map(([p, v]) => (
            <li key={p} className="flex items-center gap-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{p}</span>
              <div className="hidden h-2 w-40 rounded bg-muted sm:block">
                <div className="h-2 rounded bg-primary" style={{ width: `${(v / produtos[0][1]) * 100}%` }} />
              </div>
              <span className="num w-24 text-right">{brl(v)}</span>
            </li>
          ))}
        </ul>
      </Painel>

      <Painel titulo="Ocorrências" subtitulo="Registros individuais dos relatórios importados">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produto, motivo, turno…"
              className="h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {int(filtered.length)} ocorrência(s) · <span className="num text-foreground">{brl(filteredTotal)}</span>
          </p>
        </div>

        {/* Lista agrupada por dia: cada ocorrência numa linha limpa, valor à direita */}
        <div className="mt-5 space-y-5">
          {grupos.map(([data, itens]) => (
            <section key={data}>
              <div className="mb-2 flex items-baseline justify-between gap-3 border-b border-border pb-1.5">
                <h3 className="text-sm font-semibold capitalize">{diaSemana(data)}, {fmtData(data).slice(0, 5)}</h3>
                <p className="text-xs text-muted-foreground">
                  {itens.length} {itens.length === 1 ? 'ocorrência' : 'ocorrências'} · <span className="num text-foreground">{brl(itens.reduce((s, r) => s + valor(r), 0))}</span>
                </p>
              </div>
              <ul className="space-y-1.5">
                {itens.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2.5">
                    <span className="h-9 w-1 shrink-0 rounded-full" style={{ background: unitColor(r.unitId) }} title={r.unitName} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{r.productName}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <span className={cn('rounded-full border px-2 py-px', TIPO_COR[r.type] ?? 'border-border')}>{r.typeDescription}</span>
                        <span className="rounded-full border border-border px-2 py-px">{r.shift}</span>
                        <span className="truncate">{r.reason}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="num text-sm font-semibold">{brl(valor(r))}</p>
                      <p className="num text-xs text-muted-foreground">{qty(r.quantity)} {r.productName.includes(' KG') ? 'kg' : 'un.'}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {visible.length === 0 && <Vazio>Nenhuma ocorrência corresponde à busca.</Vazio>}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">Página {current} de {totalPages}</p>
          <div className="flex gap-2">
            <button type="button" disabled={current === 1} onClick={() => setPage(current - 1)}
              className="cursor-pointer rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40">
              Anterior
            </button>
            <button type="button" disabled={current >= totalPages} onClick={() => setPage(current + 1)}
              className="cursor-pointer rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40">
              Próxima
            </button>
          </div>
        </div>
      </Painel>

      <p className="text-xs text-muted-foreground">
        Fonte: listas de desperdício das lojas (produto pronto, insumo e pizza motoboy), de 27/10 a 02/11/2026.
        "Pizza motoboy" são refeições de colaboradores; como o consumo interno, não é necessariamente uma perda evitável.
      </p>
    </div>
  )
}
