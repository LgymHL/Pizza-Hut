import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { dashboardService, type DashboardPeriod } from '../services/dashboard.service'

export function useDashboardPeriods( unitId?: string, source: 'SALES' | 'MONTHLY' = 'SALES' ) {
  const { token } = useAuth()

  const [periods, setPeriods] =
    useState<DashboardPeriod[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(
    null,
  )

  useEffect(() => {
    const controller = new AbortController()

    if (!token) {
      setPeriods([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    setPeriods([])

    dashboardService
      .getPeriods(
        token,
        unitId,
        controller.signal,
        source,
      )
      .then((result) => {
        if (!controller.signal.aborted) {
          setPeriods(result)
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return

        setError(
          err instanceof Error
            ? err.message
            : 'Erro ao carregar períodos.',
        )
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [token, unitId, source])

  return {
    periods,
    loading,
    error,
  }
}
