import React, { useEffect, useState } from 'react'
import { useAnswerKeyStore } from '../../stores/answerKeyStore'
import StepCreateAnswerKey from './create/StepCreateAnswerKey'

interface PublicAnswerKeyManagerProps {
    onBack?: () => void
    onSuccess?: (answerKeyId: string) => void
}

interface AnswerKeyItem {
    id?: string
    _id?: string
    name?: string
    subject?: string
    department?: string
    semester?: string | number
    total_marks?: number
    total_questions?: number
    questions?: any[]
    sections?: any[]
    created_by?: string
    creation_mode?: string
    created_at?: string
    updated_at?: string
}

const PublicAnswerKeyManager: React.FC<PublicAnswerKeyManagerProps> = ({
    onBack,
    onSuccess,
}) => {
    const {
        createPublic,
        listPublic,
        fetchByIdPublic,
        updatePublic,
        deletePublic,
        isLoading,
        error,
    } = useAnswerKeyStore()

    const [view, setView] = useState<'list' | 'create' | 'edit'>('list')
    const [answerKeys, setAnswerKeys] = useState<AnswerKeyItem[]>([])
    const [editingAnswerKey, setEditingAnswerKey] =
        useState<AnswerKeyItem | null>(null)

    const [loadingList, setLoadingList] = useState(false)
    const [loadingEdit, setLoadingEdit] = useState(false)
    const [saving, setSaving] = useState(false)

    const [successMessage, setSuccessMessage] = useState('')
    const [localError, setLocalError] = useState('')

    /*
     * ---------------------------------------------------------
     * CHECK WHETHER CURRENT USER IS A FACULTY MEMBER
     * ---------------------------------------------------------
     *
     * The JWT is decoded only to determine the role for UI.
     * IMPORTANT:
     * Actual deletion must ALSO be protected in Flask backend.
     */

    const isFacultyLoggedIn = (): boolean => {
        try {
            const token = localStorage.getItem('exam_evaluate_token')

            if (!token) {
                return false
            }

            const parts = token.split('.')

            if (parts.length !== 3) {
                return false
            }

            const payload = JSON.parse(
                atob(
                    parts[1]
                        .replace(/-/g, '+')
                        .replace(/_/g, '/')
                        .padEnd(Math.ceil(parts[1].length / 4) * 4, '=')
                )
            )

            const role = String(
                payload.role ||
                payload.user_role ||
                payload.userRole ||
                payload.type ||
                ''
            ).toLowerCase()

            return role === 'faculty'
        } catch {
            return false
        }
    }

    const facultyLoggedIn = isFacultyLoggedIn()

    /*
     * ---------------------------------------------------------
     * LOAD PUBLIC ANSWER KEYS
     * ---------------------------------------------------------
     */

    const loadAnswerKeys = async () => {
        setLoadingList(true)
        setLocalError('')

        try {
            const result: any = await listPublic()

            let keys: AnswerKeyItem[] = []

            if (Array.isArray(result)) {
                keys = result
            } else if (Array.isArray(result?.answer_keys)) {
                keys = result.answer_keys
            } else if (Array.isArray(result?.data)) {
                keys = result.data
            } else if (Array.isArray(result?.results)) {
                keys = result.results
            }

            setAnswerKeys(keys)
        } catch (err: any) {
            setLocalError(
                err?.message ||
                'Unable to load answer keys. Please try again.'
            )
        } finally {
            setLoadingList(false)
        }
    }

    useEffect(() => {
        loadAnswerKeys()
    }, [])

    /*
     * ---------------------------------------------------------
     * CREATE
     * ---------------------------------------------------------
     */

    const handleCreate = () => {
        setEditingAnswerKey(null)
        setSuccessMessage('')
        setLocalError('')
        setView('create')
    }

    const handleSave = async (data?: any) => {
        if (!data) {
            setLocalError('No answer key data was provided.')
            return
        }

        setSaving(true)
        setLocalError('')
        setSuccessMessage('')

        try {
            const result: any = await createPublic(data)

            const answerKeyId =
                result?.id ||
                result?._id ||
                result?.answer_key_id ||
                result?.data?.id ||
                result?.data?._id

            setSuccessMessage('Answer key created successfully.')

            await loadAnswerKeys()

            if (answerKeyId && onSuccess) {
                onSuccess(String(answerKeyId))
            }

            setView('list')
        } catch (err: any) {
            setLocalError(
                err?.message ||
                'Failed to create answer key. Please check the entered data.'
            )
        } finally {
            setSaving(false)
        }
    }

    /*
     * ---------------------------------------------------------
     * VIEW ANSWER KEY
     * ---------------------------------------------------------
     */

    const handleView = async (key: AnswerKeyItem) => {
        const id = key.id || key._id

        if (!id) {
            setLocalError('Invalid answer key ID.')
            return
        }

        setLoadingEdit(true)
        setLocalError('')

        try {
            const result: any = await fetchByIdPublic(String(id))

            const fullKey =
                result?.data ||
                result?.answer_key ||
                result

            setEditingAnswerKey(fullKey)
            setView('edit')
        } catch (err: any) {
            setLocalError(
                err?.message ||
                'Unable to load the selected answer key.'
            )
        } finally {
            setLoadingEdit(false)
        }
    }

    /*
     * ---------------------------------------------------------
     * EDIT / UPDATE
     * ---------------------------------------------------------
     */

    const handleUpdate = async (data?: any) => {
        if (!editingAnswerKey) {
            setLocalError('No answer key selected for editing.')
            return
        }

        const id = editingAnswerKey.id || editingAnswerKey._id

        if (!id) {
            setLocalError('Invalid answer key ID.')
            return
        }

        if (!data) {
            setLocalError('No updated answer key data was provided.')
            return
        }

        setSaving(true)
        setLocalError('')
        setSuccessMessage('')

        try {
            await updatePublic(String(id), data)

            setSuccessMessage('Answer key updated successfully.')

            setEditingAnswerKey(null)

            await loadAnswerKeys()

            setView('list')
        } catch (err: any) {
            setLocalError(
                err?.message ||
                'Failed to update the answer key.'
            )
        } finally {
            setSaving(false)
        }
    }

    /*
     * ---------------------------------------------------------
     * DELETE
     * ---------------------------------------------------------
     *
     * Only logged-in Faculty can reach this function.
     *
     * Backend must ALSO require JWT + faculty role.
     */

    const handleDelete = async (key: AnswerKeyItem) => {
        if (!facultyLoggedIn) {
            setLocalError(
                'Only a logged-in Faculty member can delete an answer key.'
            )
            return
        }

        const id = key.id || key._id

        if (!id) {
            setLocalError('Invalid answer key ID.')
            return
        }

        const confirmed = window.confirm(
            `Are you sure you want to delete "${key.name || 'this answer key'}"?\n\nThis action cannot be undone.`
        )

        if (!confirmed) {
            return
        }

        setLocalError('')
        setSuccessMessage('')

        try {
            await deletePublic(String(id))

            setSuccessMessage('Answer key deleted successfully.')

            await loadAnswerKeys()
        } catch (err: any) {
            setLocalError(
                err?.message ||
                'Failed to delete the answer key.'
            )
        }
    }

    /*
     * ---------------------------------------------------------
     * CANCEL
     * ---------------------------------------------------------
     */

    const handleCancel = () => {
        setEditingAnswerKey(null)
        setLocalError('')
        setView('list')
    }

    /*
     * ---------------------------------------------------------
     * DATE FORMATTER
     * ---------------------------------------------------------
     */

    const formatDate = (value?: string) => {
        if (!value) {
            return '—'
        }

        try {
            return new Date(value).toLocaleString()
        } catch {
            return value
        }
    }

    /*
     * ---------------------------------------------------------
     * CREATE / EDIT SCREEN
     * ---------------------------------------------------------
     */

    if (view === 'create') {
        return (
            <div className="w-full">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                            Create Answer Key
                        </h2>

                        <p className="mt-1 text-sm text-gray-600">
                            You can create an answer key without logging in.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleCancel}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Back to Answer Keys
                    </button>
                </div>

                {localError && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {localError}
                    </div>
                )}

                {error && !localError && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {String(error)}
                    </div>
                )}

                <StepCreateAnswerKey
                    onSave={handleSave}
                    onCancel={handleCancel}
                />

                {saving && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                        <div className="rounded-xl bg-white px-6 py-5 shadow-xl">
                            <p className="font-medium text-gray-800">
                                Saving answer key...
                            </p>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    /*
     * ---------------------------------------------------------
     * EDIT SCREEN
     * ---------------------------------------------------------
     */

    if (view === 'edit' && editingAnswerKey) {
        return (
            <div className="w-full">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                            Edit Answer Key
                        </h2>

                        <p className="mt-1 text-sm text-gray-600">
                            Update the answer key details and questions.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleCancel}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Back to Answer Keys
                    </button>
                </div>

                {localError && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {localError}
                    </div>
                )}

                <StepCreateAnswerKey
                    initialAnswerKey={editingAnswerKey as any}
                    onUpdate={handleUpdate}
                    onSave={handleUpdate}
                    onCancel={handleCancel}
                />

                {saving && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                        <div className="rounded-xl bg-white px-6 py-5 shadow-xl">
                            <p className="font-medium text-gray-800">
                                Updating answer key...
                            </p>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    /*
     * ---------------------------------------------------------
     * ANSWER KEY LIST
     * ---------------------------------------------------------
     */

    return (
        <div className="w-full">
            {/* HEADER */}

            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Answer Keys
                    </h1>

                    <p className="mt-1 text-sm text-gray-600">
                        View and edit created answer keys.
                    </p>

                    {facultyLoggedIn && (
                        <p className="mt-1 text-xs font-medium text-green-600">
                            Faculty mode: Delete permission enabled
                        </p>
                    )}
                </div>

                <div className="flex gap-2">
                    {onBack && (
                        <button
                            type="button"
                            onClick={onBack}
                            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Back
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handleCreate}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        + Create Answer Key
                    </button>
                </div>
            </div>

            {/* MESSAGES */}

            {successMessage && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {successMessage}
                </div>
            )}

            {localError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {localError}
                </div>
            )}

            {error && !localError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {String(error)}
                </div>
            )}

            {/* INFO */}

            {!facultyLoggedIn && (
                <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <p className="text-sm text-blue-800">
                        <strong>Public access:</strong> You can view and edit
                        answer keys without logging in. Only a logged-in
                        Faculty member can delete an answer key.
                    </p>
                </div>
            )}

            {facultyLoggedIn && (
                <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4">
                    <p className="text-sm text-green-800">
                        <strong>Faculty access:</strong> You are logged in as
                        Faculty. You can view, edit and delete answer keys.
                    </p>
                </div>
            )}

            {/* LOADING */}

            {loadingList ? (
                <div className="flex min-h-[250px] items-center justify-center">
                    <div className="text-center">
                        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
                        <p className="text-sm text-gray-600">
                            Loading answer keys...
                        </p>
                    </div>
                </div>
            ) : answerKeys.length === 0 ? (
                /* EMPTY */

                <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900">
                        No Answer Keys Found
                    </h3>

                    <p className="mt-2 text-sm text-gray-600">
                        No answer keys have been created yet.
                    </p>

                    <button
                        type="button"
                        onClick={handleCreate}
                        className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        Create Your First Answer Key
                    </button>
                </div>
            ) : (
                /* LIST */

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    {answerKeys.map((key) => {
                        const id = key.id || key._id

                        return (
                            <div
                                key={String(id)}
                                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                            >
                                {/* TITLE */}

                                <div className="mb-4 flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h3 className="truncate text-lg font-semibold text-gray-900">
                                            {key.name ||
                                                'Untitled Answer Key'}
                                        </h3>

                                        <p className="mt-1 text-sm text-gray-500">
                                            {key.subject || 'Subject not specified'}
                                        </p>
                                    </div>

                                    <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                                        {key.creation_mode === 'public'
                                            ? 'Public'
                                            : 'Answer Key'}
                                    </span>
                                </div>

                                {/* DETAILS */}

                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="rounded-lg bg-gray-50 p-3">
                                        <p className="text-xs text-gray-500">
                                            Department
                                        </p>

                                        <p className="mt-1 font-medium text-gray-800">
                                            {key.department || '—'}
                                        </p>
                                    </div>

                                    <div className="rounded-lg bg-gray-50 p-3">
                                        <p className="text-xs text-gray-500">
                                            Semester
                                        </p>

                                        <p className="mt-1 font-medium text-gray-800">
                                            {key.semester || '—'}
                                        </p>
                                    </div>

                                    <div className="rounded-lg bg-gray-50 p-3">
                                        <p className="text-xs text-gray-500">
                                            Questions
                                        </p>

                                        <p className="mt-1 font-medium text-gray-800">
                                            {key.total_questions ??
                                                key.questions?.length ??
                                                0}
                                        </p>
                                    </div>

                                    <div className="rounded-lg bg-gray-50 p-3">
                                        <p className="text-xs text-gray-500">
                                            Total Marks
                                        </p>

                                        <p className="mt-1 font-medium text-gray-800">
                                            {key.total_marks ?? '—'}
                                        </p>
                                    </div>
                                </div>

                                {/* DATE */}

                                <div className="mt-4 text-xs text-gray-500">
                                    Created:{' '}
                                    {formatDate(key.created_at)}
                                </div>

                                {/* ACTIONS */}

                                <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => handleView(key)}
                                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        View / Edit
                                    </button>

                                    {facultyLoggedIn && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleDelete(key)
                                            }
                                            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* EDIT LOADING */}

            {loadingEdit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                    <div className="rounded-xl bg-white px-6 py-5 shadow-xl">
                        <div className="flex items-center gap-3">
                            <div className="h-6 w-6 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />

                            <p className="font-medium text-gray-800">
                                Loading answer key...
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* SAVE LOADING */}

            {(saving || isLoading) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                    <div className="rounded-xl bg-white px-6 py-5 shadow-xl">
                        <p className="font-medium text-gray-800">
                            Please wait...
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}

export default PublicAnswerKeyManager