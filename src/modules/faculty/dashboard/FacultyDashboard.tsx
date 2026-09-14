// src/modules/faculty/FacultyDashboard.tsx

import { AppShell } from '@/layouts'
import { useEffect, useMemo, useState } from 'react'
import { useLogout } from '@/hooks'

import {
  Card,
  CardHeader,
  Button,
  Alert,
  StatusBadge,
  RoleBadge,
  Modal,
  QuickAction,
} from '@/components/common'

import {
  StatCard,
  HBarChart,
  Sparkline,
  ActivityTimeline,
  ProgressRing,
  NotificationList,
  MiniCalendar,
  WorkflowCard,
  DonutChart,
} from '@/components/common'

import type {
  User,
  Screen,
  Notification,
} from '@/types'

import { LogoutModal } from '@/components/common'

import {
  ClipboardList,
  CheckCircle,
  Hourglass,
  Clock,
  AlertTriangle,
  Rocket,
  Upload,
  Play,
  Search,
  FileText,
  Bell,
  Check,
  CheckSquare,
  X,
  UsersRound,
  UserPlus,
  Send,
  RefreshCw,
} from 'lucide-react'

// ─── Faculty Mock Data ────────────────────────────────────────────────────────

import {
  ASSIGNED_EXAMS,
  ACTIVITY,
  EVAL_TREND,
  CAL_EVENTS,
  SUBJECT_PROGRESS,
  CONFIDENCE_DIST,
} from '@/services/faculty/mockData'

// ─── Notification API ─────────────────────────────────────────────────────────
//
// IMPORTANT:
// Faculty must NOT use the Admin users API.
// The notification recipient API returns real users that the
// logged-in Faculty is allowed to notify.

import {
  getNotificationRecipients,
  getNotifications,
  markNotificationAsRead,
  createNotification,
} from '@/services/notification/notificationApi'

// ============================================================
// BACKEND USER TYPE
// ============================================================

interface BackendUser {
  id: string
  name: string
  email: string
  employeeId?: string
  role?: string
  status?: string
  department?: string
  designation?: string
}

// ============================================================
// STATUS NORMALIZER
// ============================================================

function normalizeStatus(status?: string): string {
  if (!status) return 'Unknown'

  const value = status.toLowerCase().trim()

  if (value === 'active') return 'Active'
  if (value === 'suspended') return 'Suspended'
  if (value === 'inactive') return 'Inactive'
  if (value === 'pending') return 'Pending Activation'
  if (value === 'pending activation') return 'Pending Activation'
  if (value === 'locked') return 'Locked'

  return status
}

// ============================================================
// ROLE NORMALIZER
// ============================================================

function normalizeRole(role?: string): string {
  if (!role) return 'Unknown'

  const value = role.toLowerCase().trim()

  if (value === 'faculty') return 'Faculty'
  if (value === 'hod') return 'HOD'
  if (value === 'dean') return 'Dean'
  if (value === 'admin') return 'Admin'

  return role
}

// ============================================================
// EXAM STATUS PILL
// ============================================================

