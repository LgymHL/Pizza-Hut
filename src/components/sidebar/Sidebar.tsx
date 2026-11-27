import { NavLink } from 'react-router-dom'
import {
  BarChart3, CalendarDays, Clock, History, Package, Settings, Star, Target, Trash2, TrendingUp, Upload, Users,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import BrandLogo from '../brand/BrandLogo'
import { cn } from '../painel/ui'
import { lastImportLabel } from '../../demo/data'

/**
 * Menu: os seis itens do Lovable primeiro (mesma ordem, nomes e ícones),
 * depois as telas que vieram do Pizza Hut BI.
 */
export const MENU = [
  { path: '/', label: 'Visão geral', short: 'Geral', icon: BarChart3 },
  { path: '/entrega', label: 'Entrega e produção', short: 'Entrega', icon: Clock },
  { path: '/desperdicios', label: 'Desperdício', short: 'Perdas', icon: Trash2 },
  { path: '/selo-super', label: 'Selo Super (iFood)', short: 'iFood', icon: Star },
  { path: '/metas', label: 'Metas', short: 'Metas', icon: Target, generalManagerOnly: true },
  { path: '/importacao', label: 'Importar dados', short: 'Importar', icon: Upload, generalManagerOnly: true },
  { path: '/vendas', label: 'Vendas', short: 'Vendas', icon: TrendingUp, group: 'mais' },
  { path: '/produtos', label: 'Produtos', short: 'Produtos', icon: Package, group: 'mais' },
  { path: '/operacao', label: 'Planejamento', short: 'Agenda', icon: CalendarDays, group: 'mais' },
  { path: '/historico', label: 'Histórico de importações', short: 'Histórico', icon: History, group: 'mais' },
  { path: '/usuarios', label: 'Usuários', short: 'Usuários', icon: Users, generalManagerOnly: true, group: 'mais' },
  { path: '/configuracoes', label: 'Configurações', short: 'Ajustes', icon: Settings, group: 'mais' },
] as const

type MenuItem = (typeof MENU)[number]

export function useVisibleMenu(): MenuItem[] {
  const { user } = useAuth()
  const isGeneralManager = user?.role === 'GENERAL_MANAGER'
  return MENU.filter((item) => !('generalManagerOnly' in item) || isGeneralManager)
}

function Item({ item }: { item: MenuItem }) {
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-sidebar-primary text-sidebar-primary-foreground'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {item.label}
    </NavLink>
  )
}

export default function Sidebar() {
  const items = useVisibleMenu()
  const main = items.filter((i) => !('group' in i))
  const more = items.filter((i) => 'group' in i)

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex items-center gap-3 px-5 py-5">
        <BrandLogo className="h-9 w-auto" />
        <div className="min-w-0 leading-tight">
          <p className="text-sm font-semibold text-sidebar-accent-foreground">Gestão à vista</p>
          <p className="text-xs text-muted-foreground">São Luís · MA</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
        {main.map((m) => <Item key={m.path} item={m} />)}

        <p className="mt-4 px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Mais análises
        </p>
        {more.map((m) => <Item key={m.path} item={m} />)}
      </nav>

      <div className="border-t border-sidebar-border px-5 py-4 text-xs text-muted-foreground">
        Última importação
        <p className="num mt-1 text-sm text-sidebar-accent-foreground">{lastImportLabel()}</p>
      </div>
    </aside>
  )
}
