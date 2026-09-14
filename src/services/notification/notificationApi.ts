import type { Notification } from '@/types'

// ============================================================
// API BASE URL
// ============================================================

const API_BASE_URL =
    'http://127.0.0.1:5000/api/notifications'

// ============================================================
// RESPONSE TYPES
// ============================================================

interface NotificationResponse {
    success?: boolean
    message: string
    notification?: Notification
}

interface NotificationsResponse {
    success?: boolean
    notifications: Notification[]
    count?: number
}

interface UnreadCountResponse {
    success?: boolean
    unread_count: number
}

export interface BroadcastResponse {
    success?: boolean
    message: string
    recipient_count?: number
    updated_count?: number
    created_at?: string | null
}

// ============================================================
// HELPER
// ============================================================

async function getErrorMessage(
    response: Response,
    fallback: string
): Promise<string> {
    try {
        const data = await response.json()

        if (data?.message) {
            return data.message
        }

        return fallback
    } catch {
        try {
            const text = await response.text()

            return text || fallback
        } catch {
            return fallback
        }
    }
}

// ============================================================
// GET ALL NOTIFICATIONS FOR USER
// ============================================================

export async function getNotifications(
    recipientId: string
): Promise<Notification[]> {
    if (!recipientId) {
        throw new Error('Recipient ID is required')
    }

    const response = await fetch(
        `${API_BASE_URL}/user/${encodeURIComponent(recipientId)}`,
        {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }
    )

    if (!response.ok) {
        throw new Error(
            await getErrorMessage(
                response,
                'Failed to fetch notifications'
            )
        )
    }

    const data: NotificationsResponse =
        await response.json()

    return data.notifications || []
}

// ============================================================
// GET UNREAD NOTIFICATIONS
// ============================================================

export async function getUnreadNotifications(
    recipientId: string
): Promise<Notification[]> {
    if (!recipientId) {
        throw new Error('Recipient ID is required')
    }

    const response = await fetch(
        `${API_BASE_URL}/user/${encodeURIComponent(
            recipientId
        )}/unread`,
        {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }
    )

    if (!response.ok) {
        throw new Error(
            await getErrorMessage(
                response,
                'Failed to fetch unread notifications'
            )
        )
    }

    const data: NotificationsResponse =
        await response.json()

    return data.notifications || []
}

// ============================================================
// GET UNREAD NOTIFICATION COUNT
// ============================================================

export async function getUnreadNotificationCount(
    recipientId: string
): Promise<number> {
    if (!recipientId) {
        throw new Error('Recipient ID is required')
    }

    const response = await fetch(
        `${API_BASE_URL}/user/${encodeURIComponent(
            recipientId
        )}/unread-count`,
        {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }
    )

    if (!response.ok) {
        throw new Error(
            await getErrorMessage(
                response,
                'Failed to fetch unread notification count'
            )
        )
    }

    const data: UnreadCountResponse =
        await response.json()

    return data.unread_count || 0
}

// ============================================================
// MARK ONE NOTIFICATION AS READ
// ============================================================

export async function markNotificationAsRead(
    notificationId: string
): Promise<void> {
    if (!notificationId) {
        throw new Error('Notification ID is required')
    }

    const response = await fetch(
        `${API_BASE_URL}/${encodeURIComponent(
            notificationId
        )}/read`,
        {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
        }
    )

    if (!response.ok) {
        throw new Error(
            await getErrorMessage(
                response,
                'Failed to mark notification as read'
            )
        )
    }
}

// ============================================================
// MARK ALL NOTIFICATIONS AS READ
// ============================================================

export async function markAllNotificationsAsRead(
    recipientId: string
): Promise<void> {
    if (!recipientId) {
        throw new Error('Recipient ID is required')
    }

    const response = await fetch(
        `${API_BASE_URL}/user/${encodeURIComponent(
            recipientId
        )}/read-all`,
        {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
        }
    )

    if (!response.ok) {
        throw new Error(
            await getErrorMessage(
                response,
                'Failed to mark all notifications as read'
            )
        )
    }
}

