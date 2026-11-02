import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { useAuth } from '../features/auth/context/auth-context'
import { usePlatform } from '../features/platform/context/platform-context'
import { SetupStatusBanner } from '../features/setup/components/SetupStatusBanner'
import { useTenant } from '../features/tenants/context/tenant-context'
import { initials } from '../lib/format'

const navigation = [
  { to: '/app', label: 'Vue d’ensemble', end: true },
  { to: '/app/appointments', label: 'Rendez-vous' },
  { to: '/app/availability', label: 'Nouvelle réservation' },
  { to: '/app/customers', label: 'Clients' },
  { to: '/app/employees', label: 'Équipe' },
  { to: '/app/services', label: 'Prestations' },
  { to: '/app/locations', label: 'Établissements' },
  { to: '/app/schedule', label: 'Horaires & fermetures' },
  { to: '/app/booking-site', label: 'Site de réservation' },
]

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, logout } = useAuth()
  const { tenants, selectedTenant, selectTenant } = useTenant()
  const { access: platformAccess } = usePlatform()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!mobileOpen) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMobileOpen(false) }
    document.addEventListener('keydown', closeOnEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  const changeTenant = (tenantId: string) => {
    selectTenant(tenantId || null)
    if (tenantId) navigate('/app')
  }

  return (
    <div className="app-shell">
      {mobileOpen && <button className="sidebar-overlay" aria-label="Fermer le menu" onClick={() => setMobileOpen(false)} />}
      <aside id="business-navigation" className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand"><span>BSRM</span><strong>Booking</strong><button type="button" className="sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Fermer le menu">×</button></div>
        <div className="tenant-switcher">
          <span>Espace actif</span>
          <select value={selectedTenant?.id ?? ''} onChange={(event) => changeTenant(event.target.value)}>
            <option value="">Choisir un espace</option>
            {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
          </select>
        </div>
        <nav className="sidebar-nav" aria-label="Navigation principale">
          <span className="nav-label">Menu</span>
          {navigation.map((item, index) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => isActive ? 'nav-item nav-active' : 'nav-item'}
            >
              <span className="nav-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>{item.label}
            </NavLink>
          ))}
          <span className="nav-label nav-label-spaced">Organisation</span>
          <NavLink to="/app/tenants" onClick={() => setMobileOpen(false)} className={({ isActive }) => isActive ? 'nav-item nav-active' : 'nav-item'}>
            <span className="nav-index" aria-hidden="true">10</span>Entreprises
          </NavLink>
          {platformAccess === 'granted' && <NavLink to="/platform" onClick={() => setMobileOpen(false)} className="nav-item"><span className="nav-index" aria-hidden="true">A</span>Administration</NavLink>}
        </nav>
        <div className="sidebar-footer">
          <span className="avatar">{user ? initials(user.first_name, user.last_name) : '-'}</span>
          <div><strong>{user ? `${user.first_name} ${user.last_name}` : 'Compte'}</strong><span>{user?.email}</span></div>
          <ThemeToggle />
          <button type="button" onClick={() => void logout()} title="Se déconnecter">Quitter</button>
        </div>
      </aside>
      <div className="app-main">
        <header className="mobile-header">
          <button type="button" className="menu-button" onClick={() => setMobileOpen(true)} aria-label="Ouvrir le menu" aria-controls="business-navigation" aria-expanded={mobileOpen}>Menu</button>
          <div className="mobile-shell-brand"><strong>BSRM Booking</strong></div>
          <span className="avatar">{user ? initials(user.first_name, user.last_name) : '-'}</span>
        </header>
        {!selectedTenant && location.pathname !== '/app/tenants' && (
          <div className="tenant-notice">Sélectionnez une entreprise à laquelle votre compte a accès.</div>
        )}
        {selectedTenant && <SetupStatusBanner />}
        <div className="app-content"><Outlet /></div>
      </div>
    </div>
  )
}
