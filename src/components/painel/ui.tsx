import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { FlaskConical } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * Componentes visuais copiados do projeto Lovable (src/components/painel/ui.tsx
 * e aviso-ficticio.tsx), para as telas terem exatamente o mesmo visual.
 */

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

export type EstadoMeta = 'dentro' | 'fora' | 'neutro'

export function Farol({ estado }: { estado: EstadoMeta }) {
  const txt = estado === 'dentro' ? 'Dentro da meta' : estado === 'fora' ? 'Fora da meta' : 'Sem meta definida'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium',
        estado === 'dentro' && 'border-success/40 bg-success/10 text-success',
        estado === 'fora' && 'border-destructive/40 bg-destructive/10 text-destructive',
        estado === 'neutro' && 'border-border text-muted-foreground',
      )}
    >
      <span className={cn('h-2 w-2 rounded-full', estado === 'dentro' ? 'bg-success' : estado === 'fora' ? 'bg-destructive' : 'bg-muted-foreground')} />
      {txt}
    </span>
  )
}

/** Etiqueta "dados de exemplo". */
export function SeloExemplo() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
      Dados de exemplo
    </span>
  )
}

/** Etiqueta "dados reais" (relatórios enviados pelas lojas). */
export function SeloReal() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
      Dados reais
    </span>
  )
}

export function AvisoFicticio() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
      <FlaskConical className="h-4 w-4 shrink-0" />
      Dados fictícios para validação do MVP. Serão trocados pelos relatórios reais.
    </div>
  )
}

export function Kpi({ titulo, valor, detalhe, cor, exemplo, children }: {
  titulo: string
  valor: string
  detalhe?: ReactNode
  cor?: string
  exemplo?: boolean
  children?: ReactNode
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        {cor && <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: cor }} />}
        <p className="truncate text-sm text-muted-foreground">{titulo}</p>
        {exemplo && <SeloExemplo />}
      </div>
      <p className="num mt-2 text-3xl font-semibold text-card-foreground">{valor}</p>
      {detalhe && <div className="mt-2 text-xs text-muted-foreground">{detalhe}</div>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  )
}

export function Painel({ titulo, subtitulo, children, className, exemplo }: {
  titulo: string
  subtitulo?: string
  children: ReactNode
  className?: string
  exemplo?: boolean
}) {
  return (
    <section className={cn('min-w-0 rounded-lg border border-border bg-card p-5', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold">{titulo}</h2>
        {exemplo && <SeloExemplo />}
      </div>
      {subtitulo && <p className="mt-0.5 text-xs text-muted-foreground">{subtitulo}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

export function Vazio({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  )
}

export const tooltipStyle = {
  contentStyle: { background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--popover-foreground)' },
  itemStyle: { color: 'var(--popover-foreground)' },
  labelStyle: { color: 'var(--muted-foreground)' },
}

export function Rosca({ dados, formatar }: {
  dados: { nome: string; valor: number; cor: string }[]
  formatar: (v: number) => string
}) {
  const total = dados.reduce((s, d) => s + d.valor, 0)
  const pct = (v: number) => (total ? `${((v / total) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : '0%')
  // ordena do maior para o menor; o anel tem tamanho fixo e a legenda fica numa lista,
  // para nomes longos (ex.: "Erro operacional / contaminação") não encolherem o gráfico
  const visiveis = dados.filter((d) => d.valor > 0).sort((a, b) => b.valor - a.valor).slice(0, 6)
  if (!visiveis.length) return <Vazio>Sem dados para este filtro.</Vazio>
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={visiveis} dataKey="valor" nameKey="nome" innerRadius="62%" outerRadius="98%" paddingAngle={2} stroke="var(--card)" isAnimationActive={false}>
              {visiveis.map((d) => <Cell key={d.nome} fill={d.cor} />)}
            </Pie>
            <Tooltip {...tooltipStyle} formatter={(v, n) => [`${formatar(Number(v))} (${pct(Number(v))})`, n]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-2.5">
        {visiveis.map((d) => (
          <li key={d.nome} className="flex items-center gap-2.5 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: d.cor }} />
            <span className="min-w-0 flex-1 truncate" title={d.nome}>{d.nome}</span>
            <span className="num shrink-0 text-muted-foreground">{formatar(d.valor)}</span>
            <span className="num w-12 shrink-0 text-right font-semibold">{pct(d.valor)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Título de página no padrão do Lovable. */
export function TituloPagina({ titulo, subtitulo, exemplo, children }: {
  titulo: string
  subtitulo?: ReactNode
  exemplo?: boolean
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        {exemplo && <SeloExemplo />}
        {children}
      </div>
      {subtitulo && <p className="text-sm text-muted-foreground">{subtitulo}</p>}
    </div>
  )
}
