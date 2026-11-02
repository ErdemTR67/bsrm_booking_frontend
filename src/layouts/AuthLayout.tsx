import type { ReactNode } from 'react'
import { ThemeToggle } from '../components/ui/ThemeToggle'

type AuthLayoutProps = {
  kicker: string
  title: string
  description: string
  visualFooter: ReactNode
  children: ReactNode
  wide?: boolean
}

export function AuthLayout({ kicker, title, description, visualFooter, children, wide = false }: AuthLayoutProps) {
  return (
    <main className="auth-layout">
      <section className="auth-visual">
        <div className="brand-lockup"><span>BSRM Booking</span></div>
        <div className="auth-message">
          <span className="auth-kicker">{kicker}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {visualFooter}
      </section>
      <section className="auth-form-side">
        <ThemeToggle className="auth-theme-toggle" />
        <div className={`auth-card${wide ? ' auth-card-wide' : ''}`}>
          <div className="mobile-brand"><span>BSRM Booking</span></div>
          {children}
        </div>
      </section>
    </main>
  )
}
