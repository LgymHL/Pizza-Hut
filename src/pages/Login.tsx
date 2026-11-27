import { useState, type FormEvent, type ReactNode } from 'react'
import { ArrowLeft, CheckCircle2, Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { PROFILES, type ProfileId } from '../demo/profiles'
import BrandLogo from '../components/brand/BrandLogo'
import { Avatar } from '../components/account/AccountMenu'
import { cn } from '../components/painel/ui'

/** Senha única da versão de demonstração (não há servidor de login). Fica no guia, não na tela. */
export const DEMO_PASSWORD = 'pizzahut'

const PHOTO = `${import.meta.env.BASE_URL}login-pizza.webp`

const inputBox = (bad = false) =>
  cn(
    'h-11 w-full rounded-lg border bg-background px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/25',
    bad ? 'border-destructive' : 'border-input',
  )

function Field({ label, children, error }: { label: string; children: ReactNode; error?: string }) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      {children}
      {error && <span role="alert" className="block text-xs text-destructive">{error}</span>}
    </label>
  )
}

/** Máscara de celular brasileiro: (98) 99999-9999 */
function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/**
 * Tela de entrada, minimalista.
 * Atalhos só para contas que já entraram NESTE aparelho (e ainda pedem a senha),
 * para que ninguém veja ou tente as contas dos outros.
 */
export default function Login() {
  const { signIn, knownAccounts, pendingEmail, accountInfo } = useAuth()
  const [view, setView] = useState<'login' | 'request'>('login')

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-background px-4 py-10">
      {/* Fundo: a foto da pizza, ampliada, desfocada e bem escurecida para dar contraste ao painel */}
      <div aria-hidden className="absolute inset-0 scale-110 bg-cover bg-center blur-2xl brightness-[0.35] saturate-[1.1]" style={{ backgroundImage: `url(${PHOTO})` }} />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/55 to-background/85" />

      {/* Painel de vidro: formulário + foto */}
      <div className="relative z-10 grid w-full max-w-5xl gap-5 rounded-[28px] border border-white/10 bg-white/[0.05] p-4 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.75)] backdrop-blur-2xl md:grid-cols-[minmax(0,420px)_minmax(0,1fr)] md:p-5">
        <section className="rounded-[22px] border border-white/10 bg-background/90 p-7 sm:p-9">
          <BrandLogo className="h-12 w-auto" />
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Gestão à vista</p>
          {view === 'login'
            ? <LoginForm signIn={signIn} known={knownAccounts} prefill={pendingEmail} accountInfo={accountInfo} onRequest={() => setView('request')} />
            : <RequestAccess onBack={() => setView('login')} />}
        </section>

        <section className="relative hidden min-h-[560px] overflow-hidden rounded-[22px] md:block">
          <img src={PHOTO} alt="Pizza Hut Supreme sobre a mesa" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">São Luís · MA</p>
            <p className="mt-1 max-w-sm text-2xl font-semibold leading-tight text-white">Os números das duas lojas, num só lugar.</p>
            <p className="mt-2 max-w-sm text-sm text-white/75">Vendas, metas, CMV, desperdício e o Selo Super do iFood.</p>
          </div>
        </section>
      </div>
    </div>
  )
}

function LoginForm({ signIn, known, prefill, accountInfo, onRequest }: {
  signIn: (id: ProfileId) => void
  known: ProfileId[]
  prefill: string
  accountInfo: ReturnType<typeof useAuth>['accountInfo']
  onRequest: () => void
}) {
  const ids = Object.keys(PROFILES) as ProfileId[]
  const [email, setEmail] = useState(prefill || (known[0] ? PROFILES[known[0]].email : ''))
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<{ field: 'email' | 'password'; text: string } | null>(null)
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (loading) return
    setInfo('')
    const value = email.trim().toLowerCase()
    if (!value) return setError({ field: 'email', text: 'Informe o e-mail.' })
    if (!/^\S+@\S+\.\S+$/.test(value)) return setError({ field: 'email', text: 'E-mail inválido.' })
    if (!password) return setError({ field: 'password', text: 'Informe a senha.' })
    const id = ids.find((i) => PROFILES[i].email.toLowerCase() === value)
    // mensagem única: não revela se o e-mail existe
    if (!id || password !== DEMO_PASSWORD) return setError({ field: 'password', text: 'E-mail ou senha incorretos.' })
    setError(null)
    setLoading(true)
    window.setTimeout(() => signIn(id), 500)
  }

  return (
    <>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Entrar</h1>
      <p className="mt-1 text-sm text-muted-foreground">Use o e-mail e a senha da sua loja.</p>

      {/* Só as contas que já entraram neste aparelho */}
      {known.length > 0 && (
        <div className="mt-6 space-y-2">
          {known.slice(0, 2).map((id) => {
            const a = accountInfo(id)
            const active = email.toLowerCase() === a.email
            return (
              <button
                key={id}
                type="button"
                onClick={() => { setEmail(a.email); setPassword(''); setError(null) }}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
                  active ? 'border-primary/60 bg-primary/10' : 'border-border hover:bg-accent',
                )}
              >
                <Avatar size={34} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{a.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{a.email}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}

      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <Field label="E-mail" error={error?.field === 'email' ? error.text : undefined}>
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null) }}
            placeholder="nome@empresa.com"
            aria-invalid={error?.field === 'email'}
            className={inputBox(error?.field === 'email')}
          />
        </Field>

        <Field label="Senha" error={error?.field === 'password' ? error.text : undefined}>
          <span className="relative block">
            <input
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null) }}
              aria-invalid={error?.field === 'password'}
              className={cn(inputBox(error?.field === 'password'), 'pr-11')}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? 'Esconder senha' : 'Mostrar senha'}
              className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-md p-1.5 text-muted-foreground hover:text-foreground"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </span>
        </Field>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => { setError(null); setInfo('Para redefinir a senha, fale com o Gerente Geral.') }}
            className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Esqueceu a senha?
          </button>
        </div>
        {info && <p className="text-xs text-muted-foreground">{info}</p>}

        <button
          type="submit"
          disabled={loading}
          className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-80"
        >
          {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <p className="mt-6 border-t border-border pt-5 text-center text-sm text-muted-foreground">
        Primeiro acesso?{' '}
        <button type="button" onClick={onRequest} className="cursor-pointer font-medium text-primary hover:underline">
          Solicitar acesso
        </button>
      </p>
    </>
  )
}

