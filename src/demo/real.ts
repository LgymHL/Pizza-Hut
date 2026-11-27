/**
 * DADOS REAIS das lojas Pizza Hut Holandeses e Renascença (São Luís/MA).
 *
 * Fontes (enviadas pelo cliente):
 *  - FechaentoOutubro.pdf ............ Power BI de fechamento de outubro/2026 (faturamento por dia, arredondado a R$ 100)
 *  - Vendas_Dia_Negocio (6).pdf ...... Renascença, 01/11 a 04/11/2026
 *  - Vendas_Dia_Negocio (7).pdf ...... Holandeses, 01/11 a 04/11/2026
 *  - Vendas_Dia_Negocio.xlsx ......... Holandeses, 01/11 a 23/11/2026
 *  - Vendas_Dia_Negocio (1).xlsx ..... Renascença, 01/11 a 23/11/2026
 *  - Vendas_PLU*.xlsx ................ produtos vendidos por loja (01/11 a 23/11 e 23/11)
 *  - Painel de Desperdício .html ..... desperdício de 27/10 a 02/11/2026 (ver realExtract.json)
 *
 * Código 50033265 ("Franquia PH FCD SÃO LUÍS") = loja Renascença.
 * Código 50033611 ("PH FCD HOLANDESES") = loja Holandeses.
 */

import extract from './realExtract.json'

export const STORE_CODES: Record<string, { code: string; reportName: string }> = {
  'unit-holandeses': { code: '50033611', reportName: 'PH FCD HOLANDESES' },
  'unit-renascenca': { code: '50033265', reportName: 'Franquia PH FCD SÃO LUÍS' },
}

export type Channel = { name: string; tickets: number; gross: number; discount: number; total: number }
export type Payment = { method: string; count: number; total: number; breakdown?: { brand: string; count: number; total: number }[] }

/** Resumo do relatório "Vendas por dia de negócio" de uma loja num período. */
export type SalesReport = {
  unitId: string
  start: string
  end: string
  source: string
  generatedAt: string
  lastSaleAt: string
  gross: number
  discounts: number
  discountCount: number
  invoiced: number
  tickets: number
  tips: number
  storeSales: number
  canceledWithCoupons: { count: number | null; total: number }
  canceledWithoutCoupons: { count: number | null; total: number }
  /** "Pedidos Cancelados" (só existe no PDF). */
  canceledOrders: { count: number; total: number } | null
  /** "iFood Representou" (só existe no PDF). */
  ifoodSharePct: number | null
  payments: Payment[] | null
  /** Delivery · Balcão (Atendimento rápido) · Salão (Serviço de mesa) */
  channels: Channel[]
}

