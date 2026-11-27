import { useState } from 'react'
import { CalendarDays, ChartNoAxesCombined } from 'lucide-react'
import ProductionCalendar from '../components/planning/ProductionCalendar'
import DailySalesHistory from '../components/operations/DailySalesHistory'
import DemandAnalysis from '../components/operations/DemandAnalysis'

type OperationTab = 'planning' | 'data'

/**
 * @author Gabriel
 * @example
 * <OperationsDashboard />
 */
export default function OperationsDashboard() {
  const [activeTab, setActiveTab] = useState<OperationTab>('planning')

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
          Operação
        </h2>

        <p className="mt-1 text-xs leading-5 text-gray-500">
          Planejamento da produção e acompanhamento das vendas diárias.
        </p>
      </div>

      <div role="tablist" aria-label="Seções da operação"
        className="mb-6 flex w-full max-w-md gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
        <button id="tab-planning" type="button" role="tab"
          aria-selected={activeTab === 'planning'} aria-controls="panel-planning"
          onClick={() => setActiveTab('planning')}
          className={['flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-3 text-xs font-semibold transition',
            activeTab === 'planning'
              ? 'bg-hut-card text-hut-red shadow-sm' : 'text-gray-500 hover:text-gray-800',
          ].join(' ')}>
          <CalendarDays size={16} />
          Planejamento
        </button>

        <button id="tab-data" type="button" role="tab"
          aria-selected={activeTab === 'data'} aria-controls="panel-data"
          onClick={() => setActiveTab('data')}
          className={[ 'flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-3 text-xs font-semibold transition',
            activeTab === 'data'
              ? 'bg-hut-card text-hut-red shadow-sm' : 'text-gray-500 hover:text-gray-800',
          ].join(' ')}>
          <ChartNoAxesCombined size={16} />
          Dados diários
        </button>
      </div>

      <section id="panel-planning" role="tabpanel" aria-labelledby="tab-planning" hidden={activeTab !== 'planning'}>
        {activeTab === 'planning' && <ProductionCalendar />}
      </section>

      <section id="panel-data" role="tabpanel" aria-labelledby="tab-data" hidden={activeTab !== 'data'} className="space-y-6">
        {activeTab === 'data' && (
          <>
            <DailySalesHistory />
            <DemandAnalysis />
          </>
        )}
      </section>
    </div>
  )
}
