
const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:3000'
).replace(/\/$/, '')

export type Unit = {
  id: string
  name: string
  slug: string
}

export type ManagedUser = {
  id: string
  name: string
  email: string
  role: 'GENERAL_MANAGER' | 'UNIT_MANAGER'
  active: boolean
  createdAt: string
  units: Unit[]
}

export type InvitationStatus =
  | 'DRAFT'
  | 'SENT'
  | 'ACCEPTED'
  | 'REVOKED'

export type Invitation = {
  id: string
  name: string
  email: string
  status: InvitationStatus
  createdAt: string
  expiresAt: string | null
  unit: Unit
}

export type CreateInvitationInput = {
  name: string
  email: string
  unitId: string
}

export type UpdateUserInput = {
  name?: string
  active?: boolean
  unitId?: string
}

async function apiRequest<T>( path: string, token: string, options: RequestInit = {}) : Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...options.headers,
    },
    cache: 'no-store',
  })

  const result = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      result?.message || `Erro na requisição (${response.status})`,
    )
  }

  return result as T
}

export async function getManagedUsers(token: string) {
  const result = await apiRequest<{ data: ManagedUser[] }>('/admin/users',
    token,
  )

  return result.data
}

export async function getInvitations(token: string) {
  const result = await apiRequest<{ data: Invitation[] }>('/admin/users/invitations',
    token,
  )

  return result.data
}

export async function getUnits(token: string) {
  return apiRequest<Unit[]>('/units', token)
}

export async function createInvitation( token: string, input: CreateInvitationInput )
 {
  return apiRequest<{ message: string; data: Invitation }>('/admin/users/invitations',
    token,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  )
}

export async function sendInvitation( token: string, id: string ) {
  return apiRequest<{ message: string; status: InvitationStatus }>(`/admin/users/invitations/${encodeURIComponent(id)}/send`,
    token,
    { method: 'POST' },
  )
}

export async function revokeInvitation( token: string, id: string ) {
  return apiRequest<{ message: string }>(`/admin/users/invitations/${encodeURIComponent(id)}/revoke`,
    token,
    { method: 'PATCH' },
  )
}

export async function updateManagedUser( token: string, id: string, input: UpdateUserInput ) {
  return apiRequest<{ message: string }>(`/admin/users/${encodeURIComponent(id)}`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  )
}
