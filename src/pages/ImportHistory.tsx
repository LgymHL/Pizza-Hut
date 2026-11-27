import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

type ImportStatus =
  | 'RECEIVED'
  | 'PROCESSING'
  | 'PROCESSED'
  | 'FAILED'

type ReportType =
  | 'SALES'
  | 'WASTE'
  | 'PRODUCTS'
  | 'OTHER'

type ReportImport = {
  id: string
  fileName: string
  source: 'GMAIL' | 'MANUAL'
  status: ImportStatus
  reportType: ReportType
  receivedAt: string
  processedAt: string | null
  lastAttemptAt: string | null
  errorMessage: string | null
  periodStart: string | null
  periodEnd: string | null
  unit: {
    id: string
    name: string
    slug: string
  } | null
}

type ImportResponse = {
  data: ReportImport[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  summary: {
    received: number
    processing: number
    processed: number
    failed: number
  }
}

type RetryResponse = {
  message: string
  data?: {
    status: string
    message: string
  }
}

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '')

const statusLabels: Record<ImportStatus, string> = {
  RECEIVED: 'Recebido',
  PROCESSING: 'Processando',
  PROCESSED: 'Processado',
  FAILED: 'Falhou',
}

const typeLabels: Record<ReportType, string> = {
  SALES: 'Vendas',
  WASTE: 'Desperdício',
  PRODUCTS: 'Produtos',
  OTHER: 'Outro',
}

const statusColors: Record<ImportStatus, string> = {
  RECEIVED: 'bg-blue-50 text-blue-700',
  PROCESSING: 'bg-amber-50 text-amber-700',
  PROCESSED: 'bg-green-50 text-green-700',
  FAILED: 'bg-red-50 text-red-700',
}

