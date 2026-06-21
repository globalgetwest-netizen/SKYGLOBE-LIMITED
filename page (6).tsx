import { api } from '@/lib/api'
import type { User } from '@/types'

export const authService = {
  login: (email: string, password: string) =>
    api.post<{ user: User; token: string }>('/auth/login', { email, password }),
  logout: () => api.post<void>('/auth/logout', {}),
  me: () => api.get<User>('/auth/me'),
  register: (data: { name: string; email: string; password: string }) =>
    api.post<{ user: User; token: string }>('/auth/register', data),
}
