import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

export type MonthlyUnit = {
  snapshotId: string
  unitId: string
  unitName: string
  periodStart: string
  periodEnd: string
  ticketCount: number
  averageTicketCents: number
  displayedMainValueCents: number | null
  approximateDailySumCents: number
  productCount: number
}

export type MonthlyProduct = {
  unitId: string
  unitName: string
  periodStart: string
  periodEnd: string
  productName: string
  quantity: number
  rankingPosition: number
}

export type MonthlyDashboard = {
  overview: {
    snapshotCount: number
    ticketCount: number
    approximateDailySumCents: number
  }
  units: MonthlyUnit[]
  products: MonthlyProduct[]
}

type MonthlyPeriod = {
  start: string
  end: string
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const date = new Date(`${value}T00:00:00.000Z`)

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  )
}

function samePeriod( item: { periodStart: string; periodEnd: string }, period: MonthlyPeriod ) : boolean {
  return (
    item.periodStart === period.start &&
    item.periodEnd === period.end
  )
}

function overlaps( item: { periodStart: string; periodEnd: string }, start: string, end: string ) : boolean {
  return (
    item.periodStart <= end &&
    item.periodEnd >= start
  )
}

function findPeriod( units: MonthlyUnit[], startDate: string, endDate: string ) : MonthlyPeriod | null {
  const available = units
    .filter((unit) => {
      if (!startDate || !endDate) return true

      return overlaps(unit, startDate, endDate)
    })
    .sort((a, b) => {
      const byEnd = b.periodEnd.localeCompare(a.periodEnd)

      return byEnd !== 0
        ? byEnd
        : b.periodStart.localeCompare(a.periodStart)
    })

  if (available.length === 0) {
    return null
  }

  if (startDate && endDate) {
    const exact = available.find(
      (unit) =>
        unit.periodStart === startDate &&
        unit.periodEnd === endDate,
    )

    if (exact) {
      return {
        start: exact.periodStart,
        end: exact.periodEnd,
      }
    }
  }

  return {
    start: available[0].periodStart,
    end: available[0].periodEnd,
  }
}

function emptyDashboard(): MonthlyDashboard {
  return {
    overview: {
      snapshotCount: 0,
      ticketCount: 0,
      approximateDailySumCents: 0,
    },
    units: [],
    products: [],
  }
}

/**
 * @author Gabriel
 * @example
 * const { data, period, loading } = useMonthlyDashboard()
 */
export function useMonthlyDashboard() {
  const { token } = useAuth()
  const [searchParams] = useSearchParams()

  const unitId = searchParams.get('unitId') ?? ''
  const startDate = searchParams.get('startDate') ?? ''
  const endDate = searchParams.get('endDate') ?? ''

  const [data, setData] = useState<MonthlyDashboard | null>( null )
  const [period, setPeriod] = useState<MonthlyPeriod | null>( null )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      setLoading(true)
      setError('')
      setData(null)
      setPeriod(null)

      if (!token) {
        setError('Sessão não encontrada.')
        setLoading(false)
        return
      }

      const hasStart = Boolean(startDate)
      const hasEnd = Boolean(endDate)

      if (
        hasStart !== hasEnd ||
        (hasStart && !validDate(startDate)) ||
        (hasEnd && !validDate(endDate)) ||
        (hasStart && hasEnd && startDate > endDate)
      ) {
        setError('Informe um intervalo de datas válido.')
        setLoading(false)
        return
      }

      const params = new URLSearchParams()

      if (unitId) {
        params.set('unitId', unitId)
      }

      if (startDate && endDate) {
        params.set('startDate', startDate)
        params.set('endDate', endDate)
      }

      const query = params.toString()

      try {
        const response = await fetch(`${API_URL}/dashboard/monthly${
            query ? `?${query}` : ''
          }`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
            signal: controller.signal,
          },
        )

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error(
              'Sessão expirada. Entre novamente.',
            )
          }

          if (response.status === 403) {
            throw new Error(
              'Você não possui acesso a esses dados.',
            )
          }

          throw new Error(
            `Erro ao carregar fechamento mensal (HTTP ${response.status}).`,
          )
        }

        const result =
          (await response.json()) as MonthlyDashboard

        if (controller.signal.aborted) return

        const selectedPeriod = findPeriod(
          result.units,
          startDate,
          endDate,
        )

        if (!selectedPeriod) {
          setData(emptyDashboard())
          return
        }

        const matchingUnits = result.units.filter(
          (unit) => samePeriod(unit, selectedPeriod),
        )

        const uniqueUnits = new Map<string, MonthlyUnit>()

        for (const unit of matchingUnits) {
          if (!uniqueUnits.has(unit.unitId)) {
            uniqueUnits.set(unit.unitId, unit)
          }
        }

        const units = [...uniqueUnits.values()]

        const products = result.products.filter(
          (product) =>
            samePeriod(product, selectedPeriod) &&
            units.some(
              (unit) => unit.unitId === product.unitId,
            ),
        )

        const ticketCount = units.reduce(
          (sum, unit) => sum + unit.ticketCount,
          0,
        )

        const approximateDailySumCents = units.reduce(
          (sum, unit) =>
            sum + unit.approximateDailySumCents,
          0,
        )

        setPeriod(selectedPeriod)

        setData({
          overview: {
            snapshotCount: units.length,
            ticketCount,
            approximateDailySumCents,
          },
          units,
          products,
        })
      } catch (err) {
        if (controller.signal.aborted) return

        setError(
          err instanceof Error
            ? err.message
            : 'Não foi possível carregar os dados.',
        )
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => controller.abort()
  }, [
    token,
    unitId,
    startDate,
    endDate,
    refreshKey,
  ])

  return {
    data,
    period,
    loading,
    error,
    refresh: () => setRefreshKey((value) => value + 1),
  }
}

export const formatBRL = (cents: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100)

export const formatNumber = (value: number) =>
  new Intl.NumberFormat('pt-BR').format(value)