function formatDate(value: string | null) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Fortaleza',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export default function ImportHistory() {
  const { token, user } = useAuth()

  const isGeneralManager = user?.role === 'GENERAL_MANAGER'

  const [result, setResult] = useState<ImportResponse | null>(null)

  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [reportType, setReportType] = useState('')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [retryingId, setRetryingId] = useState<string | null>(null)

  const [refreshKey, setRefreshKey] = useState(0)

  function refresh() {
    setRefreshKey((value) => value + 1)
  }

  useEffect(() => {
    if (!token) {
      setLoading(false)
      setResult(null)
      return
    }

    const controller = new AbortController()

    const params = new URLSearchParams({
      page: String(page),
      pageSize: '10',
    })

    if (status) {
      params.set('status', status)
    }

    if (reportType) {
      params.set('reportType', reportType)
    }

    async function load() {
      setLoading(true)
      setError('')

      try {
        const response = await fetch(
          `${API_URL}/imports?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          },
        )

        if (!response.ok) {
          throw new Error(
            response.status === 401
              ? 'Sessão expirada. Entre novamente.'
              : 'Não foi possível consultar as importações.',
          )
        }

        const data =
          (await response.json()) as ImportResponse

        if (!controller.signal.aborted) {
          setResult(data)
        }
      } catch (err) {
        if (controller.signal.aborted) return

        setError(
          err instanceof Error
            ? err.message
            : 'Erro desconhecido.',
        )
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => controller.abort()
  }, [token, page, status, reportType, refreshKey])

  async function retryImport(report: ReportImport) {
    if (
      !token ||
      !isGeneralManager ||
      retryingId ||
      report.status !== 'FAILED'
    ) {
      return
    }

    setRetryingId(report.id)
    setError('')
    setFeedback('')

    try {
      const response = await fetch(`${API_URL}/imports/${encodeURIComponent(report.id, )}/retry`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      const payload =
        (await response.json()) as RetryResponse

      if (!response.ok) {
        throw new Error(
          payload.message ||
            'Não foi possível reprocessar o relatório.',
        )
      }

      if (payload.data?.status !== 'PROCESSED') {
        throw new Error(
          payload.data?.message ||
            'O reprocessamento não foi concluído.',
        )
      }

      setFeedback(
        `Relatório "${report.fileName}" processado com sucesso.`,
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao reprocessar relatório.',
      )
    } finally {
      setRetryingId(null)
      refresh()
    }
  }

  const summary = [
    {
      label: 'Recebidos',
      value: result?.summary.received ?? 0,
    },
    {
      label: 'Em processamento',
      value: result?.summary.processing ?? 0,
    },
    {
      label: 'Processados',
      value: result?.summary.processed ?? 0,
    },
    {
      label: 'Falhas',
      value: result?.summary.failed ?? 0,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
            Histórico de Importações
          </h2>

          <p className="mt-1 text-xs text-gray-500">
            Acompanhe os relatórios recebidos e processados.
          </p>
        </div>

        <button type="button" onClick={refresh} disabled={loading || retryingId !== null}
          className="flex cursor-pointer items-center gap-2 rounded-md border border-gray-200 bg-hut-card px-4 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
          <RefreshCw size={15} />
          Atualizar
        </button>
      </div>

      {result && (
        <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {summary.map((item) => (
            <div key={item.label}
              className="rounded-lg border border-gray-200 bg-hut-card p-5">
              <p className="text-xs text-gray-500">
                {item.label}
              </p>

              <strong className="mt-2 block text-2xl text-gray-900">
                {item.value}
              </strong>
            </div>
          ))}
        </section>
      )}

      {feedback && (
        <div role="status"
          className="mb-5 flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-4 text-xs text-green-800">
          <CheckCircle2 size={17} className="shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {error && (
        <div role="alert"
          className="mb-5 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          <AlertCircle size={17} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <section className="rounded-lg border border-gray-200 bg-hut-card p-5">
        <div className="mb-5 flex flex-wrap gap-3">
          <select value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
              setFeedback('')
            }} aria-label="Filtrar por status" className="rounded-md border border-gray-200 bg-hut-card px-3 py-2 text-xs text-gray-700">
            <option value="">Todos os status</option>

            {Object.entries(statusLabels).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </select>

          <select value={reportType}
            onChange={(event) => {
              setReportType(event.target.value)
              setPage(1)
              setFeedback('')
            }}
            aria-label="Filtrar por tipo" className="rounded-md border border-gray-200 bg-hut-card px-3 py-2 text-xs text-gray-700">
            <option value="">Todos os tipos</option>

            {Object.entries(typeLabels).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </select>
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-gray-500">
            Carregando importações...
          </p>
        ) : !result?.data.length ? (
          <p className="py-10 text-center text-sm text-gray-500">
            Nenhum relatório encontrado.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-gray-500">
                    <th className="px-3 py-3">ARQUIVO</th>
                    <th className="px-3 py-3">TIPO</th>
                    <th className="px-3 py-3">UNIDADE</th>
                    <th className="px-3 py-3">ORIGEM</th>
                    <th className="px-3 py-3">RECEBIDO EM</th>
                    <th className="px-3 py-3">STATUS</th>
                    <th className="px-3 py-3">AÇÕES</th>
                  </tr>
                </thead>

                <tbody>
                  {result.data.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 last:border-0">
                      <td className="max-w-[260px] px-3 py-4 align-top">
                        <p className="break-words font-medium text-gray-900">
                          {item.fileName}
                        </p>

                        {item.status === 'FAILED' &&
                          item.errorMessage && (
                            <div className="mt-2 max-w-[310px] rounded-md bg-red-50 p-2 text-[11px] leading-5 text-red-700">
                              <span className="font-semibold">
                                Motivo da falha:
                              </span>{' '}
                              {item.errorMessage}
                            </div>
                          )}

                        {item.lastAttemptAt && (
                          <p className="mt-2 text-[11px] text-gray-400">
                            Última tentativa:{' '}
                            {formatDate(item.lastAttemptAt)}
                          </p>
                        )}
                      </td>

                      <td className="px-3 py-4 align-top text-gray-600">
                        {typeLabels[item.reportType]}
                      </td>

                      <td className="px-3 py-4 align-top text-gray-600">
                        {item.unit?.name ?? 'Não identificada'}
                      </td>

                      <td className="px-3 py-4 align-top text-gray-600">
                        {item.source === 'GMAIL'
                          ? 'Gmail'
                          : 'Manual'}
                      </td>

                      <td className="px-3 py-4 align-top text-gray-600">
                        {formatDate(item.receivedAt)}
                      </td>

                      <td className="px-3 py-4 align-top">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${statusColors[item.status]}`}>
                          {statusLabels[item.status]}
                        </span>
                      </td>

                      <td className="px-3 py-4 align-top">
                        {isGeneralManager &&
                        item.status === 'FAILED' ? (
                          <button type="button" onClick={() => retryImport(item)} disabled={retryingId !== null} className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-md border border-red-200 px-3 py-2 text-[11px] font-semibold text-hut-red hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">
                            <RefreshCw size={14} className={ retryingId === item.id ? 'animate-spin' : '' } />
                            {retryingId === item.id
                              ? 'Processando...'
                              : 'Tentar novamente'}
                          </button>
                        ) : (
                          <span className="text-gray-400">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
              <span className="text-xs text-gray-500">
                Página {result.pagination.page} de{' '}
                {result.pagination.totalPages} —{' '}
                {result.pagination.total} registros
              </span>

              <div className="flex gap-2">
                <button type="button" 
                  disabled={page <= 1 || loading}
                  onClick={() =>
                    setPage((current) => current - 1)
                  }
                  className="cursor-pointer rounded border border-gray-200 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40">
                  Anterior
                </button>

                <button type="button"
                  disabled={
                    loading || page >= result.pagination.totalPages}
                  onClick={() =>
                    setPage((current) => current + 1)}
                  className="cursor-pointer rounded border border-gray-200 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40">
                  Próxima
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