function ExamStatusPill({
  status,
}: {
  status: string
}) {
  const cfg: Record<string, string> = {
    'Submitted to HOD':
      'bg-[#D1FAE5] text-[#065F46]',

    'In Progress':
      'bg-[#EEF4FF] text-[#1B3A6B]',

    'Pending Upload':
      'bg-[#FEF3C7] text-[#92400E]',

    Scheduled:
      'bg-[#F1F5F9] text-[#475569]',
  }

  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cfg[status] ??
        'bg-[#F1F5F9] text-[#475569]'
        }`}
    >
      {status}
    </span>
  )
}

// ============================================================
// FACULTY DASHBOARD
// ============================================================

interface FacultyDashboardProps {
  user: User
  onNavigate: (
    s: Screen,
    data?: any
  ) => void
  onLogout: () => void
}

export default function FacultyDashboard({
  user,
  onNavigate,
  onLogout,
}: FacultyDashboardProps) {
  const {
    showLogout,
    openLogout,
    closeLogout,
  } = useLogout()

  // ==========================================================
  // EXISTING DASHBOARD STATE
  // ==========================================================

  const [reportModal, setReportModal] =
    useState(false)

  // ==========================================================
  // NOTIFICATION STATE
  // ==========================================================

  const [
    notifications,
    setNotifications,
  ] = useState<Notification[]>([])

  const [
    loadingNotifications,
    setLoadingNotifications,
  ] = useState(true)

  const [
    notificationsError,
    setNotificationsError,
  ] = useState<string | null>(null)

  // ==========================================================
  // REAL NOTIFICATION RECIPIENT USERS
  // ==========================================================

  const [users, setUsers] =
    useState<BackendUser[]>([])

  const [
    loadingUsers,
    setLoadingUsers,
  ] = useState(true)

  const [
    usersError,
    setUsersError,
  ] = useState<string | null>(null)

  // ==========================================================
  // NOTIFICATION MODAL
  // ==========================================================

  const [
    notificationModal,
    setNotificationModal,
  ] = useState(false)

  // ==========================================================
  // RECIPIENT MODE
  // ==========================================================

  const [
    notificationRecipientMode,
    setNotificationRecipientMode,
  ] = useState<
    'role' | 'individual'
  >('individual')

  // ==========================================================
  // SELECTED ROLE
  // ==========================================================

  const [
    selectedNotificationRole,
    setSelectedNotificationRole,
  ] = useState<
    'HOD' | 'Dean'
  >('HOD')

  // ==========================================================
  // INDIVIDUAL RECIPIENTS
  // ==========================================================

  const [
    notificationRecipients,
    setNotificationRecipients,
  ] = useState<string[]>([])

  const [
    notificationUserSearch,
    setNotificationUserSearch,
  ] = useState('')

  // ==========================================================
  // NOTIFICATION FORM
  // ==========================================================

  const [
    notificationTitle,
    setNotificationTitle,
  ] = useState('')

  const [
    notificationMessage,
    setNotificationMessage,
  ] = useState('')

  const [
    notificationType,
    setNotificationType,
  ] = useState<
    Notification['type']
  >('system')

  // ==========================================================
  // CREATE STATE
  // ==========================================================

  const [
    creatingNotification,
    setCreatingNotification,
  ] = useState(false)

  const [
    notificationCreateError,
    setNotificationCreateError,
  ] = useState<string | null>(null)

  const [
    notificationCreateSuccess,
    setNotificationCreateSuccess,
  ] = useState<string | null>(null)

  // ==========================================================
  // DASHBOARD CALCULATIONS
  // ==========================================================

  const totalSheets =
    ASSIGNED_EXAMS.reduce(
      (s, e) => s + e.total,
      0
    )

  const completedSheets =
    ASSIGNED_EXAMS.reduce(
      (s, e) => s + e.verified,
      0
    )

  const pendingSheets =
    totalSheets - completedSheets

  const todayProgress = 17

  // ==========================================================
  // GET CURRENT USER ID
  // ==========================================================

  const getCurrentUserId = () => {
    const notificationUser =
      user as User & {
        id?: string
        _id?: string
      }

    return (
      notificationUser.id ||
      notificationUser._id ||
      ''
    )
  }

  // ==========================================================
  // LOAD REAL NOTIFICATION RECIPIENTS
  // ==========================================================
  //
  // IMPORTANT:
  // Do NOT call getAdminUsers() here.
  //
  // This uses the notification recipient endpoint so the
  // backend decides which real users the Faculty can notify.
  // ==========================================================

  const loadUsers = async () => {
    try {
      setLoadingUsers(true)
      setUsersError(null)

      const response =
        await getNotificationRecipients()

      /*
       * Support both possible response structures:
       *
       * 1. response.users
       * 2. response directly being an array
       *
       * This makes the dashboard tolerant of either API
       * response format.
       */

      const recipientUsers =
        Array.isArray(response)
          ? response
          : response?.users || []

      /*
       * Faculty can notify HOD and Dean only.
       *
       * Even if the backend accidentally returns another
       * role, we do not display it as a recipient.
       */

      const allowedUsers =
        recipientUsers.filter(
          (recipient: BackendUser) => {
            const role =
              normalizeRole(
                recipient.role
              )

            return (
              role === 'HOD' ||
              role === 'Dean'
            )
          }
        )

      setUsers(allowedUsers)
    } catch (error) {
      console.error(
        'FACULTY DASHBOARD RECIPIENT USERS ERROR:',
        error
      )

      setUsersError(
        error instanceof Error
          ? error.message
          : 'Unable to load notification recipients'
      )

      setUsers([])
    } finally {
      setLoadingUsers(false)
    }
  }

  // ==========================================================
  // LOAD NOTIFICATIONS
  // ==========================================================

  const loadNotifications =
    async () => {
      const recipientId =
        getCurrentUserId()

      if (!recipientId) {
        setNotifications([])

        setNotificationsError(
          'User ID is not available for notifications.'
        )

        setLoadingNotifications(false)

        return
      }

      try {
        setLoadingNotifications(true)
        setNotificationsError(null)

        const response =
          await getNotifications(
            recipientId
          )

        setNotifications(
          response || []
        )
      } catch (error) {
        console.error(
          'FACULTY DASHBOARD NOTIFICATION ERROR:',
          error
        )

        setNotificationsError(
          error instanceof Error
            ? error.message
            : 'Unable to load notifications'
        )
      } finally {
        setLoadingNotifications(false)
      }
    }

  // ==========================================================
  // INITIAL DATA LOAD
  // ==========================================================

  useEffect(() => {
    void loadUsers()
    void loadNotifications()
  }, [user])

  // ==========================================================
  // MARK NOTIFICATION AS READ
  // ==========================================================

  const handleMarkNotificationAsRead =
    async (
      notificationId: string
    ) => {
      try {
        await markNotificationAsRead(
          notificationId
        )

        setNotifications(
          previous =>
            previous.map(
              notification =>
                notification.id ===
                  notificationId
                  ? {
                    ...notification,
                    is_read: true,
                  }
                  : notification
            )
        )
      } catch (error) {
        console.error(
          'FACULTY DASHBOARD MARK NOTIFICATION ERROR:',
          error
        )

        throw error
      }
    }

  // ==========================================================
  // USERS FOR SELECTED ROLE
  // ==========================================================

  const usersForSelectedRole =
    useMemo(() => {
      return users.filter(
        recipient =>
          normalizeRole(
            recipient.role
          ) ===
          selectedNotificationRole
      )
    }, [
      users,
      selectedNotificationRole,
    ])

  // ==========================================================
  // INDIVIDUAL USER SEARCH
  // ==========================================================

  const filteredNotificationUsers =
    useMemo(() => {
      const search =
        notificationUserSearch
          .trim()
          .toLowerCase()

      /*
       * Faculty can only notify real HOD/Dean users.
       */

      const allowedUsers =
        users.filter(
          recipient => {
            const role =
              normalizeRole(
                recipient.role
              )

            return (
              role === 'HOD' ||
              role === 'Dean'
            )
          }
        )

      if (!search) {
        return allowedUsers
      }

      return allowedUsers.filter(
        recipient => {
          const name =
            recipient.name
              ?.toLowerCase() || ''

          const email =
            recipient.email
              ?.toLowerCase() || ''

          const role =
            normalizeRole(
              recipient.role
            ).toLowerCase()

          const department =
            recipient.department
              ?.toLowerCase() || ''

          const designation =
            recipient.designation
              ?.toLowerCase() || ''

          const employeeId =
            recipient.employeeId
              ?.toLowerCase() || ''

          return (
            name.includes(search) ||
            email.includes(search) ||
            role.includes(search) ||
            department.includes(search) ||
            designation.includes(search) ||
            employeeId.includes(search)
          )
        }
      )
    }, [
      users,
      notificationUserSearch,
    ])

  // ==========================================================
  // SELECTED INDIVIDUAL USERS
  // ==========================================================

  const selectedNotificationUsers =
    useMemo(() => {
      return users.filter(
        recipient =>
          notificationRecipients.includes(
            recipient.id
          )
      )
    }, [
      users,
      notificationRecipients,
    ])

  // ==========================================================
  // FINAL RECIPIENT IDS
  // ==========================================================

  const finalNotificationRecipientIds =
    useMemo(() => {
      if (
        notificationRecipientMode ===
        'role'
      ) {
        return usersForSelectedRole
          .map(
            recipient =>
              recipient.id
          )
          .filter(Boolean)
      }

      /*
       * Only allow IDs that actually exist in the
       * real recipient list.
       *
       * This prevents stale/invalid IDs from being
       * submitted to the backend.
       */

      const validRecipientIds =
        new Set(
          users.map(
            recipient =>
              recipient.id
          )
        )

      return notificationRecipients.filter(
        id =>
          validRecipientIds.has(id)
      )
    }, [
      notificationRecipientMode,
      usersForSelectedRole,
      notificationRecipients,
      users,
    ])

  // ==========================================================
  // FINAL RECIPIENT COUNT
  // ==========================================================

  const finalNotificationRecipientCount =
    finalNotificationRecipientIds.length

  // ==========================================================
  // TOGGLE INDIVIDUAL RECIPIENT
  // ==========================================================

  const toggleNotificationRecipient =
    (
      userId: string
    ) => {
      setNotificationRecipients(
        previous => {
          if (
            previous.includes(
              userId
            )
          ) {
            return previous.filter(
              id => id !== userId
            )
          }

          return [
            ...previous,
            userId,
          ]
        }
      )
    }

  // ==========================================================
  // SELECT ALL VISIBLE USERS
  // ==========================================================

  const selectAllNotificationRecipients =
    () => {
      const visibleUserIds =
        filteredNotificationUsers
          .map(
            recipient =>
              recipient.id
          )
          .filter(Boolean)

      setNotificationRecipients(
        previous => {
          const combined =
            new Set([
              ...previous,
              ...visibleUserIds,
            ])

          return Array.from(
            combined
          )
        }
      )
    }

  // ==========================================================
  // CLEAR USERS
  // ==========================================================

  const clearNotificationRecipients =
    () => {
      setNotificationRecipients([])
    }

  // ==========================================================
  // CHANGE RECIPIENT MODE
  // ==========================================================

  const handleNotificationRecipientModeChange =
    (
      mode:
        | 'role'
        | 'individual'
    ) => {
      if (creatingNotification) {
        return
      }

      setNotificationRecipientMode(
        mode
      )

      setNotificationCreateError(null)
      setNotificationCreateSuccess(null)

      if (mode === 'role') {
        setNotificationRecipients([])
      }
    }

  // ==========================================================
  // OPEN NOTIFICATION MODAL
  // ==========================================================

  const openNotificationModal =
    () => {
      setNotificationRecipientMode(
        'individual'
      )

      setSelectedNotificationRole(
        'HOD'
      )

      setNotificationRecipients([])
      setNotificationUserSearch('')
      setNotificationTitle('')
      setNotificationMessage('')
      setNotificationType('system')

      setNotificationCreateError(null)
      setNotificationCreateSuccess(null)

      /*
       * Load the latest real HOD/Dean users
       * before opening the modal.
       */

      void loadUsers()

      setNotificationModal(true)
    }

  // ==========================================================
  // CLOSE NOTIFICATION MODAL
  // ==========================================================

  const closeNotificationModal =
    () => {
      if (creatingNotification) {
        return
      }

      setNotificationModal(false)

      setNotificationCreateError(null)
      setNotificationCreateSuccess(null)

      setNotificationRecipients([])
      setNotificationUserSearch('')
      setNotificationTitle('')
      setNotificationMessage('')
    }

  // ==========================================================
  // CREATE NOTIFICATION
  // ==========================================================

  const handleCreateNotification =
    async () => {
      setNotificationCreateError(null)
      setNotificationCreateSuccess(null)

      // ------------------------------------------------------
      // VALIDATE RECIPIENT
      // ------------------------------------------------------

      if (
        finalNotificationRecipientIds.length ===
        0
      ) {
        if (
          notificationRecipientMode ===
          'role'
        ) {
          setNotificationCreateError(
            `No ${selectedNotificationRole} users are available.`
          )
        } else {
          setNotificationCreateError(
            'Please select at least one recipient.'
          )
        }

        return
      }

      // ------------------------------------------------------
      // VALIDATE TITLE
      // ------------------------------------------------------

      if (
        !notificationTitle.trim()
      ) {
        setNotificationCreateError(
          'Please enter a notification title.'
        )

        return
      }

      // ------------------------------------------------------
      // VALIDATE MESSAGE
      // ------------------------------------------------------

      if (
        !notificationMessage.trim()
      ) {
        setNotificationCreateError(
          'Please enter a notification message.'
        )

        return
      }

      try {
        setCreatingNotification(true)

        const recipientIds = [
          ...new Set(
            finalNotificationRecipientIds
          ),
        ]

        // ----------------------------------------------------
        // SEND TO REAL MONGODB USER IDS
        // ----------------------------------------------------

        const results =
          await Promise.allSettled(
            recipientIds.map(
              recipientId =>
                createNotification(
                  recipientId,
                  notificationTitle.trim(),
                  notificationMessage.trim(),
                  notificationType
                )
            )
          )

        const successfulNotifications =
          results.filter(
            result =>
              result.status ===
              'fulfilled'
          )

        const failedNotifications =
          results.filter(
            result =>
              result.status ===
              'rejected'
          )

        // ----------------------------------------------------
        // COMPLETE FAILURE
        // ----------------------------------------------------

        if (
          successfulNotifications.length ===
          0
        ) {
          setNotificationCreateError(
            'Notification could not be sent to any recipient. Please try again.'
          )

          return
        }

        // ----------------------------------------------------
        // PARTIAL FAILURE
        // ----------------------------------------------------

        if (
          failedNotifications.length >
          0
        ) {
          setNotificationCreateSuccess(
            `Notification sent to ${successfulNotifications.length} of ${recipientIds.length} users.`
          )
        } else {
          setNotificationCreateSuccess(
            `Notification successfully sent to ${successfulNotifications.length} user${successfulNotifications.length ===
              1
              ? ''
              : 's'
            }.`
          )
        }

        // ----------------------------------------------------
        // RESET FORM
        // ----------------------------------------------------

        setNotificationTitle('')
        setNotificationMessage('')
        setNotificationRecipients([])
        setNotificationUserSearch('')

        // ----------------------------------------------------
        // CLOSE AFTER SUCCESS
        // ----------------------------------------------------

        setTimeout(() => {
          setNotificationModal(false)
          setNotificationCreateSuccess(null)
        }, 1400)
      } catch (error) {
        console.error(
          'FACULTY CREATE NOTIFICATION ERROR:',
          error
        )

        setNotificationCreateError(
          error instanceof Error
            ? error.message
            : 'Failed to create notification.'
        )
      } finally {
        setCreatingNotification(false)
      }
    }

  // ==========================================================
  // NAVIGATION HANDLER FOR OCR
  // ==========================================================

  const goToOCR = (
    examId?: string,
    action?: string,
    examData?: any
  ) => {
    onNavigate(
      'ocr-workflow',
      {
        examId:
          examId || '',

        action:
          action || 'new',

        from:
          'dashboard',

        ...examData,
      }
    )
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <AppShell
      user={{
        name: user.name,
        role: user.role,
        email: user.email,
      }}
      onNavigate={onNavigate}
      onLogout={openLogout}
      activeSection="dashboard"
    >
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">

        {/* ======================================================
            WELCOME BANNER
        ====================================================== */}

        <Card className="p-0 overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-[#0F2142] via-[#1B3A6B] to-[#2030A6]">
            <div className="flex items-start justify-between gap-4 flex-wrap">

              <div>
                <p className="text-blue-300 text-sm font-medium">
                  Welcome back,
                </p>

                <h1 className="text-2xl font-bold text-white mt-0.5 tracking-tight">
                  {user.name}
                </h1>

                <p className="text-blue-200 text-sm mt-1">
                  {user.designation} · {user.department}
                </p>

                <div className="flex gap-2 mt-3 flex-wrap">
                  <RoleBadge role={user.role} />

                  <StatusBadge status={user.status} />

                  <span className="text-xs text-blue-300 self-center">
                    Last login: {user.lastLogin}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-3">
                <ProgressRing
                  value={completedSheets}
                  max={totalSheets}
                  size={72}
                  color="#3B5DE8"
                  label="Complete"
                />

                <div className="text-right">
                  <div className="text-white text-sm font-bold">
                    {completedSheets}/{totalSheets} sheets
                  </div>

                  <div className="text-blue-300 text-xs">
                    evaluated overall
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Today's Progress */}

          <div className="px-6 py-3 bg-[#0F2142]/80 border-t border-white/10 flex items-center gap-4 flex-wrap">

            <div className="text-xs text-blue-300 font-medium shrink-0">
              Today's Progress:
            </div>

            <div className="flex-1 min-w-40 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#3B5DE8] rounded-full"
                style={{
                  width: `${Math.min(
                    (todayProgress / 20) * 100,
                    100
                  )}%`,
                }}
              />
            </div>

            <div className="text-white text-xs font-bold shrink-0">
              {todayProgress} sheets evaluated today
            </div>

            <WorkflowCard
              steps={[
                {
                  label: 'Upload',
                  status: 'done',
                },
                {
                  label: 'OCR',
                  status: 'done',
                },
                {
                  label: 'Verify',
                  status: 'active',
                },
                {
                  label: 'AI Eval',
                  status: 'pending',
                },
                {
                  label: 'HOD',
                  status: 'pending',
                },
              ]}
            />
          </div>
        </Card>

        {/* ======================================================
            RETURNED ALERT
        ====================================================== */}

        <Alert
          variant="warning"
          title="HOD Returned Evaluation"
          message="CS302 — Database Management Systems evaluation was returned for correction. Review Q7 marks for 4 students before re-submitting."
        />

        {/* ======================================================
            STAT CARDS
        ====================================================== */}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">

          <StatCard
            label="Assigned Sheets"
            value={totalSheets}
            sub="4 examinations"
            color="#1B3A6B"
            icon={<ClipboardList size={20} />}
            trend={{
              direction: 'neutral',
              text: 'this semester',
            }}
          />

          <StatCard
            label="Completed"
            value={completedSheets}
            sub="verified & submitted"
            color="#059669"
            icon={<CheckCircle size={20} />}
            trend={{
              direction: 'up',
              text: '+17 today',
            }}
          />

          <StatCard
            label="Pending"
            value={pendingSheets}
            sub="not yet submitted"
            color="#D97706"
            icon={<Hourglass size={20} />}
            trend={{
              direction: 'down',
              text: '3 exams',
            }}
          />

          <StatCard
            label="Avg Eval Time"
            value="4.2h"
            sub="per sheet"
            color="#3B5DE8"
            icon={<Clock size={20} />}
            trend={{
              direction: 'up',
              text: 'faster than avg',
            }}
          />

          <StatCard
            label="Low Confidence"
            value={7}
            sub="need manual review"
            color="#DC2626"
            icon={<AlertTriangle size={20} />}
            trend={{
              direction: 'neutral',
              text: 'CS401 sheets',
            }}
          />

          <StatCard
            label="Today's Progress"
            value={`${todayProgress}`}
            sub="sheets today"
            color="#7C3AED"
            icon={<Rocket size={20} />}
            trend={{
              direction: 'up',
              text: 'on track',
            }}
          />

        </div>

        {/* ======================================================
            MAIN GRID
        ====================================================== */}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ====================================================
              LEFT 2/3
          ==================================================== */}

          <div className="xl:col-span-2 space-y-6">

            {/* ==================================================
                QUICK ACTIONS
            ================================================== */}

            <Card>
              <CardHeader
                title="Quick Actions"
                subtitle="Jump directly into your evaluation workflow"
              />

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">

                <QuickAction
                  icon={<Upload size={20} />}
                  label="Upload Sheets"
                  sub="Start new upload"
                  color="#1B3A6B"
                  onClick={() =>
                    goToOCR(
                      undefined,
                      'new'
                    )
                  }
                />

                <QuickAction
                  icon={<Play size={20} />}
                  label="Continue Evaluation"
                  sub="CS401 — 17 remaining"
                  color="#3B5DE8"
                  onClick={() =>
                    goToOCR(
                      'CS401',
                      'continue'
                    )
                  }
                />

                <QuickAction
                  icon={<Search size={20} />}
                  label="Pending Reviews"
                  sub="7 low-confidence"
                  color="#D97706"
                  onClick={() =>
                    goToOCR(
                      undefined,
                      'review'
                    )
                  }
                />

                <QuickAction
                  icon={<FileText size={20} />}
                  label="Create Answer Key"
                  sub="Define questions & rubric"
                  color="#7C3AED"
                  onClick={() =>
                    onNavigate(
                      'answer-key-create'
                    )
                  }
                />

                <QuickAction
                  icon={<Bell size={20} />}
                  label="Send Notification"
                  sub="Notify HOD / Dean"
                  color="#2563EB"
                  onClick={
                    openNotificationModal
                  }
                />

              </div>
            </Card>

            {/* ==================================================
                ASSIGNED EXAMINATIONS
            ================================================== */}

            <Card padding={false}>

              <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">

                <div>
                  <h3 className="text-base font-semibold text-[#0F172A]">
                    Assigned Examinations
                  </h3>

                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    This semester · {ASSIGNED_EXAMS.length} examinations
                  </p>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    goToOCR(
                      undefined,
                      'new'
                    )
                  }
                >
                  Upload Sheets
                </Button>

              </div>

              <div className="divide-y divide-[#F1F5F9]">

                {ASSIGNED_EXAMS.map(
                  exam => {

                    const pct =
                      exam.total > 0
                        ? Math.round(
                          (exam.verified /
                            exam.total) *
                          100
                        )
                        : 0

                    return (
                      <div
                        key={exam.id}
                        className="p-5 hover:bg-[#F8FAFC] transition-colors"
                      >

                        <div className="flex items-start justify-between gap-3 flex-wrap">

                          <div className="flex items-center gap-3">

                            <div className="w-10 h-10 rounded-lg bg-[#EEF4FF] flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-[#1B3A6B]">
                                {exam.code.slice(
                                  0,
                                  4
                                )}
                              </span>
                            </div>

                            <div>

                              <div className="flex items-center gap-2 flex-wrap">

                                <span className="text-sm font-semibold text-[#0F172A]">
                                  {exam.name}
                                </span>

                                <ExamStatusPill
                                  status={
                                    exam.status
                                  }
                                />

                              </div>

                              <div className="text-xs text-[#94A3B8] mt-0.5">
                                Sem {exam.semester} · {exam.date} · {exam.total} students
                              </div>

                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">

                            <ProgressRing
                              value={
                                exam.verified
                              }
                              max={
                                exam.total
                              }
                              size={44}
                              color={
                                pct === 100
                                  ? '#059669'
                                  : '#1B3A6B'
                              }
                            />

                            {exam.status ===
                              'Pending Upload' ||
                              exam.status ===
                              'Scheduled' ? (

                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() =>
                                  goToOCR(
                                    exam.id,
                                    'start',
                                    {
                                      examCode:
                                        exam.code,
                                      examName:
                                        exam.name,
                                      totalStudents:
                                        exam.total,
                                    }
                                  )
                                }
                              >
                                Start OCR →
                              </Button>

                            ) : exam.status ===
                              'In Progress' ? (

                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() =>
                                  goToOCR(
                                    exam.id,
                                    'continue',
                                    {
                                      examCode:
                                        exam.code,
                                      examName:
                                        exam.name,
                                      totalStudents:
                                        exam.total,
                                    }
                                  )
                                }
                              >
                                Continue →
                              </Button>

                            ) : (

                              <Button
                                variant="ghost"
                                size="sm"
                              >
                                View
                              </Button>

                            )}

                          </div>
                        </div>

                        {/* Progress Pipeline */}

                        <div className="mt-3 grid grid-cols-4 gap-1">

                          {[
                            {
                              label:
                                'Uploaded',
                              done:
                                exam.uploaded,
                              total:
                                exam.total,
                            },
                            {
                              label:
                                'OCR Done',
                              done:
                                exam.ocrDone,
                              total:
                                exam.total,
                            },
                            {
                              label:
                                'Evaluated',
                              done:
                                exam.evaluated,
                              total:
                                exam.total,
                            },
                            {
                              label:
                                'Verified',
                              done:
                                exam.verified,
                              total:
                                exam.total,
                            },
                          ].map(
                            p => {

                              const pp =
                                p.total > 0
                                  ? Math.round(
                                    (p.done /
                                      p.total) *
                                    100
                                  )
                                  : 0

                              return (
                                <div
                                  key={
                                    p.label
                                  }
                                >

                                  <div className="text-[10px] text-[#94A3B8] mb-1 flex justify-between">

                                    <span>
                                      {
                                        p.label
                                      }
                                    </span>

                                    <span className="font-semibold text-[#475569]">
                                      {
                                        p.done
                                      }/
                                      {
                                        p.total
                                      }
                                    </span>

                                  </div>

                                  <div className="h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">

                                    <div
                                      className="h-full rounded-full bg-[#1B3A6B] transition-all"
                                      style={{
                                        width: `${pp}%`,
                                      }}
                                    />

                                  </div>

                                </div>
                              )
                            }
                          )}

                        </div>

                      </div>
                    )
                  }
                )}

              </div>
            </Card>

            {/* ==================================================
                CHARTS
            ================================================== */}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

              <Card>
                <CardHeader
                  title="Subject Progress"
                  subtitle="Evaluation completion %"
                />

                <HBarChart
                  data={
                    SUBJECT_PROGRESS
                  }
                  maxValue={100}
                  unit="%"
                />
              </Card>

              <Card>
                <CardHeader
                  title="OCR Confidence"
                  subtitle="All sheets combined"
                />

                <DonutChart
                  segments={
                    CONFIDENCE_DIST
                  }
                  centerLabel="Total Sheets"
                  centerValue={187}
                  size={120}
                />
              </Card>

            </div>

            {/* ==================================================
                EVALUATION TREND
            ================================================== */}

            <Card>

              <div className="flex items-center justify-between">

                <div>
                  <h3 className="text-base font-semibold text-[#0F172A]">
                    Evaluation Trend
                  </h3>

                  <p className="text-xs text-[#94A3B8]">
                    Cumulative sheets completed (last 10 days)
                  </p>
                </div>

                <div className="flex items-center gap-2">

                  <Sparkline
                    data={EVAL_TREND}
                    color="#1B3A6B"
                    width={100}
                    height={32}
                  />

                  <div className="text-right">

                    <div className="text-lg font-bold text-[#0F172A]">
                      {
                        EVAL_TREND[
                        EVAL_TREND.length -
                        1
                        ]
                      }
                    </div>

                    <div className="text-[10px] text-[#059669] font-semibold">
                      ↑ +10.8%
                    </div>

                  </div>
                </div>
              </div>
            </Card>

          </div>

          {/* ====================================================
              RIGHT 1/3
          ==================================================== */}

          <div className="space-y-6">

            {/* ==================================================
                NOTIFICATIONS
            ================================================== */}

            <Card>

              <CardHeader
                title="Notifications"
                subtitle={
                  loadingNotifications
                    ? 'Loading...'
                    : `${notifications.length} updates`
                }
                action={
                  <div className="flex items-center gap-1">

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        void loadNotifications()
                      }
                      disabled={
                        loadingNotifications
                      }
                    >
                      <RefreshCw
                        size={14}
                      />
                    </Button>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={
                        openNotificationModal
                      }
                    >
                      <Bell
                        size={14}
                        className="mr-1"
                      />
                      Send
                    </Button>

                  </div>
                }
              />

              {notificationsError && (
                <div className="mb-3 p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#B91C1C]">
                  {notificationsError}
                </div>
              )}

              {loadingNotifications ? (

                <div className="py-8 text-center">

                  <div className="w-6 h-6 border-2 border-[#CBD5E1] border-t-[#2563EB] rounded-full animate-spin mx-auto" />

                  <p className="text-xs text-[#94A3B8] mt-2">
                    Loading notifications...
                  </p>

                </div>

              ) : notifications.length === 0 ? (

                <div className="py-8 text-center">

                  <div className="w-10 h-10 rounded-full bg-[#F1F5F9] flex items-center justify-center mx-auto">
                    <Bell
                      size={18}
                      className="text-[#94A3B8]"
                    />
                  </div>

                  <p className="text-sm font-medium text-[#475569] mt-3">
                    No notifications
                  </p>

                  <p className="text-xs text-[#94A3B8] mt-1">
                    You're all caught up.
                  </p>

                </div>

              ) : (

                <NotificationList
                  items={
                    notifications
                  }
                  onMarkAsRead={
                    handleMarkNotificationAsRead
                  }
                />

              )}

            </Card>

            {/* ==================================================
                CALENDAR
            ================================================== */}

            <Card>

              <CardHeader
                title="Calendar"
                subtitle="Upcoming deadlines"
              />

              <MiniCalendar
                month="January 2026"
                events={CAL_EVENTS}
              />

              <div className="mt-4 space-y-1.5">

                {CAL_EVENTS.map(
                  ev => (

                    <div
                      key={ev.day}
                      className="flex items-center gap-2 text-xs"
                    >

                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{
                          backgroundColor:
                            ev.color,
                        }}
                      />

                      <span className="text-[#94A3B8] w-8">
                        Jan {ev.day}
                      </span>

                      <span className="text-[#475569]">
                        {ev.label}
                      </span>

                    </div>
                  )
                )}

              </div>
            </Card>

            {/* ==================================================
                ACTIVITY
            ================================================== */}

            <Card>

              <CardHeader
                title="Recent Activity"
                subtitle="Your evaluation timeline"
              />

              <ActivityTimeline
                events={ACTIVITY}
                maxItems={5}
              />

            </Card>

          </div>
        </div>
      </div>

      {/* ========================================================
          LOGOUT MODAL
      ======================================================== */}

      <LogoutModal
        open={showLogout}
        onClose={closeLogout}
        onConfirm={onLogout}
      />

      {/* ========================================================
          REPORT MODAL
      ======================================================== */}

      <Modal
        open={reportModal}
        onClose={() =>
          setReportModal(false)
        }
      >

        <div className="p-6 space-y-4">

          <h3 className="text-lg font-bold text-[#0F172A]">
            Generate Evaluation Report
          </h3>

          <p className="text-sm text-[#475569]">
            Select the examination and report type to export.
          </p>

          <div className="space-y-3">

            {ASSIGNED_EXAMS
              .filter(
                e => e.verified > 0
              )
              .map(exam => (

                <div
                  key={exam.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-[#E2E8F0] hover:border-[#1B3A6B] transition-colors"
                >

                  <div>

                    <div className="text-sm font-semibold text-[#0F172A]">
                      {exam.code} — {exam.name}
                    </div>

                    <div className="text-xs text-[#94A3B8]">
                      {exam.verified} sheets evaluated
                    </div>

                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                  >
                    Export PDF
                  </Button>

                </div>

              ))}

          </div>

          <Button
            variant="ghost"
            size="md"
            fullWidth
            onClick={() =>
              setReportModal(false)
            }
          >
            Close
          </Button>

        </div>
      </Modal>

      {/* ========================================================
          SEND NOTIFICATION MODAL
      ======================================================== */}

      <Modal
        open={notificationModal}
        onClose={
          closeNotificationModal
        }
      >

        <div className="p-6 space-y-5 max-h-[85vh] overflow-y-auto">

          {/* HEADER */}

          <div className="flex items-start justify-between gap-4">

            <div>

              <div className="flex items-center gap-2">

                <div className="w-9 h-9 rounded-lg bg-[#EEF4FF] flex items-center justify-center">
                  <Bell
                    size={18}
                    className="text-[#2563EB]"
                  />
                </div>

                <div>

                  <h3 className="text-lg font-bold text-[#0F172A]">
                    Send Notification
                  </h3>

                  <p className="text-xs text-[#64748B]">
                    Notify your HOD or Dean
                  </p>

                </div>

              </div>

            </div>

          </div>

          {/* ERROR */}

          {notificationCreateError && (

            <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA]">

              <div className="flex items-start gap-2">

                <AlertTriangle
                  size={16}
                  className="text-[#DC2626] mt-0.5 shrink-0"
                />

                <p className="text-xs font-medium text-[#B91C1C]">
                  {
                    notificationCreateError
                  }
                </p>

              </div>

            </div>

          )}

          {/* SUCCESS */}

          {notificationCreateSuccess && (

            <div className="p-3 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0]">

              <div className="flex items-start gap-2">

                <Check
                  size={16}
                  className="text-[#059669] mt-0.5 shrink-0"
                />

                <p className="text-xs font-medium text-[#047857]">
                  {
                    notificationCreateSuccess
                  }
                </p>

              </div>

            </div>

          )}

          {/* RECIPIENT MODE */}

          <div>

            <label className="block text-sm font-semibold text-[#0F172A] mb-2">
              Who do you want to notify?
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              {/* ROLE */}

              <button
                type="button"
                disabled={
                  creatingNotification
                }
                onClick={() =>
                  handleNotificationRecipientModeChange(
                    'role'
                  )
                }
                className={`p-3 rounded-xl border text-left transition-all ${notificationRecipientMode ===
                  'role'
                  ? 'border-[#2563EB] bg-[#EEF4FF] ring-2 ring-[#2563EB]/10'
                  : 'border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]'
                  }`}
              >

                <div className="flex items-center gap-2">

                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${notificationRecipientMode ===
                      'role'
                      ? 'border-[#2563EB]'
                      : 'border-[#CBD5E1]'
                      }`}
                  >

                    {notificationRecipientMode ===
                      'role' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                      )}

                  </div>

                  <UsersRound
                    size={17}
                    className="text-[#2563EB]"
                  />

                  <span className="text-sm font-semibold text-[#0F172A]">
                    By Role
                  </span>

                </div>

                <p className="text-[11px] text-[#64748B] mt-2 ml-7">
                  Notify all HODs or all Deans
                </p>

              </button>

              {/* INDIVIDUAL */}

              <button
                type="button"
                disabled={
                  creatingNotification
                }
                onClick={() =>
                  handleNotificationRecipientModeChange(
                    'individual'
                  )
                }
                className={`p-3 rounded-xl border text-left transition-all ${notificationRecipientMode ===
                  'individual'
                  ? 'border-[#2563EB] bg-[#EEF4FF] ring-2 ring-[#2563EB]/10'
                  : 'border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]'
                  }`}
              >

                <div className="flex items-center gap-2">

                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${notificationRecipientMode ===
                      'individual'
                      ? 'border-[#2563EB]'
                      : 'border-[#CBD5E1]'
                      }`}
                  >

                    {notificationRecipientMode ===
                      'individual' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                      )}

                  </div>

                  <UserPlus
                    size={17}
                    className="text-[#2563EB]"
                  />

                  <span className="text-sm font-semibold text-[#0F172A]">
                    Individual Users
                  </span>

                </div>

                <p className="text-[11px] text-[#64748B] mt-2 ml-7">
                  Select specific HOD or Dean
                </p>

              </button>

            </div>
          </div>

          {/* ROLE MODE */}

          {notificationRecipientMode ===
            'role' && (

              <div className="space-y-3">

                <div>

                  <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
                    Select Role
                  </label>

                  <select
                    value={
                      selectedNotificationRole
                    }
                    disabled={
                      creatingNotification
                    }
                    onChange={e =>
                      setSelectedNotificationRole(
                        e.target.value as
                        | 'HOD'
                        | 'Dean'
                      )
                    }
                    className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm text-[#0F172A] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                  >

                    <option value="HOD">
                      HOD
                    </option>

                    <option value="Dean">
                      Dean
                    </option>

                  </select>
                </div>

                {/* ROLE RECIPIENT PREVIEW */}

                <div className="p-4 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF]">

                  <div className="flex items-start gap-3">

                    <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0">
                      <UsersRound
                        size={18}
                        className="text-[#2563EB]"
                      />
                    </div>

                    <div className="flex-1">

                      <p className="text-sm font-semibold text-[#1E3A8A]">

                        {loadingUsers
                          ? 'Finding users...'
                          : `${usersForSelectedRole.length} ${selectedNotificationRole} user${usersForSelectedRole.length ===
                            1
                            ? ''
                            : 's'
                          } selected`}

                      </p>

                      <p className="text-xs text-[#3B82F6] mt-0.5">
                        Every available real user with this role will receive the notification.
                      </p>

                    </div>
                  </div>
                </div>

                {/* USERS PREVIEW */}

                {!loadingUsers &&
                  usersForSelectedRole.length >
                  0 && (

                    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">

                      <div className="px-3 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0]">

                        <span className="text-xs font-semibold text-[#475569]">
                          Users who will receive it
                        </span>

                      </div>

                      <div className="max-h-40 overflow-y-auto">

                        {usersForSelectedRole.map(
                          recipient => (

                            <div
                              key={
                                recipient.id
                              }
                              className="flex items-center gap-3 px-3 py-2.5 border-b border-[#F1F5F9] last:border-b-0"
                            >

                              <div className="w-8 h-8 rounded-full bg-[#E0E7FF] flex items-center justify-center shrink-0">

                                <span className="text-xs font-bold text-[#3730A3]">
                                  {recipient.name
                                    ?.charAt(
                                      0
                                    )
                                    ?.toUpperCase() ||
                                    'U'}
                                </span>

                              </div>

                              <div className="flex-1 min-w-0">

                                <div className="text-sm font-medium text-[#0F172A] truncate">
                                  {
                                    recipient.name
                                  }
                                </div>

                                <div className="text-xs text-[#64748B] truncate">
                                  {
                                    recipient.email
                                  }
                                </div>

                                {recipient.department && (
                                  <div className="text-[10px] text-[#94A3B8] truncate mt-0.5">
                                    {
                                      recipient.department
                                    }
                                  </div>
                                )}

                              </div>

                              <span
                                className={`text-[10px] font-semibold ${normalizeStatus(
                                  recipient.status
                                ) ===
                                  'Active'
                                  ? 'text-[#059669]'
                                  : 'text-[#D97706]'
                                  }`}
                              >
                                {normalizeStatus(
                                  recipient.status
                                )}
                              </span>

                            </div>
                          )
                        )}

                      </div>
                    </div>
                  )}

                {!loadingUsers &&
                  usersForSelectedRole.length ===
                  0 && (

                    <div className="p-4 rounded-lg bg-[#FEF3C7] border border-[#FDE68A]">

                      <p className="text-xs text-[#92400E]">
                        No users found with the selected role.
                      </p>

                    </div>
                  )}

              </div>
            )}

          {/* INDIVIDUAL MODE */}

          {notificationRecipientMode ===
            'individual' && (

              <div>

                <div className="flex items-center justify-between mb-1.5">

                  <label className="block text-sm font-semibold text-[#0F172A]">
                    Select Users
                  </label>

                  <span className="text-xs font-semibold text-[#2563EB]">
                    {
                      notificationRecipients.length
                    } selected
                  </span>

                </div>

                {/* SEARCH */}

                <div className="relative mb-2">

                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"
                  />

                  <input
                    type="text"
                    value={
                      notificationUserSearch
                    }
                    onChange={e =>
                      setNotificationUserSearch(
                        e.target.value
                      )
                    }
                    disabled={
                      creatingNotification
                    }
                    placeholder="Search HOD or Dean by name, email or department..."
                    className="w-full border border-[#E2E8F0] rounded-lg pl-9 pr-3 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                  />

                </div>

                {/* SELECT ALL / CLEAR */}

                <div className="flex items-center justify-between gap-2 mb-2">

                  <div className="flex gap-2">

                    <button
                      type="button"
                      onClick={
                        selectAllNotificationRecipients
                      }
                      disabled={
                        creatingNotification ||
                        filteredNotificationUsers.length ===
                        0
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#EEF4FF] text-[#2563EB] hover:bg-[#DBEAFE] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >

                      <CheckSquare
                        size={14}
                      />

                      Select All

                    </button>

                    <button
                      type="button"
                      onClick={
                        clearNotificationRecipients
                      }
                      disabled={
                        creatingNotification ||
                        notificationRecipients.length ===
                        0
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >

                      <X
                        size={14}
                      />

                      Clear

                    </button>

                  </div>

                  <span className="text-[11px] text-[#94A3B8]">
                    {
                      filteredNotificationUsers.length
                    } available
                  </span>

                </div>

                {/* USER LIST */}

                <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">

                  {loadingUsers ? (

                    <div className="py-8 text-center">

                      <div className="w-6 h-6 border-2 border-[#CBD5E1] border-t-[#2563EB] rounded-full animate-spin mx-auto" />

                      <p className="text-xs text-[#94A3B8] mt-2">
                        Loading HOD and Dean users...
                      </p>

                    </div>

                  ) : usersError ? (

                    <div className="py-8 px-4 text-center">

                      <AlertTriangle
                        size={20}
                        className="mx-auto text-[#DC2626]"
                      />

                      <p className="text-xs text-[#B91C1C] mt-2">
                        {usersError}
                      </p>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          void loadUsers()
                        }
                        className="mt-3"
                      >
                        Retry
                      </Button>

                    </div>

                  ) : filteredNotificationUsers.length ===
                    0 ? (

                    <div className="py-8 text-center">

                      <UserPlus
                        size={20}
                        className="mx-auto text-[#94A3B8]"
                      />

                      <p className="text-xs text-[#64748B] mt-2">
                        No HOD or Dean users found.
                      </p>

                    </div>

                  ) : (

                    <div className="max-h-56 overflow-y-auto">

                      {filteredNotificationUsers.map(
                        recipient => {

                          const selected =
                            notificationRecipients.includes(
                              recipient.id
                            )

                          return (

                            <button
                              key={
                                recipient.id
                              }
                              type="button"
                              disabled={
                                creatingNotification
                              }
                              onClick={() =>
                                toggleNotificationRecipient(
                                  recipient.id
                                )
                              }
                              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left border-b border-[#F1F5F9] last:border-b-0 transition-colors ${selected
                                ? 'bg-[#EEF4FF]'
                                : 'hover:bg-[#F8FAFC]'
                                }`}
                            >

                              <div
                                className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${selected
                                  ? 'bg-[#2563EB] border-[#2563EB]'
                                  : 'border-[#CBD5E1] bg-white'
                                  }`}
                              >

                                {selected && (
                                  <Check
                                    size={13}
                                    className="text-white"
                                  />
                                )}

                              </div>

                              <div className="w-8 h-8 rounded-full bg-[#E0E7FF] flex items-center justify-center shrink-0">

                                <span className="text-xs font-bold text-[#3730A3]">
                                  {recipient.name
                                    ?.charAt(
                                      0
                                    )
                                    ?.toUpperCase() ||
                                    'U'}
                                </span>

                              </div>

                              <div className="flex-1 min-w-0">

                                <div className="text-sm font-medium text-[#0F172A] truncate">
                                  {
                                    recipient.name
                                  }
                                </div>

                                <div className="text-xs text-[#64748B] truncate">
                                  {
                                    recipient.email
                                  }
                                </div>

                                <div className="text-[10px] text-[#94A3B8] truncate mt-0.5">

                                  {normalizeRole(
                                    recipient.role
                                  )}

                                  {recipient.department
                                    ? ` · ${recipient.department}`
                                    : ''}

                                </div>

                              </div>

                              <span
                                className={`text-[10px] font-semibold shrink-0 ${normalizeStatus(
                                  recipient.status
                                ) ===
                                  'Active'
                                  ? 'text-[#059669]'
                                  : 'text-[#D97706]'
                                  }`}
                              >
                                {normalizeStatus(
                                  recipient.status
                                )}
                              </span>

                            </button>
                          )
                        }
                      )}

                    </div>
                  )}

                </div>

                {/* SELECTED CHIPS */}

                {selectedNotificationUsers.length >
                  0 && (

                    <div className="mt-3">

                      <div className="text-[11px] font-semibold text-[#64748B] mb-1.5">
                        Selected recipients
                      </div>

                      <div className="flex flex-wrap gap-1.5">

                        {selectedNotificationUsers.map(
                          recipient => (

                            <button
                              type="button"
                              key={
                                recipient.id
                              }
                              disabled={
                                creatingNotification
                              }
                              onClick={() =>
                                toggleNotificationRecipient(
                                  recipient.id
                                )
                              }
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#EEF4FF] text-[#1D4ED8] text-xs font-medium hover:bg-[#DBEAFE]"
                            >

                              <span>
                                {
                                  recipient.name
                                }
                              </span>

                              <X
                                size={12}
                              />

                            </button>
                          )
                        )}

                      </div>
                    </div>
                  )}

              </div>
            )}

          {/* TITLE */}

          <div>

            <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
              Notification Title
            </label>

            <input
              type="text"
              value={
                notificationTitle
              }
              onChange={e =>
                setNotificationTitle(
                  e.target.value
                )
              }
              disabled={
                creatingNotification
              }
              maxLength={120}
              placeholder="Enter notification title..."
              className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
            />

            <div className="text-[10px] text-[#94A3B8] text-right mt-1">
              {notificationTitle.length}/120
            </div>

          </div>

          {/* MESSAGE */}

          <div>

            <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
              Message
            </label>

            <textarea
              value={
                notificationMessage
              }
              onChange={e =>
                setNotificationMessage(
                  e.target.value
                )
              }
              disabled={
                creatingNotification
              }
              maxLength={500}
              rows={4}
              placeholder="Write your notification message..."
              className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none"
            />

            <div className="text-[10px] text-[#94A3B8] text-right mt-1">
              {notificationMessage.length}/500
            </div>

          </div>

          {/* NOTIFICATION TYPE */}

          <div>

            <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
              Notification Type
            </label>

            <select
              value={
                notificationType
              }
              disabled={
                creatingNotification
              }
              onChange={e =>
                setNotificationType(
                  e.target.value as Notification['type']
                )
              }
              className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm text-[#0F172A] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
            >

              <option value="system">
                System
              </option>

              <option value="exam">
                Examination
              </option>

              <option value="evaluation">
                Evaluation
              </option>

              <option value="announcement">
                Announcement
              </option>

            </select>

          </div>

          {/* RECIPIENT SUMMARY */}

          <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">

            <div className="flex items-center justify-between">

              <div className="flex items-center gap-2">

                <UsersRound
                  size={15}
                  className="text-[#64748B]"
                />

                <span className="text-xs font-medium text-[#475569]">
                  Recipients
                </span>

              </div>

              <span className="text-sm font-bold text-[#0F172A]">
                {
                  finalNotificationRecipientCount
                }
              </span>

            </div>

            <p className="text-[10px] text-[#94A3B8] mt-1">

              {notificationRecipientMode ===
                'role'
                ? `All ${selectedNotificationRole} users`
                : 'Selected HOD / Dean users'}

            </p>

          </div>

          {/* FOOTER */}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#E2E8F0]">

            <Button
              variant="ghost"
              size="md"
              onClick={
                closeNotificationModal
              }
              disabled={
                creatingNotification
              }
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              size="md"
              onClick={
                handleCreateNotification
              }
              disabled={
                creatingNotification ||
                finalNotificationRecipientCount ===
                0 ||
                !notificationTitle.trim() ||
                !notificationMessage.trim()
              }
            >

              {creatingNotification ? (

                <span className="flex items-center gap-2">

                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />

                  Sending...

                </span>

              ) : (

                <span className="flex items-center gap-2">

                  <Send
                    size={15}
                  />

                  Send to{' '}
                  {
                    finalNotificationRecipientCount
                  } User
                  {finalNotificationRecipientCount ===
                    1
                    ? ''
                    : 's'}

                </span>

              )}

            </Button>

          </div>

        </div>
      </Modal>

    </AppShell>
  )
}