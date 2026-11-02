import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { useAuth } from '../features/auth/context/auth-context'
import { useTenant } from '../features/tenants/context/tenant-context'
import { initials } from '../lib/format'

export function PlatformLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, logout } = useAuth()
  const { tenants } = useTenant()

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

  return (
    <div className="app-shell platform-shell">
      {mobileOpen && <button className="sidebar-overlay" aria-label="Fermer le menu" onClick={() => setMobileOpen(false)} />}
      <aside id="platform-navigation" className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand"><span>BSRM</span><strong>Administration</strong><button type="button" className="sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Fermer le menu">×</button></div>
        <div className="platform-identity"><span>Gestion générale</span><strong>Toutes les entreprises</strong></div>
        <nav className="sidebar-nav" aria-label="Navigation de l’administration">
          <span className="nav-label">Administration</span>
          <NavLink to="/platform" end onClick={() => setMobileOpen(false)} className={({ isActive }) => isActive ? 'nav-item nav-active' : 'nav-item'}>
            <span className="nav-index" aria-hidden="true">01</span>Entreprises
          </NavLink>
          {tenants.length > 0 && <><span className="nav-label nav-label-spaced">Mon activité</span><Link className="nav-item" to="/app/tenants"><span className="nav-index" aria-hidden="true">02</span>Mes entreprises</Link></>}
        </nav>
        <div className="sidebar-footer">
          <span className="avatar">{user ? initials(user.first_name, user.last_name) : '-'}</span>
          <div><strong>{user ? `${user.first_name} ${user.last_name}` : 'Compte'}</strong><span>{user?.email}</span></div>
          <ThemeToggle />
          <button type="button" onClick={() => void logout()}>Quitter</button>
        </div>
      </aside>
      <div className="app-main">
        <header className="mobile-header">
          <button type="button" className="menu-button" onClick={() => setMobileOpen(true)} aria-label="Ouvrir le menu" aria-controls="platform-navigation" aria-expanded={mobileOpen}>Menu</button>
          <div className="mobile-shell-brand"><strong>BSRM Administration</strong></div>
          <span className="avatar">{user ? initials(user.first_name, user.last_name) : '-'}</span>
        </header>
        <div className="app-content"><Outlet /></div>
      </div>
    </div>
  )
}