// ============================================================
// CREATE NOTIFICATION FOR ONE USER
// ============================================================
//
// Used for INDIVIDUAL user selection.
//
// Example:
// Admin selects:
//   Faculty A
//   Faculty B
//   HOD A
//
// Frontend calls this function separately for each selected
// user.
//
// Database example:
//
// recipient_id: "6a78..."
// recipient_role: null
//
// ============================================================

export async function createNotification(
    recipientId: string,
    title: string,
    message: string,
    type: Notification['type'] = 'system'
): Promise<Notification> {
    if (!recipientId) {
        throw new Error('Recipient ID is required')
    }

    if (!title.trim()) {
        throw new Error('Notification title is required')
    }

    if (!message.trim()) {
        throw new Error('Notification message is required')
    }

    const response = await fetch(
        `${API_BASE_URL}/`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                recipient_id: recipientId,
                title: title.trim(),
                message: message.trim(),
                type,
            }),
        }
    )

    if (!response.ok) {
        throw new Error(
            await getErrorMessage(
                response,
                'Failed to create notification'
            )
        )
    }

    const data: NotificationResponse =
        await response.json()

    if (!data.notification) {
        throw new Error(
            data.message ||
            'Notification was created but no notification data was returned'
        )
    }

    return data.notification
}

// ============================================================
// BROADCAST NOTIFICATION TO A ROLE
// ============================================================
//
// Used when ADMIN selects a ROLE instead of individual users.
//
// Supported roles:
//
//   faculty
//   hod
//   dean
//   admin
//
// Example:
//
// Admin selects:
//
//   Faculty
//
// Request:
//
// POST /api/notifications/broadcast-role
//
// {
//   role: "faculty",
//   title: "...",
//   message: "...",
//   type: "info"
// }
//
// Backend should find ALL users where:
//
// role == "faculty"
//
// and create/send the notification to all of them.
//
// ============================================================

export async function broadcastNotificationToRole(
    role: string,
    title: string,
    message: string,
    type: Notification['type'] = 'system'
): Promise<BroadcastResponse> {
    const normalizedRole = role
        .trim()
        .toLowerCase()

    if (!normalizedRole) {
        throw new Error('Recipient role is required')
    }

    const allowedRoles = [
        'faculty',
        'hod',
        'dean',
        'admin',
    ]

    if (!allowedRoles.includes(normalizedRole)) {
        throw new Error(
            `Invalid recipient role: ${role}`
        )
    }

    if (!title.trim()) {
        throw new Error('Notification title is required')
    }

    if (!message.trim()) {
        throw new Error('Notification message is required')
    }

    const response = await fetch(
        `${API_BASE_URL}/broadcast-role`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                role: normalizedRole,
                title: title.trim(),
                message: message.trim(),
                type,
            }),
        }
    )

    if (!response.ok) {
        throw new Error(
            await getErrorMessage(
                response,
                'Failed to broadcast notification to role'
            )
        )
    }

    const data: BroadcastResponse =
        await response.json()

    return data
}

// ============================================================
// BROADCAST NOTIFICATION TO EVERYONE
// ============================================================
//
// Sends the notification to EVERY user.
//
// This includes:
//
// Faculty
// HOD
// Dean
// Admin
//
// ============================================================

export async function broadcastNotificationToAll(
    title: string,
    message: string,
    type: Notification['type'] = 'system'
): Promise<BroadcastResponse> {
    if (!title.trim()) {
        throw new Error('Notification title is required')
    }

    if (!message.trim()) {
        throw new Error('Notification message is required')
    }

    const response = await fetch(
        `${API_BASE_URL}/broadcast-all`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: title.trim(),
                message: message.trim(),
                type,
            }),
        }
    )

    if (!response.ok) {
        throw new Error(
            await getErrorMessage(
                response,
                'Failed to broadcast notification to all users'
            )
        )
    }

    const data: BroadcastResponse =
        await response.json()

    return data
}

// ============================================================
// DELETE NOTIFICATION
// ============================================================

export async function deleteNotification(
    notificationId: string
): Promise<void> {
    if (!notificationId) {
        throw new Error('Notification ID is required')
    }

    const response = await fetch(
        `${API_BASE_URL}/${encodeURIComponent(
            notificationId
        )}`,
        {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        }
    )

    if (!response.ok) {
        throw new Error(
            await getErrorMessage(
                response,
                'Failed to delete notification'
            )
        )
    }
}