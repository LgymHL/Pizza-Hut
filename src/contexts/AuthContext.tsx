import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { AuthUser } from '../services/auth.service'
import { PROFILES, getProfileId, setProfileId, type ProfileId } from '../demo/profiles'

/**
 * Sessão de demonstração (sem backend).
 *
 * - O site sempre abre pela tela de login: a sessão vale só para a aba aberta
 *   (sessionStorage). Fechou a aba ou abriu o site de novo → login.
 * - Trocar de conta passa pelo login e pede a senha da outra conta.
 * - A tela de login só mostra como atalho as contas que já entraram neste aparelho.
 */

type Customization = { name?: string; photo?: string }

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  loading: boolean
  profileId: ProfileId
  photo: string | null
  /** Vai para o login com o e-mail da conta escolhida preenchido (pede a senha). */
  switchProfile: (id: ProfileId) => void
  signIn: (id: ProfileId) => void
  signOut: () => void
  updateName: (name: string) => void
  updatePhoto: (dataUrl: string | null) => void
  /** Nome e e-mail de uma conta. */
  accountInfo: (id: ProfileId) => { name: string; email: string; photo: string | null; role: AuthUser['role'] }
  /** Contas que já entraram neste aparelho (mais recente primeiro). */
  knownAccounts: ProfileId[]
  /** E-mail que o login deve trazer preenchido. */
  pendingEmail: string
}

const AuthContext = createContext<AuthContextType | null>(null)

const SESSION_KEY = 'pizza-hut-demo-session'
const CUSTOM_KEY = 'pizza-hut-demo-accounts'
const KNOWN_KEY = 'pizza-hut-demo-known-accounts'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // sem armazenamento: vale só até recarregar
  }
}

function readSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === 'true'
  } catch {
    return false
  }
}

function writeSession(value: boolean) {
  try {
    sessionStorage.setItem(SESSION_KEY, String(value))
    localStorage.removeItem(SESSION_KEY) // versão antiga guardava aqui
  } catch {
    // ignora
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profileId, setProfile] = useState<ProfileId>(getProfileId)
  const [signedIn, setSignedIn] = useState<boolean>(readSession)
  const [known, setKnown] = useState<ProfileId[]>(() => read(KNOWN_KEY, []))
  const [pendingEmail, setPendingEmail] = useState('')
  const [custom, setCustom] = useState<Record<string, Customization>>(() => read(CUSTOM_KEY, {}))

  function saveCustom(next: Record<string, Customization>) {
    setCustom(next)
    write(CUSTOM_KEY, next)
  }

  function accountInfo(id: ProfileId) {
    const base = PROFILES[id]
    return {
      name: custom[id]?.name || base.name,
      email: base.email,
      photo: custom[id]?.photo ?? null,
      role: base.role,
    }
  }

  function signIn(id: ProfileId) {
    setProfileId(id)
    setProfile(id)
    setSignedIn(true)
    writeSession(true)
    setPendingEmail('')
    const next = [id, ...known.filter((k) => k !== id)]
    setKnown(next)
    write(KNOWN_KEY, next)
  }

  function signOut(prefill = '') {
    setSignedIn(false)
    writeSession(false)
    setPendingEmail(prefill)
  }

  const user = useMemo<AuthUser | null>(
    () => (signedIn ? { ...PROFILES[profileId], name: custom[profileId]?.name || PROFILES[profileId].name } : null),
    [signedIn, profileId, custom],
  )

  return (
    <AuthContext.Provider
      value={{
        user,
        // o token muda com a conta para as telas recarregarem os dados
        token: signedIn ? `demo-token-${profileId}` : null,
        loading: false,
        profileId,
        photo: custom[profileId]?.photo ?? null,
        switchProfile: (id) => signOut(PROFILES[id].email),
        signIn,
        signOut: () => signOut(),
        updateName: (name) => saveCustom({ ...custom, [profileId]: { ...custom[profileId], name: name.trim() } }),
        updatePhoto: (photo) => saveCustom({ ...custom, [profileId]: { ...custom[profileId], photo: photo ?? undefined } }),
        accountInfo,
        knownAccounts: known,
        pendingEmail,
      }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }

  return context
}
