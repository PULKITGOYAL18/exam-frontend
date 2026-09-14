import { AppShell } from '@/layouts'
import { useEffect, useMemo, useState } from 'react'
import { useLogout } from '@/hooks'

import {
  Card,
  CardHeader,
  Button,
  Alert,
  Modal,
  Table,
  Th,
  Td,
  RoleBadge,
  StatusBadge,
  QuickAction,
  StatCard,
  HBarChart,
  DonutChart,
  ActivityTimeline,
  NotificationList,
  LogoutModal,
} from '@/components/common'

import type {
  User,
  Screen,
  UserRole,
  Notification,
} from '@/types'

import {
  Users,
  GraduationCap,
  Building2,
  Hourglass,
  BookOpen,
  Plus,
  UserPlus,
  Link,
  ClipboardList,
  Settings,
  Bot,
  FileSearch,
  RefreshCw,
  Bell,
  Check,
  X,
  CheckSquare,
  Search,
  UsersRound,
} from 'lucide-react'

import {
  getAdminUsers,
  getAdminAuditLogs,
} from '@/services/admin/adminApi'

import {
  getNotifications,
  markNotificationAsRead,
  createNotification,
} from '@/services/notification/notificationApi'

import {
  SYSTEM_HEALTH,
  DEPARTMENTS_ADMIN,
  ADMIN_ACTIVITY,
  DEPT_LOAD,
} from '@/services/admin/mockData'

/* ============================================================
BACKEND TYPES
============================================================ */

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

interface BackendAuditLog {
  id: string
  actorId?: string
  actorRole?: string
  action?: string
  targetUserId?: string
  targetEmail?: string
  targetRole?: string
  details?: Record<string, unknown>
  timestamp?: string
}

/* ============================================================
HEALTH PILL
============================================================ */

