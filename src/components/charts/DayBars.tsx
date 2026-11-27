import { useEffect, useRef, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts'

export type DaySeries = { key: string; name: string; color: string }

/** O aparelho não tem mouse (celular/tablet)? */
function useTouch() {
  const [touch, setTouch] = useState(() => typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(hover: none)')
    const on = () => setTouch(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return touch
}

// medidas do gráfico (precisam bater com as áreas de toque por cima dele)
const TOP = 8
const RIGHT = 8
const X_AXIS_HEIGHT = 30

/**
 * Gráfico de barras por dia que funciona bem no celular:
 * - cada dia tem largura mínima (as barras não ficam finas); se não couber, o gráfico rola para o lado
 *   e já abre no dia mais recente;
 * - por cima de cada dia há uma área de toque invisível (a coluna inteira, não só a barra):
 *   tocar, clicar ou passar o mouse mostra os valores numa faixa fixa embaixo do gráfico,
 *   sem balão flutuante que cobre a tela.
 */
export function DayBars({ data, series, format, height = 280, reference, yWidth = 44, yFormat }: {
  data: Record<string, string | number>[] // cada linha: { dia: 'dd/mm', <key>: valor, ... }
  series: DaySeries[]
  format: (v: number) => string
  height?: number
  reference?: { y: number; label: string; color?: string }
  yWidth?: number
  yFormat?: (v: number) => string
}) {
  const touch = useTouch()
  const [sel, setSel] = useState<number>(data.length - 1)
  const scroller = useRef<HTMLDivElement>(null)

  // abre no dia mais recente: seleciona o último e rola o gráfico até o fim
  useEffect(() => {
    setSel(data.length - 1)
    const el = scroller.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [data.length])

  if (!data.length) return null
  const idx = Math.min(Math.max(sel, 0), data.length - 1)
  const atual = data[idx]
  // largura mínima por dia: ~22 px por barra + folga
  const minWidth = data.length * Math.max(34, series.length * 22 + 14) + yWidth + RIGHT

  return (
    <div>
      <div ref={scroller} className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="relative" style={{ minWidth, height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: 0, right: RIGHT, top: TOP, bottom: 0 }} accessibilityLayer={false}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="dia" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} interval={0} height={X_AXIS_HEIGHT} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={yWidth} tickFormatter={yFormat} />
              {reference && <ReferenceLine y={reference.y} stroke={reference.color ?? 'var(--destructive)'} strokeDasharray="4 4" />}
              {series.map((s) => (
                <Bar key={s.key} dataKey={s.key} name={s.key} fill={s.color} radius={[3, 3, 0, 0]} isAnimationActive={false}>
                  {/* o dia escolhido fica forte; os outros, um pouco apagados */}
                  {data.map((_, i) => <Cell key={i} fillOpacity={i === idx ? 1 : 0.5} />)}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>

          {/* áreas de toque: uma coluna por dia, alinhada às faixas do gráfico */}
          <div className="absolute flex" style={{ left: yWidth, right: RIGHT, top: 0, bottom: 0 }}>
            {data.map((d, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Ver o dia ${String(d.dia)}`}
                aria-pressed={i === idx}
                onClick={() => setSel(i)}
                onMouseEnter={touch ? undefined : () => setSel(i)}
                className={`flex-1 cursor-pointer rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
                  i === idx ? 'bg-foreground/[0.06]' : ''
                }`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Faixa fixa com os valores do dia escolhido */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-lg bg-muted/50 px-3 py-2.5 text-sm" aria-live="polite">
        <span className="font-semibold">{String(atual.dia)}</span>
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            <span className="text-muted-foreground">{s.name}</span>
            <span className="num font-semibold">{atual[s.key] == null ? '—' : format(Number(atual[s.key]))}</span>
          </span>
        ))}
        {reference && <span className="text-xs text-muted-foreground">{reference.label}</span>}
        <span className="ml-auto text-xs text-muted-foreground">{touch ? 'Toque num dia para ver os valores' : 'Passe o mouse ou clique num dia'}</span>
      </div>
    </div>
  )
}
