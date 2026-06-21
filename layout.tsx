import { api } from '@/lib/api'
import type { Payment } from '@/types'

export const paymentsService = {
  list: () => api.get<Payment[]>('/payments'),
  get: (id: string) => api.get<Payment>(`/payments/${id}`),
  initiate: (data: { amount: number; currency: string; caseId?: string }) =>
    api.post<{ paymentUrl: string; reference: string }>('/payments', data),
}
