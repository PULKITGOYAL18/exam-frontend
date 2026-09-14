const API_BASE_URL = 'http://127.0.0.1:5000/api/admin'

/**
 * Get the JWT token stored after admin login.
 */
function getToken(): string {
    const token = localStorage.getItem('exam_evaluate_token')

    if (!token) {
        throw new Error(
            'Authentication token is missing. Please login again.'
        )
    }

    return token
}

/**
 * Common headers for authenticated admin requests.
 */
function getAuthHeaders(): HeadersInit {
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
    }
}

/**
 * Handle API responses consistently.
 */
async function handleResponse(response: Response) {
    let data: any = {}

    try {
        data = await response.json()
    } catch {
        data = {}
    }

    if (!response.ok) {
        throw new Error(
            data?.message ||
            `Request failed with status ${response.status}`
        )
    }

    return data
}

// ============================================================
// GET ALL USERS
// ============================================================

export async function getAdminUsers() {
    const response = await fetch(
        `${API_BASE_URL}/users`,
        {
            method: 'GET',
            headers: getAuthHeaders(),
        }
    )

    return handleResponse(response)
}

// ============================================================
// GET SINGLE USER
// ============================================================

export async function getAdminUser(userId: string) {
    const response = await fetch(
        `${API_BASE_URL}/users/${encodeURIComponent(userId)}`,
        {
            method: 'GET',
            headers: getAuthHeaders(),
        }
    )

    return handleResponse(response)
}

// ============================================================
// CREATE USER
// ============================================================

export interface CreateAdminUserData {
    name: string
    email: string
    password: string
    employeeId: string
    role: string
    department: string
    designation: string
}

export async function createAdminUser(
    userData: CreateAdminUserData
) {
    const response = await fetch(
        `${API_BASE_URL}/users`,
        {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(userData),
        }
    )

    return handleResponse(response)
}

// ============================================================
// UPDATE USER
// ============================================================

export async function updateAdminUser(
    userId: string,
    updates: Record<string, string>
) {
    const response = await fetch(
        `${API_BASE_URL}/users/${encodeURIComponent(userId)}`,
        {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(updates),
        }
    )

    return handleResponse(response)
}

// ============================================================
// ACTIVATE / SUSPEND USER
// ============================================================

export async function updateAdminUserStatus(
    userId: string,
    status: 'active' | 'suspended'
) {
    const response = await fetch(
        `${API_BASE_URL}/users/${encodeURIComponent(userId)}/status`,
        {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                status,
            }),
        }
    )

    return handleResponse(response)
}

// ============================================================
// DELETE USER
// ============================================================

export async function deleteAdminUser(
    userId: string
) {
    const response = await fetch(
        `${API_BASE_URL}/users/${encodeURIComponent(userId)}`,
        {
            method: 'DELETE',
            headers: getAuthHeaders(),
        }
    )

    return handleResponse(response)
}

// ============================================================
// GET AUDIT LOGS
// ============================================================

export async function getAdminAuditLogs() {
    const response = await fetch(
        `${API_BASE_URL}/audit-logs`,
        {
            method: 'GET',
            headers: getAuthHeaders(),
        }
    )

    return handleResponse(response)
}