import type { Notification } from '@/types'

// ============================================================
// API BASE URL
// ============================================================

const API_BASE_URL =
    'http://127.0.0.1:5000/api/notifications'


// ============================================================
// TYPES
// ============================================================

export interface NotificationRecipient {
    id: string
    name: string
    email: string
    role: string | null
    employeeId?: string | null
    department?: string | null
    designation?: string | null
    status?: string
}

export interface NotificationResponse {
    success?: boolean
    message: string
    notification?: Notification
}

export interface NotificationsResponse {
    success?: boolean
    message?: string
    notifications: Notification[]
    count?: number
}

export interface UnreadCountResponse {
    success?: boolean
    message?: string
    unread_count: number
}

export interface RecipientsResponse {
    success?: boolean
    message?: string
    recipients: NotificationRecipient[]
    count?: number
}

export interface BroadcastResponse {
    success?: boolean
    message: string
    recipient_count?: number
    updated_count?: number
    created_at?: string | null
}


// ============================================================
// AUTH HELPER
// ============================================================
//
// IMPORTANT:
// Your login system stores the JWT using:
//
// localStorage.setItem("exam_evaluate_token", token)
//
// Therefore we MUST use the same key here.
// ============================================================

function getAuthToken(): string | null {
    try {
        return localStorage.getItem(
            'exam_evaluate_token'
        )
    } catch {
        return null
    }
}


// ============================================================
// COMMON HEADERS
// ============================================================

function getHeaders(): HeadersInit {

    const token = getAuthToken()

    return {
        'Content-Type': 'application/json',

        ...(token
            ? {
                Authorization: `Bearer ${token}`,
            }
            : {}),
    }
}


// ============================================================
// ERROR HANDLER
// ============================================================

async function getErrorMessage(
    response: Response,
    fallback: string
): Promise<string> {

    try {

        const data = await response.json()

        if (data?.message) {
            return String(data.message)
        }

        if (data?.error) {
            return String(data.error)
        }

        return fallback

    } catch {

        try {

            const text =
                await response.text()

            return text || fallback

        } catch {

            return fallback
        }
    }
}


// ============================================================
// GENERIC REQUEST CHECK
// ============================================================

async function ensureSuccess(
    response: Response,
    fallback: string
): Promise<void> {

    if (!response.ok) {

        throw new Error(
            await getErrorMessage(
                response,
                fallback
            )
        )
    }
}


// ============================================================
// GET ALL NOTIFICATIONS FOR USER
// ============================================================

export async function getNotifications(
    recipientId: string
): Promise<Notification[]> {

    if (!recipientId) {
        throw new Error(
            'Recipient ID is required'
        )
    }

    const response = await fetch(
        `${API_BASE_URL}/user/${encodeURIComponent(
            recipientId
        )}`,
        {
            method: 'GET',
            headers: getHeaders(),
        }
    )

    await ensureSuccess(
        response,
        'Failed to fetch notifications'
    )

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
        throw new Error(
            'Recipient ID is required'
        )
    }

    const response = await fetch(
        `${API_BASE_URL}/user/${encodeURIComponent(
            recipientId
        )}/unread`,
        {
            method: 'GET',
            headers: getHeaders(),
        }
    )

    await ensureSuccess(
        response,
        'Failed to fetch unread notifications'
    )

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
        throw new Error(
            'Recipient ID is required'
        )
    }

    const response = await fetch(
        `${API_BASE_URL}/user/${encodeURIComponent(
            recipientId
        )}/unread-count`,
        {
            method: 'GET',
            headers: getHeaders(),
        }
    )

    await ensureSuccess(
        response,
        'Failed to fetch unread notification count'
    )

    const data: UnreadCountResponse =
        await response.json()

    return data.unread_count || 0
}


// ============================================================
// GET NOTIFICATION RECIPIENTS
// ============================================================

export async function getNotificationRecipients(
    role?: string
): Promise<NotificationRecipient[]> {

    const normalizedRole =
        role?.trim().toLowerCase()

    const url = normalizedRole
        ? `${API_BASE_URL}/recipients?role=${encodeURIComponent(
            normalizedRole
        )}`
        : `${API_BASE_URL}/recipients`

    const response = await fetch(
        url,
        {
            method: 'GET',
            headers: getHeaders(),
        }
    )

    await ensureSuccess(
        response,
        'Failed to fetch notification recipients'
    )

    const data: RecipientsResponse =
        await response.json()

    return data.recipients || []
}


// ============================================================
// GET RECIPIENTS BY ROLE
// ============================================================

export async function getNotificationRecipientsByRole(
    role: string
): Promise<NotificationRecipient[]> {

    if (!role?.trim()) {

        throw new Error(
            'Recipient role is required'
        )
    }

    return getNotificationRecipients(
        role
    )
}


