
export interface DashboardUnit {
  id: string
  unit: {
    id: string
    name: string
    slug: string
  }
  periodStart: string
  periodEnd: string
  grossSales: number
  discounts: number
  invoicedSales: number
  storeSales: number
  ticketCount: number
  averageTicket: number
  ifoodSharePercent: number | null
  ticketsEstimated?: boolean
  source?: string
}

export interface CoverageUnit {
  id: string
  name: string
}

export type SalesCoverageStatus =
  | 'COMPLETE'
  | 'PARTIAL'
  | 'NO_DATA'

export interface SalesCoverage {
  status: SalesCoverageStatus
  expectedCount: number
  availableCount: number
  missingCount: number
  availableUnits: CoverageUnit[]
  missingUnits: CoverageUnit[]
}

export interface DashboardOverview {
  periodStart: string | null
  periodEnd: string | null
  totalSales: number
  totalTickets: number
  averageTicket: number
  units: DashboardUnit[]
  coverage: SalesCoverage
}
