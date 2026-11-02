import { useEffect } from 'react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import clsx from 'clsx'
import type { AppointmentStatus } from '../../features/appointments/types'
import type { TimeOffStatus } from '../../features/employees/types'
import { weekdays } from '../../lib/format'

export function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  loading?: boolean
}) {
  return (
    <button className={clsx('button', `button-${variant}`, `button-${size}`, className)} disabled={disabled || loading} {...props}>
      {loading && <span className="mini-spinner" aria-hidden="true" />}
      {children}
    </button>
  )
}

export function Field({ label, error, hint, children, className }: { label: string; error?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={clsx('field', className)}>
      <span className="field-label">{label}</span>
      {children}
      {error ? <span className="field-error">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  )
}

export function FieldGroup({ label, error, hint, children, className }: { label: string; error?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={clsx('field', className)} role="group" aria-label={label}>
      <span className="field-label">{label}</span>
      {children}
      {error ? <span className="field-error">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </div>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx('input', props.className)} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={clsx('input select', props.className)} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={clsx('input textarea', props.className)} />
}

export function WeekdayCheckboxes({ value, onChange, disabled }: { value: number[]; onChange: (value: number[]) => void; disabled?: boolean }) {
  const toggle = (weekday: number) => {
    onChange(value.includes(weekday) ? value.filter((item) => item !== weekday) : [...value, weekday].sort())
  }

  return (
    <div className="weekday-check-grid">
      {weekdays.map((day, index) => (
        <label key={day} className={clsx('weekday-check', value.includes(index) && 'weekday-check-active')}>
          <input type="checkbox" checked={value.includes(index)} disabled={disabled} onChange={() => toggle(index)} />
          <span>{day.slice(0, 3)}</span>
        </label>
      ))}
    </div>
  )
}

export function Modal({ open, title, description, onClose, children, size = 'md' }: {
  open: boolean; title: string; description?: string; onClose: () => void; children: ReactNode; size?: 'sm' | 'md' | 'lg'
}) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="modal-root" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <button className="modal-backdrop" onClick={onClose} aria-label="Fermer" />
      <div className={clsx('modal-panel', `modal-${size}`)}>
        <header className="modal-header">
          <div>
            <h2 id="modal-title">{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Fermer">×</button>
        </header>
        <div className="modal-content">{children}</div>
      </div>
    </div>
  )
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmer', danger = false, loading, onClose, onConfirm }: {
  open: boolean; title: string; message: string; confirmLabel?: string; danger?: boolean; loading?: boolean; onClose: () => void; onConfirm: () => void
}) {
  return (
    <Modal open={open} title={title} onClose={onClose} size="sm">
      <p className="confirm-message">{message}</p>
      <div className="modal-actions">
        <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
        <Button type="button" variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  )
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="page-actions">{action}</div>}
    </div>
  )
}

export function LoadingState({ label = 'Chargement…' }: { label?: string }) {
  return <div className="state-card"><span className="spinner" /><p>{label}</p></div>
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="state-card empty-state">
      <h3>{title}</h3><p>{description}</p>{action}
    </div>
  )
}

const statusLabels: Record<AppointmentStatus | TimeOffStatus, string> = {
  pending: 'En attente', confirmed: 'Confirmé', completed: 'Terminé', cancelled: 'Annulé', no_show: 'Absent', approved: 'Approuvé', rejected: 'Refusé',
}

export function StatusBadge({ status }: { status: AppointmentStatus | TimeOffStatus }) {
  return <span className={clsx('status-badge', `status-${status}`)}>{statusLabels[status]}</span>
}

export function Pagination({ page, pageSize, total, onPageChange }: { page: number; pageSize: number; total: number; onPageChange: (page: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1) return null
  return (
    <div className="pagination">
      <span>Page {page} sur {totalPages}</span>
      <div>
        <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>← Précédent</Button>
        <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Suivant →</Button>
      </div>
    </div>
  )
}

export function Avatar({ initials, color }: { initials: string; color?: string | null }) {
  const paletteColor = color && ['#4B4452', '#9470BA', '#8074C8'].includes(color.toUpperCase()) ? color : undefined
  return <span className="avatar" style={paletteColor ? { backgroundColor: paletteColor } : undefined}>{initials}</span>
}
