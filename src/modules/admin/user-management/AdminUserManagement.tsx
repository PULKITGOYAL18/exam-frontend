
import { AppShell } from '@/layouts'
import { useEffect, useMemo, useState } from 'react'
import { useLogout } from '@/hooks'

import {
  Card,
  Button,
  Alert,
  Modal,
  Table,
  Th,
  Td,
  RoleBadge,
  StatusBadge,
} from '@/components/common'

import type { User, Screen, UserRole } from '@/types'
import { LogoutModal } from '@/components/common'

import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  Eye,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  X,
  Plus,
  ShieldAlert,
  ArrowLeft,
} from 'lucide-react'

import {
  getAdminUsers,
  getAdminUser,
  createAdminUser,
  updateAdminUser,
  updateAdminUserStatus,
  deleteAdminUser,
} from '@/services/admin/adminApi'

/* ============================================================
   BACKEND USER TYPE
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

/* ============================================================
   NORMALIZERS
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
   ROLE TYPE HELPER
============================================================ */

function getRoleForBadge(role?: string): UserRole {
  const normalized = normalizeRole(role)

  if (
    normalized === 'Faculty' ||
    normalized === 'HOD' ||
    normalized === 'Dean' ||
    normalized === 'Admin'
  ) {
    return normalized as UserRole
  }

  return 'Faculty' as UserRole
}

/* ============================================================
   API RESPONSE NORMALIZER
============================================================ */

function extractUsers(response: unknown): BackendUser[] {
  if (Array.isArray(response)) {
    return response as BackendUser[]
  }

  if (
    response &&
    typeof response === 'object' &&
    'users' in response &&
    Array.isArray((response as { users?: unknown }).users)
  ) {
    return (
      (response as { users: BackendUser[] }).users || []
    )
  }

  return []
}

/* ============================================================
   ADMIN USER MANAGEMENT
============================================================ */

interface AdminUserManagementProps {
  user: User
  onNavigate: (screen: Screen) => void
  onLogout: () => void
}

