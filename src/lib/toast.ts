import { getErrorMessage } from './errors'

export type ToastKind = 'success' | 'error' | 'info'
export type ToastMessage = { id: string; message: string; kind: ToastKind }
type Listener = (toast: ToastMessage) => void

const listeners = new Set<Listener>()

export function emitToast(message: string, kind: ToastKind = 'info') {
  const toast = { id: crypto.randomUUID(), message, kind }
  listeners.forEach((listener) => listener(toast))
}

export const toastSuccess = (message: string) => emitToast(message, 'success')
export const toastError = (error: unknown, fallback?: string) => emitToast(getErrorMessage(error, fallback), 'error')

export function subscribeToToasts(listener: Listener) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
