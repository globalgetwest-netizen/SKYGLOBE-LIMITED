import { api } from '@/lib/api'
import type { Case } from '@/types'

export const casesService = {
  list: () => api.get<Case[]>('/cases'),
  get: (id: string) => api.get<Case>(`/cases/${id}`),
  track: (reference: string) => api.get<Case>(`/cases/track/${reference}`),
  create: (data: Partial<Case>) => api.post<Case>('/cases', data),
}
