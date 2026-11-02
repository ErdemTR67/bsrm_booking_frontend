import { QueryCache, QueryClient } from '@tanstack/react-query'
import { toastError } from './toast'

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (!query.meta?.silentError) toastError(error, 'Impossible de charger les données.')
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        const status = typeof error === 'object' && error && 'status' in error ? Number(error.status) : 0
        return status >= 400 && status < 500 ? false : failureCount < 2
      },
      refetchOnWindowFocus: false,
    },
  },
})
