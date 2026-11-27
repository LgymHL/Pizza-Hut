import { useMemo } from 'react'
import { DayBars } from '../components/charts/DayBars'
import { unitColor, usePeriodAndUnits } from '../components/demo/DemoUi'
import { AvisoFicticio, Farol, Kpi, Painel } from '../components/painel/ui'
import { deliveryForUnit, loadGoals } from '../demo/data'

const min = (v: number) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} min`
const pct = (v: number) => `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`

/** Entrega e produção: mesma estrutura da tela do Lovable. */
export default function DeliveryDashboard() {
  const { startDate, endDate, units } = usePeriodAndUnits()
  const meta = loadGoals().motoboyMaxMin

  const rows = useMemo(
    () => units.map((unit) => deliveryForUnit(unit.id, startDate, endDate)),
    [units, startDate, endDate],
  )

  const porDia = useMemo(() => {
    const map = new Map<string, Record<string, number | string>>()
    for (const row of rows) {
      for (const day of row.daily) {
        const item = map.get(day.date) ?? { dia: `${day.date.slice(8, 10)}/${day.date.slice(5, 7)}` }
        item[row.unitName] = day.motoboyMin
        map.set(day.date, item)
      }
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v)
  }, [rows])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Entrega e produção</h1>
      <AvisoFicticio />
      {rows.map((d) => {
        const cor = unitColor(d.unitId)
        return (
          <div key={d.unitId} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi titulo={`Tempo do motoboy · ${d.unitName}`} valor={min(d.motoboyMin)} cor={cor} detalhe={`Meta até ${meta} min`}>
              <Farol estado={d.motoboyMin <= meta ? 'dentro' : 'fora'} />
            </Kpi>
            <Kpi titulo="Produção" valor={min(d.productionMin)} cor={cor} detalhe="Do pedido até a pizza pronta" />
            <Kpi titulo="Tempo total" valor={min(d.totalMin)} cor={cor} detalhe={`Espera no balcão: ${min(d.counterWaitMin)}`} />
            <Kpi titulo="Entregas atrasadas" valor={pct(d.deliveries ? d.lateDeliveries / d.deliveries : 0)} cor={cor}
              detalhe={`${d.lateDeliveries.toLocaleString('pt-BR')} de ${d.deliveries.toLocaleString('pt-BR')} entregas`} />
          </div>
        )
      })}
      <Painel titulo="Tempo do motoboy por dia" subtitulo={`Em minutos · linha da meta em ${meta} min`}>
        <DayBars
          data={porDia}
          series={rows.map((r) => ({ key: r.unitName, name: r.unitName, color: unitColor(r.unitId) }))}
          format={min}
          yWidth={30}
          reference={{ y: meta, label: `meta: até ${meta} min` }}
        />
      </Painel>
    </div>
  )
}
