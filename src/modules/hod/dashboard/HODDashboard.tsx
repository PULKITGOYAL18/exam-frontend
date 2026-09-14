import { AppShell } from '@/layouts'
import { useEffect, useMemo, useState } from 'react'
import { useLogout } from '@/hooks'

import {
  StatCard,
  HBarChart,
  GroupedBarChart,
  DonutChart,
  ActivityTimeline,
  NotificationList,
  ProgressRing,
  WorkflowCard,
  Card,
  CardHeader,
  Button,
  Alert,
  Modal,
  Table,
  Th,
  Td,
  RoleBadge,
  LogoutModal,
} from '@/components/common'

import type {
  User,
  Screen,
  Notification,
} from '@/types'

import {
  Users,
  ClipboardList,
  TrendingUp,
  Clock,
  CheckCircle,
  Undo,
  Bell,
  Send,
  RefreshCw,
  Check,
  X,
} from 'lucide-react'

import {
  FACULTY_LIST,
  PENDING_APPROVALS,
  COMPARISON_DATA,
  APPROVAL_STATUS,
} from '@/services/hod/mockData'

import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getNotificationRecipientsByRole,
  createNotification,
  broadcastNotificationToFaculty,
  broadcastNotificationToDean,
} from '@/services/notification/notificationApi'


// ============================================================================
// TYPES
// ============================================================================

interface NotificationRecipient {
  id: string
  name: string
  email: string
  role: string | null
  employeeId?: string | null
  department?: string | null
  designation?: string | null
  status?: string
}

type SendRecipientRole = 'faculty' | 'dean'
type SendRecipientMode = 'specific' | 'all'

interface ActionModalState {
  type: 'approve' | 'return'
  approval: typeof PENDING_APPROVALS[0]
}


// ============================================================================
// FACULTY STATUS
// ============================================================================

