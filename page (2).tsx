'use client'
import { useAuthStore } from '@/store/auth.store'
import { authService } from '@/services/auth.service'

export function useAuth() {
  const { user, isAuthenticated, login, logout } = useAuthStore()

  async function signIn(email: string, password: string) {
    const { user: u } = await authService.login(email, password)
    login(u)
  }

  async function signOut() {
    await authService.logout()
    logout()
  }

  return { user, isAuthenticated, signIn, signOut }
}
