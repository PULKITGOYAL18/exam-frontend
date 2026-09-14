// src/App.tsx

import type { User, UserRole, Screen } from '@/types'

import { getSavedUser } from '@/services/auth'
import { getDashboardScreen } from '@/utils'
import { useAuth, useNavigation } from '@/hooks'
import { DASHBOARD_SCREEN_ROLE_MAP } from '@/constants'

import Login from '@/modules/auth/login/Login'
import ForgotPassword from '@/modules/auth/forgot-password/ForgotPassword'
import ResetPassword from '@/modules/auth/reset-password/ResetPassword'
import AccountActivation from '@/modules/auth/account-activation/AccountActivation'
import UserProfile from '@/modules/auth/profile/UserProfile'
import EditProfile from '@/modules/auth/edit-profile/EditProfile'
import ChangePassword from '@/modules/auth/change-password/ChangePassword'
import { SessionExpired } from '@/modules/auth/session-expired'
import { UnauthorizedAccess } from '@/modules/auth/unauthorized'

import FacultyDashboard from '@/modules/faculty/dashboard/FacultyDashboard'
import HODDashboard from '@/modules/hod/dashboard/HODDashboard'
import DeanDashboard from '@/modules/dean/dashboard/DeanDashboard'
import AdminDashboard from '@/modules/admin/dashboard/AdminDashboard'

import AdminUserManagement from '@/modules/admin/user-management/AdminUserManagement'

import OCRWorkflow from '@/modules/ocr/OCRWorkflow'
import AnswerKeyManager from '@/modules/answer-key/AnswerKeyManager'