function HealthPill({
  label,
  value,
  status,
}: {
  label: string
  value: string
  status: string
}) {
  const dot =
    status === 'good'
      ? 'bg-[#059669]'
      : status === 'warn'
        ? 'bg-[#D97706]'
        : 'bg-[#DC2626]'

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-2 h-2 rounded-full shrink-0 ${dot}`}
      />

      <div className="flex-1 min-w-0">
        <div className="text-xs text-[#94A3B8]">
          {label}
        </div>

        <div className="text-sm font-semibold text-[#0F172A] truncate">
          {value}
        </div>
      </div>
    </div>
  )
}

/* ============================================================
ROLE NORMALIZER
============================================================ */

function normalizeRole(role?: string): string {
  if (!role) return 'Unknown'

  const value = role.toLowerCase().trim()

  if (value === 'faculty') return 'Faculty'
  if (value === 'hod') return 'HOD'
  if (value === 'dean') return 'Dean'
  if (value === 'admin') return 'Admin'

  return role
}

/* ============================================================
STATUS NORMALIZER
============================================================ */

function normalizeStatus(status?: string): string {
  if (!status) return 'Unknown'

  const value = status.toLowerCase().trim()

  if (value === 'active') return 'Active'
  if (value === 'suspended') return 'Suspended'
  if (value === 'inactive') return 'Inactive'
  if (value === 'pending') return 'Pending Activation'

  if (value === 'pending activation') {
    return 'Pending Activation'
  }

  if (value === 'locked') return 'Locked'

  return status
}

/* ============================================================
AUDIT ACTION DISPLAY
============================================================ */

function formatAuditAction(action?: string): string {
  if (!action) return 'Unknown Action'

  return action
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

/* ============================================================
AUDIT TYPE
============================================================ */

function getAuditType(
  action?: string
): 'success' | 'error' | 'warning' | 'info' {
  const value = action?.toUpperCase() || ''

  if (
    value.includes('DELETE') ||
    value.includes('SUSPEND')
  ) {
    return 'error'
  }

  if (
    value.includes('ACTIVATE') ||
    value.includes('CREATE') ||
    value.includes('UPDATE')
  ) {
    return 'success'
  }

  return 'info'
}

/* ============================================================
IST TIME FORMATTER
============================================================ */

function formatAuditTime(timestamp?: string): string {
  if (!timestamp) return '—'

  try {
    let normalizedTimestamp = timestamp.trim()

    const hasTimezone =
      normalizedTimestamp.endsWith('Z') ||
      /[+-]\d{2}:\d{2}$/.test(normalizedTimestamp)

    if (!hasTimezone) {
      normalizedTimestamp += 'Z'
    }

    const date = new Date(normalizedTimestamp)

    if (Number.isNaN(date.getTime())) {
      return timestamp
    }

    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date)
  } catch (error) {
    console.error(
      'AUDIT TIME FORMAT ERROR:',
      error
    )

    return timestamp
  }
}

/* ============================================================
ADMIN DASHBOARD
============================================================ */

interface AdminDashboardProps {
  user: User
  onNavigate: (s: Screen) => void
  onLogout: () => void
}

export default function AdminDashboard({
  user,
  onNavigate,
  onLogout,
}: AdminDashboardProps) {
  const {
    showLogout,
    openLogout,
    closeLogout,
  } = useLogout()

  /* ==========================================================
  STATE
  ========================================================== */

  const [users, setUsers] = useState<BackendUser[]>([])
  const [auditLogs, setAuditLogs] = useState<BackendAuditLog[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])

  const [loadingUsers, setLoadingUsers] = useState(true)
  const [loadingLogs, setLoadingLogs] = useState(true)
  const [loadingNotifications, setLoadingNotifications] =
    useState(true)

  const [usersError, setUsersError] =
    useState<string | null>(null)

  const [logsError, setLogsError] =
    useState<string | null>(null)

  const [notificationsError, setNotificationsError] =
    useState<string | null>(null)

  const [settingsModal, setSettingsModal] =
    useState<'ocr' | 'ai' | null>(null)

  const [ocrThreshold, setOcrThreshold] =
    useState('0.85')

  const [aiModel, setAiModel] =
    useState('gpt-4-turbo')

  /* ==========================================================
  NOTIFICATION MODAL
  ========================================================== */

  const [notificationModal, setNotificationModal] =
    useState(false)

  /*
   * Recipient mode:
   *
   * role       -> notify everyone having selected role
   * individual -> manually select users using checkboxes
   */
  const [notificationRecipientMode, setNotificationRecipientMode] =
    useState<'role' | 'individual'>('individual')

  /* ==========================================================
  ROLE NOTIFICATION STATE
  ========================================================== */

  const [selectedNotificationRole, setSelectedNotificationRole] =
    useState<'Faculty' | 'HOD' | 'Dean' | 'Admin'>('Faculty')

  /* ==========================================================
  INDIVIDUAL NOTIFICATION STATE
  ========================================================== */

  const [notificationRecipients, setNotificationRecipients] =
    useState<string[]>([])

  const [notificationUserSearch, setNotificationUserSearch] =
    useState('')

  /* ==========================================================
  NOTIFICATION FORM
  ========================================================== */

  const [notificationTitle, setNotificationTitle] =
    useState('')

  const [notificationMessage, setNotificationMessage] =
    useState('')

  const [notificationType, setNotificationType] =
    useState<Notification['type']>('system')

  const [creatingNotification, setCreatingNotification] =
    useState(false)

  const [notificationCreateError, setNotificationCreateError] =
    useState<string | null>(null)

  const [notificationCreateSuccess, setNotificationCreateSuccess] =
    useState<string | null>(null)

  /* ==========================================================
  LOAD USERS
  ========================================================== */

  const loadUsers = async () => {
    try {
      setLoadingUsers(true)
      setUsersError(null)

      const response = await getAdminUsers()

      setUsers(response.users || [])
    } catch (error) {
      console.error(
        'ADMIN DASHBOARD USERS ERROR:',
        error
      )

      setUsersError(
        error instanceof Error
          ? error.message
          : 'Unable to load users'
      )
    } finally {
      setLoadingUsers(false)
    }
  }

  /* ==========================================================
  LOAD AUDIT LOGS
  ========================================================== */

  const loadAuditLogs = async () => {
    try {
      setLoadingLogs(true)
      setLogsError(null)

      const response = await getAdminAuditLogs()

      setAuditLogs(response.logs || [])
    } catch (error) {
      console.error(
        'ADMIN DASHBOARD AUDIT LOG ERROR:',
        error
      )

      setLogsError(
        error instanceof Error
          ? error.message
          : 'Unable to load audit logs'
      )
    } finally {
      setLoadingLogs(false)
    }
  }

  /* ==========================================================
  GET CURRENT ADMIN ID
  ========================================================== */

  const getCurrentUserId = () => {
    const notificationUser = user as User & {
      id?: string
      _id?: string
    }

    return (
      notificationUser.id ||
      notificationUser._id ||
      ''
    )
  }

  /* ==========================================================
  LOAD NOTIFICATIONS
  ========================================================== */

  const loadNotifications = async () => {
    const recipientId = getCurrentUserId()

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

      const response = await getNotifications(
        recipientId
      )

      setNotifications(response || [])
    } catch (error) {
      console.error(
        'ADMIN DASHBOARD NOTIFICATION ERROR:',
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

  /* ==========================================================
  MARK NOTIFICATION AS READ
  ========================================================== */

  const handleMarkNotificationAsRead = async (
    notificationId: string
  ) => {
    try {
      await markNotificationAsRead(notificationId)

      setNotifications((previous) =>
        previous.map((notification) =>
          notification.id === notificationId
            ? {
              ...notification,
              is_read: true,
            }
            : notification
        )
      )
    } catch (error) {
      console.error(
        'ADMIN DASHBOARD MARK NOTIFICATION ERROR:',
        error
      )

      throw error
    }
  }

  /* ==========================================================
  USERS FILTERED BY SELECTED ROLE
  ========================================================== */

  const usersForSelectedRole = useMemo(() => {
    return users.filter(
      (recipient) =>
        normalizeRole(recipient.role) ===
        selectedNotificationRole
    )
  }, [users, selectedNotificationRole])

  /* ==========================================================
  INDIVIDUAL USER SEARCH
  ========================================================== */

  const filteredNotificationUsers = useMemo(() => {
    const search = notificationUserSearch
      .trim()
      .toLowerCase()

    if (!search) {
      return users
    }

    return users.filter((recipient) => {
      const name =
        recipient.name?.toLowerCase() || ''

      const email =
        recipient.email?.toLowerCase() || ''

      const role =
        normalizeRole(recipient.role).toLowerCase()

      const department =
        recipient.department?.toLowerCase() || ''

      return (
        name.includes(search) ||
        email.includes(search) ||
        role.includes(search) ||
        department.includes(search)
      )
    })
  }, [users, notificationUserSearch])

  /* ==========================================================
  SELECTED INDIVIDUAL USER OBJECTS
  ========================================================== */

  const selectedNotificationUsers = useMemo(() => {
    return users.filter((recipient) =>
      notificationRecipients.includes(
        recipient.id
      )
    )
  }, [users, notificationRecipients])

  /* ==========================================================
  FINAL NOTIFICATION RECIPIENT IDS
  ========================================================== */

  const finalNotificationRecipientIds = useMemo(() => {
    if (
      notificationRecipientMode === 'role'
    ) {
      return usersForSelectedRole
        .map((recipient) => recipient.id)
        .filter(Boolean)
    }

    return notificationRecipients
  }, [
    notificationRecipientMode,
    usersForSelectedRole,
    notificationRecipients,
  ])

  /* ==========================================================
  FINAL NOTIFICATION RECIPIENT COUNT
  ========================================================== */

  const finalNotificationRecipientCount =
    finalNotificationRecipientIds.length

  /* ==========================================================
  TOGGLE INDIVIDUAL USER
  ========================================================== */

  const toggleNotificationRecipient = (
    userId: string
  ) => {
    setNotificationRecipients((previous) => {
      if (previous.includes(userId)) {
        return previous.filter(
          (id) => id !== userId
        )
      }

      return [...previous, userId]
    })
  }

  /* ==========================================================
  SELECT ALL INDIVIDUAL USERS
  ========================================================== */

  const selectAllNotificationRecipients = () => {
    const visibleUserIds =
      filteredNotificationUsers
        .map((recipient) => recipient.id)
        .filter(Boolean)

    setNotificationRecipients((previous) => {
      const combined = new Set([
        ...previous,
        ...visibleUserIds,
      ])

      return Array.from(combined)
    })
  }

  /* ==========================================================
  CLEAR INDIVIDUAL USERS
  ========================================================== */

  const clearNotificationRecipients = () => {
    setNotificationRecipients([])
  }

  /* ==========================================================
  CHANGE RECIPIENT MODE
  ========================================================== */

  const handleNotificationRecipientModeChange = (
    mode: 'role' | 'individual'
  ) => {
    if (creatingNotification) return

    setNotificationRecipientMode(mode)

    setNotificationCreateError(null)
    setNotificationCreateSuccess(null)

    /*
     * We intentionally clear individual selections when
     * switching modes so the admin never accidentally
     * sends to a mixed recipient list.
     */
    if (mode === 'role') {
      setNotificationRecipients([])
    }
  }

  /* ==========================================================
  CREATE NOTIFICATION
  ========================================================== */

  const handleCreateNotification = async () => {
    setNotificationCreateError(null)
    setNotificationCreateSuccess(null)

    /* --------------------------------------------------------
    VALIDATE RECIPIENTS
    -------------------------------------------------------- */

    if (
      finalNotificationRecipientIds.length === 0
    ) {
      if (
        notificationRecipientMode === 'role'
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

    /* --------------------------------------------------------
    VALIDATE TITLE
    -------------------------------------------------------- */

    if (!notificationTitle.trim()) {
      setNotificationCreateError(
        'Please enter a notification title.'
      )
      return
    }

    /* --------------------------------------------------------
    VALIDATE MESSAGE
    -------------------------------------------------------- */

    if (!notificationMessage.trim()) {
      setNotificationCreateError(
        'Please enter a notification message.'
      )
      return
    }

    try {
      setCreatingNotification(true)

      /*
       * IMPORTANT:
       *
       * Whether admin selects:
       *
       * 1. Faculty role
       * 2. Individual users
       *
       * both eventually become an array of user IDs.
       *
       * Existing createNotification API can therefore
       * remain unchanged.
       */

      const recipientIds =
        finalNotificationRecipientIds

      console.log(
        'NOTIFICATION RECIPIENT MODE:',
        notificationRecipientMode
      )

      console.log(
        'NOTIFICATION RECIPIENT IDS:',
        recipientIds
      )

      const results = await Promise.allSettled(
        recipientIds.map(
          (recipientId) =>
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
          (result) =>
            result.status === 'fulfilled'
        )

      const failedNotifications =
        results.filter(
          (result) =>
            result.status === 'rejected'
        )

      console.log(
        'NOTIFICATION RESULTS:',
        results
      )

      /* ------------------------------------------------------
      ADD CURRENT ADMIN NOTIFICATION TO UI
      ------------------------------------------------------ */

      const currentUserId =
        getCurrentUserId()

      const currentUserIndex =
        recipientIds.indexOf(
          currentUserId
        )

      const currentUserResult =
        currentUserIndex >= 0
          ? results[currentUserIndex]
          : undefined

      if (
        currentUserResult &&
        currentUserResult.status ===
        'fulfilled'
      ) {
        setNotifications((previous) => [
          currentUserResult.value,
          ...previous,
        ])
      }

      /* ------------------------------------------------------
      NOTHING SENT
      ------------------------------------------------------ */

      if (
        successfulNotifications.length === 0
      ) {
        setNotificationCreateError(
          'Failed to send notification to all selected users.'
        )

        return
      }

      /* ------------------------------------------------------
      PARTIAL SUCCESS
      ------------------------------------------------------ */

      if (
        failedNotifications.length > 0
      ) {
        setNotificationCreateSuccess(
          `Notification sent to ${successfulNotifications.length} user(s). Failed for ${failedNotifications.length} user(s).`
        )
      } else {
        /* ----------------------------------------------------
        COMPLETE SUCCESS
        ---------------------------------------------------- */

        if (
          notificationRecipientMode ===
          'role'
        ) {
          setNotificationCreateSuccess(
            `Notification sent successfully to all ${selectedNotificationRole} users (${successfulNotifications.length}).`
          )
        } else {
          setNotificationCreateSuccess(
            `Notification sent successfully to ${successfulNotifications.length} user(s).`
          )
        }
      }

      /* ------------------------------------------------------
      RESET FORM
      ------------------------------------------------------ */

      setNotificationRecipients([])
      setNotificationTitle('')
      setNotificationMessage('')
      setNotificationType('system')
      setNotificationUserSearch('')

      /*
       * Keep role mode and selected role unchanged.
       *
       * This is useful if the admin wants to send another
       * notification to the same group.
       */

      setTimeout(() => {
        setNotificationModal(false)
        setNotificationCreateSuccess(null)
      }, 1500)
    } catch (error) {
      console.error(
        'ADMIN DASHBOARD CREATE NOTIFICATION ERROR:',
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

  /* ==========================================================
  OPEN NOTIFICATION MODAL
  ========================================================== */

  const openNotificationModal = () => {
    setNotificationCreateError(null)
    setNotificationCreateSuccess(null)

    setNotificationRecipients([])
    setNotificationTitle('')
    setNotificationMessage('')
    setNotificationType('system')
    setNotificationUserSearch('')

    /*
     * Default to individual mode.
     *
     * Change this to 'role' if you want role-based
     * notifications to be the default.
     */
    setNotificationRecipientMode(
      'individual'
    )

    setSelectedNotificationRole('Faculty')

    setNotificationModal(true)
  }

  /* ==========================================================
  CLOSE NOTIFICATION MODAL
  ========================================================== */

  const closeNotificationModal = () => {
    if (creatingNotification) return

    setNotificationModal(false)

    setNotificationCreateError(null)
    setNotificationCreateSuccess(null)

    setNotificationRecipients([])
    setNotificationUserSearch('')
  }

  /* ==========================================================
  INITIAL LOAD
  ========================================================== */

  useEffect(() => {
    void loadUsers()
    void loadAuditLogs()
    void loadNotifications()
  }, [user])

  /* ==========================================================
  USER STATISTICS
  ========================================================== */

  const totalUsers = users.length

  const activeUsers = users.filter(
    (u) =>
      normalizeStatus(u.status) ===
      'Active'
  ).length

  const activeFaculty = users.filter(
    (u) =>
      normalizeRole(u.role) ===
      'Faculty' &&
      normalizeStatus(u.status) ===
      'Active'
  ).length

  const pendingUsers = users.filter(
    (u) =>
      normalizeStatus(u.status) ===
      'Pending Activation'
  ).length

  const suspendedUsers = users.filter(
    (u) =>
      normalizeStatus(u.status) ===
      'Suspended'
  ).length

  /* ==========================================================
  ROLE DISTRIBUTION
  ========================================================== */

  const roleDistribution = useMemo(() => {
    const roles = [
      'Faculty',
      'HOD',
      'Dean',
      'Admin',
    ]

    return roles.map((role) => ({
      label: role,
      value: users.filter(
        (u) =>
          normalizeRole(u.role) === role
      ).length,
    }))
  }, [users])

  /* ==========================================================
  BACKEND AUDIT LOGS
  ========================================================== */

  const recentAuditLogs = useMemo(() => {
    return auditLogs.slice(0, 10)
  }, [auditLogs])

  /* ==========================================================
  REFRESH EVERYTHING
  ========================================================== */

  const refreshDashboard = async () => {
    await Promise.all([
      loadUsers(),
      loadAuditLogs(),
      loadNotifications(),
    ])
  }

  /* ==========================================================
  RENDER
  ========================================================== */

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
      {/* ====================================================
          FULL DASHBOARD SCROLL CONTAINER
      ==================================================== */}

      <div
        className="
          h-full
          min-h-0
          w-full
          overflow-y-auto
          overflow-x-hidden
          pr-2
          pb-8
          space-y-6
        "
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor:
            '#94A3B8 transparent',
        }}
      >
        {/* ====================================================
            WELCOME BANNER
        ==================================================== */}

        <Card className="p-0 overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-[#0F2142] via-[#1B3A6B] to-[#234E9A]">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-blue-300 text-sm font-medium">
                  System Administration
                </p>

                <h1 className="text-2xl font-bold text-white mt-0.5 tracking-tight">
                  {user.name}
                </h1>

                <p className="text-blue-200 text-sm mt-1">
                  {user.designation}
                </p>

                <div className="mt-3">
                  <RoleBadge role={user.role} />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={refreshDashboard}
                  disabled={
                    loadingUsers ||
                    loadingLogs ||
                    loadingNotifications
                  }
                  leftIcon={
                    <RefreshCw
                      size={14}
                      className={
                        loadingUsers ||
                          loadingLogs ||
                          loadingNotifications
                          ? 'animate-spin'
                          : ''
                      }
                    />
                  }
                >
                  Refresh
                </Button>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-white/10 rounded-xl p-3 min-w-[90px]">
                    <div className="text-2xl font-bold text-white">
                      {loadingUsers
                        ? '…'
                        : totalUsers}
                    </div>

                    <div className="text-blue-300 text-xs mt-0.5">
                      Total Users
                    </div>
                  </div>

                  <div className="bg-white/10 rounded-xl p-3 min-w-[90px]">
                    <div className="text-2xl font-bold text-white">
                      {DEPARTMENTS_ADMIN.length}
                    </div>

                    <div className="text-blue-300 text-xs mt-0.5">
                      Departments
                    </div>
                  </div>

                  <div className="bg-white/10 rounded-xl p-3 min-w-[90px]">
                    <div className="text-2xl font-bold text-white">
                      {activeUsers}
                    </div>

                    <div className="text-blue-300 text-xs mt-0.5">
                      Active Users
                    </div>
                  </div>

                  <div className="bg-white/10 rounded-xl p-3 min-w-[90px]">
                    <div className="text-2xl font-bold text-white">
                      {pendingUsers}
                    </div>

                    <div className="text-blue-300 text-xs mt-0.5">
                      Pending Activation
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* ====================================================
            ERROR
        ==================================================== */}

        {usersError && (
          <Alert
            variant="error"
            title="Unable to load users"
            message={usersError}
          />
        )}

        {logsError && (
          <Alert
            variant="error"
            title="Unable to load audit logs"
            message={logsError}
          />
        )}

        {/* ====================================================
            PENDING USERS
        ==================================================== */}

        {!loadingUsers &&
          pendingUsers > 0 && (
            <div className="space-y-2">
              <Alert
                variant="warning"
                title={`${pendingUsers} Pending User Activations`}
                message="New user accounts are waiting for activation."
              />

              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  onNavigate('admin-users')
                }
              >
                Manage Users →
              </Button>
            </div>
          )}

        {/* ====================================================
            STATS
        ==================================================== */}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            label="Total Users"
            value={
              loadingUsers
                ? '...'
                : totalUsers
            }
            color="#1B3A6B"
            icon={<Users size={20} />}
          />

          <StatCard
            label="Active Faculty"
            value={
              loadingUsers
                ? '...'
                : activeFaculty
            }
            color="#3B5DE8"
            icon={
              <GraduationCap size={20} />
            }
          />

          <StatCard
            label="Departments"
            value={DEPARTMENTS_ADMIN.length}
            color="#7C3AED"
            icon={<Building2 size={20} />}
          />

          <StatCard
            label="Pending Requests"
            value={
              loadingUsers
                ? '...'
                : pendingUsers
            }
            color="#D97706"
            icon={<Hourglass size={20} />}
            trend={{
              direction: 'neutral',
              text: 'need activation',
            }}
          />

          <StatCard
            label="Courses"
            value={75}
            sub="across all depts"
            color="#059669"
            icon={<BookOpen size={20} />}
          />

          <StatCard
            label="Audit Events"
            value={
              loadingLogs
                ? '...'
                : auditLogs.length
            }
            sub="recent"
            color="#94A3B8"
            icon={
              <FileSearch size={20} />
            }
          />
        </div>

        {/* ====================================================
            QUICK ACTIONS
        ==================================================== */}

        <div>
          <h2 className="text-lg font-semibold text-[#0F172A] mb-4">
            Quick Actions
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-3">
            <QuickAction
              variant="column"
              icon={<Plus size={20} />}
              label="Add Faculty"
              sub="Create faculty account"
              onClick={() =>
                onNavigate(
                  'admin-create-user'
                )
              }
              color="#1B3A6B"
            />

            <QuickAction
              variant="column"
              icon={<UserPlus size={20} />}
              label="Add HOD"
              sub="Assign department head"
              onClick={() =>
                onNavigate(
                  'admin-create-user'
                )
              }
              color="#3B5DE8"
            />

            <QuickAction
              variant="column"
              icon={
                <GraduationCap size={20} />
              }
              label="Add Dean"
              sub="Create dean account"
              onClick={() =>
                onNavigate(
                  'admin-create-user'
                )
              }
              color="#7C3AED"
            />

            <QuickAction
              variant="column"
              icon={<BookOpen size={20} />}
              label="Add Subject"
              sub="Register new subject"
              color="#0284C7"
            />

            <QuickAction
              variant="column"
              icon={<Link size={20} />}
              label="Assign Course"
              sub="Map faculty to course"
              color="#059669"
            />

            <QuickAction
              variant="column"
              icon={
                <ClipboardList size={20} />
              }
              label="Manage Users"
              sub="View all users"
              onClick={() =>
                onNavigate('admin-users')
              }
              color="#D97706"
            />

            <QuickAction
              variant="column"
              icon={<Settings size={20} />}
              label="OCR Settings"
              sub="Confidence & engine"
              onClick={() =>
                setSettingsModal('ocr')
              }
              color="#DC2626"
            />

            <QuickAction
              variant="column"
              icon={<Bot size={20} />}
              label="AI Settings"
              sub="Model & evaluation"
              onClick={() =>
                setSettingsModal('ai')
              }
              color="#059669"
            />

            <QuickAction
              variant="column"
              icon={<Bell size={20} />}
              label="Send Notification"
              sub="Notify users or roles"
              onClick={openNotificationModal}
              color="#2563EB"
            />
          </div>
        </div>

        {/* ====================================================
            MAIN CONTENT
        ==================================================== */}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* ==================================================
              LEFT CONTENT
          ================================================== */}

          <div className="xl:col-span-2 space-y-6">
            {/* USER MANAGEMENT SUMMARY */}

            <Card padding={false}>
              <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-base font-semibold text-[#0F172A]">
                    User Management
                  </h3>

                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    Live user data from MongoDB
                  </p>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    onNavigate('admin-users')
                  }
                >
                  Manage All Users →
                </Button>
              </div>

              {loadingUsers ? (
                <div className="p-10 text-center text-sm text-[#94A3B8]">
                  Loading users...
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <thead>
                      <tr>
                        <Th>Role</Th>
                        <Th>Total</Th>
                        <Th>Active</Th>
                        <Th>
                          Pending Activation
                        </Th>
                        <Th>Actions</Th>
                      </tr>
                    </thead>

                    <tbody>
                      {roleDistribution.map(
                        (row) => {
                          const active =
                            users.filter(
                              (u) =>
                                normalizeRole(
                                  u.role
                                ) ===
                                row.label &&
                                normalizeStatus(
                                  u.status
                                ) ===
                                'Active'
                            ).length

                          const pending =
                            users.filter(
                              (u) =>
                                normalizeRole(
                                  u.role
                                ) ===
                                row.label &&
                                normalizeStatus(
                                  u.status
                                ) ===
                                'Pending Activation'
                            ).length

                          return (
                            <tr
                              key={row.label}
                              className="hover:bg-[#F8FAFC]"
                            >
                              <Td>
                                <RoleBadge
                                  role={
                                    row.label as UserRole
                                  }
                                />
                              </Td>

                              <Td>
                                <span className="text-sm font-bold text-[#0F172A]">
                                  {row.value}
                                </span>
                              </Td>

                              <Td>
                                <div className="flex items-center gap-1.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#059669]" />

                                  <span className="text-sm text-[#0F172A]">
                                    {active}
                                  </span>
                                </div>
                              </Td>

                              <Td>
                                {pending > 0 ? (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#92400E]">
                                    {pending}{' '}
                                    pending
                                  </span>
                                ) : (
                                  <span className="text-xs text-[#94A3B8]">
                                    —
                                  </span>
                                )}
                              </Td>

                              <Td>
                                <button
                                  onClick={() =>
                                    onNavigate(
                                      'admin-users'
                                    )
                                  }
                                  className="text-xs font-semibold text-[#3B5DE8] hover:text-[#1B3A6B]"
                                >
                                  View →
                                </button>
                              </Td>
                            </tr>
                          )
                        }
                      )}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card>

            {/* DEPARTMENT MANAGEMENT */}

            <Card padding={false}>
              <div className="p-5 border-b border-[#E2E8F0]">
                <h3 className="text-base font-semibold text-[#0F172A]">
                  Department Overview
                </h3>

                <p className="text-xs text-[#94A3B8] mt-0.5">
                  All registered departments
                </p>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <thead>
                    <tr>
                      <Th>Code</Th>
                      <Th>Department</Th>
                      <Th>Faculty</Th>
                      <Th>Courses</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>

                  <tbody>
                    {DEPARTMENTS_ADMIN.map(
                      (dept) => (
                        <tr
                          key={dept.id}
                          className="hover:bg-[#F8FAFC]"
                        >
                          <Td>
                            <span className="text-xs font-bold text-[#94A3B8] bg-[#F1F5F9] px-2 py-0.5 rounded-md">
                              {dept.code}
                            </span>
                          </Td>

                          <Td>
                            <span className="text-sm font-medium text-[#0F172A]">
                              {dept.name}
                            </span>
                          </Td>

                          <Td>
                            <span className="text-sm text-[#475569]">
                              {dept.faculty}
                            </span>
                          </Td>

                          <Td>
                            <span className="text-sm text-[#475569]">
                              {dept.courses}
                            </span>
                          </Td>

                          <Td>
                            <StatusBadge status="Active" />
                          </Td>
                        </tr>
                      )
                    )}
                  </tbody>
                </Table>
              </div>
            </Card>

            {/* AUDIT LOGS */}

            <Card padding={false}>
              <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-base font-semibold text-[#0F172A]">
                    Audit Logs
                  </h3>

                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    Live admin activity from backend • IST
                  </p>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={loadAuditLogs}
                >
                  Refresh
                </Button>
              </div>

              {loadingLogs ? (
                <div className="p-10 text-center text-sm text-[#94A3B8]">
                  Loading audit logs...
                </div>
              ) : recentAuditLogs.length ===
                0 ? (
                <div className="p-10 text-center text-sm text-[#94A3B8]">
                  No audit logs available.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <thead>
                      <tr>
                        <Th>User</Th>
                        <Th>Action</Th>
                        <Th>Resource</Th>
                        <Th>Time (IST)</Th>
                      </tr>
                    </thead>

                    <tbody>
                      {recentAuditLogs.map(
                        (log) => {
                          const auditType =
                            getAuditType(
                              log.action
                            )

                          return (
                            <tr
                              key={log.id}
                              className="hover:bg-[#F8FAFC]"
                            >
                              <Td>
                                <div>
                                  <div className="text-sm font-medium text-[#0F172A]">
                                    {log.targetEmail ||
                                      log.actorId ||
                                      'System'}
                                  </div>

                                  <span className="text-xs text-[#94A3B8]">
                                    {normalizeRole(
                                      log.targetRole ||
                                      log.actorRole
                                    )}
                                  </span>
                                </div>
                              </Td>

                              <Td>
                                <div className="flex items-center gap-1.5">
                                  <div
                                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${auditType ===
                                        'success'
                                        ? 'bg-[#059669]'
                                        : auditType ===
                                          'error'
                                          ? 'bg-[#DC2626]'
                                          : 'bg-[#3B5DE8]'
                                      }`}
                                  />

                                  <span className="text-sm text-[#475569]">
                                    {formatAuditAction(
                                      log.action
                                    )}
                                  </span>
                                </div>
                              </Td>

                              <Td>
                                <span className="text-xs text-[#94A3B8] font-mono">
                                  {log.targetUserId ||
                                    '—'}
                                </span>
                              </Td>

                              <Td>
                                <span className="text-xs text-[#94A3B8]">
                                  {formatAuditTime(
                                    log.timestamp
                                  )}
                                </span>
                              </Td>
                            </tr>
                          )
                        }
                      )}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card>

            {/* CHARTS */}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Card>
                <CardHeader
                  title="User Role Distribution"
                  subtitle="Live backend user data"
                />

                <DonutChart
                  segments={roleDistribution}
                  centerValue={totalUsers}
                  centerLabel="Total Users"
                  size={120}
                />
              </Card>

              <Card>
                <CardHeader
                  title="Faculty per Department"
                  subtitle="Current department overview"
                />

                <HBarChart
                  data={DEPT_LOAD}
                />
              </Card>
            </div>
          </div>

          {/* ==================================================
              SIDEBAR
          ================================================== */}

          <div className="space-y-6">
            {/* SYSTEM HEALTH */}

            <Card>
              <CardHeader
                title="System Health"
                subtitle="System status"
              />

              <div className="grid grid-cols-1 gap-2">
                {SYSTEM_HEALTH.map(
                  (s) => (
                    <HealthPill
                      key={s.label}
                      {...s}
                    />
                  )
                )}
              </div>
            </Card>

            {/* USER STATUS SUMMARY */}

            <Card>
              <CardHeader
                title="Account Status"
                subtitle="Live MongoDB data"
              />

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#475569]">
                    Active
                  </span>

                  <span className="text-sm font-bold text-[#059669]">
                    {activeUsers}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#475569]">
                    Pending
                  </span>

                  <span className="text-sm font-bold text-[#D97706]">
                    {pendingUsers}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#475569]">
                    Suspended
                  </span>

                  <span className="text-sm font-bold text-[#DC2626]">
                    {suspendedUsers}
                  </span>
                </div>
              </div>
            </Card>

            {/* SETTINGS */}

            <Card>
              <CardHeader title="System Settings" />

              <div className="space-y-2">
                <button
                  onClick={() =>
                    setSettingsModal('ocr')
                  }
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-[#F8FAFC] border border-transparent hover:border-[#E2E8F0] transition-all text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#FEE2E2] flex items-center justify-center">
                    <Settings
                      size={18}
                      className="text-[#DC2626]"
                    />
                  </div>

                  <div className="flex-1">
                    <div className="text-sm font-medium text-[#0F172A]">
                      OCR Settings
                    </div>

                    <div className="text-xs text-[#94A3B8]">
                      Threshold:{' '}
                      {ocrThreshold}
                    </div>
                  </div>

                  <span className="text-xs text-[#94A3B8]">
                    →
                  </span>
                </button>

                <button
                  onClick={() =>
                    setSettingsModal('ai')
                  }
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-[#F8FAFC] border border-transparent hover:border-[#E2E8F0] transition-all text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#D1FAE5] flex items-center justify-center">
                    <Bot
                      size={18}
                      className="text-[#059669]"
                    />
                  </div>

                  <div className="flex-1">
                    <div className="text-sm font-medium text-[#0F172A]">
                      AI Evaluation
                    </div>

                    <div className="text-xs text-[#94A3B8]">
                      Model: {aiModel}
                    </div>
                  </div>

                  <span className="text-xs text-[#94A3B8]">
                    →
                  </span>
                </button>

                <button
                  onClick={
                    openNotificationModal
                  }
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-[#F8FAFC] border border-transparent hover:border-[#E2E8F0] transition-all text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#DBEAFE] flex items-center justify-center">
                    <Bell
                      size={18}
                      className="text-[#2563EB]"
                    />
                  </div>

                  <div className="flex-1">
                    <div className="text-sm font-medium text-[#0F172A]">
                      Send Notification
                    </div>

                    <div className="text-xs text-[#94A3B8]">
                      Notify users or roles
                    </div>
                  </div>

                  <span className="text-xs text-[#94A3B8]">
                    →
                  </span>
                </button>
              </div>
            </Card>

            {/* NOTIFICATIONS */}

            <Card>
              <CardHeader
                title="Notifications"
                subtitle={
                  loadingNotifications
                    ? 'Loading...'
                    : `${notifications.length} updates`
                }
              />

              {notificationsError ? (
                <div className="p-4">
                  <p className="text-xs text-[#DC2626]">
                    {notificationsError}
                  </p>
                </div>
              ) : (
                <NotificationList
                  items={notifications}
                  onMarkAsRead={
                    handleMarkNotificationAsRead
                  }
                />
              )}
            </Card>

            {/* RECENT ACTIVITY */}

            <Card>
              <CardHeader title="Recent Activity" />

              <ActivityTimeline
                events={ADMIN_ACTIVITY}
                maxItems={5}
              />
            </Card>
          </div>
        </div>

        {/* ====================================================
            LOGOUT
        ==================================================== */}

        <LogoutModal
          open={showLogout}
          onClose={closeLogout}
          onConfirm={onLogout}
        />
      </div>

      {/* ======================================================
          CREATE NOTIFICATION MODAL
      ====================================================== */}

      {notificationModal && (
        <Modal
          open
          onClose={closeNotificationModal}
          maxWidth="max-w-lg"
        >
          <div className="max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="p-6 space-y-5">

              {/* ------------------------------------------------
                  HEADER
              ------------------------------------------------ */}

              <div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#DBEAFE] flex items-center justify-center">
                    <Bell
                      size={20}
                      className="text-[#2563EB]"
                    />
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-[#0F172A]">
                      Create Notification
                    </h3>

                    <p className="text-xs text-[#94A3B8] mt-0.5">
                      Notify a complete role or selected users
                    </p>
                  </div>
                </div>
              </div>

              {/* ------------------------------------------------
                  ERROR
              ------------------------------------------------ */}

              {notificationCreateError && (
                <div className="p-3 rounded-lg bg-[#FEE2E2] border border-[#FECACA]">
                  <p className="text-sm text-[#B91C1C]">
                    {notificationCreateError}
                  </p>
                </div>
              )}

              {/* ------------------------------------------------
                  SUCCESS
              ------------------------------------------------ */}

              {notificationCreateSuccess && (
                <div className="p-3 rounded-lg bg-[#D1FAE5] border border-[#A7F3D0]">
                  <p className="text-sm text-[#065F46] font-medium">
                    {notificationCreateSuccess}
                  </p>
                </div>
              )}

              {/* =================================================
                  RECIPIENT MODE
              ================================================= */}

              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-2">
                  Recipient Type
                </label>

                <div className="grid grid-cols-2 gap-3">

                  {/* ROLE */}

                  <button
                    type="button"
                    onClick={() =>
                      handleNotificationRecipientModeChange(
                        'role'
                      )
                    }
                    disabled={
                      creatingNotification
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
                      Notify everyone having a role
                    </p>
                  </button>

                  {/* INDIVIDUAL */}

                  <button
                    type="button"
                    onClick={() =>
                      handleNotificationRecipientModeChange(
                        'individual'
                      )
                    }
                    disabled={
                      creatingNotification
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
                      Select specific users
                    </p>
                  </button>
                </div>
              </div>

              {/* =================================================
                  ROLE MODE
              ================================================= */}

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
                        onChange={(e) =>
                          setSelectedNotificationRole(
                            e.target.value as
                            | 'Faculty'
                            | 'HOD'
                            | 'Dean'
                            | 'Admin'
                          )
                        }
                        disabled={
                          creatingNotification
                        }
                        className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm text-[#0F172A] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                      >
                        <option value="Faculty">
                          Faculty
                        </option>

                        <option value="HOD">
                          HOD
                        </option>

                        <option value="Dean">
                          Dean
                        </option>

                        <option value="Admin">
                          Admin
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
                            Every active or existing user with
                            this role will receive the notification.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* ROLE USER PREVIEW */}

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
                              (recipient) => (
                                <div
                                  key={recipient.id}
                                  className="flex items-center gap-3 px-3 py-2.5 border-b border-[#F1F5F9] last:border-b-0"
                                >
                                  <div className="w-8 h-8 rounded-full bg-[#E0E7FF] flex items-center justify-center shrink-0">
                                    <span className="text-xs font-bold text-[#3730A3]">
                                      {recipient.name
                                        ?.charAt(0)
                                        ?.toUpperCase() ||
                                        'U'}
                                    </span>
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-[#0F172A] truncate">
                                      {recipient.name}
                                    </div>

                                    <div className="text-xs text-[#64748B] truncate">
                                      {recipient.email}
                                    </div>
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

              {/* =================================================
                  INDIVIDUAL MODE
              ================================================= */}

              {notificationRecipientMode ===
                'individual' && (
                  <div>

                    <div className="flex items-center justify-between mb-1.5">

                      <label className="block text-sm font-semibold text-[#0F172A]">
                        Select Users
                      </label>

                      <span className="text-xs font-semibold text-[#2563EB]">
                        {notificationRecipients.length}{' '}
                        selected
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
                        onChange={(e) =>
                          setNotificationUserSearch(
                            e.target.value
                          )
                        }
                        disabled={
                          creatingNotification
                        }
                        placeholder="Search by name, email, role or department..."
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
                          <X size={14} />

                          Clear
                        </button>

                      </div>

                      <span className="text-[11px] text-[#94A3B8]">
                        Select 2–5 users
                      </span>

                    </div>

                    {/* USER LIST */}

                    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-white">

                      {loadingUsers ? (
                        <div className="p-5 text-center text-sm text-[#94A3B8]">
                          Loading users...
                        </div>
                      ) : filteredNotificationUsers.length ===
                        0 ? (
                        <div className="p-5 text-center text-sm text-[#94A3B8]">
                          No users found.
                        </div>
                      ) : (
                        <div className="max-h-64 overflow-y-auto">

                          {filteredNotificationUsers.map(
                            (recipient) => {

                              const selected =
                                notificationRecipients.includes(
                                  recipient.id
                                )

                              return (
                                <button
                                  type="button"
                                  key={recipient.id}
                                  onClick={() =>
                                    toggleNotificationRecipient(
                                      recipient.id
                                    )
                                  }
                                  disabled={
                                    creatingNotification
                                  }
                                  className={`w-full flex items-center gap-3 px-3 py-3 text-left border-b border-[#F1F5F9] last:border-b-0 transition-colors ${selected
                                      ? 'bg-[#EEF4FF]'
                                      : 'hover:bg-[#F8FAFC]'
                                    }`}
                                >
                                  {/* CHECKBOX */}

                                  <div
                                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${selected
                                        ? 'bg-[#2563EB] border-[#2563EB]'
                                        : 'bg-white border-[#CBD5E1]'
                                      }`}
                                  >
                                    {selected && (
                                      <Check
                                        size={14}
                                        className="text-white"
                                      />
                                    )}
                                  </div>

                                  {/* AVATAR */}

                                  <div className="w-9 h-9 rounded-full bg-[#E0E7FF] flex items-center justify-center shrink-0">
                                    <span className="text-xs font-bold text-[#3730A3]">
                                      {recipient.name
                                        ?.charAt(0)
                                        ?.toUpperCase() ||
                                        'U'}
                                    </span>
                                  </div>

                                  {/* DETAILS */}

                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-[#0F172A] truncate">
                                      {recipient.name}
                                    </div>

                                    <div className="text-xs text-[#64748B] truncate">
                                      {recipient.email}
                                    </div>

                                    <div className="flex items-center gap-2 mt-1">

                                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#475569]">
                                        {normalizeRole(
                                          recipient.role
                                        )}
                                      </span>

                                      {recipient.department && (
                                        <span className="text-[10px] text-[#94A3B8] truncate">
                                          {
                                            recipient.department
                                          }
                                        </span>
                                      )}

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
                                  </div>
                                </button>
                              )
                            }
                          )}

                        </div>
                      )}

                    </div>

                    {/* SELECTED USERS */}

                    {selectedNotificationUsers.length >
                      0 && (
                        <div className="mt-3">

                          <p className="text-xs font-semibold text-[#475569] mb-2">
                            Selected recipients
                          </p>

                          <div className="flex flex-wrap gap-2">

                            {selectedNotificationUsers.map(
                              (recipient) => (
                                <div
                                  key={recipient.id}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#EEF4FF] border border-[#DBEAFE]"
                                >
                                  <span className="text-xs font-medium text-[#1E40AF]">
                                    {recipient.name}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleNotificationRecipient(
                                        recipient.id
                                      )
                                    }
                                    disabled={
                                      creatingNotification
                                    }
                                    className="text-[#3B82F6] hover:text-[#1D4ED8] disabled:opacity-50"
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                              )
                            )}

                          </div>
                        </div>
                      )}

                    <p className="text-xs text-[#94A3B8] mt-2">
                      Select individual users using the checkboxes.
                      This is useful when notifying a small group of
                      users.
                    </p>
                  </div>
                )}

              {/* =================================================
                  TITLE
              ================================================= */}

              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
                  Notification Title
                </label>

                <input
                  type="text"
                  value={notificationTitle}
                  onChange={(e) =>
                    setNotificationTitle(
                      e.target.value
                    )
                  }
                  disabled={
                    creatingNotification
                  }
                  placeholder="e.g. Exam Evaluation Pending"
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                />
              </div>

              {/* =================================================
                  MESSAGE
              ================================================= */}

              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
                  Message
                </label>

                <textarea
                  value={notificationMessage}
                  onChange={(e) =>
                    setNotificationMessage(
                      e.target.value
                    )
                  }
                  disabled={
                    creatingNotification
                  }
                  rows={4}
                  placeholder="Enter the notification message..."
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] resize-none focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                />
              </div>

              {/* =================================================
                  TYPE
              ================================================= */}

              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
                  Notification Type
                </label>

                <select
                  value={notificationType}
                  onChange={(e) =>
                    setNotificationType(
                      e.target.value as Notification['type']
                    )
                  }
                  disabled={
                    creatingNotification
                  }
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm text-[#0F172A] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                >
                  <option value="system">
                    System
                  </option>

                  <option value="info">
                    Information
                  </option>

                  <option value="warning">
                    Warning
                  </option>

                  <option value="success">
                    Success
                  </option>

                  <option value="error">
                    Error
                  </option>
                </select>
              </div>

              {/* =================================================
                  ACTIONS
              ================================================= */}

              <div className="flex gap-3 pt-2">

                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
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
                  fullWidth
                  onClick={
                    handleCreateNotification
                  }
                  disabled={
                    creatingNotification ||
                    finalNotificationRecipientCount ===
                    0
                  }
                >
                  {creatingNotification
                    ? 'Sending...'
                    : `Send to ${finalNotificationRecipientCount || 0} User${finalNotificationRecipientCount ===
                      1
                      ? ''
                      : 's'
                    }`}
                </Button>

              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ======================================================
          OCR SETTINGS MODAL
      ====================================================== */}

      {settingsModal === 'ocr' && (
        <Modal
          open
          onClose={() =>
            setSettingsModal(null)
          }
          maxWidth="max-w-md"
        >
          <div className="max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="p-6 space-y-5">

              <h3 className="text-lg font-bold text-[#0F172A]">
                OCR Engine Settings
              </h3>

              <div className="space-y-4">

                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                    Confidence Threshold
                  </label>

                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0.5"
                      max="1.0"
                      step="0.05"
                      value={
                        ocrThreshold
                      }
                      onChange={(e) =>
                        setOcrThreshold(
                          e.target.value
                        )
                      }
                      className="flex-1 accent-[#1B3A6B]"
                    />

                    <span className="w-12 text-center text-sm font-bold text-[#1B3A6B] bg-[#EEF4FF] px-2 py-1 rounded-lg">
                      {ocrThreshold}
                    </span>
                  </div>

                  <p className="text-xs text-[#94A3B8] mt-1">
                    Minimum confidence for
                    auto-accepted OCR results.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                    OCR Engine Status
                  </label>

                  <div className="flex items-center gap-2 p-2.5 bg-[#D1FAE5] rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-[#059669]" />

                    <span className="text-sm text-[#065F46] font-medium">
                      Online and operational
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                    Auto-advance Delay
                  </label>

                  <select className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#0F172A]">
                    <option>
                      2 seconds (fast)
                    </option>

                    <option>
                      3 seconds (default)
                    </option>

                    <option>
                      5 seconds (careful)
                    </option>

                    <option>
                      Manual only
                    </option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  onClick={() =>
                    setSettingsModal(null)
                  }
                >
                  Cancel
                </Button>

                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={() =>
                    setSettingsModal(null)
                  }
                >
                  Save Settings
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ======================================================
          AI SETTINGS MODAL
      ====================================================== */}

      {settingsModal === 'ai' && (
        <Modal
          open
          onClose={() =>
            setSettingsModal(null)
          }
          maxWidth="max-w-md"
        >
          <div className="max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="p-6 space-y-5">

              <h3 className="text-lg font-bold text-[#0F172A]">
                AI Evaluation Settings
              </h3>

              <div className="space-y-4">

                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                    AI Model
                  </label>

                  <select
                    value={aiModel}
                    onChange={(e) =>
                      setAiModel(
                        e.target.value
                      )
                    }
                    className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#0F172A]"
                  >
                    <option value="gpt-4-turbo">
                      GPT-4 Turbo
                    </option>

                    <option value="gpt-4">
                      GPT-4
                    </option>

                    <option value="claude-3-opus">
                      Claude 3 Opus
                    </option>

                    <option value="claude-3-sonnet">
                      Claude 3 Sonnet
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                    Evaluation Mode
                  </label>

                  <select className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#0F172A]">
                    <option>
                      Strict (marks within ±5%)
                    </option>

                    <option>
                      Standard (marks within ±10%)
                    </option>

                    <option>
                      Lenient (faculty override preferred)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                    AI Service Status
                  </label>

                  <div className="flex items-center gap-2 p-2.5 bg-[#D1FAE5] rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-[#059669]" />

                    <span className="text-sm text-[#065F46] font-medium">
                      Online
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  onClick={() =>
                    setSettingsModal(null)
                  }
                >
                  Cancel
                </Button>

                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={() =>
                    setSettingsModal(null)
                  }
                >
                  Save Settings
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </AppShell>
  )
}