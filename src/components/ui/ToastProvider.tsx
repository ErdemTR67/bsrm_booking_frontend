import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { subscribeToToasts } from '../../lib/toast'
import type { ToastMessage } from '../../lib/toast'

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const activeMessages = useRef(new Set<string>())

  const dismiss = useCallback((toast: ToastMessage) => {
    const timer = timers.current.get(toast.id)
    if (timer) clearTimeout(timer)
    timers.current.delete(toast.id)
    activeMessages.current.delete(`${toast.kind}:${toast.message}`)
    setToasts((current) => current.filter((item) => item.id !== toast.id))
  }, [])

  useEffect(() => subscribeToToasts((toast) => {
    const key = `${toast.kind}:${toast.message}`
    if (activeMessages.current.has(key)) return
    activeMessages.current.add(key)
    setToasts((current) => [...current, toast])
    timers.current.set(toast.id, setTimeout(() => dismiss(toast), 5000))
  }), [dismiss])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  return (
    <>
      {children}
      <div className="toast-region" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.kind}`} role={toast.kind === 'error' ? 'alert' : 'status'}>
            <span className="toast-mark" aria-hidden="true">{toast.kind === 'success' ? '✓' : toast.kind === 'error' ? '!' : 'i'}</span>
            <span>{toast.message}</span>
            <button type="button" onClick={() => dismiss(toast)} aria-label="Fermer la notification">×</button>
          </div>
        ))}
      </div>
    </>
  )
}
