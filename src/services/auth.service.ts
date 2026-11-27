
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export type UserRole = 'GENERAL_MANAGER' | 'UNIT_MANAGER'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  units: {
    id: string
    name: string
    slug: string
  }[]
}

interface LoginResponse {
  token: string
  tokenType: string
  expiresIn: number
}

export async function login( email: string, password: string ): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => null)

    throw new Error(
      error?.message || 'Não foi possível realizar o login',
    )
  }

  return response.json() as Promise<LoginResponse>
}

export async function getMe(token: string): Promise<AuthUser> {
  const response = await fetch(`${API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Sessão inválida ou expirada')
  }

  return response.json() as Promise<AuthUser>
}
