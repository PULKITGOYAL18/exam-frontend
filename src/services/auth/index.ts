// src/services/auth/index.ts

import type { User, UserRole } from '@/types'

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    'http://127.0.0.1:5000'

// ─── Backend Login Response ───────────────────────────────────────────────────

interface LoginResponse {
    message: string
    token: string

    user: {
        id: string
        name: string
        email: string
        role: string
        department: string
        designation: string
        employeeId: string
    }
}

// ─── Login ────────────────────────────────────────────────────────────────────

/**
 * Login user through Flask backend.
 *
 * Backend endpoint:
 * POST /api/auth/login
 */
export async function login(
    email: string,
    password: string
): Promise<{
    token: string
    user: User
}> {

    const cleanEmail = email.trim()

    // =========================================================
    // Debug information
    // =========================================================

    console.log(
        '========== FRONTEND LOGIN =========='
    )

    console.log(
        'Email:',
        cleanEmail
    )

    console.log(
        'Password received:',
        Boolean(password)
    )

    console.log(
        'Password length:',
        password?.length || 0
    )

    console.log(
        'API URL:',
        `${API_BASE_URL}/api/auth/login`
    )

    console.log(
        '===================================='
    )

    // =========================================================
    // Basic validation
    // =========================================================

    if (!cleanEmail) {
        throw new Error(
            'Email is required'
        )
    }

    if (!password) {
        throw new Error(
            'Password is required'
        )
    }

    // =========================================================
    // Send request to Flask
    // =========================================================

    let response: Response

    try {

        response = await fetch(
            `${API_BASE_URL}/api/auth/login`,
            {
                method: 'POST',

                headers: {
                    'Content-Type':
                        'application/json',

                    Accept:
                        'application/json',
                },

                body: JSON.stringify({
                    email: cleanEmail,
                    password: password,
                }),
            }
        )

    } catch (error) {

        console.error(
            'Authentication server connection error:',
            error
        )

        throw new Error(
            'Unable to connect to the authentication server. Make sure the Flask backend is running.'
        )
    }

    // =========================================================
    // Read backend response
    // =========================================================

    let data:
        | LoginResponse
        | {
            message?: string
        }
        | null = null

    try {

        data =
            await response.json()

    } catch {

        console.error(
            'Backend returned a non-JSON response.'
        )

        throw new Error(
            'Server returned an invalid response'
        )
    }

    // =========================================================
    // Debug backend response
    // =========================================================

    console.log(
        '========== BACKEND RESPONSE =========='
    )

    console.log(
        'Status:',
        response.status
    )

    console.log(
        'Response:',
        data
    )

    console.log(
        '======================================='
    )

    // =========================================================
    // Handle backend errors
    // =========================================================

    if (!response.ok) {

        const message =
            data &&
                'message' in data
                ? data.message
                : undefined

        throw new Error(
            message ||
            'Invalid email or password'
        )
    }

    // =========================================================
    // Validate successful response
    // =========================================================

    if (
        !data ||
        !('token' in data) ||
        !data.token ||
        !('user' in data) ||
        !data.user
    ) {

        console.error(
            'Invalid authentication response:',
            data
        )

        throw new Error(
            'Invalid authentication response from server'
        )
    }

    const backendUser =
        data.user

    // =========================================================
    // Validate user information
    // =========================================================

    if (
        !backendUser.id ||
        !backendUser.email ||
        !backendUser.role
    ) {

        console.error(
            'Incomplete user information:',
            backendUser
        )

        throw new Error(
            'Server returned incomplete user information'
        )
    }

    // =========================================================
    // Employee ID
    //
    // backendUser.id
    //     = MongoDB ObjectId
    //
    // backendUser.employeeId
    //     = Actual employee ID
    // =========================================================

    const employeeId =
        backendUser.employeeId ||
        'Not Assigned'

    // =========================================================
    // Convert backend user to frontend User type
    // =========================================================

    const user: User = {

        // IMPORTANT:
        // Keep MongoDB ID for notifications
        id:
            backendUser.id,

        name:
            backendUser.name || '',

        email:
            backendUser.email,

        employeeId:
            employeeId,

        department:
            backendUser.department || '',

        designation:
            backendUser.designation || '',

        role:
            normalizeRole(
                backendUser.role
            ),

        status:
            'Active',

        lastLogin:
            'Just now',

        phone:
            '',
    }

    // =========================================================
    // Authentication success logging
    // =========================================================

    console.log(
        '========== AUTHENTICATION SUCCESS =========='
    )

    console.log(
        'User:',
        user.name
    )

    console.log(
        'MongoDB ID:',
        user.id
    )

    console.log(
        'Email:',
        user.email
    )

    console.log(
        'Employee ID:',
        user.employeeId
    )

    console.log(
        'Role:',
        user.role
    )

    console.log(
        'Department:',
        user.department
    )

    console.log(
        'Designation:',
        user.designation
    )

    console.log(
        '============================================'
    )

    // =========================================================
    // Save authentication information
    // =========================================================

    saveToken(
        data.token
    )

    saveUser(
        user
    )

    // =========================================================
    // Return authentication result
    // =========================================================

    return {
        token:
            data.token,

        user,
    }
}

// ─── Normalize Role ────────────────────────────────────────────────────────────

/**
 * Convert backend role into frontend UserRole type.
 */
function normalizeRole(
    role: string
): UserRole {

    const normalized =
        role.trim().toLowerCase()

    switch (normalized) {

        case 'faculty':
            return 'Faculty'

        case 'hod':
        case 'head_of_department':
        case 'head of department':
            return 'HOD'

        case 'dean':
            return 'Dean'

        case 'admin':
        case 'administrator':
            return 'Admin'

        default:
            throw new Error(
                `Unknown user role: ${role}`
            )
    }
}

// ─── Token Storage ─────────────────────────────────────────────────────────────

/**
 * Save JWT token.
 */
export function saveToken(
    token: string
) {

    localStorage.setItem(
        'exam_evaluate_token',
        token
    )
}

/**
 * Get JWT token.
 */
export function getToken():
    | string
    | null {

    return localStorage.getItem(
        'exam_evaluate_token'
    )
}

/**
 * Remove JWT token.
 */
export function removeToken() {

    localStorage.removeItem(
        'exam_evaluate_token'
    )
}

// ─── User Storage ──────────────────────────────────────────────────────────────

/**
 * Save authenticated user.
 */
export function saveUser(
    user: User
) {

    localStorage.setItem(
        'exam_evaluate_user',
        JSON.stringify(user)
    )
}

/**
 * Get saved authenticated user.
 */
export function getSavedUser():
    | User
    | null {

    const stored =
        localStorage.getItem(
            'exam_evaluate_user'
        )

    if (!stored) {
        return null
    }

    try {

        return JSON.parse(
            stored
        ) as User

    } catch (error) {

        console.error(
            'Failed to parse saved user:',
            error
        )

        return null
    }
}

// ─── Clear Authentication ──────────────────────────────────────────────────────

/**
 * Clear all authentication information.
 */
export function clearAuth() {

    removeToken()

    localStorage.removeItem(
        'exam_evaluate_user'
    )

    localStorage.removeItem(
        'exam_evaluate_remember_me'
    )
}