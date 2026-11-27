import { useState, type FormEvent } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Painel } from '../components/painel/ui'
import { loadGoals, saveGoals } from '../demo/data'

type Campo = { chave: keyof FormState; label: string; unidade: string; nota?: string }
type FormState = { hol: string; ren: string; rating: string; cancel: string; agreements: string; motoboy: string; waste: string; cmvMin: string; cmvMax: string }

/** Mesmos grupos e textos da tela Metas do Lovable. */
const GRUPOS: { titulo: string; subtitulo?: string; campos: Campo[] }[] = [
  {
    titulo: 'Faturamento mensal',
    subtitulo: 'As metas alimentam os faróis de todas as telas.',
    campos: [
      { chave: 'hol', label: 'Holandeses', unidade: 'R$', nota: 'Usada na Visão geral: acumulado do mês e projeção até o fim do mês.' },
      { chave: 'ren', label: 'Renascença', unidade: 'R$', nota: 'Usada na Visão geral: acumulado do mês e projeção até o fim do mês.' },
    ],
  },
  {
    titulo: 'Selo Super',
    subtitulo: 'Critérios do selo do iFood. Usados na tela Selo Super e nos alertas da Visão geral.',
    campos: [
      { chave: 'rating', label: 'Avaliação iFood (mínimo)', unidade: 'nota de 0 a 5' },
      { chave: 'cancel', label: 'Cancelamento (máximo)', unidade: '% (0 a 100)' },
      { chave: 'agreements', label: 'Acordos (máximo)', unidade: '% (0 a 100)' },
    ],
  },
  {
    titulo: 'Operação',
    campos: [{ chave: 'motoboy', label: 'Tempo do motoboy (máximo)', unidade: 'minutos', nota: 'Usada em Entrega e produção (linha da meta) e nos alertas.' }],
  },
  {
    titulo: 'CMV (custo da mercadoria vendida)',
    subtitulo: 'Faixa exigida pela franquia, em % das vendas faturadas. Usada no quadro de CMV da Visão geral.',
    campos: [
      { chave: 'cmvMin', label: 'CMV mínimo', unidade: '% (0 a 100)' },
      { chave: 'cmvMax', label: 'CMV máximo', unidade: '% (0 a 100)' },
    ],
  },
  {
    titulo: 'Desperdício',
    campos: [{ chave: 'waste', label: 'Desperdício semanal por loja (máximo, opcional)', unidade: 'R$', nota: 'Usada na tela Desperdício e nos alertas (média por semana). Valor sugerido: confirmar com o cliente. Deixe em branco para não comparar.' }],
  },
]

const fmtNum = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2, useGrouping: false })

function initial(): FormState {
  const g = loadGoals()
  return {
    hol: fmtNum(g.revenue['unit-holandeses'] ?? 0),
    ren: fmtNum(g.revenue['unit-renascenca'] ?? 0),
    rating: fmtNum(g.ratingMin),
    cancel: fmtNum(g.cancellationMaxPct),
    agreements: fmtNum(g.agreementsMaxPct),
    motoboy: fmtNum(g.motoboyMaxMin),
    waste: g.weeklyWasteMax === null ? '' : fmtNum(g.weeklyWasteMax),
    cmvMin: fmtNum(g.cmvMinPct),
    cmvMax: fmtNum(g.cmvMaxPct),
  }
}

export default function Goals() {
  const [form, setForm] = useState<FormState>(initial)
  const [updatedAt, setUpdatedAt] = useState(() => loadGoals().updatedAt)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [saved, setSaved] = useState(false)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const n = (v: string) => Number(v.trim().replace(/\./g, '').replace(',', '.'))
    const next: typeof errors = {}
    const check = (k: keyof FormState, max?: number) => {
      const v = n(form[k])
      if (form[k].trim() === '' || !Number.isFinite(v) || v < 0) next[k] = 'Informe um número maior ou igual a zero.'
      else if (max !== undefined && v > max) next[k] = `O valor máximo é ${max}.`
    }
    check('hol'); check('ren'); check('rating', 5); check('cancel', 100); check('agreements', 100); check('motoboy'); check('cmvMin', 100); check('cmvMax', 100)
    if (!next.cmvMin && !next.cmvMax && n(form.cmvMin) > n(form.cmvMax)) next.cmvMax = 'O máximo precisa ser maior que o mínimo.'
    if (form.waste.trim() !== '' && (!Number.isFinite(n(form.waste)) || n(form.waste) < 0)) next.waste = 'Informe um número ou deixe em branco.'
    setErrors(next)
    if (Object.keys(next).length) return

    const value = saveGoals({
      revenue: { 'unit-holandeses': n(form.hol), 'unit-renascenca': n(form.ren) },
      ratingMin: n(form.rating),
      cancellationMaxPct: n(form.cancel),
      agreementsMaxPct: n(form.agreements),
      motoboyMaxMin: n(form.motoboy),
      weeklyWasteMax: form.waste.trim() === '' ? null : n(form.waste),
      cmvMinPct: n(form.cmvMin),
      cmvMaxPct: n(form.cmvMax),
      updatedAt: null,
    })
    setUpdatedAt(value.updatedAt)
    setSaved(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Metas</h1>
        <p className="text-sm text-muted-foreground">
          {updatedAt
            ? `Última atualização: ${new Date(updatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`
            : 'Metas ainda não salvas'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {GRUPOS.map((g) => (
          <Painel key={g.titulo} titulo={g.titulo} {...(g.subtitulo ? { subtitulo: g.subtitulo } : {})}>
            <div className="grid gap-4 sm:grid-cols-2">
              {g.campos.map((c) => {
                const msg = errors[c.chave]
                const id = `meta-${c.chave}`
                return (
                  <div key={c.chave} className="space-y-1.5 text-sm">
                    <label htmlFor={id} className="text-muted-foreground">{c.label}</label>
                    <div className={`flex items-center rounded-md border bg-background focus-within:ring-2 focus-within:ring-ring ${msg ? 'border-destructive' : 'border-input'}`}>
                      <input
                        id={id}
                        inputMode="decimal"
                        autoComplete="off"
                        aria-invalid={!!msg}
                        value={form[c.chave]}
                        onChange={(e) => { setForm((f) => ({ ...f, [c.chave]: e.target.value })); setSaved(false) }}
                        className="num w-full bg-transparent px-3 py-2 outline-none"
                      />
                      <span className="whitespace-nowrap px-3 text-xs text-muted-foreground">{c.unidade}</span>
                    </div>
                    {c.nota && !msg && <p className="text-xs text-muted-foreground">{c.nota}</p>}
                    {msg && <p role="alert" className="text-xs text-destructive">{msg}</p>}
                  </div>
                )
              })}
            </div>
          </Painel>
        ))}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Salvar metas
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" /> Metas salvas
            </span>
          )}
        </div>
      </form>
    </div>
  )
}
