export type { User } from './index'

export interface UserProfile {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
  nationality?: string
  role: 'client' | 'admin' | 'staff'
  createdAt: string
  updatedAt: string
}

export interface AuthCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  user: UserProfile
  token: string
  refreshToken: string
}
