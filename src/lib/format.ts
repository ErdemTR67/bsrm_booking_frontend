export const weekdays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

export function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function nextAvailableSlug(value: string, existingSlugs: string[], fallback = 'element') {
  const base = slugify(value) || fallback
  const existing = new Set(existingSlugs.map((slug) => slug.toLowerCase()))
  if (!existing.has(base)) return base
  let suffix = 2
  while (existing.has(`${base}-${suffix}`)) suffix += 1
  return `${base}-${suffix}`
}

export function getBrowserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Brussels'
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('fr-BE', {
    weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value))
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-BE', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(value))
}

export function formatTime(value: string) {
  if (value.includes('T')) return new Intl.DateTimeFormat('fr-BE', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
  return value.slice(0, 5)
}

export function formatMoney(cents: number | null, currency = 'EUR') {
  if (cents === null) return 'Sur devis'
  return new Intl.NumberFormat('fr-BE', { style: 'currency', currency }).format(cents / 100)
}

export function toApiDateTime(value: string) {
  return new Date(value).toISOString()
}

export function toLocalDateTime(value: string) {
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()
}