// ============================================================
// MARK ONE NOTIFICATION AS READ
// ============================================================

export async function markNotificationAsRead(
    notificationId: string
): Promise<void> {

    if (!notificationId) {

        throw new Error(
            'Notification ID is required'
        )
    }

    const response = await fetch(
        `${API_BASE_URL}/${encodeURIComponent(
            notificationId
        )}/read`,
        {
            method: 'PATCH',
            headers: getHeaders(),
        }
    )

    await ensureSuccess(
        response,
        'Failed to mark notification as read'
    )
}


// ============================================================
// MARK ALL NOTIFICATIONS AS READ
// ============================================================

export async function markAllNotificationsAsRead(
    recipientId: string
): Promise<void> {

    if (!recipientId) {

        throw new Error(
            'Recipient ID is required'
        )
    }

    const response = await fetch(
        `${API_BASE_URL}/user/${encodeURIComponent(
            recipientId
        )}/read-all`,
        {
            method: 'PATCH',
            headers: getHeaders(),
        }
    )

    await ensureSuccess(
        response,
        'Failed to mark all notifications as read'
    )
}


// ============================================================
// CREATE NOTIFICATION FOR ONE USER
// ============================================================

export async function createNotification(
    recipientId: string,
    title: string,
    message: string,
    type: Notification['type'] = 'system'
): Promise<Notification> {

    if (!recipientId) {

        throw new Error(
            'Recipient ID is required'
        )
    }

    const cleanTitle =
        title.trim()

    const cleanMessage =
        message.trim()

    if (!cleanTitle) {

        throw new Error(
            'Notification title is required'
        )
    }

    if (!cleanMessage) {

        throw new Error(
            'Notification message is required'
        )
    }

    const response = await fetch(
        `${API_BASE_URL}/`,
        {
            method: 'POST',

            headers: getHeaders(),

            body: JSON.stringify({

                recipient_id:
                    recipientId,

                title:
                    cleanTitle,

                message:
                    cleanMessage,

                type,
            }),
        }
    )

    await ensureSuccess(
        response,
        'Failed to create notification'
    )

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
// CREATE NOTIFICATION FOR MULTIPLE USERS
// ============================================================

export async function createNotificationToUsers(
    recipientIds: string[],
    title: string,
    message: string,
    type: Notification['type'] = 'system'
): Promise<Notification[]> {

    const uniqueRecipientIds = [
        ...new Set(
            recipientIds
                .filter(Boolean)
                .map(id => id.trim())
        ),
    ]

    if (!uniqueRecipientIds.length) {

        throw new Error(
            'At least one recipient is required'
        )
    }

    const cleanTitle =
        title.trim()

    const cleanMessage =
        message.trim()

    if (!cleanTitle) {

        throw new Error(
            'Notification title is required'
        )
    }

    if (!cleanMessage) {

        throw new Error(
            'Notification message is required'
        )
    }

    return Promise.all(
        uniqueRecipientIds.map(
            recipientId =>
                createNotification(
                    recipientId,
                    cleanTitle,
                    cleanMessage,
                    type
                )
        )
    )
}


// ============================================================
// BROADCAST NOTIFICATION TO A ROLE
// ============================================================

export async function broadcastNotificationToRole(
    role: string,
    title: string,
    message: string,
    type: Notification['type'] = 'system'
): Promise<BroadcastResponse> {

    const normalizedRole =
        role.trim().toLowerCase()

    const allowedRoles = [
        'faculty',
        'hod',
        'dean',
        'admin',
    ]

    if (!normalizedRole) {

        throw new Error(
            'Recipient role is required'
        )
    }

    if (
        !allowedRoles.includes(
            normalizedRole
        )
    ) {

        throw new Error(
            `Invalid recipient role: ${role}`
        )
    }

    const cleanTitle =
        title.trim()

    const cleanMessage =
        message.trim()

    if (!cleanTitle) {

        throw new Error(
            'Notification title is required'
        )
    }

    if (!cleanMessage) {

        throw new Error(
            'Notification message is required'
        )
    }

    const response = await fetch(
        `${API_BASE_URL}/broadcast-role`,
        {
            method: 'POST',

            headers: getHeaders(),

            body: JSON.stringify({

                role:
                    normalizedRole,

                title:
                    cleanTitle,

                message:
                    cleanMessage,

                type,
            }),
        }
    )

    await ensureSuccess(
        response,
        'Failed to broadcast notification to role'
    )

    return await response.json()
}


// ============================================================
// BROADCAST TO FACULTY
// ============================================================

export async function broadcastNotificationToFaculty(
    title: string,
    message: string,
    type: Notification['type'] = 'system'
): Promise<BroadcastResponse> {

    return broadcastNotificationToRole(
        'faculty',
        title,
        message,
        type
    )
}


// ============================================================
// BROADCAST TO HOD
// ============================================================

export async function broadcastNotificationToHOD(
    title: string,
    message: string,
    type: Notification['type'] = 'system'
): Promise<BroadcastResponse> {

    return broadcastNotificationToRole(
        'hod',
        title,
        message,
        type
    )
}


// ============================================================
// BROADCAST TO DEAN
// ============================================================

export async function broadcastNotificationToDean(
    title: string,
    message: string,
    type: Notification['type'] = 'system'
): Promise<BroadcastResponse> {

    return broadcastNotificationToRole(
        'dean',
        title,
        message,
        type
    )
}


// ============================================================
// BROADCAST TO ADMIN
// ============================================================

export async function broadcastNotificationToAdmin(
    title: string,
    message: string,
    type: Notification['type'] = 'system'
): Promise<BroadcastResponse> {

    return broadcastNotificationToRole(
        'admin',
        title,
        message,
        type
    )
}


// ============================================================
// BROADCAST TO EVERYONE
// ============================================================

export async function broadcastNotificationToAll(
    title: string,
    message: string,
    type: Notification['type'] = 'system'
): Promise<BroadcastResponse> {

    const cleanTitle =
        title.trim()

    const cleanMessage =
        message.trim()

    if (!cleanTitle) {

        throw new Error(
            'Notification title is required'
        )
    }

    if (!cleanMessage) {

        throw new Error(
            'Notification message is required'
        )
    }

    const response = await fetch(
        `${API_BASE_URL}/broadcast-all`,
        {
            method: 'POST',

            headers: getHeaders(),

            body: JSON.stringify({

                title:
                    cleanTitle,

                message:
                    cleanMessage,

                type,
            }),
        }
    )

    await ensureSuccess(
        response,
        'Failed to broadcast notification to all users'
    )

    return await response.json()
}


// ============================================================
// DELETE NOTIFICATION
// ============================================================

export async function deleteNotification(
    notificationId: string
): Promise<void> {

    if (!notificationId) {

        throw new Error(
            'Notification ID is required'
        )
    }

    const response = await fetch(
        `${API_BASE_URL}/${encodeURIComponent(
            notificationId
        )}`,
        {
            method: 'DELETE',
            headers: getHeaders(),
        }
    )

    await ensureSuccess(
        response,
        'Failed to delete notification'
    )
}


// ============================================================
// NOTIFICATION RECIPIENT MODE
// ============================================================

export type NotificationRecipientMode =
    | 'user'
    | 'role'
    | 'all'


// ============================================================
// SEND NOTIFICATION OPTIONS
// ============================================================

export interface SendNotificationOptions {

    mode:
    NotificationRecipientMode

    recipientIds?:
    string[]

    role?:
    string

    title:
    string

    message:
    string

    type?:
    Notification['type']
}


// ============================================================
// SEND NOTIFICATION
// ============================================================

export async function sendNotification(
    options: SendNotificationOptions
): Promise<
    Notification[] |
    BroadcastResponse
> {

    const {
        mode,
        recipientIds = [],
        role,
        title,
        message,
        type = 'system',
    } = options


    // --------------------------------------------------------
    // SPECIFIC USERS
    // --------------------------------------------------------

    if (mode === 'user') {

        return createNotificationToUsers(
            recipientIds,
            title,
            message,
            type
        )
    }


    // --------------------------------------------------------
    // ROLE
    // --------------------------------------------------------

    if (mode === 'role') {

        if (!role) {

            throw new Error(
                'Recipient role is required'
            )
        }

        return broadcastNotificationToRole(
            role,
            title,
            message,
            type
        )
    }


    // --------------------------------------------------------
    // EVERYONE
    // --------------------------------------------------------

    if (mode === 'all') {

        return broadcastNotificationToAll(
            title,
            message,
            type
        )
    }


    throw new Error(
        `Unsupported notification mode: ${mode}`
    )
}


// ============================================================
// GET NOTIFICATION SUMMARY
// ============================================================

export async function getNotificationSummary(
    recipientId: string
): Promise<{
    notifications: Notification[]
    unreadCount: number
}> {

    if (!recipientId) {

        throw new Error(
            'Recipient ID is required'
        )
    }

    const [
        notifications,
        unreadCount,
    ] = await Promise.all([

        getNotifications(
            recipientId
        ),

        getUnreadNotificationCount(
            recipientId
        ),
    ])

    return {
        notifications,
        unreadCount,
    }
}