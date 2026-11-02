export function parseAllowedOrigins(value: string) {
  return [...new Set(value.split(/[,\n]/).map((origin) => origin.trim()).filter(Boolean))]
}

export function isValidHttpOrigin(value: string) {
  try {
    const url = new URL(value)
    return (url.protocol === 'http:' || url.protocol === 'https:')
      && url.username === ''
      && url.password === ''
      && url.pathname === '/'
      && url.search === ''
      && url.hash === ''
      && !value.includes('*')
  } catch {
    return false
  }
}
