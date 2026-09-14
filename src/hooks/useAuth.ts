
// src/hooks/useAuth.ts

import { useState } from 'react'
import type { User } from '@/types'
import {
  login as apiLogin,
  getSavedUser,
  clearAuth,
} from '@/services/auth'

export function useAuth() {
  /*
   * ============================================================
   * RESTORE USER IMMEDIATELY
   * ============================================================
   *
   * When the browser refreshes, React state is recreated.
   *
   * Instead of starting with:
   *
   *   null
   *
   * and waiting for useEffect, directly restore the
   * authenticated user from localStorage.
   */
  const [currentUser, setCurrentUser] = useState<User | null>(
    () => getSavedUser()
  )

  /*
   * User restoration is synchronous now, so there is no
   * restoration loading state required here.
   */
  const loading = false

  /*
   * ============================================================
   * SET USER
   * ============================================================
   *
   * Used by App.tsx after Login.tsx successfully authenticates.
   *
   * Also persist the user so browser refresh does NOT log
   * the user out.
   */
  const setUser = (user: User) => {
    setCurrentUser(user)

    try {
      localStorage.setItem(
        'exam_evaluate_user',
        JSON.stringify(user)
      )
    } catch (error) {
      console.error(
        'Unable to save authenticated user:',
        error
      )
    }
  }

  /*
   * ============================================================
   * LOGIN
   * ============================================================
   */
  const login = async (
    email: string,
    password: string
  ) => {
    try {
      const result = await apiLogin(
        email,
        password
      )

      setUser(result.user)

      return {
        success: true,
        user: result.user,
      }
    } catch (error: any) {
      return {
        success: false,
        error:
          error?.message ||
          'Login failed.',
      }
    }
  }

  /*
   * ============================================================
   * LOGOUT
   * ============================================================
   *
   * Explicit logout clears:
   * - JWT/token
   * - saved user
   * - React authentication state
   */
  const logout = () => {
    clearAuth()
    setCurrentUser(null)
  }

  /*
   * ============================================================
   * SAVE PROFILE
   * ============================================================
   */
  const saveProfile = (
    updates: Partial<User>
  ) => {
    if (!currentUser) {
      return
    }

    const updatedUser = {
      ...currentUser,
      ...updates,
    }

    setCurrentUser(updatedUser)

    try {
      localStorage.setItem(
        'exam_evaluate_user',
        JSON.stringify(updatedUser)
      )
    } catch (error) {
      console.error(
        'Unable to save updated user:',
        error
      )
    }
  }

  return {
    currentUser,
    loading,
    setUser,
    login,
    logout,
    saveProfile,
  }
}