export default function App() {
  const {
    screen,
    previousScreen,
    navigate,
  } = useNavigation('login')

  const {
    currentUser,
    setUser,
    logout,
    saveProfile,
  } = useAuth()


  /*
   * ============================================================
   * LOGIN SUCCESS
   * ============================================================
   *
   * Login.tsx already:
   *
   * 1. Calls Flask backend
   * 2. Receives JWT
   * 3. Saves JWT
   * 4. Saves user in localStorage
   * 5. Calls onSuccess(user.role)
   *
   * Therefore App.tsx retrieves the authenticated user
   * that Login.tsx has already saved.
   */

  const handleLoginSuccess = (role: UserRole) => {
    const savedUser = getSavedUser()

    if (!savedUser) {
      console.error(
        'Login succeeded but authenticated user was not found in localStorage.'
      )

      navigate('login')
      return
    }

    // Put authenticated backend user into React state.
    setUser(savedUser)

    // Navigate according to the actual backend role.
    switch (role) {
      case 'Faculty':
        navigate('dashboard-faculty')
        break

      case 'HOD':
        navigate('dashboard-hod')
        break

      case 'Dean':
        navigate('dashboard-dean')
        break

      case 'Admin':
        navigate('dashboard-admin')
        break

      default:
        console.error('Unknown user role:', role)
        navigate('unauthorized')
    }
  }


  /*
   * ============================================================
   * LOGOUT
   * ============================================================
   */

  const handleLogout = () => {
    logout()
    navigate('login')
  }


  /*
   * ============================================================
   * SAVE PROFILE
   * ============================================================
   */

  const handleSaveProfile = (
    updates: Partial<User>
  ) => {
    saveProfile(updates)
  }


  /*
   * ============================================================
   * DASHBOARD SCREEN FOR CURRENT USER
   * ============================================================
   */

  const getDashboardScreenForUser = (): Screen => {
    if (!currentUser) {
      return 'login'
    }

    return getDashboardScreen(
      currentUser.role
    ) as Screen
  }


  /*
   * ============================================================
   * LOGIN SCREEN
   * ============================================================
   */

  if (screen === 'login') {
    return (
      <Login
        onSuccess={handleLoginSuccess}

        onForgotPassword={() =>
          navigate('forgot-password')
        }

        onActivateAccount={() =>
          navigate('account-activation')
        }

        onSessionExpired={() =>
          navigate('session-expired')
        }
      />
    )
  }


  /*
   * ============================================================
   * FORGOT PASSWORD
   * ============================================================
   */

  if (screen === 'forgot-password') {
    return (
      <ForgotPassword
        onBack={() =>
          navigate('login')
        }
      />
    )
  }


  /*
   * ============================================================
   * RESET PASSWORD
   * ============================================================
   */

  if (screen === 'reset-password') {
    return (
      <ResetPassword
        onBackToLogin={() =>
          navigate('login')
        }
      />
    )
  }


  /*
   * ============================================================
   * ACCOUNT ACTIVATION
   * ============================================================
   */

  if (screen === 'account-activation') {
    return (
      <AccountActivation
        onBackToLogin={() =>
          navigate('login')
        }
      />
    )
  }


  /*
   * ============================================================
   * SESSION EXPIRED
   * ============================================================
   */

  if (screen === 'session-expired') {
    return (
      <SessionExpired
        onReturnToLogin={() =>
          navigate('login')
        }
      />
    )
  }


  /*
   * ============================================================
   * UNAUTHORIZED
   * ============================================================
   */

  if (screen === 'unauthorized') {
    return (
      <UnauthorizedAccess
        onReturnToDashboard={() =>
          navigate(
            getDashboardScreenForUser()
          )
        }

        onGoBack={() =>
          navigate(previousScreen)
        }

        userRole={currentUser?.role}
      />
    )
  }


  /*
   * ============================================================
   * AUTHENTICATION GUARD
   * ============================================================
   *
   * Every screen below this point requires
   * an authenticated user.
   */

  if (!currentUser) {
    return (
      <Login
        onSuccess={handleLoginSuccess}

        onForgotPassword={() =>
          navigate('forgot-password')
        }

        onActivateAccount={() =>
          navigate('account-activation')
        }

        onSessionExpired={() =>
          navigate('session-expired')
        }
      />
    )
  }


  /*
   * ============================================================
   * USER PROFILE
   * ============================================================
   */

  if (screen === 'profile') {
    return (
      <UserProfile
        user={currentUser}
        onNavigate={navigate}
        onLogout={handleLogout}
      />
    )
  }


  /*
   * ============================================================
   * EDIT PROFILE
   * ============================================================
   */

  if (screen === 'edit-profile') {
    return (
      <EditProfile
        user={currentUser}

        onSave={handleSaveProfile}

        onCancel={() =>
          navigate('profile')
        }

        onNavigate={navigate}

        onLogout={handleLogout}
      />
    )
  }


  /*
   * ============================================================
   * CHANGE PASSWORD
   * ============================================================
   */

  if (screen === 'change-password') {
    return (
      <ChangePassword
        user={currentUser}

        onNavigate={navigate}

        onLogout={handleLogout}

        onBack={() =>
          navigate('profile')
        }
      />
    )
  }


  /*
   * ============================================================
   * ANSWER KEY MANAGEMENT
   * ============================================================
   */

  if (
    screen === 'answer-key-create' ||
    screen === 'answer-key-list'
  ) {
    return (
      <AnswerKeyManager
        user={currentUser}
        onNavigate={navigate}
        onLogout={handleLogout}
        initialScreen={
          screen === 'answer-key-list'
            ? 'list'
            : 'create'
        }
      />
    )
  }


  /*
   * ============================================================
   * OCR WORKFLOW
   * ============================================================
   *
   * OCRWorkflow requires `user`.
   */

  if (screen === 'ocr-workflow') {
    return (
      <OCRWorkflow
        user={currentUser}
        onNavigate={navigate}
        onLogout={handleLogout}
      />
    )
  }


  /*
   * ============================================================
   * ADMIN USER MANAGEMENT
   * ============================================================
   *
   * AdminUserManagement expects:
   *
   *     user={currentUser}
   *
   * NOT:
   *
   *     currentUser={currentUser}
   */

  if (
    screen === 'admin-users' ||
    screen === 'admin-create-user'
  ) {
    return (
      <AdminUserManagement
        user={currentUser}
        onNavigate={navigate}
        onLogout={handleLogout}
      />
    )
  }


  /*
   * ============================================================
   * ROLE-SPECIFIC DASHBOARDS
   * ============================================================
   */

  if (
    screen in DASHBOARD_SCREEN_ROLE_MAP
  ) {
    const viewRole =
      DASHBOARD_SCREEN_ROLE_MAP[screen]


    /*
     * ==========================================================
     * SECURITY CHECK
     * ==========================================================
     *
     * A logged-in user should only access
     * their own role dashboard.
     */

    if (
      viewRole !== currentUser.role
    ) {
      return (
        <UnauthorizedAccess
          onReturnToDashboard={() =>
            navigate(
              getDashboardScreenForUser()
            )
          }

          onGoBack={() =>
            navigate(previousScreen)
          }

          userRole={currentUser.role}
        />
      )
    }


    /*
     * ==========================================================
     * COMMON DASHBOARD PROPS
     * ==========================================================
     */

    const dashProps = {
      user: currentUser,
      onNavigate: navigate,
      onLogout: handleLogout,
    }


    /*
     * ==========================================================
     * FACULTY
     * ==========================================================
     */

    if (
      screen === 'dashboard-faculty'
    ) {
      return (
        <FacultyDashboard
          {...dashProps}
        />
      )
    }


    /*
     * ==========================================================
     * HOD
     * ==========================================================
     */

    if (
      screen === 'dashboard-hod'
    ) {
      return (
        <HODDashboard
          {...dashProps}
        />
      )
    }


    /*
     * ==========================================================
     * DEAN
     * ==========================================================
     */

    if (
      screen === 'dashboard-dean'
    ) {
      return (
        <DeanDashboard
          {...dashProps}
        />
      )
    }


    /*
     * ==========================================================
     * ADMIN
     * ==========================================================
     */

    if (
      screen === 'dashboard-admin'
    ) {
      return (
        <AdminDashboard
          {...dashProps}
        />
      )
    }
  }


  /*
   * ============================================================
   * FINAL FALLBACK
   * ============================================================
   */

  return (
    <Login
      onSuccess={handleLoginSuccess}

      onForgotPassword={() =>
        navigate('forgot-password')
      }

      onActivateAccount={() =>
        navigate('account-activation')
      }

      onSessionExpired={() =>
        navigate('session-expired')
      }
    />
  )
}