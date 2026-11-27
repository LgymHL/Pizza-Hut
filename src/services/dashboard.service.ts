import type { DashboardOverview, DashboardUnit } from '../types/dashboard'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export type DashboardFilters = {
  unitId?: string
  startDate?: string
  endDate?: string
}

export interface DashboardPeriod {
  startDate: string
  endDate: string
}


function buildUrl( endpoint: string, filters: DashboardFilters ) {
  const params = new URLSearchParams()

  if (filters.unitId) {
    params.set('unitId', filters.unitId)
  }

  if (filters.startDate && filters.endDate) {
    params.set('startDate', filters.startDate)
    params.set('endDate', filters.endDate)
  }

  const query = params.toString()

  return `${API_URL}${endpoint}${query ? `?${query}` : ''}`
}


async function get<T>( endpoint: string, token: string, filters: DashboardFilters = {}, signal?: AbortSignal ) : Promise<T> {
  const response = await fetch(buildUrl(endpoint, filters), {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    signal,
  })

  if (response.status === 401) {
    throw new Error('Sessão inválida ou expirada')
  }

  if (response.status === 403) {
    throw new Error('Acesso não autorizado')
  }

  if (!response.ok) {
    throw new Error(
      `Erro ao consultar os indicadores (${response.status})`,
    )
  }

  return response.json() as Promise<T>
}


export const dashboardService = {
  getOverview(
    token: string,
    filters: DashboardFilters = {},
    signal?: AbortSignal,
  ) {
    return get<DashboardOverview>(
      '/dashboard/overview',
      token,
      filters,
      signal,
    )
  },

  getUnits(
    token: string,
    filters: DashboardFilters = {},
    signal?: AbortSignal,
  ) {
    return get<DashboardUnit[]>(
      '/dashboard/units',
      token,
      filters,
      signal,
    )
  },

  getPeriods(
    token: string,
    unitId?: string,
    signal?: AbortSignal,
    source: 'SALES' | 'MONTHLY' = 'SALES',
  ) {
    const params = new URLSearchParams({
      source,
    })

    if (unitId) {
      params.set('unitId', unitId)
    }

    const endpoint =
      `/dashboard/periods?${params.toString()}`

    return get<DashboardPeriod[]>(
      endpoint,
      token,
      {},
      signal,
    )
  }
}

