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
} from '@/components/common'

import {
  StatCard,
  HBarChart,
  GroupedBarChart,
  DonutChart,
  ActivityTimeline,
  ProgressRing,
  WorkflowCard,
} from '@/components/common'

import type { User, Screen, Notification } from '@/types'

import { LogoutModal } from '@/components/common'
import { PublishResultsModal } from '@/modules/results/publishing'

import {
  University,
  ClipboardList,
  TrendingUp,
  Target,
  CheckCircle,
  Rocket,
  Bell,
  Check,
  CheckCheck,
  Send,
  Users,
  UserRound,
  RefreshCw,
  X,
} from 'lucide-react'

// ============================================================
// MOCK DATA
// ============================================================
//
// IMPORTANT:
// Department / analytics / activity data remains mock for now.
// Notifications and recipients are REAL.
// ============================================================

import {
  DEPARTMENTS,
  DEAN_ACTIVITY,
  DEPT_COMPARISON,
  COLLEGE_STATUS,
  GRADE_DIST,
} from '@/services/dean/mockData'

// ============================================================
// REAL NOTIFICATION API
// ============================================================

import {
  getNotificationSummary,
  getNotificationRecipients,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  sendNotification,
} from '@/services/notification/notificationApi'

// ============================================================
// DEPARTMENT STATUS
// ============================================================

