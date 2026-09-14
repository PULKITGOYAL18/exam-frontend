import { AuthLayout } from '@/layouts'
import { useState } from 'react'
import {
  Button,
  Input,
  PasswordInput,
  Alert,
  ShieldIcon,
} from '@/components/common'
import type { UserRole } from '@/types'
import {
  login,
  saveToken,
  saveUser,
} from '@/services/auth'

type LoginState =
  | 'default'
  | 'validation-error'
  | 'invalid-credentials'
  | 'loading'
  | 'success'
  | 'account-locked'
  | 'account-disabled'
  | 'session-expired'
  | 'network-error'

interface LoginProps {
  onSuccess: (role: UserRole) => void
  onForgotPassword: () => void
  onActivateAccount?: () => void
  onSessionExpired?: () => void
  initialState?: LoginState
}

export default function Login({
  onSuccess,
  onForgotPassword,
  onActivateAccount,
  onSessionExpired,
  initialState = 'default',
}: LoginProps) {
  const [loginState, setLoginState] =
    useState<LoginState>(initialState)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [rememberMe, setRememberMe] =
    useState(false)

  const [emailError, setEmailError] =
    useState('')

  const [passwordError, setPasswordError] =
    useState('')

  const validate = () => {
    let valid = true

    setEmailError('')
    setPasswordError('')

    if (!email.trim()) {
      setEmailError(
        'Email or username is required'
      )
      valid = false
    } else if (
      !email.includes('@') &&
      email.trim().length < 3
    ) {
      setEmailError(
        'Enter a valid email or username'
      )
      valid = false
    }

    if (!password) {
      setPasswordError(
        'Password is required'
      )
      valid = false
    } else if (password.length < 8) {
      setPasswordError(
        'Password must be at least 8 characters'
      )
      valid = false
    }

    return valid
  }

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault()

    if (!validate()) {
      setLoginState('validation-error')
      return
    }

    setLoginState('loading')

    try {
      /*
       * Call Flask backend.
       *
       * POST:
       * http://127.0.0.1:5000/api/auth/login
       */
      const result = await login(
        email.trim(),
        password
      )

      /*
       * Save JWT token.
       */
      saveToken(result.token)

      /*
       * Save user information.
       */
      saveUser(result.user)

      /*
       * Remember me:
       *
       * The authentication token is already saved.
       * This flag is kept here so we can later
       * implement persistent/session-only behavior.
       */
      if (rememberMe) {
        localStorage.setItem(
          'exam_evaluate_remember_me',
          'true'
        )
      } else {
        localStorage.removeItem(
          'exam_evaluate_remember_me'
        )
      }

      /*
       * Authentication succeeded.
       */
      setLoginState('success')

      /*
       * Use the ACTUAL role returned by MongoDB.
       *
       * No more demoRole.
       */
      setTimeout(() => {
        onSuccess(result.user.role)
      }, 500)

    } catch (error: any) {
      console.error(
        'Login error:',
        error
      )

      const message =
        error?.message || ''

      /*
       * Backend/account errors.
       */
      if (
        message
          .toLowerCase()
          .includes('locked')
      ) {
        setLoginState(
          'account-locked'
        )
        return
      }

      if (
        message
          .toLowerCase()
          .includes('inactive') ||
        message
          .toLowerCase()
          .includes('disabled')
      ) {
        setLoginState(
          'account-disabled'
        )
        return
      }

      /*
       * Invalid email/password.
       */
      if (
        message
          .toLowerCase()
          .includes(
            'invalid email or password'
          )
      ) {
        setLoginState(
          'invalid-credentials'
        )
        return
      }

      /*
       * Everything else is treated as a
       * network/server error.
       */
      setLoginState(
        'network-error'
      )
    }
  }

  const isBusy =
    loginState === 'loading' ||
    loginState === 'success'

  return (
    <AuthLayout>
      <div className="space-y-6 animate-fade-in">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
            Sign in to your account
          </h1>

          <p className="text-sm text-[#475569] mt-1.5">
            Access the secure examination evaluation
            portal. Authorized personnel only.
          </p>
        </div>

        {/* Session expired */}
        {loginState === 'session-expired' && (
          <Alert
            variant="warning"
            title="Session Expired"
            message="Your session has timed out due to inactivity. Please sign in again to continue."
          />
        )}

        {/* Invalid credentials */}
        {loginState === 'invalid-credentials' && (
          <Alert
            variant="error"
            title="Invalid Credentials"
            message="The email or password you entered is incorrect. Please check your credentials and try again."
          />
        )}

        {/* Account locked */}
        {loginState === 'account-locked' && (
          <Alert
            variant="error"
            title="Account Locked"
            message="Your account has been locked after multiple failed login attempts. Contact your administrator to unlock it."
          />
        )}

        {/* Account disabled */}
        {loginState === 'account-disabled' && (
          <Alert
            variant="error"
            title="Account Disabled"
            message="Your account has been disabled. Please contact your system administrator for assistance."
          />
        )}

        {/* Network/server error */}
        {loginState === 'network-error' && (
          <Alert
            variant="error"
            title="Connection Error"
            message="Unable to reach the authentication server. Make sure the Flask backend is running and try again."
          />
        )}

        {/* Success */}
        {loginState === 'success' && (
          <Alert
            variant="success"
            title="Signing In…"
            message="Authentication successful. Redirecting to your dashboard…"
          />
        )}

        {/* Login Form */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="space-y-4"
        >

          <Input
            label="University Email / Username"
            type="email"
            placeholder="you@university.edu"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setEmailError('')
            }}
            error={emailError}
            required
            autoComplete="email"
            leftIcon={<MailInputIcon />}
            disabled={isBusy}
          />

          <PasswordInput
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setPasswordError('')
            }}
            error={passwordError}
            required
            autoComplete="current-password"
            disabled={isBusy}
          />

          {/* Remember + Forgot password */}
          <div className="flex items-center justify-between">

            <label className="flex items-center gap-2 cursor-pointer group">

              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) =>
                  setRememberMe(
                    e.target.checked
                  )
                }
                disabled={isBusy}
                className="w-4 h-4 rounded border-[#E2E8F0] text-[#1B3A6B] focus:ring-[#3B5DE8]"
              />

              <span className="text-sm text-[#475569] group-hover:text-[#0F172A] transition-colors">
                Remember me
              </span>

            </label>

            <button
              type="button"
              onClick={onForgotPassword}
              disabled={isBusy}
              className="text-sm text-[#3B5DE8] hover:text-[#1B3A6B] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B5DE8] rounded"
            >
              Forgot password?
            </button>

          </div>

          {/* Submit */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loginState === 'loading'}
            disabled={loginState === 'success'}
          >
            {loginState === 'loading'
              ? 'Signing In…'
              : loginState === 'success'
                ? 'Redirecting…'
                : 'Sign In'}
          </Button>

        </form>

        {/* Security notice */}
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#EEF4FF] border border-[#BACFFB]">

          <ShieldIcon size={14} />

          <p className="text-xs text-[#1B3A6B]">
            <strong>
              Secure System Notice:
            </strong>{' '}
            This is a restricted examination
            management system. All access is logged
            and monitored. Unauthorized access is
            strictly prohibited.
          </p>

        </div>

        {/* Development information */}
        <div className="border-t border-[#E2E8F0] pt-4">

          <p className="text-xs text-[#94A3B8]">
            Authentication is handled securely by
            the ExamEvaluate backend.
          </p>

          <p className="text-xs text-[#94A3B8] mt-1">
            Your account role and permissions are
            determined by the server.
          </p>

        </div>

        {/* Optional account activation */}
        {onActivateAccount && (
          <button
            type="button"
            onClick={onActivateAccount}
            disabled={isBusy}
            className="w-full px-2.5 py-2 rounded-md text-xs font-medium border border-[#E2E8F0] bg-white text-[#475569] hover:border-[#1B3A6B] hover:text-[#1B3A6B] transition-all"
          >
            Account Activation Flow →
          </button>
        )}

        {/* Optional session expired */}
        {onSessionExpired && (
          <button
            type="button"
            onClick={onSessionExpired}
            disabled={isBusy}
            className="w-full px-2.5 py-2 rounded-md text-xs font-medium border border-[#E2E8F0] bg-white text-[#475569] hover:border-[#D97706] hover:text-[#D97706] transition-all"
          >
            Session Expired Screen →
          </button>
        )}

      </div>
    </AuthLayout>
  )
}


/* Email icon */
function MailInputIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}