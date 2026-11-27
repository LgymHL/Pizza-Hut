import { useEffect, useState } from 'react'
import { Building2, CheckCircle2, Database, LockKeyhole, Mail, RefreshCw, Server, Settings2, ShieldCheck, UserRound, XCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const API_URL = (import.meta.env.VITE_API_URL ||'http://localhost:3000').replace(/\/$/, '')

type HealthState =
  | 'checking'
  | 'online'
  | 'offline'

type HealthResponse = {
  status: string
  database: string
  service: string
}

export default function Settings() {
  const { user } = useAuth()

  const [health, setHealth] =
    useState<HealthState>('checking')

  const [checking, setChecking] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const isGeneralManager =
    user?.role === 'GENERAL_MANAGER'

  useEffect(() => {
    const controller = new AbortController()

    async function checkHealth() {
      setHealth('checking')
      setChecking(true)

      try {
        const response = await fetch(
          `${API_URL}/health`,
          { signal: controller.signal },
        )

        if (!response.ok) {
          throw new Error('API indisponível')
        }

        const result =
          (await response.json()) as HealthResponse

        if (!controller.signal.aborted) {
          setHealth(
            result.status === 'ok' &&
              result.database === 'connected'
              ? 'online'
              : 'offline',
          )
        }
      } catch {
        if (!controller.signal.aborted) {
          setHealth('offline')
        }
      } finally {
        if (!controller.signal.aborted) {
          setChecking(false)
        }
      }
    }

    void checkHealth()

    return () => controller.abort()
  }, [refreshKey])

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Settings2 size={23} className="text-hut-red" />

          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
            Configurações
          </h2>
        </div>

        <p className="mt-2 text-xs text-gray-500">
          Informações da conta, unidades autorizadas e
          estado dos serviços do Pizza Hut BI.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-hut-card p-6">
          <div className="mb-6 flex items-center gap-3">
            <UserRound size={20} className="text-hut-red" />

            <h3 className="text-base font-semibold text-gray-900">
              Minha conta
            </h3>
          </div>

          <div className="space-y-5">
            <div>
              <p className="text-[11px] text-gray-500">
                Nome
              </p>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {user?.name || 'Não informado'}
              </p>
            </div>

            <div>
              <p className="text-[11px] text-gray-500">
                E-mail
              </p>
              <p className="mt-1 break-all text-sm font-medium text-gray-900">
                {user?.email || 'Não informado'}
              </p>
            </div>

            <div>
              <p className="text-[11px] text-gray-500">
                Perfil de acesso
              </p>

              <div className="mt-2 flex items-center gap-2">
                <ShieldCheck
                  size={17}
                  className="text-hut-red"
                />

                <span className="text-sm font-medium text-gray-900">
                  {isGeneralManager
                    ? 'Gerente Geral'
                    : 'Gerente de Unidade'}
                </span>
              </div>
            </div>

            <div className="rounded-lg bg-gray-50 p-4">
              <div className="flex items-start gap-3">
                <LockKeyhole
                  size={18}
                  className="mt-0.5 shrink-0 text-gray-500"
                />

                <div>
                  <p className="text-xs font-semibold text-gray-800">
                    Segurança da conta
                  </p>

                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    O acesso é autenticado pela API. A
                    alteração de senha ainda não está
                    disponível nesta interface.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-hut-card p-6">
          <div className="mb-6 flex items-center gap-3">
            <Building2 size={20} className="text-hut-red" />

            <h3 className="text-base font-semibold text-gray-900">
              Unidades vinculadas
            </h3>
          </div>

          <p className="mb-5 text-xs leading-5 text-gray-500">
            Unidades que seu perfil pode consultar.
          </p>

          {!user?.units.length ? (
            <div className="rounded-lg bg-gray-50 p-5 text-xs text-gray-500">
              Nenhuma unidade disponível.
            </div>
          ) : (
            <div className="space-y-3">
              {user.units.map((unit) => (
                <div key={unit.id} className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center gap-3">
                    <Building2 size={18} className="text-gray-500" />

                    <div>
                      <p className="text-xs font-semibold text-gray-900">
                        {unit.name}
                      </p>

                      <p className="mt-1 text-[11px] text-gray-500">
                        {unit.slug}
                      </p>
                    </div>
                  </div>

                  <span className="whitespace-nowrap rounded-full bg-green-50 px-3 py-1 text-[11px] font-medium text-green-700">
                    Autorizada
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 rounded-lg bg-gray-50 p-4">
            <p className="text-xs leading-5 text-gray-600">
              {isGeneralManager
                ? 'Seu perfil permite visualizar as unidades disponíveis e importar relatórios.'
                : 'Seu perfil possui acesso aos dados das unidades vinculadas, sem permissão para importar relatórios.'}
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-hut-card p-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Server size={20} className="text-hut-red" />

              <h3 className="text-base font-semibold text-gray-900">
                Estado dos serviços
              </h3>
            </div>

            <button type="button"
              onClick={() =>
                setRefreshKey((value) => value + 1)
              }
              disabled={checking} aria-label="Verificar conexão" className="cursor-pointer rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
              <RefreshCw
                size={16}
                className={checking ? 'animate-spin' : ''}
              />
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <Database size={19} className="text-gray-500" />
              <div>
                <p className="text-xs font-semibold text-gray-900">
                  API e PostgreSQL
                </p>

                <p className="mt-1 text-[11px] text-gray-500">
                  Verificação pelo endpoint /health
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {health === 'online' ? (
                <>
                  <CheckCircle2 size={17} className="text-green-600" />
                  <span className="text-xs font-medium text-green-700">
                    Conectado
                  </span>
                </>
              ) : health === 'offline' ? (
                <>
                  <XCircle size={17} className="text-red-600" />
                  <span className="text-xs font-medium text-red-700">
                    Indisponível
                  </span>
                </>
              ) : (
                <span className="text-xs text-gray-500">
                  Verificando...
                </span>
              )}
            </div>
          </div>

          <p className="mt-4 text-xs leading-5 text-gray-500">
            Esta verificação informa se a API respondeu
            e conseguiu consultar o PostgreSQL. Ela
            não garante que todas as integrações estejam
            funcionando.
          </p>
        </section>

        <section className="rounded-xl border border-gray-200 bg-hut-card p-6">
          <div className="mb-6 flex items-center gap-3">
            <Mail size={20} className="text-hut-red" />

            <h3 className="text-base font-semibold text-gray-900">
              Integração de relatórios
            </h3>
          </div>

          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-900">
              Gmail
            </p>

            <p className="mt-2 text-xs leading-5 text-gray-500">
              O backend possui um serviço de
              sincronização de relatórios recebidos
              por e-mail.
            </p>

            <p className="mt-3 text-[11px] font-medium text-amber-700">
              Estado da sincronização não disponível
              nesta versão da API.
            </p>
          </div>

          <p className="mt-4 text-xs leading-5 text-gray-500">
            A configuração do agendador é feita no
            ambiente do servidor. Esta página não
            permite ativá-lo nem alterar credenciais.
          </p>
        </section>
      </div>
    </div>
  )
}
