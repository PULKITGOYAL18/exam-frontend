// src/modules/auth/login/Login.tsx

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


// ============================================================
// LOGIN STATE
// ============================================================

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


// ============================================================
// PROPS
// ============================================================

interface LoginProps {

  // Normal login success
  onSuccess: (role: UserRole) => void

  // Password recovery
  onForgotPassword: () => void

  // Optional account activation
  onActivateAccount?: () => void

  // Optional session expired
  onSessionExpired?: () => void

  // NEW:
  // Opens public answer-key creation page
  // without login.
  onCreateAnswerKey?: () => void

  // Initial screen state
  initialState?: LoginState
}


// ============================================================
// LOGIN COMPONENT
// ============================================================

export default function Login({
  onSuccess,
  onForgotPassword,
  onActivateAccount,
  onSessionExpired,
  onCreateAnswerKey,
  initialState = 'default',
}: LoginProps) {

  // ==========================================================
  // STATE
  // ==========================================================

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


  // ==========================================================
  // VALIDATION
  // ==========================================================

  const validate = () => {

    let valid = true

    setEmailError('')
    setPasswordError('')


    // --------------------------------------------------------
    // Email / Username
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // Password
    // --------------------------------------------------------

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


  // ==========================================================
  // LOGIN SUBMIT
  // ==========================================================

  const handleSubmit = async (
    e: React.FormEvent
  ) => {

    // IMPORTANT:
    // Prevent normal browser form submission.
    e.preventDefault()


    // --------------------------------------------------------
    // Validate
    // --------------------------------------------------------

    if (!validate()) {

      setLoginState(
        'validation-error'
      )

      return
    }


    setLoginState('loading')


    try {

      /*
       * Call Flask backend.
       *
       * POST:
       *
       * http://127.0.0.1:5000/api/auth/login
       */

      const result = await login(
        email.trim(),
        password
      )


      // ------------------------------------------------------
      // Save JWT
      // ------------------------------------------------------

      saveToken(
        result.token
      )


      // ------------------------------------------------------
      // Save user
      // ------------------------------------------------------

      saveUser(
        result.user
      )


      // ------------------------------------------------------
      // Remember me
      // ------------------------------------------------------

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


      // ------------------------------------------------------
      // Login success
      // ------------------------------------------------------

      setLoginState(
        'success'
      )


      /*
       * Use the actual role returned by the backend.
       */

      setTimeout(() => {

        onSuccess(
          result.user.role
        )

      }, 500)


    } catch (error: any) {

      console.error(
        'Login error:',
        error
      )


      const message =
        error?.message || ''


      // ------------------------------------------------------
      // Account locked
      // ------------------------------------------------------

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


      // ------------------------------------------------------
      // Account disabled
      // ------------------------------------------------------

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


      // ------------------------------------------------------
      // Invalid credentials
      // ------------------------------------------------------

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


      // ------------------------------------------------------
      // Network/server error
      // ------------------------------------------------------

      setLoginState(
        'network-error'
      )
    }
  }


  // ==========================================================
  // BUSY STATE
  // ==========================================================

  const isBusy =
    loginState === 'loading' ||
    loginState === 'success'


  // ==========================================================
  // CREATE ANSWER KEY
  // ==========================================================
  //
  // IMPORTANT:
  //
  // DO NOT use:
  //
  // window.location.href
  //
  // because that causes a full browser refresh.
  //
  // Instead, call the navigation callback supplied by App.tsx.
  //
  // App.tsx:
  //
  // onCreateAnswerKey={() =>
  //   navigate('public-answer-key-create')
  // }
  //
  // ==========================================================

  const handleCreateAnswerKey = () => {

    if (!onCreateAnswerKey) {

      console.warn(
        'Create Answer Key navigation callback is not configured.'
      )

      return
    }


    onCreateAnswerKey()
  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <AuthLayout>

      <div className="space-y-6 animate-fade-in">

        {/* ==================================================
            HEADER
            ================================================== */}

        <div>

          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
            Sign in to your account
          </h1>

          <p className="text-sm text-[#475569] mt-1.5">
            Access the secure examination evaluation
            portal. Authorized personnel only.
          </p>

        </div>


        {/* ==================================================
            SESSION EXPIRED
            ================================================== */}

        {loginState === 'session-expired' && (

          <Alert
            variant="warning"
            title="Session Expired"
            message="Your session has timed out due to inactivity. Please sign in again to continue."
          />

        )}


        {/* ==================================================
            INVALID CREDENTIALS
            ================================================== */}

        {loginState === 'invalid-credentials' && (

          <Alert
            variant="error"
            title="Invalid Credentials"
            message="The email or password you entered is incorrect. Please check your credentials and try again."
          />

        )}


        {/* ==================================================
            ACCOUNT LOCKED
            ================================================== */}

        {loginState === 'account-locked' && (

          <Alert
            variant="error"
            title="Account Locked"
            message="Your account has been locked after multiple failed login attempts. Contact your administrator to unlock it."
          />

        )}


        {/* ==================================================
            ACCOUNT DISABLED
            ================================================== */}

        {loginState === 'account-disabled' && (

          <Alert
            variant="error"
            title="Account Disabled"
            message="Your account has been disabled. Please contact your system administrator for assistance."
          />

        )}


        {/* ==================================================
            NETWORK ERROR
            ================================================== */}

        {loginState === 'network-error' && (

          <Alert
            variant="error"
            title="Connection Error"
            message="Unable to reach the authentication server. Make sure the Flask backend is running and try again."
          />

        )}


        {/* ==================================================
            LOGIN SUCCESS
            ================================================== */}

        {loginState === 'success' && (

          <Alert
            variant="success"
            title="Signing In…"
            message="Authentication successful. Redirecting to your dashboard…"
          />

        )}


        {/* ==================================================
            LOGIN FORM
            ================================================== */}

        <form
          onSubmit={handleSubmit}
          noValidate
          className="space-y-4"
        >

          {/* Email */}

          <Input
            label="University Email / Username"
            type="email"
            placeholder="you@university.edu"
            value={email}
            onChange={(e) => {

              setEmail(
                e.target.value
              )

              setEmailError('')
            }}
            error={emailError}
            required
            autoComplete="email"
            leftIcon={
              <MailInputIcon />
            }
            disabled={isBusy}
          />


          {/* Password */}

          <PasswordInput
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => {

              setPassword(
                e.target.value
              )

              setPasswordError('')
            }}
            error={passwordError}
            required
            autoComplete="current-password"
            disabled={isBusy}
          />


          {/* =================================================
              REMEMBER ME + FORGOT PASSWORD
              ================================================= */}

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


          {/* =================================================
              SIGN IN BUTTON
              ================================================= */}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={
              loginState === 'loading'
            }
            disabled={
              loginState === 'success'
            }
          >
            {loginState === 'loading'
              ? 'Signing In…'
              : loginState === 'success'
                ? 'Redirecting…'
                : 'Sign In'}
          </Button>

        </form>


        {/* ==================================================
            CREATE ANSWER KEY WITHOUT LOGIN
            ================================================== */}

        <div className="relative flex items-center py-1">

          <div className="flex-grow border-t border-[#E2E8F0]" />

          <span className="px-3 text-xs text-[#94A3B8] bg-white">
            OR
          </span>

          <div className="flex-grow border-t border-[#E2E8F0]" />

        </div>


        {/*
         * IMPORTANT:
         *
         * type="button"
         *
         * This prevents this button from submitting
         * the login form.
         */}

        <Button
          type="button"
          variant="secondary"
          size="lg"
          fullWidth
          onClick={handleCreateAnswerKey}
          disabled={isBusy}
        >
          Create Answer Key
        </Button>


        {/* ==================================================
            SECURITY NOTICE
            ================================================== */}

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


        {/* ==================================================
            DEVELOPMENT INFORMATION
            ================================================== */}

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


        {/* ==================================================
            ACCOUNT ACTIVATION
            ================================================== */}

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


        {/* ==================================================
            SESSION EXPIRED TEST
            ================================================== */}

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


// ============================================================
// EMAIL ICON
// ============================================================

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