function DeptStatusPill({
  status,
}: {
  status: string
}) {
  const cfg: Record<string, string> = {
    'Ready to Publish':
      'bg-[#D1FAE5] text-[#065F46]',

    'Dean Approval Pending':
      'bg-[#EEF4FF] text-[#1B3A6B]',

    'In Progress':
      'bg-[#FEF3C7] text-[#92400E]',

    Partial:
      'bg-[#FEF3C7] text-[#92400E]',

    'Not Started':
      'bg-[#FEE2E2] text-[#991B1B]',

    Published:
      'bg-[#D1FAE5] text-[#065F46]',
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
// NOTIFICATION RECIPIENT TYPE
// ============================================================

interface DeanRecipient {
  id: string
  name: string
  email: string
  role: string | null
  employeeId?: string | null
  department?: string | null
  designation?: string | null
  status?: string
}

// ============================================================
// NOTIFICATION TYPE
// ============================================================

type DeanNotification = Notification & {
  id: string
  title: string
  message: string
  type: Notification['type']
  is_read?: boolean
  created_at?: string | null
  read_at?: string | null
  recipient_id?: string
  recipient_role?: string
}

// ============================================================
// NOTIFICATION HELPERS
// ============================================================

function notificationTime(
  createdAt?: string | null
): string {
  if (!createdAt) {
    return 'Just now'
  }

  const date = new Date(createdAt)

  if (Number.isNaN(date.getTime())) {
    return 'Just now'
  }

  const diff =
    Date.now() - date.getTime()

  const minutes =
    Math.floor(diff / 60000)

  if (minutes < 1) {
    return 'Just now'
  }

  if (minutes < 60) {
    return `${minutes}m ago`
  }

  const hours =
    Math.floor(minutes / 60)

  if (hours < 24) {
    return `${hours}h ago`
  }

  const days =
    Math.floor(hours / 24)

  if (days < 7) {
    return `${days}d ago`
  }

  return date.toLocaleDateString()
}

function notificationTypeStyle(
  type?: Notification['type']
) {
  switch (type) {
    case 'success':
      return {
        icon: '✓',
        bg: 'bg-[#ECFDF5]',
        text: 'text-[#047857]',
      }

    case 'warning':
      return {
        icon: '!',
        bg: 'bg-[#FFFBEB]',
        text: 'text-[#B45309]',
      }

    case 'error':
      return {
        icon: '!',
        bg: 'bg-[#FEF2F2]',
        text: 'text-[#B91C1C]',
      }

    default:
      return {
        icon: 'i',
        bg: 'bg-[#EEF4FF]',
        text: 'text-[#1D4ED8]',
      }
  }
}

// ============================================================
// DEAN DASHBOARD
// ============================================================

interface DeanDashboardProps {
  user: User
  onNavigate: (s: Screen) => void
  onLogout: () => void
}

export default function DeanDashboard({
  user,
  onNavigate,
  onLogout,
}: DeanDashboardProps) {
  const {
    showLogout,
    openLogout,
    closeLogout,
  } = useLogout()

  // ==========================================================
  // EXISTING MOCK DASHBOARD STATE
  // ==========================================================

  const [
    detailDept,
    setDetailDept,
  ] = useState<
    typeof DEPARTMENTS[0] | null
  >(null)

  const [
    publishModal,
    setPublishModal,
  ] = useState<
    typeof DEPARTMENTS[0] | null
  >(null)

  const [
    approvedDepts,
    setApprovedDepts,
  ] = useState<Set<string>>(
    new Set()
  )

  // ==========================================================
  // REAL NOTIFICATION STATE
  // ==========================================================

  const [
    notifications,
    setNotifications,
  ] = useState<DeanNotification[]>([])

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0)

  const [
    notificationLoading,
    setNotificationLoading,
  ] = useState(false)

  const [
    notificationError,
    setNotificationError,
  ] = useState<string | null>(null)

  // ==========================================================
  // REAL RECIPIENT STATE
  // ==========================================================

  const [
    hodRecipients,
    setHodRecipients,
  ] = useState<DeanRecipient[]>([])

  const [
    facultyRecipients,
    setFacultyRecipients,
  ] = useState<DeanRecipient[]>([])

  const [
    recipientLoading,
    setRecipientLoading,
  ] = useState(false)

  // ==========================================================
  // SEND NOTIFICATION MODAL
  // ==========================================================

  const [
    showNotificationModal,
    setShowNotificationModal,
  ] = useState(false)

  const [
    notificationMode,
    setNotificationMode,
  ] = useState<
    'hod' | 'faculty' | 'all'
  >('hod')

  const [
    selectedRecipientId,
    setSelectedRecipientId,
  ] = useState('')

  const [
    notificationTitle,
    setNotificationTitle,
  ] = useState('')

  const [
    notificationMessage,
    setNotificationMessage,
  ] = useState('')

  const [
    sendingNotification,
    setSendingNotification,
  ] = useState(false)

  const [
    sendError,
    setSendError,
  ] = useState<string | null>(null)

  const [
    sendSuccess,
    setSendSuccess,
  ] = useState<string | null>(null)

  // ==========================================================
  // LOAD REAL NOTIFICATIONS
  // ==========================================================

  const loadNotifications =
    async () => {
      if (!user?.id) {
        return
      }

      try {
        setNotificationLoading(true)
        setNotificationError(null)

        const summary =
          await getNotificationSummary(
            user.id
          )

        setNotifications(
          (summary.notifications || []) as DeanNotification[]
        )

        setUnreadCount(
          summary.unreadCount || 0
        )
      } catch (error) {
        console.error(
          'Failed to load Dean notifications:',
          error
        )

        setNotificationError(
          error instanceof Error
            ? error.message
            : 'Failed to load notifications'
        )
      } finally {
        setNotificationLoading(false)
      }
    }

  // ==========================================================
  // LOAD REAL HOD/FACULTY USERS
  // ==========================================================

  const loadRecipients =
    async () => {
      try {
        setRecipientLoading(true)

        const [
          hods,
          faculty,
        ] = await Promise.all([
          getNotificationRecipientsByRoleSafe(
            'hod'
          ),

          getNotificationRecipientsByRoleSafe(
            'faculty'
          ),
        ])

        setHodRecipients(hods)
        setFacultyRecipients(faculty)
      } catch (error) {
        console.error(
          'Failed to load notification recipients:',
          error
        )
      } finally {
        setRecipientLoading(false)
      }
    }

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    loadNotifications()
    loadRecipients()
  }, [user?.id])

  // ==========================================================
  // SAFE RECIPIENT API
  // ==========================================================

  async function getNotificationRecipientsByRoleSafe(
    role: string
  ): Promise<DeanRecipient[]> {
    const recipients =
      await getNotificationRecipients(
        role
      )

    return recipients as DeanRecipient[]
  }

  // ==========================================================
  // REFRESH NOTIFICATIONS
  // ==========================================================

  const handleRefreshNotifications =
    async () => {
      await loadNotifications()
    }

  // ==========================================================
  // MARK ONE READ
  // ==========================================================

  const handleMarkRead =
    async (
      notificationId: string
    ) => {
      try {
        await markNotificationAsRead(
          notificationId
        )

        setNotifications(
          previous =>
            previous.map(notification =>
              notification.id ===
                notificationId
                ? {
                  ...notification,
                  is_read: true,
                }
                : notification
            )
        )

        setUnreadCount(
          previous =>
            Math.max(0, previous - 1)
        )
      } catch (error) {
        console.error(
          'Failed to mark notification as read:',
          error
        )

        setNotificationError(
          error instanceof Error
            ? error.message
            : 'Failed to mark notification as read'
        )
      }
    }

  // ==========================================================
  // MARK ALL READ
  // ==========================================================

  const handleMarkAllRead =
    async () => {
      if (!user?.id) {
        return
      }

      try {
        await markAllNotificationsAsRead(
          user.id
        )

        setNotifications(
          previous =>
            previous.map(notification => ({
              ...notification,
              is_read: true,
            }))
        )

        setUnreadCount(0)
      } catch (error) {
        console.error(
          'Failed to mark all notifications as read:',
          error
        )

        setNotificationError(
          error instanceof Error
            ? error.message
            : 'Failed to mark all notifications as read'
        )
      }
    }

  // ==========================================================
  // OPEN SEND NOTIFICATION
  // ==========================================================

  const openSendNotification =
    (
      mode:
        | 'hod'
        | 'faculty'
        | 'all'
    ) => {
      setNotificationMode(mode)

      setSelectedRecipientId('')

      setNotificationTitle('')

      setNotificationMessage('')

      setSendError(null)

      setSendSuccess(null)

      setShowNotificationModal(true)
    }

  // ==========================================================
  // CURRENT RECIPIENT LIST
  // ==========================================================

  const currentRecipients =
    useMemo(() => {
      if (
        notificationMode ===
        'hod'
      ) {
        return hodRecipients
      }

      if (
        notificationMode ===
        'faculty'
      ) {
        return facultyRecipients
      }

      return []
    }, [
      notificationMode,
      hodRecipients,
      facultyRecipients,
    ])

  // ==========================================================
  // SEND NOTIFICATION
  // ==========================================================

  const handleSendNotification =
    async () => {
      const cleanTitle =
        notificationTitle.trim()

      const cleanMessage =
        notificationMessage.trim()

      if (!cleanTitle) {
        setSendError(
          'Notification title is required.'
        )
        return
      }

      if (!cleanMessage) {
        setSendError(
          'Notification message is required.'
        )
        return
      }

      if (
        notificationMode !==
        'all' &&
        !selectedRecipientId
      ) {
        setSendError(
          'Please select a recipient.'
        )
        return
      }

      try {
        setSendingNotification(true)
        setSendError(null)
        setSendSuccess(null)

        if (
          notificationMode ===
          'all'
        ) {
          await sendNotification({
            mode: 'all',
            title: cleanTitle,
            message: cleanMessage,
            type: 'info',
          })
        } else {
          await sendNotification({
            mode: 'user',
            recipientIds: [
              selectedRecipientId,
            ],
            title: cleanTitle,
            message: cleanMessage,
            type: 'info',
          })
        }

        setSendSuccess(
          'Notification sent successfully.'
        )

        setNotificationTitle('')
        setNotificationMessage('')
        setSelectedRecipientId('')

        // Small delay so user sees success message.
        setTimeout(() => {
          setShowNotificationModal(false)
          setSendSuccess(null)
        }, 900)
      } catch (error) {
        console.error(
          'Failed to send notification:',
          error
        )

        setSendError(
          error instanceof Error
            ? error.message
            : 'Failed to send notification'
        )
      } finally {
        setSendingNotification(false)
      }
    }

  // ==========================================================
  // MOCK PUBLISH
  // ==========================================================

  const handlePublish =
    (deptId: string) => {
      setApprovedDepts(
        previous =>
          new Set([
            ...previous,
            deptId,
          ])
      )

      setPublishModal(null)
    }

  // ==========================================================
  // MOCK DASHBOARD CALCULATIONS
  // ==========================================================

  const totalSheets =
    DEPARTMENTS.reduce(
      (sum, dept) =>
        sum + dept.totalSheets,
      0
    )

  const totalCompleted =
    DEPARTMENTS.reduce(
      (sum, dept) =>
        sum + dept.completed,
      0
    )

  const totalApproved =
    DEPARTMENTS.reduce(
      (sum, dept) =>
        sum + dept.approved,
      0
    )

  const pendingDeans =
    DEPARTMENTS.filter(
      dept =>
        (
          dept.status ===
          'Dean Approval Pending' ||
          dept.status ===
          'Ready to Publish'
        ) &&
        !approvedDepts.has(
          dept.id
        )
    )

  const collegeProgress =
    totalSheets > 0
      ? Math.round(
        (totalCompleted /
          totalSheets) *
        100
      )
      : 0

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

        {/* ================================================== */}
        {/* WELCOME BANNER */}
        {/* ================================================== */}

        <Card className="p-0 overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-[#4C1D95] via-[#6D28D9] to-[#7C3AED]">
            <div className="flex items-start justify-between gap-4 flex-wrap">

              <div>
                <p className="text-purple-200 text-sm font-medium">
                  College Overview Dashboard
                </p>

                <h1 className="text-2xl font-bold text-white mt-0.5 tracking-tight">
                  {user.name}
                </h1>

                <p className="text-purple-100 text-sm mt-1">
                  {user.designation}
                </p>

                <div className="flex gap-2 mt-3 flex-wrap">
                  <RoleBadge role={user.role} />

                  <span className="text-xs text-purple-200 self-center">
                    {DEPARTMENTS.length}{' '}
                    departments ·{' '}
                    {totalSheets.toLocaleString()}{' '}
                    total sheets
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 text-center">
                {[
                  {
                    label: 'Total Sheets',
                    value: totalSheets,
                    color: 'text-white',
                  },
                  {
                    label: 'Completed',
                    value: totalCompleted,
                    color:
                      'text-emerald-300',
                  },
                  {
                    label: 'Approved',
                    value: totalApproved,
                    color:
                      'text-purple-200',
                  },
                ].map(stat => (
                  <div
                    key={stat.label}
                  >
                    <div
                      className={`text-2xl font-bold ${stat.color}`}
                    >
                      {stat.value.toLocaleString()}
                    </div>

                    <div className="text-purple-300 text-xs mt-0.5">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="px-6 py-3 bg-[#4C1D95]/80 border-t border-white/10 flex items-center gap-4">
            <div className="text-xs text-purple-200 font-medium">
              College Progress:
            </div>

            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#7C3AED] rounded-full"
                style={{
                  width: `${collegeProgress}%`,
                }}
              />
            </div>

            <div className="text-white text-xs font-bold">
              {collegeProgress}%
              {' '}
              college-wide
            </div>
          </div>
        </Card>

        {/* ================================================== */}
        {/* NOTIFICATION ACTIONS */}
        {/* ================================================== */}

        <Card>
          <div className="flex items-center justify-between gap-4 flex-wrap">

            <div>
              <div className="flex items-center gap-2">
                <Bell
                  size={19}
                  className="text-[#7C3AED]"
                />

                <h2 className="text-base font-semibold text-[#0F172A]">
                  Notification Center
                </h2>

                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#DC2626] text-white text-[10px] font-bold">
                    {unreadCount}
                    {' '}
                    unread
                  </span>
                )}
              </div>

              <p className="text-xs text-[#94A3B8] mt-1">
                Send updates to real HOD and Faculty users.
              </p>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() =>
                  openSendNotification(
                    'hod'
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#7C3AED] bg-[#F3E8FF] hover:bg-[#E9D5FF]"
              >
                <UserRound size={14} />
                Notify HOD
              </button>

              <button
                onClick={() =>
                  openSendNotification(
                    'faculty'
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#1D4ED8] bg-[#EEF4FF] hover:bg-[#DBEAFE]"
              >
                <Users size={14} />
                Notify Faculty
              </button>

              <button
                onClick={() =>
                  openSendNotification(
                    'all'
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9]"
              >
                <Send size={14} />
                Notify Everyone
              </button>
            </div>
          </div>
        </Card>

        {/* ================================================== */}
        {/* REAL NOTIFICATIONS */}
        {/* ================================================== */}

        <Card>
          <div className="flex items-center justify-between gap-3 mb-4">

            <div>
              <h2 className="text-base font-semibold text-[#0F172A]">
                Notifications
              </h2>

              <p className="text-xs text-[#94A3B8] mt-0.5">
                Live notifications from the evaluation system
              </p>
            </div>

            <div className="flex items-center gap-2">

              {unreadCount > 0 && (
                <button
                  onClick={
                    handleMarkAllRead
                  }
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#475569] bg-[#F1F5F9] hover:bg-[#E2E8F0]"
                >
                  <CheckCheck size={14} />
                  Read all
                </button>
              )}

              <button
                onClick={
                  handleRefreshNotifications
                }
                disabled={
                  notificationLoading
                }
                className="inline-flex items-center justify-center p-2 rounded-lg text-[#475569] bg-[#F1F5F9] hover:bg-[#E2E8F0] disabled:opacity-50"
                title="Refresh notifications"
              >
                <RefreshCw
                  size={15}
                  className={
                    notificationLoading
                      ? 'animate-spin'
                      : ''
                  }
                />
              </button>
            </div>
          </div>

          {notificationError && (
            <div className="mb-3 p-3 rounded-lg bg-[#FEF2F2] text-[#B91C1C] text-xs">
              {notificationError}
            </div>
          )}

          {notificationLoading &&
            notifications.length === 0 && (
              <div className="py-10 text-center text-sm text-[#94A3B8]">
                Loading notifications...
              </div>
            )}

          {!notificationLoading &&
            notifications.length === 0 && (
              <div className="py-10 text-center">
                <Bell
                  size={28}
                  className="mx-auto text-[#CBD5E1]"
                />

                <p className="text-sm font-medium text-[#475569] mt-2">
                  No notifications
                </p>

                <p className="text-xs text-[#94A3B8] mt-1">
                  New HOD and evaluation updates will appear here.
                </p>
              </div>
            )}

          <div className="space-y-2">
            {notifications.map(
              notification => {
                const style =
                  notificationTypeStyle(
                    notification.type
                  )

                const unread =
                  !notification.is_read

                return (
                  <div
                    key={
                      notification.id
                    }
                    className={`flex gap-3 p-3 rounded-xl border transition-colors ${unread
                      ? 'bg-[#FAF5FF] border-[#E9D5FF]'
                      : 'bg-white border-[#E2E8F0]'
                      }`}
                  >

                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${style.bg} ${style.text}`}
                    >
                      <span className="text-xs font-bold">
                        {style.icon}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">

                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p
                            className={`text-sm ${unread
                              ? 'font-bold text-[#0F172A]'
                              : 'font-semibold text-[#475569]'
                              }`}
                          >
                            {
                              notification.title
                            }
                          </p>

                          <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                            {
                              notification.message
                            }
                          </p>
                        </div>

                        {unread && (
                          <span className="w-2 h-2 rounded-full bg-[#7C3AED] shrink-0 mt-1.5" />
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-3 mt-2">

                        <span className="text-[10px] text-[#94A3B8]">
                          {notificationTime(
                            notification.created_at
                          )}
                        </span>

                        {unread && (
                          <button
                            onClick={() =>
                              handleMarkRead(
                                notification.id
                              )
                            }
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#7C3AED] hover:text-[#6D28D9]"
                          >
                            <Check
                              size={12}
                            />
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              }
            )}
          </div>
        </Card>

        {/* ================================================== */}
        {/* ALERT */}
        {/* ================================================== */}

        {pendingDeans.length >
          0 && (
            <Alert
              variant="info"
              title={`${pendingDeans.length} Department${pendingDeans.length >
                1
                ? 's'
                : ''
                } Awaiting Dean Approval`}
              message={`${pendingDeans
                .map(d => d.code)
                .join(
                  ', '
                )} evaluations have been HOD-approved and are ready for your review and publish authorization.`}
            />
          )}

        {/* ================================================== */}
        {/* STATS */}
        {/* ================================================== */}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">

          <StatCard
            label="Departments"
            value={
              DEPARTMENTS.length
            }
            color="#7C3AED"
            icon={
              <University
                size={20}
              />
            }
          />

          <StatCard
            label="Pending Approval"
            value={
              pendingDeans.length
            }
            color="#D97706"
            icon={
              <ClipboardList
                size={20}
              />
            }
            trend={{
              direction: 'neutral',
              text: 'awaiting Dean',
            }}
          />

          <StatCard
            label="College Progress"
            value={`${collegeProgress}%`}
            color="#059669"
            icon={
              <TrendingUp
                size={20}
              />
            }
          />

          <StatCard
            label="Avg Marks"
            value="68.5"
            sub="college average"
            color="#3B5DE8"
            icon={
              <Target
                size={20}
              />
            }
          />

          <StatCard
            label="Pass Rate"
            value="83%"
            sub="college-wide"
            color="#059669"
            icon={
              <CheckCircle
                size={20}
              />
            }
          />

          <StatCard
            label="Published"
            value={
              approvedDepts.size
            }
            sub="departments"
            color="#059669"
            icon={
              <Rocket
                size={20}
              />
            }
          />
        </div>

        {/* ================================================== */}
        {/* DEPARTMENT STATUS */}
        {/* ================================================== */}

        <div>
          <h2 className="text-lg font-semibold text-[#0F172A] mb-4">
            Department Status
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">

            {DEPARTMENTS.map(
              dept => {
                const compPct =
                  Math.round(
                    (dept.completed /
                      dept.totalSheets) *
                    100
                  )

                const appPct =
                  dept.completed >
                    0
                    ? Math.round(
                      (dept.approved /
                        dept.completed) *
                      100
                    )
                    : 0

                const isPublished =
                  approvedDepts.has(
                    dept.id
                  )

                const displayStatus =
                  isPublished
                    ? 'Published'
                    : dept.status

                return (
                  <Card
                    key={dept.id}
                    className="hover:shadow-md transition-all hover:border-[#BACFFB]"
                  >

                    <div className="flex items-start justify-between mb-3">

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">

                          <span className="text-xs font-bold text-[#94A3B8] bg-[#F1F5F9] px-2 py-0.5 rounded-md">
                            {dept.code}
                          </span>

                          <DeptStatusPill
                            status={
                              displayStatus
                            }
                          />
                        </div>

                        <h3 className="text-sm font-bold text-[#0F172A] mt-1.5 leading-snug">
                          {dept.name}
                        </h3>

                        <p className="text-xs text-[#94A3B8]">
                          HOD: {dept.hod}
                        </p>
                      </div>

                      <ProgressRing
                        value={
                          compPct
                        }
                        size={48}
                        color={
                          compPct ===
                            100
                            ? '#059669'
                            : '#7C3AED'
                        }
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-3">

                      {[
                        {
                          label: 'Faculty',
                          value:
                            dept.faculty,
                        },
                        {
                          label: 'Courses',
                          value:
                            dept.courses,
                        },
                        {
                          label: 'Subjects',
                          value:
                            dept.subjects,
                        },
                      ].map(
                        stat => (
                          <div
                            key={
                              stat.label
                            }
                            className="text-center p-2 bg-[#F8FAFC] rounded-lg"
                          >
                            <div className="text-base font-bold text-[#0F172A]">
                              {
                                stat.value
                              }
                            </div>

                            <div className="text-[10px] text-[#94A3B8]">
                              {
                                stat.label
                              }
                            </div>
                          </div>
                        )
                      )}
                    </div>

                    <div className="space-y-1.5 mb-3">

                      {[
                        {
                          label:
                            'Completed',
                          pct:
                            compPct,
                          color:
                            '#059669',
                        },
                        {
                          label:
                            'Approved',
                          pct:
                            appPct,
                          color:
                            '#3B5DE8',
                        },
                        {
                          label: `Pass Rate · ${dept.passPercent}%`,
                          pct:
                            dept.passPercent,
                          color:
                            '#D97706',
                        },
                      ].map(
                        progress => (
                          <div
                            key={
                              progress.label
                            }
                          >
                            <div className="flex justify-between text-[10px] text-[#94A3B8] mb-0.5">
                              <span>
                                {
                                  progress.label
                                }
                              </span>

                              <span className="font-semibold">
                                {
                                  progress.pct
                                }
                                %
                              </span>
                            </div>

                            <div className="h-1 bg-[#F1F5F9] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${progress.pct}%`,
                                  backgroundColor:
                                    progress.color,
                                }}
                              />
                            </div>
                          </div>
                        )
                      )}
                    </div>

                    <div className="flex gap-2 flex-wrap">

                      <button
                        onClick={() =>
                          setDetailDept(
                            dept
                          )
                        }
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#7C3AED] bg-[#F3E8FF] hover:bg-[#E9D5FF] transition-colors flex-1"
                      >
                        View Details
                      </button>

                      {(displayStatus ===
                        'Dean Approval Pending' ||
                        displayStatus ===
                        'Ready to Publish') && (
                          <button
                            onClick={() =>
                              setPublishModal(
                                dept
                              )
                            }
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] transition-colors flex-1"
                          >
                            Approve & Publish
                          </button>
                        )}

                      {displayStatus ===
                        'Published' && (
                          <span className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#065F46] bg-[#D1FAE5] flex-1 text-center">
                            ✓ Published
                          </span>
                        )}
                    </div>
                  </Card>
                )
              }
            )}
          </div>
        </div>

        {/* ================================================== */}
        {/* ANALYTICS */}
        {/* ================================================== */}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          <div className="xl:col-span-2 space-y-6">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

              <Card>
                <CardHeader
                  title="Department Comparison"
                  subtitle="Completed vs. Approved"
                />

                <GroupedBarChart
                  series={[
                    {
                      label:
                        'Completed',
                      color:
                        '#7C3AED',
                    },
                    {
                      label:
                        'Approved',
                      color:
                        '#059669',
                    },
                  ]}
                  data={
                    DEPT_COMPARISON
                  }
                  height={180}
                />
              </Card>

              <Card>
                <CardHeader
                  title="College-wide Status"
                  subtitle="Sheet evaluation distribution"
                />

                <DonutChart
                  segments={
                    COLLEGE_STATUS
                  }
                  centerValue={
                    totalSheets
                  }
                  centerLabel="Total Sheets"
                  size={120}
                />
              </Card>
            </div>

            <Card>
              <CardHeader
                title="Grade Distribution"
                subtitle="All evaluated & approved sheets"
              />

              <HBarChart
                data={
                  GRADE_DIST
                }
                maxValue={Math.max(
                  ...GRADE_DIST.map(
                    d =>
                      d.value
                  )
                )}
              />
            </Card>

            {/* ================================================= */}
            {/* PENDING APPROVALS */}
            {/* ================================================= */}

            {pendingDeans.length >
              0 && (
                <Card
                  padding={
                    false
                  }
                >
                  <div className="p-5 border-b border-[#E2E8F0]">

                    <h3 className="text-base font-semibold text-[#0F172A]">
                      Pending Dean Approvals
                    </h3>

                    <WorkflowCard
                      steps={[
                        {
                          label:
                            'HOD Approved',
                          status:
                            'done',
                        },
                        {
                          label:
                            'Dean Review',
                          status:
                            'active',
                        },
                        {
                          label:
                            'Publish Results',
                          status:
                            'pending',
                        },
                      ]}
                    />
                  </div>

                  <Table>
                    <thead>
                      <tr>
                        <Th>
                          Department
                        </Th>
                        <Th>
                          HOD
                        </Th>
                        <Th>
                          Sheets
                        </Th>
                        <Th>
                          Avg Marks
                        </Th>
                        <Th>
                          Pass %
                        </Th>
                        <Th>
                          Actions
                        </Th>
                      </tr>
                    </thead>

                    <tbody>
                      {pendingDeans.map(
                        dept => (
                          <tr
                            key={
                              dept.id
                            }
                            className="hover:bg-[#F8FAFC]"
                          >
                            <Td>
                              <div>
                                <div className="text-sm font-semibold text-[#0F172A]">
                                  {
                                    dept.code
                                  }
                                </div>

                                <div className="text-xs text-[#94A3B8]">
                                  {
                                    dept.name
                                  }
                                </div>
                              </div>
                            </Td>

                            <Td>
                              <span className="text-sm text-[#475569]">
                                {
                                  dept.hod
                                }
                              </span>
                            </Td>

                            <Td>
                              <span className="text-sm font-bold">
                                {dept.completed.toLocaleString()}
                              </span>
                            </Td>

                            <Td>
                              <span
                                className={`text-sm font-bold ${dept.avgMarks >=
                                  70
                                  ? 'text-[#059669]'
                                  : 'text-[#D97706]'
                                  }`}
                              >
                                {
                                  dept.avgMarks
                                }
                                /100
                              </span>
                            </Td>

                            <Td>
                              <span
                                className={`text-sm font-bold ${dept.passPercent >=
                                  80
                                  ? 'text-[#059669]'
                                  : 'text-[#D97706]'
                                  }`}
                              >
                                {
                                  dept.passPercent
                                }
                                %
                              </span>
                            </Td>

                            <Td>
                              <div className="flex gap-1.5">

                                <button
                                  onClick={() =>
                                    setDetailDept(
                                      dept
                                    )
                                  }
                                  className="px-2.5 py-1 rounded-md text-xs font-semibold text-[#7C3AED] bg-[#F3E8FF] hover:bg-[#E9D5FF]"
                                >
                                  View
                                </button>

                                <button
                                  onClick={() =>
                                    setPublishModal(
                                      dept
                                    )
                                  }
                                  className="px-2.5 py-1 rounded-md text-xs font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9]"
                                >
                                  Approve
                                </button>

                                <button
                                  onClick={() =>
                                    notifyDepartmentHOD(
                                      dept.hod
                                    )
                                  }
                                  className="px-2.5 py-1 rounded-md text-xs font-semibold text-[#1D4ED8] bg-[#EEF4FF] hover:bg-[#DBEAFE]"
                                >
                                  Notify
                                </button>
                              </div>
                            </Td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </Table>
                </Card>
              )}
          </div>

          {/* ================================================= */}
          {/* RIGHT COLUMN */}
          {/* ================================================= */}

          <div className="space-y-6">

            <Card>
              <CardHeader
                title="Department Health"
              />

              <HBarChart
                data={DEPARTMENTS.map(
                  dept => ({
                    label:
                      dept.code,

                    value:
                      dept.totalSheets >
                        0
                        ? Math.round(
                          (dept.completed /
                            dept.totalSheets) *
                          100
                        )
                        : 0,

                    color:
                      dept.completed ===
                        dept.totalSheets
                        ? '#059669'
                        : dept.completed >
                          0
                          ? '#7C3AED'
                          : '#94A3B8',
                  })
                )}
                maxValue={100}
                unit="%"
              />
            </Card>

            <Card>
              <CardHeader
                title="Recent Activity"
              />

              <ActivityTimeline
                events={
                  DEAN_ACTIVITY
                }
                maxItems={5}
              />
            </Card>
          </div>
        </div>
      </div>

      {/* ====================================================== */}
      {/* LOGOUT */}
      {/* ====================================================== */}

      <LogoutModal
        open={showLogout}
        onClose={closeLogout}
        onConfirm={onLogout}
      />

      {/* ====================================================== */}
      {/* DEPARTMENT DETAIL MODAL */}
      {/* ====================================================== */}

      {detailDept && (
        <Modal
          open
          onClose={() =>
            setDetailDept(null)
          }
          maxWidth="max-w-2xl"
        >
          <div className="p-6 space-y-5">

            <div className="flex items-start justify-between">

              <div>
                <h3 className="text-xl font-bold text-[#0F172A]">
                  {
                    detailDept.name
                  }
                </h3>

                <p className="text-sm text-[#475569] mt-0.5">
                  HOD:{' '}
                  {
                    detailDept.hod
                  }
                </p>

                <div className="flex gap-2 mt-2">

                  <span className="text-xs font-bold text-[#94A3B8] bg-[#F1F5F9] px-2 py-0.5 rounded-md">
                    {
                      detailDept.code
                    }
                  </span>

                  <DeptStatusPill
                    status={
                      approvedDepts.has(
                        detailDept.id
                      )
                        ? 'Published'
                        : detailDept.status
                    }
                  />
                </div>
              </div>

              <ProgressRing
                value={
                  detailDept.completed
                }
                max={
                  detailDept.totalSheets
                }
                size={64}
                color="#7C3AED"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

              {[
                {
                  label:
                    'Faculty',
                  value:
                    detailDept.faculty,
                  color:
                    '#1B3A6B',
                },
                {
                  label:
                    'Completed',
                  value:
                    detailDept.completed,
                  color:
                    '#059669',
                },
                {
                  label:
                    'Approved',
                  value:
                    detailDept.approved,
                  color:
                    '#7C3AED',
                },
                {
                  label:
                    'Rejected',
                  value:
                    detailDept.rejected,
                  color:
                    '#DC2626',
                },
              ].map(
                stat => (
                  <div
                    key={
                      stat.label
                    }
                    className="text-center p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]"
                  >
                    <div
                      className="text-xl font-bold"
                      style={{
                        color:
                          stat.color,
                      }}
                    >
                      {
                        stat.value
                      }
                    </div>

                    <div className="text-xs text-[#94A3B8] mt-0.5">
                      {
                        stat.label
                      }
                    </div>
                  </div>
                )
              )}
            </div>

            <div>
              <div className="text-sm font-semibold text-[#0F172A] mb-2">
                Grade Distribution
              </div>

              <HBarChart
                data={Object.entries(
                  detailDept.grades
                ).map(
                  ([grade, value]) => ({
                    label:
                      grade,
                    value,
                    color:
                      grade ===
                        'O'
                        ? '#059669'
                        : grade ===
                          'A'
                          ? '#3B5DE8'
                          : grade ===
                            'B'
                            ? '#0284C7'
                            : grade ===
                              'C'
                              ? '#D97706'
                              : grade ===
                                'P'
                                ? '#F59E0B'
                                : '#DC2626',
                  })
                )}
              />
            </div>

            <div className="flex gap-3">

              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={() =>
                  setDetailDept(
                    null
                  )
                }
              >
                Close
              </Button>

              {(
                detailDept.status ===
                'Dean Approval Pending' ||
                detailDept.status ===
                'Ready to Publish'
              ) &&
                !approvedDepts.has(
                  detailDept.id
                ) && (
                  <Button
                    variant="primary"
                    size="md"
                    fullWidth
                    onClick={() => {
                      setPublishModal(
                        detailDept
                      )

                      setDetailDept(
                        null
                      )
                    }}
                  >
                    Approve & Publish
                  </Button>
                )}
            </div>
          </div>
        </Modal>
      )}

      {/* ====================================================== */}
      {/* PUBLISH MODAL */}
      {/* ====================================================== */}

      {publishModal && (
        <PublishResultsModal
          department={
            publishModal
          }
          onClose={() =>
            setPublishModal(
              null
            )
          }
          onConfirm={
            handlePublish
          }
        />
      )}

      {/* ====================================================== */}
      {/* SEND NOTIFICATION MODAL */}
      {/* ====================================================== */}

      {showNotificationModal && (
        <Modal
          open
          onClose={() => {
            if (
              !sendingNotification
            ) {
              setShowNotificationModal(
                false
              )
            }
          }}
          maxWidth="max-w-lg"
        >
          <div className="p-6 space-y-5">

            <div className="flex items-start justify-between gap-4">

              <div>
                <h3 className="text-lg font-bold text-[#0F172A]">
                  Send Notification
                </h3>

                <p className="text-xs text-[#64748B] mt-1">
                  Send a real notification through the existing notification API.
                </p>
              </div>

              <button
                onClick={() => {
                  if (
                    !sendingNotification
                  ) {
                    setShowNotificationModal(
                      false
                    )
                  }
                }}
                className="p-1.5 rounded-lg hover:bg-[#F1F5F9]"
              >
                <X
                  size={18}
                />
              </button>
            </div>

            {/* Recipient mode */}

            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-2">
                Recipient
              </label>

              <div className="grid grid-cols-3 gap-2">

                <button
                  onClick={() => {
                    setNotificationMode(
                      'hod'
                    )
                    setSelectedRecipientId(
                      ''
                    )
                  }}
                  className={`p-2.5 rounded-lg border text-xs font-semibold ${notificationMode ===
                    'hod'
                    ? 'border-[#7C3AED] bg-[#F3E8FF] text-[#7C3AED]'
                    : 'border-[#E2E8F0] text-[#475569]'
                    }`}
                >
                  HOD
                </button>

                <button
                  onClick={() => {
                    setNotificationMode(
                      'faculty'
                    )
                    setSelectedRecipientId(
                      ''
                    )
                  }}
                  className={`p-2.5 rounded-lg border text-xs font-semibold ${notificationMode ===
                    'faculty'
                    ? 'border-[#7C3AED] bg-[#F3E8FF] text-[#7C3AED]'
                    : 'border-[#E2E8F0] text-[#475569]'
                    }`}
                >
                  Faculty
                </button>

                <button
                  onClick={() => {
                    setNotificationMode(
                      'all'
                    )
                    setSelectedRecipientId(
                      ''
                    )
                  }}
                  className={`p-2.5 rounded-lg border text-xs font-semibold ${notificationMode ===
                    'all'
                    ? 'border-[#7C3AED] bg-[#F3E8FF] text-[#7C3AED]'
                    : 'border-[#E2E8F0] text-[#475569]'
                    }`}
                >
                  Everyone
                </button>
              </div>
            </div>

            {/* User selection */}

            {notificationMode !==
              'all' && (
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-2">
                    Select{' '}
                    {
                      notificationMode ===
                        'hod'
                        ? 'HOD'
                        : 'Faculty'
                    }
                  </label>

                  <select
                    value={
                      selectedRecipientId
                    }
                    onChange={event =>
                      setSelectedRecipientId(
                        event.target
                          .value
                      )
                    }
                    disabled={
                      recipientLoading ||
                      sendingNotification
                    }
                    className="w-full px-3 py-2.5 rounded-lg border border-[#CBD5E1] bg-white text-sm text-[#0F172A] outline-none focus:border-[#7C3AED]"
                  >
                    <option value="">
                      {recipientLoading
                        ? 'Loading users...'
                        : 'Select user'}
                    </option>

                    {currentRecipients.map(
                      recipient => (
                        <option
                          key={
                            recipient.id
                          }
                          value={
                            recipient.id
                          }
                        >
                          {
                            recipient.name
                          }{' '}
                          —{' '}
                          {
                            recipient.email
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>
              )}

            {/* Title */}

            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-2">
                Title
              </label>

              <input
                value={
                  notificationTitle
                }
                onChange={event =>
                  setNotificationTitle(
                    event.target
                      .value
                  )
                }
                disabled={
                  sendingNotification
                }
                placeholder="Notification title"
                className="w-full px-3 py-2.5 rounded-lg border border-[#CBD5E1] text-sm outline-none focus:border-[#7C3AED]"
              />
            </div>

            {/* Message */}

            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-2">
                Message
              </label>

              <textarea
                value={
                  notificationMessage
                }
                onChange={event =>
                  setNotificationMessage(
                    event.target
                      .value
                  )
                }
                disabled={
                  sendingNotification
                }
                rows={4}
                placeholder="Write your notification..."
                className="w-full px-3 py-2.5 rounded-lg border border-[#CBD5E1] text-sm outline-none resize-none focus:border-[#7C3AED]"
              />
            </div>

            {sendError && (
              <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-xs">
                {sendError}
              </div>
            )}

            {sendSuccess && (
              <div className="p-3 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] text-xs">
                {sendSuccess}
              </div>
            )}

            <div className="flex gap-3">

              <Button
                variant="secondary"
                size="md"
                fullWidth
                disabled={
                  sendingNotification
                }
                onClick={() =>
                  setShowNotificationModal(
                    false
                  )
                }
              >
                Cancel
              </Button>

              <Button
                variant="primary"
                size="md"
                fullWidth
                disabled={
                  sendingNotification
                }
                onClick={
                  handleSendNotification
                }
              >
                {sendingNotification
                  ? 'Sending...'
                  : 'Send Notification'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </AppShell>
  )
}

// ============================================================
// DEPARTMENT HOD NOTIFICATION
// ============================================================
//
// This uses the REAL HOD list from MongoDB.
// We match the HOD name from the current mock department
// against the real HOD user and then use the real MongoDB ID.
// ============================================================

async function notifyDepartmentHOD(
  hodName: string
) {
  try {
    const hods =
      await getNotificationRecipients(
        'hod'
      )

    const normalizedName =
      hodName
        .trim()
        .toLowerCase()

    const hod =
      hods.find(
        recipient =>
          recipient.name
            .trim()
            .toLowerCase() ===
          normalizedName
      )

    if (!hod) {
      console.warn(
        `HOD "${hodName}" was not found in the real users collection.`
      )

      return
    }

    await sendNotification({
      mode: 'user',
      recipientIds: [
        hod.id,
      ],
      title:
        'Dean Notification',
      message:
        'The Dean has sent an update regarding your department evaluation.',
      type: 'info',
    })

    console.log(
      'Notification sent to HOD:',
      hod.name,
      hod.id
    )
  } catch (error) {
    console.error(
      'Failed to notify HOD:',
      error
    )
  }
}