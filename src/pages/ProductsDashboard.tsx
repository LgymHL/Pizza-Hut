import { useMemo, useState } from 'react'
import { AlertCircle, CalendarDays, Package, RefreshCw, Search, Store } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatNumber, useMonthlyDashboard } from '../hooks/useMonthlyDashboard'

function formatPeriod(startDate: string, endDate: string) {
  const format = (date: string) => {
    const [year, month, day] = date.split('-')
    return `${day}/${month}/${year}`
  }

  return `${format(startDate)} a ${format(endDate)}`
}

export default function ProductsDashboard() {
  const [search, setSearch] = useState('')

  const { data, loading, error, refresh } = useMonthlyDashboard()

  const units = data?.units ?? []

  const periodLabel = units.length  ? formatPeriod( units[0].periodStart, units[0].periodEnd ) : 'Nenhum período disponível'

  const products = useMemo(() => {
    const term = search
      .trim()
      .toLocaleLowerCase('pt-BR')

    return (data?.products ?? [])
      .filter((product) =>
        product.productName
          .toLocaleLowerCase('pt-BR')
          .includes(term),
      )
      .sort((a, b) => b.quantity - a.quantity)
  }, [data, search])

  const chartData = products
    .slice(0, 10)
    .map((product) => ({
      label: `${product.productName} · ${product.unitName}`,
      quantity: product.quantity,
    }))

  const totalListedQuantity = products.reduce(
    (total, product) => total + product.quantity,
    0,
  )

  const unitCount = units.length

  return (
    <div className="space-y-6 space-y-6">
      {/* Cabeçalho da página */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Performance de Produtos
          </h1>

          <p className="mt-1 text-xs text-gray-500">
            Ranking de produtos dos fechamentos mensais.
          </p>
        </div>

        <button type="button" onClick={refresh} disabled={loading}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-hut-card px-4 py-2.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </header>

      <section className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-hut-card p-4">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <CalendarDays size={17} className="text-hut-red" />
          <span>
            Período:
            <strong className="ml-1 font-semibold text-gray-900">
              {loading ? 'Carregando...' : periodLabel}
            </strong>
          </span>
        </div>

        <label className="flex min-w-56 flex-1 items-center gap-2 rounded-lg border border-gray-200 px-3">
          <Search size={16} className="shrink-0 text-gray-400" />
          <input type="search" value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            } placeholder="Buscar produto..." aria-label="Buscar produto" 
            className="w-full bg-transparent py-2.5 text-xs text-gray-800 outline-none" />
        </label>
      </section>

      {loading && (
        <div className="rounded-xl border border-gray-200 bg-hut-card p-12 text-center text-sm text-gray-500">
          Carregando indicadores de produtos...
        </div>
      )}

      {/* Erro */}
      {!loading && error && (
        <div role="alert"
          className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <AlertCircle size={19} />
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* Indicadores */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-hut-card p-5">
              <Package size={20} className="text-hut-red" />

              <p className="mt-3 text-xs text-gray-500">
                Entradas no ranking
              </p>

              <h2 className="mt-2 text-2xl font-semibold text-gray-900">
                {formatNumber(products.length)}
              </h2>

              <p className="mt-2 text-xs text-gray-400">
                Produtos listados nos relatórios
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-hut-card p-5">
              <Package size={20} className="text-hut-red" />

              <p className="mt-3 text-xs text-gray-500">
                Quantidade dos itens listados
              </p>

              <h2 className="mt-2 text-2xl font-semibold text-gray-900">
                {formatNumber(totalListedQuantity)}
              </h2>

              <p className="mt-2 text-xs text-gray-400">
                Soma dos itens presentes no ranking
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-hut-card p-5">
              <Store size={20} className="text-hut-red" />

              <p className="mt-3 text-xs text-gray-500">
                Unidades no fechamento
              </p>

              <h2 className="mt-2 text-2xl font-semibold text-gray-900">
                {formatNumber(unitCount)}
              </h2>

              <p className="mt-2 text-xs text-gray-400">
                Unidades com dados disponíveis
              </p>
            </div>
          </section>

          {/* Sem produtos */}
          {products.length === 0 ? (
            <section className="rounded-xl border border-gray-200 bg-hut-card p-12 text-center">
              <Package size={30} className="mx-auto text-gray-400" />

              <h3 className="mt-4 text-base font-semibold text-gray-900">
                Nenhum produto encontrado
              </h3>

              <p className="mt-2 text-xs text-gray-500">
                {search
                  ? 'Não foram encontrados produtos para a busca informada.'
                  : 'Não existem rankings disponíveis para o período selecionado.'}
              </p>
            </section>
          ) : (
            <>
              <section className="rounded-xl border border-gray-200 bg-hut-card p-5">
                <h2 className="text-base font-semibold text-gray-900">
                  Produtos mais vendidos no ranking
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Top 10 por quantidade, considerando
                  os itens apresentados no fechamento.
                </p>

                <div className="mt-6 h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical"
                      margin={{
                        top: 5,
                        right: 20,
                        left: 115,
                        bottom: 5,
                      }}>
                      <CartesianGrid stroke="var(--border)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="label" width={155} tick={{ fontSize: 10 }} />
                      <Tooltip
                        formatter={(value) =>
                          formatNumber(Number(value))
                        } />
                      <Bar dataKey="quantity" name="Quantidade" fill="var(--chart-1)" radius={[0, 5, 5, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="overflow-hidden rounded-xl border border-gray-200 bg-hut-card">
                <div className="p-5">
                  <h2 className="text-base font-semibold text-gray-900">
                    Ranking detalhado
                  </h2>

                  <p className="mt-1 text-xs text-gray-500">
                    Quantidades registradas por produto e unidade.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-left text-xs">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        <th className="px-5 py-3">
                          PRODUTO
                        </th>

                        <th className="px-5 py-3">
                          UNIDADE
                        </th>

                        <th className="px-5 py-3 text-right">
                          POSIÇÃO
                        </th>

                        <th className="px-5 py-3 text-right">
                          QUANTIDADE
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {products.map((product) => (
                        <tr key={`${product.unitId}-${product.periodStart}-${product.productName}-${product.rankingPosition}`}
                          className="hover:bg-gray-50">
                          <td className="px-5 py-4 font-medium text-gray-900">
                            {product.productName}
                          </td>

                          <td className="px-5 py-4 text-gray-600">
                            {product.unitName}
                          </td>

                          <td className="px-5 py-4 text-right text-gray-600">
                            {product.rankingPosition}º
                          </td>

                          <td className="px-5 py-4 text-right font-semibold text-gray-900">
                            {formatNumber(product.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          <p className="text-xs leading-5 text-gray-500">
            Os rankings apresentam apenas os produtos
            disponíveis no fechamento mensal. As quantidades
            listadas não representam necessariamente todas
            as vendas realizadas pelas unidades.
          </p>
        </>
      )}
    </div>
  )
}