/** Pedido de acesso (demonstração): nome, e-mail, celular, loja e função. */
function RequestAccess({ onBack }: { onBack: () => void }) {
  const [v, setV] = useState({ name: '', email: '', phone: '', store: '', role: '' })
  const [errors, setErrors] = useState<Partial<Record<keyof typeof v, string>>>({})
  const [sent, setSent] = useState(false)
  const set = (k: keyof typeof v) => (value: string) => { setV((s) => ({ ...s, [k]: value })); setErrors((e) => ({ ...e, [k]: undefined })) }

  function submit(e: FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (v.name.trim().length < 3) next.name = 'Informe o nome completo.'
    if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) next.email = 'E-mail inválido.'
    if (v.phone.replace(/\D/g, '').length < 10) next.phone = 'Informe o celular com DDD.'
    if (!v.store) next.store = 'Escolha a loja.'
    if (!v.role) next.role = 'Escolha a função.'
    setErrors(next)
    if (Object.keys(next).length) return
    setSent(true)
  }

  if (sent) {
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
        <h1 className="mt-4 text-xl font-semibold">Solicitação enviada</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O Gerente Geral vai analisar o pedido de <span className="text-foreground">{v.name.trim()}</span> e enviar o convite para {v.email.trim()}.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">Na versão de demonstração nenhum e-mail ou SMS é enviado.</p>
        <button type="button" onClick={onBack} className="mt-6 h-11 w-full cursor-pointer rounded-lg border border-input text-sm font-medium hover:bg-accent">
          Voltar para o login
        </button>
      </div>
    )
  }

  return (
    <>
      <button type="button" onClick={onBack} className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </button>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Solicitar acesso</h1>
      <p className="mt-1 text-sm text-muted-foreground">O Gerente Geral recebe o pedido e libera a sua loja.</p>

      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <Field label="Nome completo" error={errors.name}>
          <input value={v.name} onChange={(e) => set('name')(e.target.value)} autoComplete="name" className={inputBox(!!errors.name)} />
        </Field>
        <Field label="E-mail" error={errors.email}>
          <input type="email" value={v.email} onChange={(e) => set('email')(e.target.value)} autoComplete="email" placeholder="nome@empresa.com" className={inputBox(!!errors.email)} />
        </Field>
        <Field label="Celular (WhatsApp)" error={errors.phone}>
          <input type="tel" inputMode="numeric" value={v.phone} onChange={(e) => set('phone')(maskPhone(e.target.value))} autoComplete="tel" placeholder="(98) 99999-9999" className={inputBox(!!errors.phone)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Loja" error={errors.store}>
            <select value={v.store} onChange={(e) => set('store')(e.target.value)} className={cn(inputBox(!!errors.store), 'cursor-pointer')}>
              <option value="">Escolha</option>
              <option>Holandeses</option>
              <option>Renascença</option>
            </select>
          </Field>
          <Field label="Função" error={errors.role}>
            <select value={v.role} onChange={(e) => set('role')(e.target.value)} className={cn(inputBox(!!errors.role), 'cursor-pointer')}>
              <option value="">Escolha</option>
              <option>Gerente de loja</option>
              <option>Gerente de produção</option>
              <option>Supervisor</option>
            </select>
          </Field>
        </div>
        <button type="submit" className="h-11 w-full cursor-pointer rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">
          Enviar solicitação
        </button>
      </form>
    </>
  )
}
