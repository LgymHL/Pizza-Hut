import type { AuthUser } from '../services/auth.service'

/**
 * Perfis de demonstração (sem login).
 * Substituem a autenticação enquanto o backend não está disponível.
 */

export const UNITS = [
  { id: 'unit-holandeses', name: 'Holandeses', slug: 'holandeses' },
  { id: 'unit-renascenca', name: 'Renascença', slug: 'renascenca' },
] as const

export type ProfileId = 'geral' | 'holandeses' | 'renascenca'

export const PROFILES: Record<ProfileId, AuthUser> = {
  geral: {
    id: 'demo-geral',
    name: 'Gerente Geral',
    email: 'gerente.geral@demo.local',
    role: 'GENERAL_MANAGER',
    units: [...UNITS],
  },
  holandeses: {
    id: 'demo-holandeses',
    name: 'Gerente Holandeses',
    email: 'gerente.holandeses@demo.local',
    role: 'UNIT_MANAGER',
    units: [UNITS[0]],
  },
  renascenca: {
    id: 'demo-renascenca',
    name: 'Gerente Renascença',
    email: 'gerente.renascenca@demo.local',
    role: 'UNIT_MANAGER',
    units: [UNITS[1]],
  },
}

export const PROFILE_LABELS: Record<ProfileId, string> = {
  geral: 'Gerente Geral',
  holandeses: 'Gerente · Holandeses',
  renascenca: 'Gerente · Renascença',
}

const STORAGE_KEY = 'pizza-hut-demo-profile'

let current: ProfileId = readStoredProfile()

function readStoredProfile(): ProfileId {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value === 'geral' || value === 'holandeses' || value === 'renascenca') {
      return value
    }
  } catch {
    // armazenamento indisponível: usa o padrão
  }
  return 'geral'
}

export function getProfileId(): ProfileId {
  return current
}

export function getCurrentUser(): AuthUser {
  return PROFILES[current]
}

export function setProfileId(id: ProfileId) {
  current = id
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // ignora
  }
}

/** Unidades que o perfil atual pode ver, respeitando o filtro pedido. */
export function allowedUnitIds(requested?: string | null): string[] {
  const user = getCurrentUser()
  const own = user.units.map((unit) => unit.id)

  if (requested) {
    return own.includes(requested) ? [requested] : []
  }

  return own
}