export const SALES_REPORTS: SalesReport[] = [
  // ---------------- 01/11 a 23/11 (planilhas .xlsx) ----------------
  {
    unitId: 'unit-holandeses', start: '2026-11-01', end: '2026-11-23',
    source: 'Vendas_Dia_Negocio.xlsx', generatedAt: '2026-11-24T10:09:45', lastSaleAt: '2026-11-23T23:28:00',
    gross: 424323.01, discounts: 5801.07, discountCount: 556, invoiced: 418521.94, tickets: 3124,
    tips: 21754.7, storeSales: 396767.24,
    canceledWithCoupons: { count: null, total: 695.38 }, canceledWithoutCoupons: { count: null, total: 56.9 },
    canceledOrders: null, ifoodSharePct: null, payments: null,
    channels: [
      { name: 'Delivery', tickets: 1710, gross: 158988.78, discount: 5801.07, total: 153187.71 },
      { name: 'Balcão', tickets: 192, gross: 14727.38, discount: 0, total: 14727.38 },
      { name: 'Salão', tickets: 1222, gross: 250606.85, discount: 0, total: 250606.85 },
    ],
  },
  {
    unitId: 'unit-renascenca', start: '2026-11-01', end: '2026-11-23',
    source: 'Vendas_Dia_Negocio (1).xlsx', generatedAt: '2026-11-24T10:13:05', lastSaleAt: '2026-11-23T22:52:00',
    gross: 156953.2, discounts: 292.4, discountCount: 42, invoiced: 156660.8, tickets: 1704,
    tips: 0, storeSales: 156660.8,
    canceledWithCoupons: { count: null, total: 1038.1 }, canceledWithoutCoupons: { count: null, total: 398.9 },
    canceledOrders: null, ifoodSharePct: null, payments: null,
    channels: [
      { name: 'Delivery', tickets: 1255, gross: 117328.26, discount: 292.4, total: 117035.86 },
      { name: 'Balcão', tickets: 449, gross: 39624.94, discount: 0, total: 39624.94 },
      { name: 'Salão', tickets: 0, gross: 0, discount: 0, total: 0 },
    ],
  },
  // ---------------- 01/11 a 04/11 (PDFs) ----------------
  {
    unitId: 'unit-holandeses', start: '2026-11-01', end: '2026-11-04',
    source: 'Vendas_Dia_Negocio (7).pdf', generatedAt: '2026-11-05T09:15:45', lastSaleAt: '2026-11-04T23:04:00',
    gross: 69077.37, discounts: 1003.65, discountCount: 101, invoiced: 68073.72, tickets: 532,
    tips: 3445.25, storeSales: 64628.47,
    canceledWithCoupons: { count: 0, total: 0 }, canceledWithoutCoupons: { count: 1, total: 56.9 },
    canceledOrders: { count: 92, total: 1753.3 }, ifoodSharePct: 30.65,
    payments: [
      { method: 'iFood', count: 249, total: 20863.27 },
      { method: 'PIX manual', count: 102, total: 13067.51 },
      { method: 'Máquina POS crédito', count: 97, total: 12053.77 },
      { method: 'Máquina POS débito', count: 73, total: 9309.9 },
      { method: 'TEF débito', count: 44, total: 5131.8, breakdown: [
        { brand: 'Mastercard', count: 28, total: 3618.35 }, { brand: 'Visa', count: 15, total: 1461.86 }, { brand: 'Elo', count: 1, total: 51.59 }] },
      { method: 'TEF crédito', count: 35, total: 4270.85, breakdown: [
        { brand: 'Visa', count: 17, total: 2053.33 }, { brand: 'Mastercard', count: 16, total: 1932.4 }, { brand: 'Elo', count: 2, total: 285.12 }] },
      { method: 'Dinheiro', count: 19, total: 1462.52 },
      { method: 'Cupom parceiro', count: 150, total: 1106.88 },
      { method: 'Hanzo Prd', count: 9, total: 807.22 },
    ],
    channels: [
      { name: 'Delivery', tickets: 300, gross: 28472.22, discount: 1003.65, total: 27468.57 },
      { name: 'Balcão', tickets: 24, gross: 1603.4, discount: 0, total: 1603.4 },
      { name: 'Salão', tickets: 208, gross: 39001.75, discount: 0, total: 39001.75 },
    ],
  },
  {
    unitId: 'unit-renascenca', start: '2026-11-01', end: '2026-11-04',
    source: 'Vendas_Dia_Negocio (6).pdf', generatedAt: '2026-11-05T09:14:27', lastSaleAt: '2026-11-04T22:32:00',
    gross: 28946.67, discounts: 53, discountCount: 10, invoiced: 28893.67, tickets: 307,
    tips: 0, storeSales: 28893.67,
    canceledWithCoupons: { count: 2, total: 794.2 }, canceledWithoutCoupons: { count: 0, total: 0 },
    canceledOrders: { count: 9, total: 122.9 }, ifoodSharePct: 66.26,
    payments: [
      { method: 'iFood', count: 221, total: 19146.34 },
      { method: 'Máquina POS crédito', count: 39, total: 3731.3 },
      { method: 'Máquina POS débito', count: 25, total: 2238.8 },
      { method: 'Hanzo Prd', count: 11, total: 1404.28 },
      { method: 'PIX manual', count: 10, total: 1347.7 },
      { method: 'Cupom parceiro', count: 100, total: 1019.75 },
      { method: 'Dinheiro', count: 1, total: 5.5 },
    ],
    channels: [
      { name: 'Delivery', tickets: 248, gross: 23478.67, discount: 53, total: 23425.67 },
      { name: 'Balcão', tickets: 59, gross: 5468, discount: 0, total: 5468 },
      { name: 'Salão', tickets: 0, gross: 0, discount: 0, total: 0 },
    ],
  },
]

/**
 * Outubro/2026 (Power BI de fechamento).
 * Faturamento por dia em R$ mil, como aparece no relatório (arredondado a R$ 100).
 */
