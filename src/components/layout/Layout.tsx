import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Ellipsis, X } from 'lucide-react'
import Sidebar, { MENU, useVisibleMenu } from '../sidebar/Sidebar'
import Header from '../header/Header'
import BrandLogo from '../brand/BrandLogo'
import { cn } from '../painel/ui'
import { lastImportLabel } from '../../demo/data'

/** No celular, a barra de baixo mostra só estes itens; o resto fica em "Mais". */
const MOBILE_MAIN = ['/', '/entrega', '/desperdicios', '/selo-super']

/** Estrutura da página igual ao app-shell do Lovable. */
export default function Layout() {
  const items = useVisibleMenu()
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)

  const main = items.filter((m) => MOBILE_MAIN.includes(m.path))
  const more = items.filter((m) => !MOBILE_MAIN.includes(m.path))
  const moreActive = more.some((m) => location.pathname === m.path)

  // fecha a gaveta ao trocar de página
  useEffect(() => setMoreOpen(false), [location.pathname])

  return (
    <div className="min-h-screen w-full">
      <Sidebar />

      <div className="pb-20 lg:pb-0 lg:pl-60">
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex items-center justify-between gap-3 px-4 pt-3 lg:hidden">
            <BrandLogo className="h-7 w-auto" />
            <p className="text-right text-xs text-muted-foreground">
              Última importação <span className="num block text-foreground">{lastImportLabel()}</span>
            </p>
          </div>
          <Header />
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      {/* Gaveta "Mais" (celular) */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMoreOpen(false)}>
          <div
            role="dialog"
            aria-label="Mais telas"
            className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-sidebar-border bg-sidebar px-4 pb-24 pt-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-sidebar-accent-foreground">Mais telas</p>
              <button type="button" onClick={() => setMoreOpen(false)} aria-label="Fechar" className="cursor-pointer rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {more.map((m) => (
                <NavLink
                  key={m.path}
                  to={m.path}
                  className={({ isActive }) =>
                    cn(
                      'flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-center text-xs font-medium',
                      isActive ? 'border-primary bg-primary text-primary-foreground' : 'border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent',
                    )}
                >
                  <m.icon className="h-5 w-5" />
                  {m.label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-sidebar-border bg-sidebar lg:hidden">
        {main.map((m) => (
          <NavLink
            key={m.path}
            to={m.path}
            end={m.path === '/'}
            className={({ isActive }) =>
              cn('flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium', isActive && !moreOpen ? 'text-primary' : 'text-sidebar-foreground')}
          >
            <m.icon className="h-5 w-5" />
            {m.short}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          aria-expanded={moreOpen}
          className={cn('flex cursor-pointer flex-col items-center gap-1 py-2.5 text-[11px] font-medium', moreOpen || moreActive ? 'text-primary' : 'text-sidebar-foreground')}
        >
          <Ellipsis className="h-5 w-5" />
          Mais
        </button>
      </nav>
    </div>
  )
}

export { MENU }
