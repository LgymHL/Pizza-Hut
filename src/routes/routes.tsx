import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import Overview from '../pages/Overview'
import ImportData from '../pages/ImportData'
import ImportHistory from '../pages/ImportHistory'
import WasteDashboard from '../pages/WasteDashboard'
import SalesDashboard from '../pages/SalesDashboard'
import ProductsDashboard from '../pages/ProductsDashboard'
import OperationsDashboard from '../pages/OperationsDashboard'
import Settings from '../pages/Settings'
import UserManagement from '../pages/UserManagement'
import SeloSuper from '../pages/SeloSuper'
import DeliveryDashboard from '../pages/DeliveryDashboard'
import Goals from '../pages/Goals'
import GeneralManagerRoute from './guards/GeneralManagerRoute'

/**
 * Versão de demonstração: sem tela de login nem convite.
 * O perfil é escolhido no cabeçalho.
 */
export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Overview />} />
        <Route path="vendas" element={<SalesDashboard />} />
        <Route path="selo-super" element={<SeloSuper />} />
        <Route path="entrega" element={<DeliveryDashboard />} />
        <Route path="operacao" element={<OperationsDashboard />} />
        <Route path="desperdicios" element={<WasteDashboard />} />
        <Route path="produtos" element={<ProductsDashboard />} />

        <Route element={<GeneralManagerRoute />}>
          <Route path="metas" element={<Goals />} />
          <Route path="importacao" element={<ImportData />} />
          <Route path="usuarios" element={<UserManagement />} />
        </Route>

        <Route path="historico" element={<ImportHistory />} />
        <Route path="configuracoes" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
