import { timelineColors } from '../ChartCard'
import type { Notification } from '@/types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface NotificationListProps {
  items: Notification[]
  onMarkAsRead?: (notificationId: string) => Promise<void> | void
}

// ─── Notification List ────────────────────────────────────────────────────────

export function NotificationList({
  items,
  onMarkAsRead,
}: NotificationListProps) {

  // ─── Handle Notification Click ──────────────────────────────────────────────

  const handleNotificationClick = async (
    notification: Notification
  ) => {
    // Already read → nothing to do
    if (notification.is_read) {
      return
    }

    // Mark notification as read in backend
    if (onMarkAsRead) {
      try {
        await onMarkAsRead(notification.id)
      } catch (error) {
        console.error(
          'Failed to mark notification as read:',
          error
        )
      }
    }
  }

  // ─── Notification Color ─────────────────────────────────────────────────────

  const getNotificationColor = (
    type: Notification['type']
  ) => {
    switch (type) {
      case 'warning':
        return timelineColors.warning

      case 'approval':
      case 'evaluation':
      case 'result':
      case 'success':
        return timelineColors.success

      case 'exam':
      case 'user':
      case 'info':
        return timelineColors.info

      case 'error':
        return timelineColors.error

      case 'system':
      default:
        return timelineColors.info
    }
  }

  // ─── Format Notification Time ──────────────────────────────────────────────

  const formatTime = (
    createdAt: string | null
  ) => {

    // Debug: show exactly what backend sent
    console.log(
      '🔔 NOTIFICATION created_at:',
      createdAt
    )

    if (!createdAt) {
      return ''
    }

    const date = new Date(createdAt)

    // Debug: show JavaScript parsed date
    console.log(
      '🔔 PARSED DATE:',
      date.toString()
    )

    // Debug: show explicit IST conversion
    console.log(
      '🔔 IST TIME:',
      date.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'medium',
      })
    )

    if (Number.isNaN(date.getTime())) {
      console.error(
        '❌ Invalid notification date:',
        createdAt
      )

      return createdAt
    }

    // Explicitly display backend timestamp in IST
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  // ─── Empty State ────────────────────────────────────────────────────────────

  if (!items.length) {
    return (
      <div className="text-sm text-[#94A3B8] py-4 text-center">
        No notifications
      </div>
    )
  }

  // ─── Notification Items ─────────────────────────────────────────────────────

  return (
    <div className="divide-y divide-[#F1F5F9]">

      {items.map((notification) => {

        const isRead = notification.is_read

        const cfg = getNotificationColor(
          notification.type
        )

        return (
          <div
            key={notification.id}
            className={`
              flex gap-3
              px-1 py-3
              cursor-pointer
              hover:bg-[#F8FAFC]
              transition-colors
              rounded-lg
              ${isRead ? 'opacity-60' : ''}
            `}
            onClick={() =>
              handleNotificationClick(notification)
            }
          >

            {/* Unread indicator */}

            <div
              className="w-2 h-2 rounded-full mt-1.5 shrink-0"
              style={{
                background: isRead
                  ? '#E2E8F0'
                  : cfg.dot,
              }}
            />

            {/* Notification Content */}

            <div className="min-w-0 flex-1">

              {/* Title */}

              <p
                className={`
                  text-xs
                  font-semibold
                  leading-snug
                  ${isRead
                    ? 'text-[#94A3B8]'
                    : 'text-[#0F172A]'
                  }
                `}
              >
                {notification.title}
              </p>

              {/* Message */}

              <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                {notification.message}
              </p>

              {/* Time */}

              <p className="text-[10px] text-[#94A3B8] mt-1">
                {formatTime(
                  notification.created_at
                )}
              </p>

            </div>

          </div>
        )
      })}

    </div>
  )
}