export default function AdminUserManagement({
  user,
  onNavigate,
  onLogout,
}: AdminUserManagementProps) {
  const {
    showLogout,
    openLogout,
    closeLogout,
  } = useLogout()

  /* ==========================================================
     USERS
  ========================================================== */

  const [users, setUsers] = useState<BackendUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /*
   * Used for individual table actions such as:
   * view-userId
   * delete-userId
   */
  const [actionLoading, setActionLoading] =
    useState<string | null>(null)

  /* ==========================================================
     SEARCH / FILTER
  ========================================================== */

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')

  /* ==========================================================
     MODALS
  ========================================================== */

  const [showCreateModal, setShowCreateModal] =
    useState(false)

  const [showViewModal, setShowViewModal] =
    useState(false)

  const [showEditModal, setShowEditModal] =
    useState(false)

  const [showDeleteModal, setShowDeleteModal] =
    useState(false)

  const [showStatusModal, setShowStatusModal] =
    useState(false)

  const [selectedUser, setSelectedUser] =
    useState<BackendUser | null>(null)

  const [statusAction, setStatusAction] =
    useState<'active' | 'suspended' | null>(null)

  const [statusActionLoading, setStatusActionLoading] =
    useState(false)

  const [statusActionError, setStatusActionError] =
    useState<string | null>(null)

  /* ==========================================================
     CREATE FORM
  ========================================================== */

  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    employeeId: '',
    role: 'faculty',
    department: '',
    designation: '',
  })

  const [createLoading, setCreateLoading] =
    useState(false)

  const [createError, setCreateError] =
    useState<string | null>(null)

  /* ==========================================================
     EDIT FORM
  ========================================================== */

  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    employeeId: '',
    role: 'faculty',
    department: '',
    designation: '',
  })

  const [editLoading, setEditLoading] =
    useState(false)

  const [editError, setEditError] =
    useState<string | null>(null)

  /* ==========================================================
     LOAD USERS
  ========================================================== */

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await getAdminUsers()

      setUsers(extractUsers(response))
    } catch (err) {
      console.error(
        'ADMIN USER MANAGEMENT ERROR:',
        err
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load users.'
      )
    } finally {
      setLoading(false)
    }
  }

  /* ==========================================================
     INITIAL LOAD
  ========================================================== */

  useEffect(() => {
    loadUsers()
  }, [])

  /* ==========================================================
     FILTERED USERS
  ========================================================== */

  const filteredUsers = useMemo(() => {
    const query = search
      .toLowerCase()
      .trim()

    return users.filter((item) => {
      const matchesSearch =
        !query ||
        item.name
          ?.toLowerCase()
          .includes(query) ||
        item.email
          ?.toLowerCase()
          .includes(query) ||
        item.employeeId
          ?.toLowerCase()
          .includes(query) ||
        item.department
          ?.toLowerCase()
          .includes(query)

      const matchesRole =
        roleFilter === 'All' ||
        normalizeRole(item.role) === roleFilter

      const matchesStatus =
        statusFilter === 'All' ||
        normalizeStatus(item.status) ===
          statusFilter

      return (
        matchesSearch &&
        matchesRole &&
        matchesStatus
      )
    })
  }, [
    users,
    search,
    roleFilter,
    statusFilter,
  ])

  /* ==========================================================
     STATISTICS
  ========================================================== */

  const totalUsers = users.length

  const activeUsers = users.filter(
    (item) =>
      normalizeStatus(item.status) === 'Active'
  ).length

  const pendingUsers = users.filter(
    (item) =>
      normalizeStatus(item.status) ===
      'Pending Activation'
  ).length

  const suspendedUsers = users.filter(
    (item) =>
      normalizeStatus(item.status) === 'Suspended'
  ).length

  /* ==========================================================
     RESET CREATE FORM
  ========================================================== */

  const resetCreateForm = () => {
    setCreateForm({
      name: '',
      email: '',
      password: '',
      employeeId: '',
      role: 'faculty',
      department: '',
      designation: '',
    })

    setCreateError(null)
  }

  /* ==========================================================
     OPEN CREATE MODAL
  ========================================================== */

  const openCreateModal = () => {
    resetCreateForm()
    setShowCreateModal(true)
  }

  /* ==========================================================
     CREATE USER
  ========================================================== */

  const handleCreateUser = async () => {
    if (!createForm.name.trim()) {
      setCreateError('Name is required.')
      return
    }

    if (!createForm.email.trim()) {
      setCreateError('Email is required.')
      return
    }

    if (!createForm.password.trim()) {
      setCreateError('Password is required.')
      return
    }

    if (!createForm.employeeId.trim()) {
      setCreateError(
        'Employee ID is required.'
      )
      return
    }

    if (!createForm.department.trim()) {
      setCreateError(
        'Department is required.'
      )
      return
    }

    if (!createForm.designation.trim()) {
      setCreateError(
        'Designation is required.'
      )
      return
    }

    try {
      setCreateLoading(true)
      setCreateError(null)

      await createAdminUser({
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        employeeId:
          createForm.employeeId.trim(),
        role: createForm.role,
        department:
          createForm.department.trim(),
        designation:
          createForm.designation.trim(),
      })

      setShowCreateModal(false)

      resetCreateForm()

      await loadUsers()
    } catch (err) {
      console.error(
        'CREATE ADMIN USER ERROR:',
        err
      )

      setCreateError(
        err instanceof Error
          ? err.message
          : 'Unable to create user.'
      )
    } finally {
      setCreateLoading(false)
    }
  }

  /* ==========================================================
     VIEW USER
  ========================================================== */

  const handleViewUser = async (
    item: BackendUser
  ) => {
    try {
      setActionLoading(`view-${item.id}`)

      const response =
        await getAdminUser(item.id)

      let fetchedUser: BackendUser | null =
        null

      if (
        response &&
        typeof response === 'object'
      ) {
        const data =
          response as {
            user?: BackendUser
          }

        fetchedUser =
          data.user || null
      }

      setSelectedUser(
        fetchedUser || item
      )

      setShowViewModal(true)
    } catch (err) {
      console.error(
        'GET ADMIN USER ERROR:',
        err
      )

      /*
       * Even if the individual GET fails,
       * show the already-loaded user instead
       * of breaking the interface.
       */
      setSelectedUser(item)
      setShowViewModal(true)
    } finally {
      setActionLoading(null)
    }
  }

  /* ==========================================================
     OPEN EDIT
  ========================================================== */

  const handleOpenEdit = (
    item: BackendUser
  ) => {
    setSelectedUser(item)

    setEditForm({
      name: item.name || '',
      email: item.email || '',
      employeeId:
        item.employeeId || '',
      role:
        item.role?.toLowerCase() ||
        'faculty',
      department:
        item.department || '',
      designation:
        item.designation || '',
    })

    setEditError(null)

    setShowEditModal(true)
  }

  /* ==========================================================
     UPDATE USER
  ========================================================== */

  const handleUpdateUser = async () => {
    if (!selectedUser) return

    if (!editForm.name.trim()) {
      setEditError('Name is required.')
      return
    }

    if (!editForm.email.trim()) {
      setEditError('Email is required.')
      return
    }

    if (!editForm.employeeId.trim()) {
      setEditError(
        'Employee ID is required.'
      )
      return
    }

    if (!editForm.department.trim()) {
      setEditError(
        'Department is required.'
      )
      return
    }

    if (!editForm.designation.trim()) {
      setEditError(
        'Designation is required.'
      )
      return
    }

    try {
      setEditLoading(true)
      setEditError(null)

      await updateAdminUser(
        selectedUser.id,
        {
          name: editForm.name.trim(),
          email: editForm.email.trim(),
          employeeId:
            editForm.employeeId.trim(),
          role: editForm.role,
          department:
            editForm.department.trim(),
          designation:
            editForm.designation.trim(),
        }
      )

      setShowEditModal(false)
      setSelectedUser(null)

      await loadUsers()
    } catch (err) {
      console.error(
        'UPDATE ADMIN USER ERROR:',
        err
      )

      setEditError(
        err instanceof Error
          ? err.message
          : 'Unable to update user.'
      )
    } finally {
      setEditLoading(false)
    }
  }

  /* ==========================================================
     OPEN STATUS CONFIRMATION
  ========================================================== */

  const handleOpenStatusModal = (
    item: BackendUser
  ) => {
    const currentStatus =
      normalizeStatus(item.status)

    const nextStatus =
      currentStatus === 'Active'
        ? 'suspended'
        : 'active'

    setSelectedUser(item)
    setStatusAction(nextStatus)
    setStatusActionError(null)
    setShowStatusModal(true)
  }

  /* ==========================================================
     CLOSE STATUS MODAL
  ========================================================== */

  const closeStatusModal = () => {
    if (statusActionLoading) return

    setShowStatusModal(false)
    setSelectedUser(null)
    setStatusAction(null)
    setStatusActionError(null)
  }

  /* ==========================================================
     CONFIRM STATUS CHANGE
  ========================================================== */

  const handleConfirmStatusChange =
    async () => {
      if (
        !selectedUser ||
        !statusAction
      ) {
        return
      }

      try {
        setStatusActionLoading(true)
        setStatusActionError(null)

        await updateAdminUserStatus(
          selectedUser.id,
          statusAction
        )

        setShowStatusModal(false)
        setSelectedUser(null)
        setStatusAction(null)

        await loadUsers()
      } catch (err) {
        console.error(
          'UPDATE USER STATUS ERROR:',
          err
        )

        setStatusActionError(
          err instanceof Error
            ? err.message
            : 'Unable to update user status.'
        )
      } finally {
        setStatusActionLoading(false)
      }
    }

  /* ==========================================================
     OPEN DELETE MODAL
  ========================================================== */

  const handleOpenDelete = (
    item: BackendUser
  ) => {
    setSelectedUser(item)
    setShowDeleteModal(true)
  }

  /* ==========================================================
     DELETE USER
  ========================================================== */

  const handleDeleteUser = async () => {
    if (!selectedUser) return

    try {
      setActionLoading(
        `delete-${selectedUser.id}`
      )

      await deleteAdminUser(
        selectedUser.id
      )

      setShowDeleteModal(false)
      setSelectedUser(null)

      await loadUsers()
    } catch (err) {
      console.error(
        'DELETE ADMIN USER ERROR:',
        err
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to delete user.'
      )
    } finally {
      setActionLoading(null)
    }
  }

  /* ==========================================================
     BACK TO ADMIN DASHBOARD
  ========================================================== */

  const handleBackToDashboard = () => {
    onNavigate('dashboard-admin')
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
      activeSection="admin-users"
    >
      <div className="space-y-6">

        {/* ==================================================
            HEADER
        ================================================== */}

        <Card className="p-0 overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-[#0F2142] via-[#1B3A6B] to-[#234E9A]">

            <div className="flex items-center justify-between gap-4 flex-wrap">

              <div className="flex items-center gap-4">

                {/* BACK TO DASHBOARD */}
                <button
                  type="button"
                  onClick={
                    handleBackToDashboard
                  }
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-white/20 bg-white/10 text-white text-sm font-semibold hover:bg-white/20 transition-all duration-200"
                >
                  <ArrowLeft size={16} />
                  Back to Dashboard
                </button>

                <div className="h-8 w-px bg-white/20" />

                <div>
                  <div className="flex items-center gap-2 text-blue-300 text-sm font-medium">
                    <Users size={16} />
                    Administration
                  </div>

                  <h1 className="text-2xl font-bold text-white mt-1">
                    User Management
                  </h1>

                  <p className="text-blue-200 text-sm mt-1">
                    Manage faculty, HODs, deans and administrators.
                  </p>
                </div>

              </div>

              <div className="flex items-center gap-3">

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={loadUsers}
                  disabled={loading}
                  leftIcon={
                    <RefreshCw
                      size={14}
                      className={
                        loading
                          ? 'animate-spin'
                          : ''
                      }
                    />
                  }
                >
                  Refresh
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={
                    openCreateModal
                  }
                  leftIcon={
                    <UserPlus size={14} />
                  }
                >
                  Add User
                </Button>

              </div>

            </div>

          </div>
        </Card>

        {/* ==================================================
            ERROR
        ================================================== */}

        {error && (
          <Alert
            variant="error"
            title="User Management Error"
            message={error}
          />
        )}

        {/* ==================================================
            STATS
        ================================================== */}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

          <Card>
            <div className="flex items-center justify-between">

              <div>
                <p className="text-xs text-[#94A3B8]">
                  Total Users
                </p>

                <p className="text-2xl font-bold text-[#0F172A] mt-1">
                  {loading
                    ? '...'
                    : totalUsers}
                </p>
              </div>

              <div className="w-10 h-10 rounded-xl bg-[#EEF4FF] flex items-center justify-center">
                <Users
                  size={20}
                  className="text-[#1B3A6B]"
                />
              </div>

            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">

              <div>
                <p className="text-xs text-[#94A3B8]">
                  Active
                </p>

                <p className="text-2xl font-bold text-[#059669] mt-1">
                  {loading
                    ? '...'
                    : activeUsers}
                </p>
              </div>

              <div className="w-10 h-10 rounded-xl bg-[#D1FAE5] flex items-center justify-center">
                <CheckCircle
                  size={20}
                  className="text-[#059669]"
                />
              </div>

            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">

              <div>
                <p className="text-xs text-[#94A3B8]">
                  Pending
                </p>

                <p className="text-2xl font-bold text-[#D97706] mt-1">
                  {loading
                    ? '...'
                    : pendingUsers}
                </p>
              </div>

              <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center">
                <RefreshCw
                  size={20}
                  className="text-[#D97706]"
                />
              </div>

            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">

              <div>
                <p className="text-xs text-[#94A3B8]">
                  Suspended
                </p>

                <p className="text-2xl font-bold text-[#DC2626] mt-1">
                  {loading
                    ? '...'
                    : suspendedUsers}
                </p>
              </div>

              <div className="w-10 h-10 rounded-xl bg-[#FEE2E2] flex items-center justify-center">
                <XCircle
                  size={20}
                  className="text-[#DC2626]"
                />
              </div>

            </div>
          </Card>

        </div>

        {/* ==================================================
            SEARCH / FILTERS
        ================================================== */}

        <Card>

          <div className="flex flex-col lg:flex-row gap-3">

            <div className="flex-1 relative">

              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"
              />

              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search by name, email, employee ID or department..."
                className="w-full pl-10 pr-9 py-2.5 border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] outline-none focus:ring-2 focus:ring-[#3B5DE8]/20 focus:border-[#3B5DE8]"
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch('')
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A]"
                >
                  <X size={15} />
                </button>
              )}

            </div>

            <select
              value={roleFilter}
              onChange={(e) =>
                setRoleFilter(
                  e.target.value
                )
              }
              className="lg:w-44 border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm text-[#0F172A] bg-white"
            >
              <option value="All">
                All Roles
              </option>

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

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value
                )
              }
              className="lg:w-48 border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm text-[#0F172A] bg-white"
            >
              <option value="All">
                All Statuses
              </option>

              <option value="Active">
                Active
              </option>

              <option value="Pending Activation">
                Pending Activation
              </option>

              <option value="Suspended">
                Suspended
              </option>

              <option value="Inactive">
                Inactive
              </option>

              <option value="Locked">
                Locked
              </option>
            </select>

          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#F1F5F9]">

            <span className="text-xs text-[#94A3B8]">
              Showing{' '}
              <strong className="text-[#475569]">
                {filteredUsers.length}
              </strong>{' '}
              of{' '}
              <strong className="text-[#475569]">
                {users.length}
              </strong>{' '}
              users
            </span>

            {(search ||
              roleFilter !== 'All' ||
              statusFilter !== 'All') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setRoleFilter('All')
                  setStatusFilter('All')
                }}
                className="text-xs font-semibold text-[#3B5DE8] hover:text-[#1B3A6B]"
              >
                Clear Filters
              </button>
            )}

          </div>

        </Card>

        {/* ==================================================
            USER TABLE
        ================================================== */}

        <Card padding={false}>

          <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">

            <div>
              <h2 className="text-base font-semibold text-[#0F172A]">
                All Users
              </h2>

              <p className="text-xs text-[#94A3B8] mt-0.5">
                Live data from MongoDB
              </p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={
                openCreateModal
              }
              leftIcon={
                <Plus size={14} />
              }
            >
              Add User
            </Button>

          </div>

          {loading ? (
            <div className="p-12 text-center">

              <RefreshCw
                size={22}
                className="animate-spin mx-auto text-[#3B5DE8]"
              />

              <p className="text-sm text-[#94A3B8] mt-3">
                Loading users...
              </p>

            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center">

              <Users
                size={36}
                className="mx-auto text-[#CBD5E1]"
              />

              <h3 className="text-sm font-semibold text-[#475569] mt-3">
                No users found
              </h3>

              <p className="text-xs text-[#94A3B8] mt-1">
                Try changing your search or filters.
              </p>

            </div>
          ) : (
            <div className="overflow-x-auto">

              <Table>

                <thead>
                  <tr>
                    <Th>User</Th>
                    <Th>Employee ID</Th>
                    <Th>Role</Th>
                    <Th>Department</Th>
                    <Th>Designation</Th>
                    <Th>Status</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>

                <tbody>

                  {filteredUsers.map(
                    (item) => {
                      const normalizedStatus =
                        normalizeStatus(
                          item.status
                        )

                      const isActive =
                        normalizedStatus ===
                        'Active'

                      const isViewLoading =
                        actionLoading ===
                        `view-${item.id}`

                      const isDeleteLoading =
                        actionLoading ===
                        `delete-${item.id}`

                      const isStatusLoading =
                        actionLoading ===
                        `status-${item.id}`

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-[#F8FAFC] border-b border-[#F1F5F9]"
                        >

                          <Td>
                            <div className="min-w-[190px]">

                              <div className="text-sm font-semibold text-[#0F172A]">
                                {item.name ||
                                  'Unnamed User'}
                              </div>

                              <div className="text-xs text-[#94A3B8] mt-0.5">
                                {item.email ||
                                  'No email'}
                              </div>

                            </div>
                          </Td>

                          <Td>
                            <span className="text-xs font-mono font-semibold text-[#475569]">
                              {item.employeeId ||
                                '—'}
                            </span>
                          </Td>

                          <Td>
                            <RoleBadge
                              role={getRoleForBadge(
                                item.role
                              )}
                            />
                          </Td>

                          <Td>
                            <span className="text-sm text-[#475569]">
                              {item.department ||
                                '—'}
                            </span>
                          </Td>

                          <Td>
                            <span className="text-sm text-[#475569]">
                              {item.designation ||
                                '—'}
                            </span>
                          </Td>

                          <Td>
                            <StatusBadge
                              status={
                                normalizedStatus
                              }
                            />
                          </Td>

                          {/* ==================================================
                              TEXT ACTION BUTTONS
                          ================================================== */}

                          <Td>

                            <div className="flex items-center gap-2 min-w-max">

                              {/* VIEW */}
                              <button
                                type="button"
                                disabled={
                                  isViewLoading
                                }
                                onClick={() =>
                                  handleViewUser(
                                    item
                                  )
                                }
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#1B3A6B] bg-[#EEF4FF] hover:bg-[#DDEAFF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isViewLoading ? (
                                  <RefreshCw
                                    size={13}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Eye
                                    size={13}
                                  />
                                )}

                                View
                              </button>

                              {/* EDIT */}
                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenEdit(
                                    item
                                  )
                                }
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#475569] bg-[#F1F5F9] hover:bg-[#E2E8F0] transition-colors"
                              >
                                <Pencil
                                  size={13}
                                />

                                Edit
                              </button>

                              {/* SUSPEND / ACTIVATE */}
                              <button
                                type="button"
                                disabled={
                                  isStatusLoading
                                }
                                onClick={() =>
                                  handleOpenStatusModal(
                                    item
                                  )
                                }
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                  isActive
                                    ? 'text-[#B45309] bg-[#FEF3C7] hover:bg-[#FDE68A]'
                                    : 'text-[#047857] bg-[#D1FAE5] hover:bg-[#A7F3D0]'
                                }`}
                              >
                                {isStatusLoading ? (
                                  <RefreshCw
                                    size={13}
                                    className="animate-spin"
                                  />
                                ) : isActive ? (
                                  <XCircle
                                    size={13}
                                  />
                                ) : (
                                  <CheckCircle
                                    size={13}
                                  />
                                )}

                                {isActive
                                  ? 'Suspend'
                                  : 'Activate'}
                              </button>

                              {/* DELETE */}
                              <button
                                type="button"
                                disabled={
                                  isDeleteLoading
                                }
                                onClick={() =>
                                  handleOpenDelete(
                                    item
                                  )
                                }
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#B91C1C] bg-[#FEE2E2] hover:bg-[#FECACA] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isDeleteLoading ? (
                                  <RefreshCw
                                    size={13}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Trash2
                                    size={13}
                                  />
                                )}

                                Delete
                              </button>

                            </div>

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

      </div>

      {/* ==================================================
          LOGOUT
      ================================================== */}

      <LogoutModal
        open={showLogout}
        onClose={closeLogout}
        onConfirm={onLogout}
      />

      {/* ==================================================
          CREATE USER MODAL
      ================================================== */}

      {showCreateModal && (
        <Modal
          open
          onClose={() => {
            if (!createLoading) {
              setShowCreateModal(false)
            }
          }}
          maxWidth="max-w-2xl"
        >
          <div className="p-6">

            <div className="flex items-center justify-between mb-5">

              <div>
                <h3 className="text-lg font-bold text-[#0F172A]">
                  Create New User
                </h3>

                <p className="text-xs text-[#94A3B8] mt-1">
                  Create a faculty, HOD, dean or admin account.
                </p>
              </div>

              <button
                type="button"
                disabled={
                  createLoading
                }
                onClick={() =>
                  setShowCreateModal(false)
                }
                className="text-[#94A3B8] hover:text-[#0F172A] disabled:opacity-50"
              >
                <X size={20} />
              </button>

            </div>

            {createError && (
              <Alert
                variant="error"
                title="Unable to create user"
                message={createError}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">

              {/* NAME */}
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                  Full Name
                </label>

                <input
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm(
                      (previous) => ({
                        ...previous,
                        name: e.target.value,
                      })
                    )
                  }
                  placeholder="Enter full name"
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#3B5DE8]/20 focus:border-[#3B5DE8]"
                />
              </div>

              {/* EMAIL */}
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                  Email
                </label>

                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm(
                      (previous) => ({
                        ...previous,
                        email:
                          e.target.value,
                      })
                    )
                  }
                  placeholder="user@university.edu"
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#3B5DE8]/20 focus:border-[#3B5DE8]"
                />
              </div>

              {/* PASSWORD */}
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                  Password
                </label>

                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm(
                      (previous) => ({
                        ...previous,
                        password:
                          e.target.value,
                      })
                    )
                  }
                  placeholder="Enter password"
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#3B5DE8]/20 focus:border-[#3B5DE8]"
                />
              </div>

              {/* EMPLOYEE ID */}
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                  Employee ID
                </label>

                <input
                  value={
                    createForm.employeeId
                  }
                  onChange={(e) =>
                    setCreateForm(
                      (previous) => ({
                        ...previous,
                        employeeId:
                          e.target.value,
                      })
                    )
                  }
                  placeholder="EMP001"
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#3B5DE8]/20 focus:border-[#3B5DE8]"
                />
              </div>

              {/* ROLE */}
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                  Role
                </label>

                <select
                  value={
                    createForm.role
                  }
                  onChange={(e) =>
                    setCreateForm(
                      (previous) => ({
                        ...previous,
                        role: e.target.value,
                      })
                    )
                  }
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm bg-white"
                >
                  <option value="faculty">
                    Faculty
                  </option>

                  <option value="hod">
                    HOD
                  </option>

                  <option value="dean">
                    Dean
                  </option>

                  <option value="admin">
                    Admin
                  </option>
                </select>
              </div>

              {/* DEPARTMENT */}
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                  Department
                </label>

                <input
                  value={
                    createForm.department
                  }
                  onChange={(e) =>
                    setCreateForm(
                      (previous) => ({
                        ...previous,
                        department:
                          e.target.value,
                      })
                    )
                  }
                  placeholder="Computer Science"
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#3B5DE8]/20 focus:border-[#3B5DE8]"
                />
              </div>

              {/* DESIGNATION */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                  Designation
                </label>

                <input
                  value={
                    createForm.designation
                  }
                  onChange={(e) =>
                    setCreateForm(
                      (previous) => ({
                        ...previous,
                        designation:
                          e.target.value,
                      })
                    )
                  }
                  placeholder="Assistant Professor"
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#3B5DE8]/20 focus:border-[#3B5DE8]"
                />
              </div>

            </div>

            <div className="flex gap-3 mt-6">

              <Button
                variant="secondary"
                size="md"
                fullWidth
                disabled={
                  createLoading
                }
                onClick={() =>
                  setShowCreateModal(false)
                }
              >
                Cancel
              </Button>

              <Button
                variant="primary"
                size="md"
                fullWidth
                disabled={
                  createLoading
                }
                onClick={
                  handleCreateUser
                }
                leftIcon={
                  createLoading ? (
                    <RefreshCw
                      size={15}
                      className="animate-spin"
                    />
                  ) : (
                    <UserPlus size={15} />
                  )
                }
              >
                {createLoading
                  ? 'Creating...'
                  : 'Create User'}
              </Button>

            </div>

          </div>
        </Modal>
      )}

      {/* ==================================================
          VIEW USER MODAL
      ================================================== */}

      {showViewModal &&
        selectedUser && (
          <Modal
            open
            onClose={() => {
              setShowViewModal(false)
              setSelectedUser(null)
            }}
            maxWidth="max-w-lg"
          >
            <div className="p-6">

              <div className="flex items-center justify-between mb-5">

                <div>
                  <h3 className="text-lg font-bold text-[#0F172A]">
                    User Details
                  </h3>

                  <p className="text-xs text-[#94A3B8] mt-1">
                    Complete account information
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowViewModal(false)
                    setSelectedUser(null)
                  }}
                  className="text-[#94A3B8] hover:text-[#0F172A]"
                >
                  <X size={20} />
                </button>

              </div>

              <div className="space-y-4">

                <div className="p-4 bg-[#F8FAFC] rounded-xl">

                  <div className="text-xs text-[#94A3B8]">
                    Name
                  </div>

                  <div className="text-base font-semibold text-[#0F172A] mt-1">
                    {selectedUser.name ||
                      '—'}
                  </div>

                </div>

                <div className="grid grid-cols-2 gap-3">

                  <div className="p-3 border border-[#E2E8F0] rounded-lg">

                    <div className="text-xs text-[#94A3B8]">
                      Email
                    </div>

                    <div className="text-sm font-medium text-[#0F172A] mt-1 break-all">
                      {selectedUser.email ||
                        '—'}
                    </div>

                  </div>

                  <div className="p-3 border border-[#E2E8F0] rounded-lg">

                    <div className="text-xs text-[#94A3B8]">
                      Employee ID
                    </div>

                    <div className="text-sm font-medium text-[#0F172A] mt-1">
                      {selectedUser.employeeId ||
                        '—'}
                    </div>

                  </div>

                  <div className="p-3 border border-[#E2E8F0] rounded-lg">

                    <div className="text-xs text-[#94A3B8] mb-1">
                      Role
                    </div>

                    <RoleBadge
                      role={getRoleForBadge(
                        selectedUser.role
                      )}
                    />

                  </div>

                  <div className="p-3 border border-[#E2E8F0] rounded-lg">

                    <div className="text-xs text-[#94A3B8] mb-1">
                      Status
                    </div>

                    <StatusBadge
                      status={normalizeStatus(
                        selectedUser.status
                      )}
                    />

                  </div>

                  <div className="p-3 border border-[#E2E8F0] rounded-lg">

                    <div className="text-xs text-[#94A3B8]">
                      Department
                    </div>

                    <div className="text-sm font-medium text-[#0F172A] mt-1">
                      {selectedUser.department ||
                        '—'}
                    </div>

                  </div>

                  <div className="p-3 border border-[#E2E8F0] rounded-lg">

                    <div className="text-xs text-[#94A3B8]">
                      Designation
                    </div>

                    <div className="text-sm font-medium text-[#0F172A] mt-1">
                      {selectedUser.designation ||
                        '—'}
                    </div>

                  </div>

                </div>

                <div className="p-3 border border-[#E2E8F0] rounded-lg">

                  <div className="text-xs text-[#94A3B8]">
                    User ID
                  </div>

                  <div className="text-xs font-mono text-[#475569] mt-1 break-all">
                    {selectedUser.id}
                  </div>

                </div>

              </div>

              <div className="flex gap-3 mt-6">

                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  onClick={() => {
                    const userToEdit =
                      selectedUser

                    setShowViewModal(false)

                    handleOpenEdit(
                      userToEdit
                    )
                  }}
                >
                  Edit User
                </Button>

                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={() => {
                    setShowViewModal(false)
                    setSelectedUser(null)
                  }}
                >
                  Close
                </Button>

              </div>

            </div>
          </Modal>
        )}

      {/* ==================================================
          EDIT USER MODAL
      ================================================== */}

      {showEditModal &&
        selectedUser && (
          <Modal
            open
            onClose={() => {
              if (!editLoading) {
                setShowEditModal(false)
                setSelectedUser(null)
                setEditError(null)
              }
            }}
            maxWidth="max-w-2xl"
          >
            <div className="p-6">

              <div className="flex items-center justify-between mb-5">

                <div>
                  <h3 className="text-lg font-bold text-[#0F172A]">
                    Edit User
                  </h3>

                  <p className="text-xs text-[#94A3B8] mt-1">
                    Update account information.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={
                    editLoading
                  }
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedUser(null)
                    setEditError(null)
                  }}
                  className="text-[#94A3B8] hover:text-[#0F172A] disabled:opacity-50"
                >
                  <X size={20} />
                </button>

              </div>

              {editError && (
                <div className="mb-4">

                  <Alert
                    variant="error"
                    title="Unable to update user"
                    message={editError}
                  />

                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* NAME */}
                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                    Full Name
                  </label>

                  <input
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm(
                        (previous) => ({
                          ...previous,
                          name: e.target.value,
                        })
                      )
                    }
                    className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#3B5DE8]/20 focus:border-[#3B5DE8]"
                  />
                </div>

                {/* EMAIL */}
                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                    Email
                  </label>

                  <input
                    type="email"
                    value={
                      editForm.email
                    }
                    onChange={(e) =>
                      setEditForm(
                        (previous) => ({
                          ...previous,
                          email:
                            e.target.value,
                        })
                      )
                    }
                    className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#3B5DE8]/20 focus:border-[#3B5DE8]"
                  />
                </div>

                {/* EMPLOYEE ID */}
                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                    Employee ID
                  </label>

                  <input
                    value={
                      editForm.employeeId
                    }
                    onChange={(e) =>
                      setEditForm(
                        (previous) => ({
                          ...previous,
                          employeeId:
                            e.target.value,
                        })
                      )
                    }
                    className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#3B5DE8]/20 focus:border-[#3B5DE8]"
                  />
                </div>

                {/* ROLE */}
                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                    Role
                  </label>

                  <select
                    value={
                      editForm.role
                    }
                    onChange={(e) =>
                      setEditForm(
                        (previous) => ({
                          ...previous,
                          role: e.target.value,
                        })
                      )
                    }
                    className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm bg-white"
                  >
                    <option value="faculty">
                      Faculty
                    </option>

                    <option value="hod">
                      HOD
                    </option>

                    <option value="dean">
                      Dean
                    </option>

                    <option value="admin">
                      Admin
                    </option>
                  </select>
                </div>

                {/* DEPARTMENT */}
                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                    Department
                  </label>

                  <input
                    value={
                      editForm.department
                    }
                    onChange={(e) =>
                      setEditForm(
                        (previous) => ({
                          ...previous,
                          department:
                            e.target.value,
                        })
                      )
                    }
                    className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#3B5DE8]/20 focus:border-[#3B5DE8]"
                  />
                </div>

                {/* DESIGNATION */}
                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                    Designation
                  </label>

                  <input
                    value={
                      editForm.designation
                    }
                    onChange={(e) =>
                      setEditForm(
                        (previous) => ({
                          ...previous,
                          designation:
                            e.target.value,
                        })
                      )
                    }
                    className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#3B5DE8]/20 focus:border-[#3B5DE8]"
                  />
                </div>

              </div>

              <div className="flex gap-3 mt-6">

                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  disabled={
                    editLoading
                  }
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedUser(null)
                    setEditError(null)
                  }}
                >
                  Cancel
                </Button>

                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  disabled={
                    editLoading
                  }
                  onClick={
                    handleUpdateUser
                  }
                  leftIcon={
                    editLoading ? (
                      <RefreshCw
                        size={15}
                        className="animate-spin"
                      />
                    ) : (
                      <Pencil size={15} />
                    )
                  }
                >
                  {editLoading
                    ? 'Saving...'
                    : 'Save Changes'}
                </Button>

              </div>

            </div>
          </Modal>
        )}

      {/* ==================================================
          STATUS CONFIRMATION MODAL
      ================================================== */}

      {showStatusModal &&
        selectedUser &&
        statusAction && (
          <Modal
            open
            onClose={
              closeStatusModal
            }
            maxWidth="max-w-md"
          >
            <div className="p-6">

              {/* HEADER ICON */}
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                  statusAction ===
                  'suspended'
                    ? 'bg-[#FEF3C7]'
                    : 'bg-[#D1FAE5]'
                }`}
              >
                {statusAction ===
                'suspended' ? (
                  <ShieldAlert
                    size={23}
                    className="text-[#D97706]"
                  />
                ) : (
                  <CheckCircle
                    size={23}
                    className="text-[#059669]"
                  />
                )}
              </div>

              {/* TITLE */}
              <h3 className="text-lg font-bold text-[#0F172A]">
                {statusAction ===
                'suspended'
                  ? 'Suspend User'
                  : 'Activate User'}
              </h3>

              {/* DESCRIPTION */}
              <p className="text-sm text-[#64748B] mt-2 leading-6">
                {statusAction ===
                'suspended'
                  ? 'Are you sure you want to suspend this user? The user will no longer be able to access the system until the account is activated again.'
                  : 'Are you sure you want to activate this user? The user will regain access to the system.'}
              </p>

              {/* USER INFO */}
              <div className="mt-4 p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">

                <div className="text-sm font-semibold text-[#0F172A]">
                  {selectedUser.name ||
                    'Unnamed User'}
                </div>

                <div className="text-xs text-[#64748B] mt-1">
                  {selectedUser.email ||
                    'No email'}
                </div>

                <div className="flex items-center gap-2 mt-3">

                  <RoleBadge
                    role={getRoleForBadge(
                      selectedUser.role
                    )}
                  />

                  <span className="text-xs text-[#94A3B8]">
                    •
                  </span>

                  <span className="text-xs font-medium text-[#64748B]">
                    {selectedUser.employeeId ||
                      'No Employee ID'}
                  </span>

                </div>

              </div>

              {/* ERROR */}
              {statusActionError && (
                <div className="mt-4">

                  <Alert
                    variant="error"
                    title="Unable to update status"
                    message={
                      statusActionError
                    }
                  />

                </div>
              )}

              {/* BUTTONS */}
              <div className="flex gap-3 mt-6">

                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  disabled={
                    statusActionLoading
                  }
                  onClick={
                    closeStatusModal
                  }
                >
                  Cancel
                </Button>

                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  disabled={
                    statusActionLoading
                  }
                  onClick={
                    handleConfirmStatusChange
                  }
                  leftIcon={
                    statusActionLoading ? (
                      <RefreshCw
                        size={15}
                        className="animate-spin"
                      />
                    ) : statusAction ===
                      'suspended' ? (
                      <XCircle size={15} />
                    ) : (
                      <CheckCircle
                        size={15}
                      />
                    )
                  }
                >
                  {statusActionLoading
                    ? statusAction ===
                      'suspended'
                      ? 'Suspending...'
                      : 'Activating...'
                    : statusAction ===
                      'suspended'
                    ? 'Suspend User'
                    : 'Activate User'}
                </Button>

              </div>

            </div>
          </Modal>
        )}

      {/* ==================================================
          DELETE CONFIRMATION
      ================================================== */}

      {showDeleteModal &&
        selectedUser && (
          <Modal
            open
            onClose={() => {
              if (
                actionLoading !==
                `delete-${selectedUser.id}`
              ) {
                setShowDeleteModal(false)
                setSelectedUser(null)
              }
            }}
            maxWidth="max-w-md"
          >
            <div className="p-6">

              <div className="w-12 h-12 rounded-xl bg-[#FEE2E2] flex items-center justify-center mb-4">

                <Trash2
                  size={22}
                  className="text-[#DC2626]"
                />

              </div>

              <h3 className="text-lg font-bold text-[#0F172A]">
                Delete User?
              </h3>

              <p className="text-sm text-[#64748B] mt-2 leading-6">
                You are about to permanently
                delete{' '}
                <strong className="text-[#0F172A]">
                  {selectedUser.name}
                </strong>
                . This action cannot be undone.
              </p>

              <div className="mt-4 p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">

                <div className="text-sm font-semibold text-[#0F172A]">
                  {selectedUser.email}
                </div>

                <div className="text-xs text-[#94A3B8] mt-1">
                  {normalizeRole(
                    selectedUser.role
                  )}{' '}
                  •{' '}
                  {selectedUser.employeeId ||
                    'No Employee ID'}
                </div>

              </div>

              <div className="flex gap-3 mt-6">

                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  disabled={
                    actionLoading ===
                    `delete-${selectedUser.id}`
                  }
                  onClick={() => {
                    setShowDeleteModal(false)
                    setSelectedUser(null)
                  }}
                >
                  Cancel
                </Button>

                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  disabled={
                    actionLoading ===
                    `delete-${selectedUser.id}`
                  }
                  onClick={
                    handleDeleteUser
                  }
                  leftIcon={
                    actionLoading ===
                    `delete-${selectedUser.id}` ? (
                      <RefreshCw
                        size={15}
                        className="animate-spin"
                      />
                    ) : (
                      <Trash2 size={15} />
                    )
                  }
                >
                  {actionLoading ===
                  `delete-${selectedUser.id}`
                    ? 'Deleting...'
                    : 'Delete User'}
                </Button>

              </div>

            </div>
          </Modal>
        )}

    </AppShell>
  )
}

