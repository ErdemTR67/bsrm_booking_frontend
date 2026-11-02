export type ApiValidationDetail = { location: Array<string | number>; message: string; type: string }
export type ApiErrorPayload = { code: string; message: string; details?: ApiValidationDetail[] }
export type PageResponse<T> = { items: T[]; page: number; page_size: number; total: number }
