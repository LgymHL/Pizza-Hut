import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { dashboardService } from '../services/dashboard.service'
import type { DashboardOverview } from '../types/dashboard'

const REFRESH_INTERVAL_MS = 60_000
const MIN_REFRESH_GAP_MS = 10_000

/**
 * @author Gabriel
 * @example
 * const { data, refresh, refreshing } = useDashboard()
 */
export function useDashboard() {
  const { token } = useAuth()
  const [searchParams] = useSearchParams()

  const [data, setData] = useState<DashboardOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [version, setVersion] = useState(0)

  const query = searchParams.toString()

  const lastRequestAt = useRef(0)
  const previousKey = useRef<string | null>(null)
  const dataRef = useRef<DashboardOverview | null>(null)

  const refresh = useCallback(() => {
    lastRequestAt.current = Date.now()
    setVersion((current) => current + 1)
  }, [])

  useEffect(() => {
    if (!token) return

    function scheduleRefresh() {
      if (document.visibilityState !== 'visible') {
        return
      }

      const now = Date.now()

      if (now - lastRequestAt.current < MIN_REFRESH_GAP_MS) {
        return
      }

      lastRequestAt.current = now
      setVersion((current) => current + 1)
    }

    const interval = window.setInterval(
      scheduleRefresh,
      REFRESH_INTERVAL_MS,
    )

    window.addEventListener('focus', scheduleRefresh)
    document.addEventListener(
      'visibilitychange',
      scheduleRefresh,
    )

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', scheduleRefresh)
      document.removeEventListener(
        'visibilitychange',
        scheduleRefresh,
      )
    }
  }, [token])

  useEffect(() => {
    const controller = new AbortController()
    const key = JSON.stringify([token, query])
    const filtersChanged = previousKey.current !== key

    previousKey.current = key

    if (filtersChanged) {
      dataRef.current = null
      setData(null)
      setLastUpdated(null)
      setError(null)
      setRefreshError(null)
    }

    if (!token) {
      setLoading(false)
      setRefreshing(false)

      return () => controller.abort()
    }

    const params = new URLSearchParams(query)

    const filters = {
      unitId: params.get('unitId') || undefined,
      startDate: params.get('startDate') || undefined,
      endDate: params.get('endDate') || undefined,
    }

    const backgroundRefresh =
      !filtersChanged && dataRef.current !== null

    setLoading(!backgroundRefresh)
    setRefreshing(backgroundRefresh)
    setError(null)
    setRefreshError(null)

    lastRequestAt.current = Date.now()

    dashboardService
      .getOverview(token, filters, controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return

        dataRef.current = response
        setData(response)
        setLastUpdated(new Date())
        setError(null)
        setRefreshError(null)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return

        const message =
          err instanceof Error
            ? err.message
            : 'Erro ao atualizar indicadores'

        if (backgroundRefresh) {
          setRefreshError(message)
        } else {
          setError(message)
        }
      })
      .finally(() => {
        if (controller.signal.aborted) return

        setLoading(false)
        setRefreshing(false)
      })

    return () => controller.abort()
  }, [token, query, version])

  return {
    data,
    loading,
    refreshing,
    error,
    refreshError,
    lastUpdated,
    refresh,
  }
}