export const OCTOBER = {
  source: 'FechaentoOutubro.pdf',
  units: {
    'unit-holandeses': {
      // Faturamento do mês = soma dos 31 dias do gráfico (R$ 491,2 mil), igual à
      // "Projeção Final do Mês" do relatório (R$ 491.298). O número grande do cartão
      // (R$ 526,40 mil = 3.681 tickets × R$ 143,01) é outra medida, ainda a confirmar.
      total: 491298,
      panelValue: 526400,
      averageTicket: 491298 / 3681,
      tickets: 3681,
      projectionShown: 491298,
      dailyThousands: [10.1, 15.1, 26.6, 21.3, 7.9, 12.3, 9.4, 7.4, 17.5, 22.9, 27.3, 32.0, 14.1, 7.8, 11.7, 17.9, 22.9, 26.1, 10.8, 10.5, 10.2, 10.1, 16.5, 28.1, 16.8, 6.3, 11.5, 8.9, 9.7, 16.6, 24.9],
      topProducts: [['GD CALABRESA', 260], ['GD FRANGO REQ', 254], ['GD PEPPERONI', 226], ['MD CALABRESA', 202], ['IND CALABRESA', 185], ['MD PORTUGUESA', 173], ['GD CORN BACON', 160], ['IND FRANGO REQ', 97], ['GD MARGUERITA', 85], ['GD CALABRESA REQ', 83], ['GD PORTUGUESA', 77], ['GD BRASILEIRA', 65], ['IND PEPPERONI', 65], ['MD FRANGO REQ', 56]] as [string, number][],
    },
    'unit-renascenca': {
      // soma dos dias = R$ 200,8 mil; "Projeção Final do Mês" = R$ 201.013
      total: 201013,
      panelValue: 224520,
      // o Power BI não mostra a quantidade de tickets da Renascença;
      // estimada pelo cartão do painel (R$ 224.520 ÷ ticket médio R$ 94,41)
      tickets: Math.round(224520 / 94.41),
      averageTicket: 201013 / Math.round(224520 / 94.41),
      projectionShown: 201013,
      dailyThousands: [3.9, 8.5, 9.2, 14.4, 2.3, 2.7, 4.3, 4.7, 3.1, 8.5, 9.8, 9.4, 3.6, 3.5, 4.5, 7.8, 8.0, 11.8, 6.0, 4.7, 3.9, 3.8, 7.3, 11.1, 14.7, 2.9, 4.3, 4.6, 4.6, 4.9, 8.0],
      topProducts: [['IND CALABRESA', 130], ['GD CALABRESA', 110], ['GD PEPPERONI', 104], ['IND FRANGO REQ', 96], ['IND PEPPERONI', 82], ['GD FRANGO REQ', 66], ['GD CORN BACON', 59], ['IND CALABRESA REQ', 55], ['IND PORTUGUESA', 50], ['IND MARGUERITA', 45], ['IND MUSSARELA', 33], ['IND BRASILEIRA', 29], ['IND PEPPERONI REQ', 27], ['GD MARGUERITA', 26]] as [string, number][],
    },
  } as Record<string, { total: number; panelValue: number; averageTicket: number; tickets: number; projectionShown: number; dailyThousands: number[]; topProducts: [string, number][] }>,
}

/** Ranking de pizzas de 01/11 a 23/11 (planilhas Vendas_PLU). */
export const NOVEMBER_PRODUCTS = extract.produtosNov as Record<string, { nome: string; qtd: number; liquido: number }[]>

/** Desperdício real de 27/10 a 02/11/2026 (96 lançamentos). */
export const REAL_WASTE = extract.desperdicio as {
  unitId: string
  date: string
  shift: string
  type: string
  typeDescription: string
  productCode: string
  productName: string
  reason: string
  quantity: number
  lossCents: number
}[]

/**
 * Arquivos reais recebidos, para o Histórico de importações.
 * "at" = "Gerado em" do próprio relatório; para o desperdício e o Power BI de outubro
 * (que não informam) foi usado o dia seguinte ao fim do período.
 */
export const REAL_FILES = [
  { file: 'Vendas_Dia_Negocio.xlsx', unitId: 'unit-holandeses', type: 'SALES', start: '2026-11-01', end: '2026-11-23', at: '2026-11-24T10:09:45' },
  { file: 'Vendas_PLU (1).xlsx', unitId: 'unit-holandeses', type: 'PRODUCTS', start: '2026-11-01', end: '2026-11-23', at: '2026-11-24T10:09:05' },
  { file: 'Vendas_PLU.xlsx', unitId: 'unit-holandeses', type: 'PRODUCTS', start: '2026-11-23', end: '2026-11-23', at: '2026-11-24T10:08:21' },
  { file: 'Vendas_Dia_Negocio (1).xlsx', unitId: 'unit-renascenca', type: 'SALES', start: '2026-11-01', end: '2026-11-23', at: '2026-11-24T10:13:05' },
  { file: 'Vendas_PLU (2).xlsx', unitId: 'unit-renascenca', type: 'PRODUCTS', start: '2026-11-01', end: '2026-11-23', at: '2026-11-24T10:11:45' },
  { file: 'Vendas_PLU (3).xlsx', unitId: 'unit-renascenca', type: 'PRODUCTS', start: '2026-11-23', end: '2026-11-23', at: '2026-11-24T10:12:21' },
  { file: 'Vendas_Dia_Negocio (7).pdf', unitId: 'unit-holandeses', type: 'SALES', start: '2026-11-01', end: '2026-11-04', at: '2026-11-05T09:15:45' },
  { file: 'Vendas_Dia_Negocio (6).pdf', unitId: 'unit-renascenca', type: 'SALES', start: '2026-11-01', end: '2026-11-04', at: '2026-11-05T09:14:27' },
  { file: 'Painel de Desperdício por Loja — 27_10 a 02_11_2026.html', unitId: null, type: 'WASTE', start: '2026-10-27', end: '2026-11-02', at: '2026-11-03T08:30:00' },
  { file: 'FechaentoOutubro.pdf', unitId: null, type: 'OTHER', start: '2026-10-01', end: '2026-10-31', at: '2026-11-01T09:00:00' },
] as const

/** Última importação = relatório mais recente gerado. */
export const LAST_IMPORT_AT = '2026-11-24T10:13:05'
