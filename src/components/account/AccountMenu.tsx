import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftRight, Check, ChevronRight, CircleUserRound, LogOut, User, UserPlus, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { PROFILES, type ProfileId } from '../../demo/profiles'
import { cn } from '../painel/ui'

export function roleLabel(id: ProfileId) {
  const p = PROFILES[id]
  return p.role === 'GENERAL_MANAGER' ? 'Administrador' : `Gerente · ${p.units[0]?.name ?? 'Loja'}`
}

/** Avatar da conta: sempre o ícone de usuário (modelo do Figma). */
export function Avatar({ size = 40 }: { size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-full bg-muted text-foreground" style={{ width: size, height: size }}>
      <CircleUserRound className="h-[72%] w-[72%]" strokeWidth={1.25} />
    </span>
  )
}

/** Janela simples no estilo do painel. */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="cursor-pointer rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

type Dialog = 'perfil' | 'nome' | null

export default function AccountMenu() {
  const { user, profileId, switchProfile, signOut, updateName, accountInfo, knownAccounts } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [subOpen, setSubOpen] = useState(false)
  const [dialog, setDialog] = useState<Dialog>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) { setOpen(false); setSubOpen(false) } }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); setSubOpen(false) } }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  if (!user) return null

  const choose = (d: Dialog) => { setDialog(d); setOpen(false); setSubOpen(false) }

  function changeAccount(id: ProfileId) {
    setOpen(false)
    setSubOpen(false)
    if (id === profileId) return
    switchProfile(id)
    navigate('/')
  }

  // itens grandes do menu da conta (modelo do Figma)
  const item = 'flex w-full cursor-pointer items-center gap-5 rounded-lg px-2 py-3 text-left text-lg text-foreground transition-colors hover:bg-accent'
  // linhas da lista de contas (submenu)
  const sub = 'flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Conta: ${user.name}`}
        className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-1.5 text-left transition-colors hover:bg-accent sm:py-2 sm:pl-3 sm:pr-2"
      >
        <span className="hidden min-w-0 leading-tight sm:block">
          <span className="block max-w-44 truncate text-sm font-medium text-foreground">{user.name}</span>
          <span className="block max-w-44 truncate text-xs text-muted-foreground">{user.email}</span>
        </span>
        <Avatar size={38} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-[330px] rounded-2xl border border-border bg-background px-5 pb-4 pt-5 shadow-2xl">
          <div className="flex items-center gap-4 pb-4">
            <Avatar size={60} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <div className="mb-3 h-px bg-foreground/80" />

          <button type="button" role="menuitem" className={item} onClick={() => choose('perfil')}>
            <User className="h-7 w-7" strokeWidth={1.5} /> Perfil
          </button>

          <div className="relative" onMouseEnter={() => setSubOpen(true)} onMouseLeave={() => setSubOpen(false)}>
            <button type="button" role="menuitem" aria-haspopup="menu" aria-expanded={subOpen} className={item} onClick={() => setSubOpen(true)}>
              <ArrowLeftRight className="h-7 w-7" strokeWidth={1.5} />
              <span className="flex-1">Trocar de Conta</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            {subOpen && (
              <div role="menu" className="absolute right-full top-0 z-50 mr-1 w-72 rounded-lg border border-border bg-popover p-1.5 shadow-2xl max-sm:right-0 max-sm:top-full max-sm:mr-0 max-sm:mt-1">
                <p className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Contas neste aparelho</p>
                {/* só contas que já entraram aqui; trocar pede a senha no login */}
                {[profileId, ...knownAccounts.filter((k) => k !== profileId)].map((id) => {
                  const a = accountInfo(id)
                  return (
                    <button key={id} type="button" role="menuitemradio" aria-checked={id === profileId} className={sub} onClick={() => changeAccount(id)}>
                      <Avatar size={32} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{a.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{roleLabel(id)}</span>
                      </span>
                      {id === profileId && <Check className="h-4 w-4 text-success" />}
                    </button>
                  )
                })}
                <div className="my-1 h-px bg-border" />
                <button type="button" role="menuitem" className={sub} onClick={() => { setOpen(false); setSubOpen(false); signOut() }}>
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                  Entrar com outra conta
                </button>
                <p className="px-3 pb-1.5 pt-1 text-[11px] text-muted-foreground">Ao trocar, a senha da outra conta é pedida.</p>
              </div>
            )}
          </div>

          <button type="button" role="menuitem" className={item} onClick={() => { setOpen(false); signOut() }}>
            <LogOut className="h-7 w-7" strokeWidth={1.5} /> Sair
          </button>
        </div>
      )}

      {dialog === 'perfil' && (
        <Modal title="Meu perfil" onClose={() => setDialog(null)}>
          <div className="flex items-center gap-4">
            <Avatar size={64} />
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">{user.name}</p>
              <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <dl className="mt-5 divide-y divide-border rounded-md border border-border text-sm">
            <div className="flex justify-between gap-4 px-3 py-2.5"><dt className="text-muted-foreground">Perfil</dt><dd>{roleLabel(profileId)}</dd></div>
            <div className="flex justify-between gap-4 px-3 py-2.5"><dt className="text-muted-foreground">Lojas</dt><dd className="text-right">{user.units.map((u) => u.name).join(', ')}</dd></div>
            <div className="flex justify-between gap-4 px-3 py-2.5"><dt className="text-muted-foreground">Acesso a metas e usuários</dt><dd>{user.role === 'GENERAL_MANAGER' ? 'Sim' : 'Não'}</dd></div>
          </dl>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setDialog('nome')} className="cursor-pointer rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Alterar nome</button>
          </div>
        </Modal>
      )}

      {dialog === 'nome' && <NameDialog current={user.name} onSave={(n) => { updateName(n); setDialog(null) }} onClose={() => setDialog(null)} />}
    </div>
  )
}

function NameDialog({ current, onSave, onClose }: { current: string; onSave: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState(current)
  const [error, setError] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    const value = name.trim()
    if (value.length < 2) return setError('Informe um nome com pelo menos 2 letras.')
    if (value.length > 60) return setError('Use no máximo 60 caracteres.')
    onSave(value)
  }

  return (
    <Modal title="Alterar nome" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5 text-sm">
          <label htmlFor="conta-nome" className="text-muted-foreground">Nome exibido</label>
          <input
            id="conta-nome"
            autoFocus
            value={name}
            onChange={(e) => { setName(e.target.value); setError('') }}
            className={cn('h-9 w-full rounded-md border bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring', error ? 'border-destructive' : 'border-input')}
          />
          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="cursor-pointer rounded-md border border-input px-3 py-2 text-sm hover:bg-accent">Cancelar</button>
          <button type="submit" className="cursor-pointer rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Salvar</button>
        </div>
      </form>
    </Modal>
  )
}