function FacultyStatusPill({
  status,
}: {
  status: string
}) {
  const cfg: Record<string, string> = {
    Approved:
      'bg-[#D1FAE5] text-[#065F46]',

    'All Submitted':
      'bg-[#D1FAE5] text-[#065F46]',

    Evaluating:
      'bg-[#EEF4FF] text-[#1B3A6B]',

    'Pending OCR':
      'bg-[#FEF3C7] text-[#92400E]',

    'Not Started':
      'bg-[#FEE2E2] text-[#991B1B]',
  }

  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
        cfg[status] ??
        'bg-[#F1F5F9] text-[#475569]'
      }`}
    >
      {status}
    </span>
  )
}


// ============================================================================
// WORKLOAD
// ============================================================================

function WorkloadBadge({
  workload,
}: {
  workload: string
}) {
  const cfg: Record<string, string> = {
    High: 'text-[#DC2626]',
    Normal: 'text-[#059669]',
    Low: 'text-[#94A3B8]',
  }

  return (
    <span
      className={`text-xs font-semibold ${
        cfg[workload] ?? 'text-[#475569]'
      }`}
    >
      {workload}
    </span>
  )
}


// ============================================================================
// HOD DASHBOARD
// ============================================================================

interface HODDashboardProps {
  user: User
  onNavigate: (s: Screen) => void
  onLogout: () => void
}

export default function HODDashboard({
  user,
  onNavigate,
  onLogout,
}: HODDashboardProps) {

  const {
    showLogout,
    openLogout,
    closeLogout,
  } = useLogout()


  // ==========================================================================
  // EXISTING DASHBOARD STATE
  // ==========================================================================

  const [
    detailFaculty,
    setDetailFaculty,
  ] = useState<typeof FACULTY_LIST[0] | null>(null)

  const [
    actionModal,
    setActionModal,
  ] = useState<ActionModalState | null>(null)

  const [
    approvedIds,
    setApprovedIds,
  ] = useState<Set<string>>(new Set())

  const [
    returnedIds,
    setReturnedIds,
  ] = useState<Set<string>>(new Set())

  const [
    returnRemark,
    setReturnRemark,
  ] = useState('')


  // ==========================================================================
  // REAL NOTIFICATION STATE
  // ==========================================================================

  const [
    notifications,
    setNotifications,
  ] = useState<Notification[]>([])

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0)

  const [
    loadingNotifications,
    setLoadingNotifications,
  ] = useState(false)

  const [
    notificationsError,
    setNotificationsError,
  ] = useState<string | null>(null)


  // ==========================================================================
  // REAL RECIPIENT USERS
  // ==========================================================================

  const [
    facultyRecipients,
    setFacultyRecipients,
  ] = useState<NotificationRecipient[]>([])

  const [
    deanRecipients,
    setDeanRecipients,
  ] = useState<NotificationRecipient[]>([])

  const [
    loadingRecipients,
    setLoadingRecipients,
  ] = useState(false)


  // ==========================================================================
  // SEND NOTIFICATION MODAL
  // ==========================================================================

  const [
    notificationModal,
    setNotificationModal,
  ] = useState(false)

  const [
    recipientRole,
    setRecipientRole,
  ] = useState<SendRecipientRole>('faculty')

  const [
    recipientMode,
    setRecipientMode,
  ] = useState<SendRecipientMode>('specific')

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
    notificationType,
    setNotificationType,
  ] = useState<Notification['type']>('system')

  const [
    sendingNotification,
    setSendingNotification,
  ] = useState(false)

  const [
    notificationSendError,
    setNotificationSendError,
  ] = useState<string | null>(null)

  const [
    notificationSendSuccess,
    setNotificationSendSuccess,
  ] = useState<string | null>(null)


  // ==========================================================================
  // CURRENT REAL USER ID
  // ==========================================================================

  const getCurrentUserId = (): string => {

    const currentUser =
      user as User & {
        id?: string
        _id?: string
      }

    return (
      currentUser.id ||
      currentUser._id ||
      ''
    )
  }


  // ==========================================================================
  // LOAD NOTIFICATIONS
  // ==========================================================================

  const loadNotifications = async () => {

    const recipientId =
      getCurrentUserId()

    if (!recipientId) {

      setNotifications([])

      setNotificationsError(
        'HOD user ID is not available.'
      )

      return
    }

    try {

      setLoadingNotifications(true)

      setNotificationsError(null)

      const [
        notificationData,
        unread,
      ] = await Promise.all([
        getNotifications(recipientId),
        getUnreadNotificationCount(recipientId),
      ])

      setNotifications(
        notificationData || []
      )

      setUnreadCount(
        unread || 0
      )

    } catch (error) {

      console.error(
        'HOD DASHBOARD NOTIFICATION ERROR:',
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


  // ==========================================================================
  // LOAD REAL FACULTY + DEAN RECIPIENTS
  // ==========================================================================

  const loadNotificationRecipients =
    async () => {

      try {

        setLoadingRecipients(true)

        const [
          faculty,
          deans,
        ] = await Promise.all([
          getNotificationRecipientsByRole(
            'faculty'
          ),

          getNotificationRecipientsByRole(
            'dean'
          ),
        ])

        setFacultyRecipients(
          faculty || []
        )

        setDeanRecipients(
          deans || []
        )

      } catch (error) {

        console.error(
          'HOD DASHBOARD RECIPIENT ERROR:',
          error
        )

      } finally {

        setLoadingRecipients(false)
      }
    }


  // ==========================================================================
  // INITIAL LOAD
  // ==========================================================================

  useEffect(() => {

    void loadNotifications()

    void loadNotificationRecipients()

  }, [user])


  // ==========================================================================
  // MARK ONE NOTIFICATION AS READ
  // ==========================================================================

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

        setUnreadCount(
          previous =>
            Math.max(
              0,
              previous - 1
            )
        )

      } catch (error) {

        console.error(
          'HOD MARK NOTIFICATION ERROR:',
          error
        )

        throw error
      }
    }


  // ==========================================================================
  // MARK ALL NOTIFICATIONS AS READ
  // ==========================================================================

  const handleMarkAllAsRead =
    async () => {

      const recipientId =
        getCurrentUserId()

      if (!recipientId) {
        return
      }

      try {

        await markAllNotificationsAsRead(
          recipientId
        )

        setNotifications(
          previous =>
            previous.map(
              notification => ({
                ...notification,
                is_read: true,
              })
            )
        )

        setUnreadCount(0)

      } catch (error) {

        console.error(
          'HOD MARK ALL NOTIFICATIONS ERROR:',
          error
        )

        setNotificationsError(
          error instanceof Error
            ? error.message
            : 'Unable to mark notifications as read'
        )
      }
    }


  // ==========================================================================
  // REFRESH
  // ==========================================================================

  const refreshNotifications =
    async () => {

      await Promise.all([
        loadNotifications(),
        loadNotificationRecipients(),
      ])
    }


  // ==========================================================================
  // RECIPIENTS FOR CURRENT ROLE
  // ==========================================================================

  const currentRecipients =
    useMemo(
      () =>
        recipientRole === 'faculty'
          ? facultyRecipients
          : deanRecipients,
      [
        recipientRole,
        facultyRecipients,
        deanRecipients,
      ]
    )


  // ==========================================================================
  // OPEN SEND NOTIFICATION MODAL
  // ==========================================================================

  const openNotificationModal = () => {

    setRecipientRole('faculty')

    setRecipientMode('specific')

    setSelectedRecipientId('')

    setNotificationTitle('')

    setNotificationMessage('')

    setNotificationType('system')

    setNotificationSendError(null)

    setNotificationSendSuccess(null)

    setNotificationModal(true)
  }


  // ==========================================================================
  // CLOSE SEND NOTIFICATION MODAL
  // ==========================================================================

  const closeNotificationModal = () => {

    if (sendingNotification) {
      return
    }

    setNotificationModal(false)

    setNotificationSendError(null)

    setNotificationSendSuccess(null)
  }


  // ==========================================================================
  // SEND NOTIFICATION
  // ==========================================================================

  const handleSendNotification =
    async () => {

      setNotificationSendError(null)

      setNotificationSendSuccess(null)


      if (!notificationTitle.trim()) {

        setNotificationSendError(
          'Please enter a notification title.'
        )

        return
      }


      if (!notificationMessage.trim()) {

        setNotificationSendError(
          'Please enter a notification message.'
        )

        return
      }


      if (
        recipientMode ===
        'specific' &&
        !selectedRecipientId
      ) {

        setNotificationSendError(
          'Please select a recipient.'
        )

        return
      }


      try {

        setSendingNotification(true)


        // ----------------------------------------------------------
        // SEND TO ALL USERS IN ROLE
        // ----------------------------------------------------------

        if (
          recipientMode ===
          'all'
        ) {

          if (
            recipientRole ===
            'faculty'
          ) {

            const response =
              await broadcastNotificationToFaculty(
                notificationTitle.trim(),
                notificationMessage.trim(),
                notificationType
              )

            setNotificationSendSuccess(
              `Notification sent to ${
                response.recipient_count ??
                'all'
              } faculty user(s).`
            )

          } else {

            const response =
              await broadcastNotificationToDean(
                notificationTitle.trim(),
                notificationMessage.trim(),
                notificationType
              )

            setNotificationSendSuccess(
              `Notification sent to ${
                response.recipient_count ??
                'all'
              } dean user(s).`
            )
          }

        }

        // ----------------------------------------------------------
        // SEND TO ONE REAL USER
        // ----------------------------------------------------------

        else {

          const created =
            await createNotification(
              selectedRecipientId,
              notificationTitle.trim(),
              notificationMessage.trim(),
              notificationType
            )

          setNotificationSendSuccess(
            `Notification sent successfully to ${
              currentRecipients.find(
                recipient =>
                  recipient.id ===
                  selectedRecipientId
              )?.name ??
              'selected user'
            }.`
          )


          // If somehow the HOD selected themselves,
          // immediately display the new notification.
          if (
            created &&
            created.id ===
              getCurrentUserId()
          ) {

            setNotifications(
              previous => [
                created,
                ...previous,
              ]
            )
          }
        }


        setNotificationTitle('')

        setNotificationMessage('')

        setSelectedRecipientId('')

        await loadNotifications()

      } catch (error) {

        console.error(
          'HOD SEND NOTIFICATION ERROR:',
          error
        )

        setNotificationSendError(
          error instanceof Error
            ? error.message
            : 'Failed to send notification.'
        )

      } finally {

        setSendingNotification(false)
      }
    }


  // ==========================================================================
  // FIND REAL FACULTY USER FOR MOCK EVALUATION
  // ==========================================================================

  const findFacultyRecipient =
    (
      facultyName: string
    ): NotificationRecipient | undefined => {

      const normalized =
        facultyName
          .trim()
          .toLowerCase()

      return facultyRecipients.find(
        recipient =>
          recipient.name
            .trim()
            .toLowerCase() ===
          normalized
      )
    }


  // ==========================================================================
  // APPROVE EVALUATION
  // ==========================================================================
  //
  // Evaluation data is still mock.
  // Notification goes to REAL Dean users.
  // ==========================================================================

  const handleApprove = async (
    approval: typeof PENDING_APPROVALS[0]
  ) => {

    try {

      setApprovedIds(
        previous =>
          new Set([
            ...previous,
            approval.id,
          ])
      )

      setActionModal(null)


      // ----------------------------------------------------------
      // NOTIFY REAL DEAN USERS
      // ----------------------------------------------------------

      const response =
        await broadcastNotificationToDean(
          'Evaluation Approved by HOD',
          `${approval.exam} evaluation submitted by ${approval.faculty} has been approved by the HOD and forwarded to the Dean for final review. ${approval.sheets} sheets are included in this evaluation.`,
          'success'
        )

      console.log(
        'HOD → DEAN notification sent:',
        response
      )

      await loadNotifications()

    } catch (error) {

      console.error(
        'HOD APPROVE NOTIFICATION ERROR:',
        error
      )

      setNotificationsError(
        error instanceof Error
          ? error.message
          : 'Evaluation approved but Dean notification failed.'
      )
    }
  }


  // ==========================================================================
  // RETURN EVALUATION SHEETS TO FACULTY
  // ==========================================================================
  //
  // IMPORTANT:
  // This is NOT a generic "return" action.
  // The HOD is returning the evaluation sheets to the faculty
  // member for correction/re-evaluation.
  // ==========================================================================

  const handleReturn = async (
    approval: typeof PENDING_APPROVALS[0]
  ) => {

    if (!returnRemark.trim()) {
      return
    }

    try {

      setReturnedIds(
        previous =>
          new Set([
            ...previous,
            approval.id,
          ])
      )

      setActionModal(null)

      const remark =
        returnRemark.trim()

      setReturnRemark('')


      // ----------------------------------------------------------
      // FIND THE REAL FACULTY USER
      // ----------------------------------------------------------

      const facultyUser =
        findFacultyRecipient(
          approval.faculty
        )


      if (!facultyUser) {

        setNotificationsError(
          `Evaluation returned, but the real faculty user "${approval.faculty}" was not found in MongoDB recipients.`
        )

        return
      }


      // ----------------------------------------------------------
      // SEND REAL NOTIFICATION TO THAT FACULTY
      // ----------------------------------------------------------

      const notification =
        await createNotification(
          facultyUser.id,

          'Evaluation Sheets Returned by HOD',

          `${approval.exam} evaluation has been returned to you by the HOD for correction. ${approval.sheets} sheets are affected. Reason: ${remark}`,

          'warning'
        )


      console.log(
        'HOD → FACULTY return notification:',
        notification
      )


      await loadNotifications()

    } catch (error) {

      console.error(
        'HOD RETURN EVALUATION ERROR:',
        error
      )

      setNotificationsError(
        error instanceof Error
          ? error.message
          : 'Evaluation was returned but faculty notification failed.'
      )
    }
  }


  // ==========================================================================
  // TOTALS
  // ==========================================================================

  const totalAssigned =
    FACULTY_LIST.reduce(
      (sum, faculty) =>
        sum + faculty.assigned,
      0
    )

  const totalCompleted =
    FACULTY_LIST.reduce(
      (sum, faculty) =>
        sum + faculty.completed,
      0
    )

  const totalPending =
    totalAssigned -
    totalCompleted


  // ==========================================================================
  // PENDING APPROVALS
  // ==========================================================================

  const pendingApprovals =
    PENDING_APPROVALS.filter(
      approval =>
        !approvedIds.has(
          approval.id
        ) &&
        !returnedIds.has(
          approval.id
        )
    )


  // ==========================================================================
  // RENDER
  // ==========================================================================

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


        {/* ============================================================
            WELCOME BANNER
        ============================================================ */}

        <Card className="p-0 overflow-hidden">

          <div className="p-6 bg-gradient-to-r from-[#075985] via-[#0284C7] to-[#0EA5E9]">

            <div className="flex items-start justify-between gap-4 flex-wrap">

              <div>

                <p className="text-sky-200 text-sm font-medium">
                  Department Dashboard
                </p>

                <h1 className="text-2xl font-bold text-white mt-0.5 tracking-tight">
                  {user.name}
                </h1>

                <p className="text-sky-100 text-sm mt-1">
                  {user.designation} · {user.department}
                </p>

                <div className="flex gap-2 mt-3 flex-wrap">

                  <RoleBadge
                    role={user.role}
                  />

                  <span className="text-xs text-sky-200 self-center">
                    {FACULTY_LIST.length} faculty under supervision
                  </span>

                </div>

              </div>


              <div className="grid grid-cols-3 gap-4 text-center">

                {[
                  {
                    label: 'Total Sheets',
                    value: totalAssigned,
                    color: 'text-white',
                  },
                  {
                    label: 'Completed',
                    value: totalCompleted,
                    color: 'text-emerald-300',
                  },
                  {
                    label: 'Pending',
                    value: totalPending,
                    color: 'text-amber-300',
                  },
                ].map(stat => (

                  <div key={stat.label}>

                    <div
                      className={`text-2xl font-bold ${stat.color}`}
                    >
                      {stat.value}
                    </div>

                    <div className="text-sky-200 text-xs mt-0.5">
                      {stat.label}
                    </div>

                  </div>

                ))}

              </div>

            </div>

          </div>

        </Card>


        {/* ============================================================
            NOTIFICATION CONTROLS
        ============================================================ */}

        <Card>

          <div className="flex items-center justify-between gap-4 flex-wrap">

            <div>

              <h3 className="text-base font-semibold text-[#0F172A]">
                Notifications
              </h3>

              <p className="text-xs text-[#94A3B8] mt-0.5">
                Real notifications for the logged-in HOD
              </p>

            </div>


            <div className="flex items-center gap-2 flex-wrap">

              {unreadCount > 0 && (

                <span className="px-2.5 py-1 rounded-full bg-[#FEE2E2] text-[#991B1B] text-xs font-bold">
                  {unreadCount} unread
                </span>

              )}


              <Button
                variant="secondary"
                size="sm"
                onClick={refreshNotifications}
              >
                <RefreshCw
                  size={14}
                  className="mr-1"
                />
                Refresh
              </Button>


              {unreadCount > 0 && (

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                >
                  <Check
                    size={14}
                    className="mr-1"
                  />
                  Mark All Read
                </Button>

              )}


              <Button
                variant="primary"
                size="sm"
                onClick={openNotificationModal}
              >
                <Bell
                  size={14}
                  className="mr-1"
                />
                Send Notification
              </Button>

            </div>

          </div>


          {notificationsError && (

            <div className="mt-4 p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA]">

              <p className="text-sm text-[#B91C1C]">
                {notificationsError}
              </p>

            </div>

          )}

        </Card>


        {/* ============================================================
            ALERT
        ============================================================ */}

        {pendingApprovals.length > 0 && (

          <Alert
            variant="info"
            title={`${pendingApprovals.length} Evaluation${pendingApprovals.length > 1 ? 's' : ''} Awaiting Your Approval`}
            message="Review submitted faculty evaluations before forwarding them to the Dean."
          />

        )}


        {/* ============================================================
            STATS
        ============================================================ */}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">

          <StatCard
            label="Total Faculty"
            value={FACULTY_LIST.length}
            color="#0284C7"
            icon={<Users size={20} />}
          />

          <StatCard
            label="Pending Approvals"
            value={pendingApprovals.length}
            color="#D97706"
            icon={<ClipboardList size={20} />}
            trend={{
              direction:
                pendingApprovals.length > 0
                  ? 'up'
                  : 'neutral',
              text: 'awaiting review',
            }}
          />

          <StatCard
            label="Dept Progress"
            value={`${Math.round(
              (totalCompleted /
                totalAssigned) *
                100
            )}%`}
            color="#059669"
            icon={<TrendingUp size={20} />}
          />

          <StatCard
            label="Avg Eval Time"
            value="4.1h"
            sub="dept average"
            color="#3B5DE8"
            icon={<Clock size={20} />}
          />

          <StatCard
            label="Approved"
            value={307}
            sub="forwarded to Dean"
            color="#059669"
            icon={<CheckCircle size={20} />}
          />

          <StatCard
            label="Returned"
            value={19}
            sub="needs correction"
            color="#DC2626"
            icon={<Undo size={20} />}
          />

        </div>


        {/* ============================================================
            PENDING APPROVALS
        ============================================================ */}

        {pendingApprovals.length > 0 && (

          <Card padding={false}>

            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between gap-4 flex-wrap">

              <div>

                <h3 className="text-base font-semibold text-[#0F172A]">
                  Pending Approvals
                </h3>

                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Review faculty evaluations before forwarding to Dean
                </p>

              </div>


              <WorkflowCard
                steps={[
                  {
                    label: 'Faculty Verified',
                    status: 'done',
                  },
                  {
                    label: 'HOD Review',
                    status: 'active',
                  },
                  {
                    label: 'Dean Approval',
                    status: 'pending',
                  },
                  {
                    label: 'Publish',
                    status: 'pending',
                  },
                ]}
              />

            </div>


            <Table>

              <thead>

                <tr>

                  <Th>Faculty</Th>

                  <Th>Examination</Th>

                  <Th>Sheets</Th>

                  <Th>Avg Marks</Th>

                  <Th>Low Conf</Th>

                  <Th>Submitted</Th>

                  <Th>Actions</Th>

                </tr>

              </thead>


              <tbody>

                {pendingApprovals.map(
                  approval => (

                    <tr
                      key={approval.id}
                      className="hover:bg-[#F8FAFC] transition-colors"
                    >

                      <Td>

                        <div className="flex items-center gap-2.5">

                          <div className="w-8 h-8 rounded-full bg-[#EEF4FF] text-[#1B3A6B] text-xs font-bold flex items-center justify-center">

                            {approval.faculty
                              .split(' ')
                              .map(
                                name =>
                                  name[0]
                              )
                              .join('')
                              .slice(
                                0,
                                2
                              )
                              .toUpperCase()}

                          </div>

                          <span className="text-sm font-medium text-[#0F172A]">
                            {approval.faculty}
                          </span>

                        </div>

                      </Td>


                      <Td>

                        <span className="text-sm text-[#475569]">
                          {approval.exam}
                        </span>

                      </Td>


                      <Td>

                        <span className="text-sm font-semibold text-[#0F172A]">
                          {approval.sheets}
                        </span>

                      </Td>


                      <Td>

                        <span
                          className={`text-sm font-semibold ${
                            approval.avgMarks >= 70
                              ? 'text-[#059669]'
                              : approval.avgMarks >= 50
                                ? 'text-[#D97706]'
                                : 'text-[#DC2626]'
                          }`}
                        >
                          {approval.avgMarks}/100
                        </span>

                      </Td>


                      <Td>

                        {approval.lowConf > 0 ? (

                          <span className="text-xs font-semibold text-[#DC2626] bg-[#FEE2E2] px-2 py-0.5 rounded-full">
                            {approval.lowConf} flagged
                          </span>

                        ) : (

                          <span className="text-xs font-semibold text-[#059669]">
                            None
                          </span>

                        )}

                      </Td>


                      <Td>

                        <span className="text-xs text-[#94A3B8]">
                          {approval.submittedAt}
                        </span>

                      </Td>


                      <Td>

                        <div className="flex gap-1.5 flex-wrap">

                          <button
                            onClick={() => {
                              const faculty =
                                FACULTY_LIST.find(
                                  item =>
                                    item.name ===
                                    approval.faculty
                                )

                              setDetailFaculty(
                                faculty ??
                                null
                              )
                            }}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold text-[#1B3A6B] bg-[#EEF4FF] hover:bg-[#BACFFB] transition-colors"
                          >
                            View
                          </button>


                          <button
                            onClick={() =>
                              setActionModal({
                                type: 'approve',
                                approval,
                              })
                            }
                            className="px-2.5 py-1 rounded-md text-xs font-semibold text-[#065F46] bg-[#D1FAE5] hover:bg-[#A7F3D0] transition-colors"
                          >
                            Approve & Forward
                          </button>


                          <button
                            onClick={() => {
                              setReturnRemark('')
                              setActionModal({
                                type: 'return',
                                approval,
                              })
                            }}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold text-[#92400E] bg-[#FEF3C7] hover:bg-[#FDE68A] transition-colors"
                          >
                            Return Evaluation
                          </button>

                        </div>

                      </Td>

                    </tr>

                  )
                )}

              </tbody>

            </Table>


            {approvedIds.size > 0 && (

              <div className="p-4 bg-[#D1FAE5] border-t border-[#A7F3D0] flex items-center justify-between">

                <span className="text-sm text-[#065F46] font-medium">

                  {approvedIds.size} evaluation
                  {approvedIds.size > 1
                    ? 's'
                    : ''}{' '}
                  approved and forwarded to Dean.

                </span>

              </div>

            )}

          </Card>

        )}


        {/* ============================================================
            MAIN GRID
        ============================================================ */}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">


          {/* LEFT */}
          <div className="xl:col-span-2 space-y-6">


            {/* FACULTY PERFORMANCE */}

            <Card padding={false}>

              <div className="p-5 border-b border-[#E2E8F0]">

                <h3 className="text-base font-semibold text-[#0F172A]">
                  Faculty Performance
                </h3>

                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Evaluation status for all department faculty
                </p>

              </div>


              <div className="divide-y divide-[#F1F5F9]">

                {FACULTY_LIST.map(
                  faculty => {

                    const pct =
                      faculty.assigned >
                      0
                        ? Math.round(
                            (faculty.completed /
                              faculty.assigned) *
                              100
                          )
                        : 0

                    return (

                      <div
                        key={faculty.id}
                        className="p-5 hover:bg-[#F8FAFC] transition-colors"
                      >

                        <div className="flex items-start gap-4 flex-wrap">

                          <div className="flex-1 min-w-0">

                            <div className="flex items-center gap-2 flex-wrap">

                              <div className="w-9 h-9 rounded-full bg-[#EEF4FF] text-[#1B3A6B] text-sm font-bold flex items-center justify-center shrink-0">

                                {faculty.name
                                  .split(' ')
                                  .map(
                                    name =>
                                      name[0]
                                  )
                                  .join('')
                                  .slice(
                                    0,
                                    2
                                  )
                                  .toUpperCase()}

                              </div>


                              <div>

                                <div className="flex items-center gap-2">

                                  <span className="text-sm font-semibold text-[#0F172A]">
                                    {faculty.name}
                                  </span>

                                  <FacultyStatusPill
                                    status={
                                      faculty.status
                                    }
                                  />

                                </div>

                                <div className="text-xs text-[#94A3B8]">
                                  {faculty.designation}
                                </div>

                              </div>

                            </div>


                            <div className="mt-2 flex flex-wrap gap-1">

                              {faculty.subjects.map(
                                subject => (

                                  <span
                                    key={subject}
                                    className="text-[10px] bg-[#F1F5F9] text-[#475569] px-2 py-0.5 rounded-md"
                                  >
                                    {subject}
                                  </span>

                                )
                              )}

                            </div>


                            <div className="mt-2">

                              <div className="flex justify-between text-[10px] text-[#94A3B8] mb-1">

                                <span>
                                  Progress
                                </span>

                                <span className="font-semibold">
                                  {faculty.completed}/
                                  {faculty.assigned}{' '}
                                  sheets
                                </span>

                              </div>


                              <div className="h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">

                                <div
                                  className="h-full rounded-full bg-[#0284C7] transition-all"
                                  style={{
                                    width: `${pct}%`,
                                  }}
                                />

                              </div>

                            </div>

                          </div>


                          <div className="flex items-center gap-4 shrink-0">

                            <div className="text-center">

                              <div className="text-xs text-[#94A3B8]">
                                Avg Time
                              </div>

                              <div className="text-sm font-bold text-[#0F172A]">
                                {faculty.avgTime}
                              </div>

                            </div>


                            <div className="text-center">

                              <div className="text-xs text-[#94A3B8]">
                                Low Conf
                              </div>

                              <div
                                className={`text-sm font-bold ${
                                  faculty.lowConfPct >
                                  8
                                    ? 'text-[#DC2626]'
                                    : faculty.lowConfPct >
                                      4
                                      ? 'text-[#D97706]'
                                      : 'text-[#059669]'
                                }`}
                              >
                                {faculty.lowConfPct}%
                              </div>

                            </div>


                            <div className="text-center">

                              <div className="text-xs text-[#94A3B8]">
                                Workload
                              </div>

                              <WorkloadBadge
                                workload={
                                  faculty.workload
                                }
                              />

                            </div>


                            <ProgressRing
                              value={pct}
                              size={44}
                              color={
                                pct === 100
                                  ? '#059669'
                                  : '#0284C7'
                              }
                            />


                            <button
                              onClick={() =>
                                setDetailFaculty(
                                  faculty
                                )
                              }
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#0284C7] bg-[#E0F2FE] hover:bg-[#BAE6FD] transition-colors"
                            >
                              View Details
                            </button>

                          </div>

                        </div>

                      </div>

                    )
                  }
                )}

              </div>

            </Card>


            {/* CHARTS */}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

              <Card>

                <CardHeader
                  title="Faculty Comparison"
                  subtitle="Completed vs. Pending sheets"
                />

                <GroupedBarChart
                  series={[
                    {
                      label: 'Completed',
                      color: '#059669',
                    },
                    {
                      label: 'Pending',
                      color: '#D97706',
                    },
                  ]}
                  data={COMPARISON_DATA}
                  height={180}
                />

              </Card>


              <Card>

                <CardHeader
                  title="Approval Status"
                  subtitle="Department-wide distribution"
                />

                <DonutChart
                  segments={
                    APPROVAL_STATUS
                  }
                  centerValue={641}
                  centerLabel="Total Sheets"
                  size={120}
                />

              </Card>

            </div>

          </div>


          {/* RIGHT */}

          <div className="space-y-6">


            {/* DEPARTMENT STATISTICS */}

            <Card>

              <CardHeader
                title="Department Statistics"
              />

              <HBarChart
                data={[
                  {
                    label:
                      'Completion Rate',
                    value:
                      Math.round(
                        (totalCompleted /
                          totalAssigned) *
                          100
                      ),
                    color:
                      '#059669',
                  },
                  {
                    label:
                      'Approval Rate',
                    value:
                      Math.round(
                        (307 /
                          totalCompleted) *
                          100
                      ),
                    color:
                      '#3B5DE8',
                  },
                  {
                    label:
                      'On-time Rate',
                    value: 78,
                    color:
                      '#D97706',
                  },
                  {
                    label:
                      'Accuracy Score',
                    value: 91,
                    color:
                      '#0284C7',
                  },
                ]}
                maxValue={100}
                unit="%"
              />

            </Card>


            {/* REAL NOTIFICATIONS */}

            <Card>

              <div className="flex items-center justify-between mb-4">

                <CardHeader
                  title="Notifications"
                  subtitle={
                    loadingNotifications
                      ? 'Loading…'
                      : `${notifications.length} updates`
                  }
                />

                {unreadCount > 0 && (

                  <span className="px-2 py-1 rounded-full bg-[#FEE2E2] text-[#991B1B] text-xs font-bold">
                    {unreadCount} unread
                  </span>

                )}

              </div>


              {loadingNotifications ? (

                <div className="py-8 text-center text-sm text-[#94A3B8]">
                  Loading notifications…
                </div>

              ) : notifications.length === 0 ? (

                <div className="py-8 text-center">

                  <Bell
                    size={28}
                    className="mx-auto text-[#CBD5E1] mb-2"
                  />

                  <p className="text-sm text-[#94A3B8]">
                    No notifications yet.
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

              <CardHeader
                title="Recent Activity"
              />

              <ActivityTimeline
                events={[
                  {
                    time: '09:30',
                    title:
                      'Prof. Rajan Kumar submitted CS205',
                    sub:
                      '93 sheets · 72.4/100 avg',
                    type:
                      'success' as const,
                  },
                  {
                    time: '07:45',
                    title:
                      'HOD approved CS101 evaluation',
                    sub:
                      '93 sheets forwarded to Dean',
                    type:
                      'success' as const,
                  },
                  {
                    time: 'Yesterday',
                    title:
                      'Returned CS302 evaluation',
                    sub:
                      'Evaluation sheets sent back to faculty',
                    type:
                      'warning' as const,
                  },
                  {
                    time: '2d ago',
                    title:
                      'Sent CS302 approval to Dean',
                    sub:
                      '74 sheets · first batch',
                    type:
                      'info' as const,
                  },
                  {
                    time: '3d ago',
                    title:
                      'Dr. Meena Iyer started CS403',
                    sub:
                      'OCR processing complete',
                    type:
                      'neutral' as const,
                  },
                ]}
                maxItems={5}
              />

            </Card>

          </div>

        </div>

      </div>


      {/* ============================================================
          LOGOUT
      ============================================================ */}

      <LogoutModal
        open={showLogout}
        onClose={closeLogout}
        onConfirm={onLogout}
      />


      {/* ============================================================
          FACULTY DETAIL MODAL
      ============================================================ */}

      {detailFaculty && (

        <Modal
          open
          onClose={() =>
            setDetailFaculty(null)
          }
          maxWidth="max-w-2xl"
        >

          <div className="p-6 space-y-5">

            <div className="flex items-center gap-4">

              <div className="w-14 h-14 rounded-2xl bg-[#EEF4FF] text-[#1B3A6B] text-xl font-bold flex items-center justify-center">

                {detailFaculty.name
                  .split(' ')
                  .map(name => name[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}

              </div>


              <div>

                <h3 className="text-lg font-bold text-[#0F172A]">
                  {detailFaculty.name}
                </h3>

                <p className="text-sm text-[#475569]">
                  {detailFaculty.designation}
                </p>

                <div className="flex gap-2 mt-1.5">

                  <FacultyStatusPill
                    status={
                      detailFaculty.status
                    }
                  />

                  <WorkloadBadge
                    workload={
                      detailFaculty.workload
                    }
                  />

                </div>

              </div>


              <div className="ml-auto">

                <ProgressRing
                  value={
                    detailFaculty.completed
                  }
                  max={
                    detailFaculty.assigned
                  }
                  size={60}
                  color="#0284C7"
                />

              </div>

            </div>


            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

              {[
                {
                  label: 'Assigned',
                  value:
                    detailFaculty.assigned,
                  color:
                    '#1B3A6B',
                },
                {
                  label: 'Completed',
                  value:
                    detailFaculty.completed,
                  color:
                    '#059669',
                },
                {
                  label: 'Pending',
                  value:
                    detailFaculty.pending,
                  color:
                    '#D97706',
                },
                {
                  label: 'Low Conf %',
                  value:
                    `${detailFaculty.lowConfPct}%`,
                  color:
                    '#DC2626',
                },
              ].map(stat => (

                <div
                  key={stat.label}
                  className="text-center p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]"
                >

                  <div
                    className="text-xl font-bold"
                    style={{
                      color:
                        stat.color,
                    }}
                  >
                    {stat.value}
                  </div>

                  <div className="text-xs text-[#94A3B8] mt-0.5">
                    {stat.label}
                  </div>

                </div>

              ))}

            </div>


            <div>

              <div className="text-sm font-semibold text-[#0F172A] mb-2">
                Subjects
              </div>

              <div className="space-y-1">

                {detailFaculty.subjects.map(
                  subject => (

                    <div
                      key={subject}
                      className="flex items-center gap-2 text-sm text-[#475569]"
                    >

                      <span className="w-1.5 h-1.5 rounded-full bg-[#0284C7] shrink-0" />

                      {subject}

                    </div>

                  )
                )}

              </div>

            </div>


            <div className="flex gap-3">

              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={() =>
                  setDetailFaculty(null)
                }
              >
                Close
              </Button>


              {(() => {

                const approval =
                  PENDING_APPROVALS.find(
                    item =>
                      item.faculty ===
                      detailFaculty.name
                  )

                if (!approval) {
                  return null
                }

                return (
                  <>
                    <Button
                      variant="success"
                      size="md"
                      fullWidth
                      onClick={() => {

                        void handleApprove(
                          approval
                        )

                        setDetailFaculty(
                          null
                        )

                      }}
                    >
                      Approve & Forward
                    </Button>


                    <Button
                      variant="danger"
                      size="md"
                      onClick={() => {

                        setReturnRemark('')

                        setActionModal({
                          type: 'return',
                          approval,
                        })

                        setDetailFaculty(
                          null
                        )

                      }}
                    >
                      Return Evaluation
                    </Button>
                  </>
                )

              })()}

            </div>

          </div>

        </Modal>

      )}


      {/* ============================================================
          APPROVE / RETURN MODAL
      ============================================================ */}

      {actionModal && (

        <Modal
          open
          onClose={() => {

            setActionModal(
              null
            )

            setReturnRemark('')

          }}
          maxWidth="max-w-md"
        >

          <div className="p-6 space-y-4">

            <div className="flex items-start gap-3">

              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  actionModal.type ===
                  'approve'
                    ? 'bg-[#D1FAE5] text-[#059669]'
                    : 'bg-[#FEF3C7] text-[#D97706]'
                }`}
              >

                {actionModal.type ===
                'approve' ? (
                  <Check
                    size={20}
                  />
                ) : (
                  <Undo
                    size={20}
                  />
                )}

              </div>


              <div>

                <h3 className="text-lg font-bold text-[#0F172A]">

                  {actionModal.type ===
                  'approve'
                    ? 'Approve Evaluation'
                    : 'Return Evaluation Sheets'}

                </h3>

                <p className="text-xs text-[#64748B] mt-1">
                  {actionModal.type ===
                  'approve'
                    ? 'The evaluation will be forwarded to the Dean.'
                    : 'The evaluation sheets will be returned to the faculty member for correction and re-evaluation.'}
                </p>

              </div>

            </div>


            <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">

              <p className="text-sm text-[#475569]">

                <strong className="text-[#0F172A]">
                  {actionModal.approval.faculty}
                </strong>

                {' — '}

                {actionModal.approval.exam}

              </p>

              <p className="text-xs text-[#94A3B8] mt-1">

                {actionModal.approval.sheets}
                {' sheets · '}
                {actionModal.approval.avgMarks}
                /100 average

              </p>

            </div>


            {actionModal.type ===
              'approve' && (

              <div className="p-3 bg-[#EEF4FF] border border-[#BACFFB] rounded-lg text-xs text-[#1B3A6B]">

                Approving this evaluation will automatically send a real notification to the Dean users and mark this evaluation as forwarded.

              </div>

            )}


            {actionModal.type ===
              'return' && (

              <div className="space-y-1.5">

                <label className="text-sm font-medium text-[#0F172A]">

                  Correction Reason
                  {' '}

                  <span className="text-[#DC2626]">
                    *
                  </span>

                </label>


                <textarea
                  value={
                    returnRemark
                  }
                  onChange={event =>
                    setReturnRemark(
                      event.target.value
                    )
                  }
                  rows={4}
                  placeholder="Explain what needs to be corrected in the evaluation sheets…"
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E2E8F0] text-sm resize-none outline-none focus:border-[#3B5DE8] focus:ring-2 focus:ring-[#3B5DE8]/20 placeholder:text-[#94A3B8]"
                />

                <p className="text-xs text-[#94A3B8]">
                  This reason will be included in the notification sent to the faculty member.
                </p>

              </div>

            )}


            <div className="flex gap-3">

              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => {

                  setActionModal(
                    null
                  )

                  setReturnRemark('')

                }}
              >
                Cancel
              </Button>


              {actionModal.type ===
                'approve' ? (

                <Button
                  variant="success"
                  size="md"
                  fullWidth
                  onClick={() =>
                    void handleApprove(
                      actionModal.approval
                    )
                  }
                >
                  Approve & Notify Dean
                </Button>

              ) : (

                <Button
                  variant="danger"
                  size="md"
                  fullWidth
                  disabled={
                    !returnRemark.trim()
                  }
                  onClick={() =>
                    void handleReturn(
                      actionModal.approval
                    )
                  }
                >
                  Return Sheets to Faculty
                </Button>

              )}

            </div>

          </div>

        </Modal>

      )}


      {/* ============================================================
          SEND NOTIFICATION MODAL
      ============================================================ */}

      {notificationModal && (

        <Modal
          open
          onClose={
            closeNotificationModal
          }
          maxWidth="max-w-lg"
        >

          <div className="max-h-[calc(100vh-4rem)] overflow-y-auto">

            <div className="p-6 space-y-5">


              <div className="flex items-center gap-3">

                <div className="w-10 h-10 rounded-xl bg-[#DBEAFE] flex items-center justify-center">

                  <Send
                    size={20}
                    className="text-[#2563EB]"
                  />

                </div>


                <div>

                  <h3 className="text-lg font-bold text-[#0F172A]">
                    Send Notification
                  </h3>

                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    Send a notification to real Faculty or Dean users
                  </p>

                </div>

              </div>


              {notificationSendError && (

                <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA]">

                  <p className="text-sm text-[#B91C1C] font-medium">
                    {notificationSendError}
                  </p>

                </div>

              )}


              {notificationSendSuccess && (

                <div className="p-3 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0]">

                  <p className="text-sm text-[#065F46] font-medium">
                    {notificationSendSuccess}
                  </p>

                </div>

              )}


              {/* ROLE */}

              <div>

                <label className="block text-sm font-semibold text-[#0F172A] mb-2">
                  Recipient Role
                </label>


                <div className="grid grid-cols-2 gap-3">

                  <button
                    type="button"
                    onClick={() => {

                      setRecipientRole(
                        'faculty'
                      )

                      setSelectedRecipientId(
                        ''
                      )

                    }}
                    disabled={
                      sendingNotification
                    }
                    className={`p-3 rounded-xl border text-left ${
                      recipientRole ===
                      'faculty'
                        ? 'border-[#2563EB] bg-[#EEF4FF] ring-2 ring-[#2563EB]/10'
                        : 'border-[#E2E8F0] bg-white'
                    }`}
                  >

                    <div className="text-sm font-semibold text-[#0F172A]">
                      Faculty
                    </div>

                    <div className="text-[11px] text-[#94A3B8] mt-0.5">
                      {facultyRecipients.length} real users available
                    </div>

                  </button>


                  <button
                    type="button"
                    onClick={() => {

                      setRecipientRole(
                        'dean'
                      )

                      setSelectedRecipientId(
                        ''
                      )

                    }}
                    disabled={
                      sendingNotification
                    }
                    className={`p-3 rounded-xl border text-left ${
                      recipientRole ===
                      'dean'
                        ? 'border-[#2563EB] bg-[#EEF4FF] ring-2 ring-[#2563EB]/10'
                        : 'border-[#E2E8F0] bg-white'
                    }`}
                  >

                    <div className="text-sm font-semibold text-[#0F172A]">
                      Dean
                    </div>

                    <div className="text-[11px] text-[#94A3B8] mt-0.5">
                      {deanRecipients.length} real users available
                    </div>

                  </button>

                </div>

              </div>


              {/* RECIPIENT MODE */}

              <div>

                <label className="block text-sm font-semibold text-[#0F172A] mb-2">
                  Send To
                </label>


                <div className="grid grid-cols-2 gap-3">

                  <button
                    type="button"
                    onClick={() =>
                      setRecipientMode(
                        'specific'
                      )
                    }
                    disabled={
                      sendingNotification
                    }
                    className={`p-3 rounded-xl border text-left ${
                      recipientMode ===
                      'specific'
                        ? 'border-[#2563EB] bg-[#EEF4FF]'
                        : 'border-[#E2E8F0]'
                    }`}
                  >

                    <div className="text-sm font-semibold text-[#0F172A]">
                      Specific User
                    </div>

                    <div className="text-[11px] text-[#94A3B8]">
                      Select one real user
                    </div>

                  </button>


                  <button
                    type="button"
                    onClick={() =>
                      setRecipientMode(
                        'all'
                      )
                    }
                    disabled={
                      sendingNotification
                    }
                    className={`p-3 rounded-xl border text-left ${
                      recipientMode ===
                      'all'
                        ? 'border-[#2563EB] bg-[#EEF4FF]'
                        : 'border-[#E2E8F0]'
                    }`}
                  >

                    <div className="text-sm font-semibold text-[#0F172A]">
                      Everyone in Role
                    </div>

                    <div className="text-[11px] text-[#94A3B8]">
                      Broadcast notification
                    </div>

                  </button>

                </div>

              </div>


              {/* SPECIFIC USER */}

              {recipientMode ===
                'specific' && (

                <div>

                  <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
                    Select User
                  </label>


                  <select
                    value={
                      selectedRecipientId
                    }
                    onChange={event =>
                      setSelectedRecipientId(
                        event.target.value
                      )
                    }
                    disabled={
                      sendingNotification ||
                      loadingRecipients
                    }
                    className="w-full px-3 py-2.5 rounded-lg border border-[#E2E8F0] text-sm bg-white outline-none focus:border-[#3B5DE8]"
                  >

                    <option value="">
                      Select {recipientRole === 'faculty'
                        ? 'faculty'
                        : 'dean'}
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
                          {recipient.name}
                          {' — '}
                          {recipient.email}
                        </option>

                      )
                    )}

                  </select>

                </div>

              )}


              {/* TITLE */}

              <div>

                <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
                  Title
                </label>

                <input
                  value={
                    notificationTitle
                  }
                  onChange={event =>
                    setNotificationTitle(
                      event.target.value
                    )
                  }
                  disabled={
                    sendingNotification
                  }
                  placeholder="Notification title"
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E2E8F0] text-sm outline-none focus:border-[#3B5DE8] focus:ring-2 focus:ring-[#3B5DE8]/20"
                />

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
                  onChange={event =>
                    setNotificationMessage(
                      event.target.value
                    )
                  }
                  disabled={
                    sendingNotification
                  }
                  rows={4}
                  placeholder="Write your notification message…"
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E2E8F0] text-sm resize-none outline-none focus:border-[#3B5DE8] focus:ring-2 focus:ring-[#3B5DE8]/20"
                />

              </div>


              {/* TYPE */}

              <div>

                <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
                  Notification Type
                </label>

                <select
                  value={
                    notificationType
                  }
                  onChange={event =>
                    setNotificationType(
                      event.target.value as Notification['type']
                    )
                  }
                  disabled={
                    sendingNotification
                  }
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E2E8F0] text-sm bg-white outline-none focus:border-[#3B5DE8]"
                >

                  <option value="system">
                    System
                  </option>

                  <option value="info">
                    Information
                  </option>

                  <option value="success">
                    Success
                  </option>

                  <option value="warning">
                    Warning
                  </option>

                  <option value="error">
                    Error
                  </option>

                </select>

              </div>


              {/* ACTIONS */}

              <div className="flex gap-3">

                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  onClick={
                    closeNotificationModal
                  }
                  disabled={
                    sendingNotification
                  }
                >
                  Cancel
                </Button>


                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  loading={
                    sendingNotification
                  }
                  disabled={
                    sendingNotification
                  }
                  onClick={() =>
                    void handleSendNotification()
                  }
                >

                  {sendingNotification
                    ? 'Sending…'
                    : 'Send Notification'}

                </Button>

              </div>

            </div>

          </div>

        </Modal>

      )}

    </AppShell>
  )
}