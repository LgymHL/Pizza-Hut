import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { UploadCloud, FileText, CheckCircle2, AlertCircle, LoaderCircle, X, History, Clock3, Info } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '')

const MAX_SIZE = 10 * 1024 * 1024

type ImportStatus =
  | 'RECEIVED'
  | 'PROCESSING'
  | 'PROCESSED'
  | 'FAILED'

type UploadResponse = {
  message: string
  data: {
    id: string
    fileName: string
    status: ImportStatus
    duplicated: boolean
    processing?: {
      reportImportId: string
      type: string
      status: string
      message: string
    }
  }
}

function formatSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2).replace('.', ',')} MB`
}

function getImportFeedback(result: UploadResponse) {
  const status = result.data.status
  const duplicated = result.data.duplicated

  if (status === 'PROCESSED') {
    return {
      title: duplicated
        ? 'Relatório já processado anteriormente'
        : 'Relatório processado com sucesso',
      description: duplicated
        ? 'Este arquivo já existe no sistema. Nenhum novo registro foi criado.'
        : 'O arquivo foi recebido e processado. Os indicadores já podem ser consultados.',
      color: 'border-green-200 bg-green-50 text-green-800',
      icon: CheckCircle2,
    }
  }

  if (status === 'FAILED') {
    return {
      title: duplicated
        ? 'Arquivo já registrado com falha'
        : 'Falha no processamento',
      description: duplicated
        ? 'Este arquivo já está registrado, mas seu processamento falhou. Consulte o histórico para tentar novamente.'
        : result.data.processing?.message ||
          'O arquivo foi registrado, mas não foi possível processá-lo. Consulte o histórico de importações.',
      color: 'border-red-200 bg-red-50 text-red-800',
      icon: AlertCircle,
    }
  }

  if (status === 'PROCESSING') {
    return {
      title: 'Relatório em processamento',
      description: duplicated
        ? 'Este arquivo já está sendo processado. Nenhum novo registro foi criado.'
        : 'O arquivo foi registrado e seu processamento está em andamento.',
      color: 'border-blue-200 bg-blue-50 text-blue-800',
      icon: Clock3,
    }
  }

  return {
    title: duplicated
      ? 'Arquivo já registrado'
      : 'Arquivo recebido',
    description: duplicated
      ? 'Este arquivo já existe no sistema e ainda não consta como processado. Consulte o histórico.'
      : result.data.processing?.type === 'UNSUPPORTED'
        ? 'O arquivo foi registrado, mas ainda não possui processamento automático. Consulte o histórico.'
        : 'O arquivo foi registrado e ainda não consta como processado. Consulte o histórico para acompanhar.',
    color: 'border-amber-200 bg-amber-50 text-amber-900',
    icon: Info,
  }
}

/**
 * @author Gabriel
 * @example
 * <ImportData />
 */
export default function ImportData() {
  const { token, user } = useAuth()

  const inputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<UploadResponse | null>(null)

  const canUpload = user?.role === 'GENERAL_MANAGER'
  const feedback = result ? getImportFeedback(result) : null

  function selectFile(selected: File | null) {
    setError('')
    setResult(null)
    setFile(null)

    if (!selected) return

    const name = selected.name.toLowerCase()

    if (!/\.(pdf|html|htm)$/.test(name)) {
      setError('Formato não permitido. Envie um PDF ou HTML.')
      return
    }

    if (selected.size > MAX_SIZE) {
      setError('O arquivo deve ter no máximo 10 MB.')
      return
    }

    if (selected.size === 0) {
      setError('O arquivo está vazio.')
      return
    }

    setFile(selected)
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0] ?? null)
    event.target.value = ''
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!file || !token || !canUpload || uploading) return

    setUploading(true)
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${API_URL}/imports/upload`, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const payload = (await response.json()) as UploadResponse

      if (!response.ok) {
        throw new Error(
          payload.message || 'Não foi possível enviar o arquivo',
        )
      }

      if (!payload.data?.id || !payload.data?.status) {
        throw new Error('A API retornou um resultado de importação inválido.')
      }

      setResult(payload)
      setFile(null)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro inesperado durante o upload',
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
          Importação de Dados
        </h2>

        <p className="mt-1 text-xs text-gray-500">
          Envie relatórios para registro e processamento no Pizza Hut BI.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-lg border border-gray-200 bg-hut-card p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-red-50 p-3 text-hut-red">
              <UploadCloud size={21} strokeWidth={1.7} />
            </div>

            <div>
              <h3 className="text-base font-semibold text-gray-900">
                Enviar relatório
              </h3>

              <p className="mt-1 text-xs text-gray-500">
                Selecione um arquivo do seu computador.
              </p>
            </div>
          </div>

          {!canUpload ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              O envio manual de relatórios está disponível somente
              para o gerente geral.
            </div>
          ) : (
            <form onSubmit={handleUpload}>
              <input ref={inputRef} type="file" accept=".pdf,.html,.htm" onChange={handleFileChange} className="hidden" aria-label="Selecionar relatório" disabled={uploading} />

              <button type="button" disabled={uploading} onClick={() => inputRef.current?.click()} className="flex min-h-[210px] w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 px-6 py-8 text-center transition hover:border-hut-red hover:bg-red-50/30 disabled:cursor-not-allowed disabled:opacity-60" >
                <UploadCloud size={35} strokeWidth={1.4} className="text-hut-red" />

                <span className="mt-4 text-sm font-semibold text-gray-900">
                  Clique para selecionar um arquivo
                </span>

                <span className="mt-2 text-xs text-gray-500">
                  PDF ou HTML, com até 10 MB
                </span>
              </button>

              {file && (
                <div className="mt-5 flex items-center gap-3 rounded-lg border border-gray-200 p-4">
                  <FileText size={23} className="shrink-0 text-hut-red" />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-gray-900">
                      {file.name}
                    </p>

                    <p className="mt-1 text-[11px] text-gray-500">
                      {formatSize(file.size)}
                    </p>
                  </div>

                  <button type="button" disabled={uploading} onClick={() => setFile(null)} aria-label="Remover arquivo" className="rounded-md p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50" >
                    <X size={17} />
                  </button>
                </div>
              )}

              {error && (
                <div role="alert" className="mt-5 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-xs text-red-700" >
                  <AlertCircle size={17} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {result && feedback && (
                <div role={result.data.status === 'FAILED' ? 'alert' : 'status'} className={`mt-5 flex items-start gap-3 rounded-md border p-4 text-xs ${feedback.color}`} >
                  <feedback.icon size={18} className="shrink-0" />

                  <div className="min-w-0">
                    <p className="font-semibold">
                      {feedback.title}
                    </p>

                    <p className="mt-1 leading-5">
                      {feedback.description}
                    </p>

                    <p className="mt-2 break-words text-[11px] opacity-80">
                      Arquivo: {result.data.fileName}
                    </p>

                    <Link to="/historico" className="mt-3 inline-flex items-center gap-2 rounded-md border border-current/20 px-3 py-2 text-[11px] font-semibold hover:bg-hut-card/50">
                      <History size={14} />
                      Consultar histórico
                    </Link>
                  </div>
                </div>
              )}

              <button type="submit" disabled={!file || uploading} className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-hut-red px-4 py-3 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50" >
                {uploading ? (
                  <>
                    <LoaderCircle size={16} className="animate-spin" />
                    Enviando arquivo...
                  </>
                ) : (
                  <>
                    <UploadCloud size={16} />
                    Enviar relatório
                  </>
                )}
              </button>
            </form>
          )}
        </section>

        <aside className="flex flex-col gap-5">
          <section className="rounded-lg border border-gray-200 bg-hut-card p-6">
            <h3 className="text-base font-semibold text-gray-900">
              Como funciona?
            </h3>

            <ol className="mt-4 list-inside list-decimal space-y-3 text-xs leading-6 text-gray-600">
              <li>Selecione um relatório PDF ou HTML.</li>
              <li>O sistema valida e registra o arquivo.</li>
              <li>Arquivos idênticos são identificados.</li>
              <li>O processamento identifica o tipo de relatório.</li>
              <li>Acompanhe o resultado no histórico.</li>
            </ol>
          </section>

          <section className="rounded-lg border border-gray-200 bg-hut-card p-6">
            <div className="flex items-center gap-3">
              <History size={19} className="text-hut-red" />

              <h3 className="text-base font-semibold text-gray-900">
                Histórico de Importações
              </h3>
            </div>

            <p className="mt-3 text-xs leading-5 text-gray-500">
              Consulte os relatórios recebidos por Gmail ou upload
              manual, incluindo seus respectivos status.
            </p>

            <Link to="/historico" className="mt-5 inline-flex items-center rounded-md border border-gray-200 px-4 py-2.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50" >
              Ver histórico
            </Link>
          </section>
        </aside>
      </div>
    </div>
  )
}
