import { lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from '../features/auth/context/auth-context'
import { usePlatform } from '../features/platform/context/platform-context'
import { useTenant } from '../features/tenants/context/tenant-context'
import { LoadingState } from '../components/ui'

const AdminLayout = lazy(() => import('../layouts/AdminLayout').then((module) => ({ default: module.AdminLayout })))
const PlatformLayout = lazy(() => import('../layouts/PlatformLayout').then((module) => ({ default: module.PlatformLayout })))
const LoginPage = lazy(() => import('../features/auth/pages/LoginPage').then((module) => ({ default: module.LoginPage })))
const AcceptInvitationPage = lazy(() => import('../features/auth/pages/AcceptInvitationPage').then((module) => ({ default: module.AcceptInvitationPage })))
const DashboardPage = lazy(() => import('../features/dashboard/pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const TenantsPage = lazy(() => import('../features/tenants/pages/TenantsPage').then((module) => ({ default: module.TenantsPage })))
const LocationsPage = lazy(() => import('../features/locations/pages/LocationsPage').then((module) => ({ default: module.LocationsPage })))
const EmployeesPage = lazy(() => import('../features/employees/pages/EmployeesPage').then((module) => ({ default: module.EmployeesPage })))
const EmployeeDetailPage = lazy(() => import('../features/employees/pages/EmployeeDetailPage').then((module) => ({ default: module.EmployeeDetailPage })))
const ServicesPage = lazy(() => import('../features/services/pages/ServicesPage').then((module) => ({ default: module.ServicesPage })))
const CustomersPage = lazy(() => import('../features/customers/pages/CustomersPage').then((module) => ({ default: module.CustomersPage })))
const SchedulePage = lazy(() => import('../features/schedule/pages/SchedulePage').then((module) => ({ default: module.SchedulePage })))
const AvailabilityPage = lazy(() => import('../features/appointments/pages/AvailabilityPage').then((module) => ({ default: module.AvailabilityPage })))
const AppointmentsPage = lazy(() => import('../features/appointments/pages/AppointmentsPage').then((module) => ({ default: module.AppointmentsPage })))
const BookingSitePage = lazy(() => import('../features/booking-site/pages/BookingSitePage').then((module) => ({ default: module.BookingSitePage })))
const PlatformTenantsPage = lazy(() => import('../features/platform/pages/PlatformTenantsPage').then((module) => ({ default: module.PlatformTenantsPage })))
const PlatformTenantDetailPage = lazy(() => import('../features/platform/pages/PlatformTenantDetailPage').then((module) => ({ default: module.PlatformTenantDetailPage })))

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'initializing') return <div className="fullscreen-state"><LoadingState label="Restauration de votre session…" /></div>
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

function TenantRequired({ children }: { children: ReactNode }) {
  const { selectedTenant, isLoading } = useTenant()
  if (isLoading) return <LoadingState label="Chargement de votre espace…" />
  if (!selectedTenant) return <Navigate to="/app/tenants" replace />
  return children
}

function PlatformRequired({ children }: { children: ReactNode }) {
  const { access, refreshTenants } = usePlatform()
  if (access === 'checking') return <div className="fullscreen-state"><LoadingState label="Vérification de vos droits d’administration…" /></div>
  if (access === 'denied') return <Navigate to="/app/tenants" replace />
  if (access === 'error') return <div className="fullscreen-state"><div className="state-card empty-state"><h3>Administration temporairement indisponible</h3><p>La vérification de vos droits n’a pas pu aboutir.</p><button className="button button-secondary button-md" onClick={() => void refreshTenants()}>Réessayer</button></div></div>
  return children
}

function AuthenticatedLanding() {
  const { access, refreshTenants } = usePlatform()
  const { tenants, selectedTenant, isLoading } = useTenant()
  if (access === 'checking' || isLoading || (tenants.length === 1 && !selectedTenant)) return <div className="fullscreen-state"><LoadingState label="Préparation de votre espace…" /></div>
  if (access === 'error') return <div className="fullscreen-state"><div className="state-card empty-state"><h3>Service temporairement indisponible</h3><p>La vérification de vos accès n’a pas pu aboutir.</p><button className="button button-secondary button-md" onClick={() => void refreshTenants()}>Réessayer</button></div></div>
  if (access === 'granted') return <Navigate to="/platform" replace />
  if (selectedTenant) return <Navigate to="/app" replace />
  return <Navigate to="/app/tenants" replace />
}

export function AppRouter() {
  return (
    <Suspense fallback={<div className="fullscreen-state"><LoadingState label="Chargement de l’interface…" /></div>}><Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route path="/app" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
        <Route index element={<TenantRequired><DashboardPage /></TenantRequired>} />
        <Route path="tenants" element={<TenantsPage />} />
        <Route path="locations" element={<TenantRequired><LocationsPage /></TenantRequired>} />
        <Route path="employees" element={<TenantRequired><EmployeesPage /></TenantRequired>} />
        <Route path="employees/:employeeId" element={<TenantRequired><EmployeeDetailPage /></TenantRequired>} />
        <Route path="services" element={<TenantRequired><ServicesPage /></TenantRequired>} />
        <Route path="customers" element={<TenantRequired><CustomersPage /></TenantRequired>} />
        <Route path="schedule" element={<TenantRequired><SchedulePage /></TenantRequired>} />
        <Route path="availability" element={<TenantRequired><AvailabilityPage /></TenantRequired>} />
        <Route path="appointments" element={<TenantRequired><AppointmentsPage /></TenantRequired>} />
        <Route path="booking-site" element={<TenantRequired><BookingSitePage /></TenantRequired>} />
      </Route>
      <Route path="/platform" element={<ProtectedRoute><PlatformRequired><PlatformLayout /></PlatformRequired></ProtectedRoute>}>
        <Route index element={<PlatformTenantsPage />} />
        <Route path="tenants/:tenantId" element={<PlatformTenantDetailPage />} />
      </Route>
      <Route path="/" element={<ProtectedRoute><AuthenticatedLanding /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes></Suspense>
  )
}
