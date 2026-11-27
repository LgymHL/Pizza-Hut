import { usePeriodAndUnits, unitColor } from '../components/demo/DemoUi'
import { AvisoFicticio, Farol, Painel } from '../components/painel/ui'
import { loadGoals, seloForUnit } from '../demo/data'

const n = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })

/** Selo Super (iFood): mesma estrutura da tela do Lovable. */
export default function SeloSuper() {
  const { startDate, endDate, units } = usePeriodAndUnits()
  const goals = loadGoals()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Selo Super (iFood)</h1>
      <AvisoFicticio />
      <div className="grid gap-4 lg:grid-cols-2">
        {units.map((unit) => {
          const d = seloForUnit(unit.id, startDate, endDate)
          const itens = [
            { t: 'Avaliação média', v: n(d.rating), meta: `acima de ${n(goals.ratingMin)}`, ok: d.rating >= goals.ratingMin },
            { t: 'Taxa de acordos', v: `${n(d.agreementsPct)}%`, meta: `abaixo de ${n(goals.agreementsMaxPct)}%`, ok: d.agreementsPct <= goals.agreementsMaxPct },
            { t: 'Cancelamento', v: `${n(d.cancellationPct)}%`, meta: `abaixo de ${n(goals.cancellationMaxPct)}%`, ok: d.cancellationPct <= goals.cancellationMaxPct },
          ]
          const selo = itens.every((i) => i.ok)
          return (
            <Painel key={unit.id} titulo={unit.name} subtitulo={`${d.reviews.toLocaleString('pt-BR')} avaliações no período`}>
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: unitColor(unit.id) }} />
                {selo ? 'Cumpre os critérios do Selo Super' : 'Não cumpre todos os critérios do Selo Super'}
              </div>
              <ul className="space-y-2">
                {itens.map((i) => (
                  <li key={i.t} className="flex items-center justify-between gap-3 rounded-md bg-muted/50 px-3 py-2.5">
                    <div>
                      <p className="text-sm text-muted-foreground">{i.t}</p>
                      <p className="num text-xl font-semibold">{i.v}</p>
                      <p className="text-xs text-muted-foreground">Meta: {i.meta}</p>
                    </div>
                    <Farol estado={i.ok ? 'dentro' : 'fora'} />
                  </li>
                ))}
              </ul>
            </Painel>
          )
        })}
      </div>
    </div>
  )
}
