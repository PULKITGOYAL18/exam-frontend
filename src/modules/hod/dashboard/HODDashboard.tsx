import { AppShell } from '@/layouts'
import { useState } from 'react'
import { useLogout } from '@/hooks'
import { Card, CardHeader, Button, Alert, Modal, Table, Th, Td, RoleBadge } from '@/components/common'
import {
  StatCard, HBarChart, GroupedBarChart, DonutChart,
  ActivityTimeline, NotificationList, ProgressRing, WorkflowCard,
} from '@/components/common'
import type { User, Screen } from '@/types'
import { LogoutModal } from '@/components/common'
import { Users, ClipboardList, TrendingUp, Clock, CheckCircle, Undo } from 'lucide-react'

// ─── Mock Data ────────────────────────────────────────────────────────────────
import { FACULTY_LIST, PENDING_APPROVALS, DEPT_NOTIFICATIONS, DEPT_ACTIVITY, COMPARISON_DATA, APPROVAL_STATUS } from '@/services/hod/mockData'

// ─── Faculty Status Pill ──────────────────────────────────────────────────────
function FacultyStatusPill({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    'Approved': 'bg-[#D1FAE5] text-[#065F46]',
    'All Submitted': 'bg-[#D1FAE5] text-[#065F46]',
    'Evaluating': 'bg-[#EEF4FF] text-[#1B3A6B]',
    'Pending OCR': 'bg-[#FEF3C7] text-[#92400E]',
    'Not Started': 'bg-[#FEE2E2] text-[#991B1B]',
  }
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cfg[status] ?? 'bg-[#F1F5F9] text-[#475569]'}`}>{status}</span>
}

function WorkloadBadge({ workload }: { workload: string }) {
  const cfg = { High: 'text-[#DC2626]', Normal: 'text-[#059669]', Low: 'text-[#94A3B8]' }[workload] ?? 'text-[#475569]'
  return <span className={`text-xs font-semibold ${cfg}`}>{workload}</span>
}

// ─── HOD Dashboard ────────────────────────────────────────────────────────────
interface HODDashboardProps {
  user: User
  onNavigate: (s: Screen) => void
  onLogout: () => void
}

export default function HODDashboard({ user, onNavigate, onLogout }: HODDashboardProps) {
  const { showLogout, openLogout, closeLogout } = useLogout()
  const [detailFaculty, setDetailFaculty] = useState<typeof FACULTY_LIST[0] | null>(null)
  const [actionModal, setActionModal] = useState<{ type: 'approve' | 'return' | 'reassign'; approval: typeof PENDING_APPROVALS[0] } | null>(null)
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set())
  const [returnedIds, setReturnedIds] = useState<Set<string>>(new Set())
  const [returnRemark, setReturnRemark] = useState('')

  const totalAssigned = FACULTY_LIST.reduce((s, f) => s + f.assigned, 0)
  const totalCompleted = FACULTY_LIST.reduce((s, f) => s + f.completed, 0)
  const totalPending = totalAssigned - totalCompleted
  const pendingApprovals = PENDING_APPROVALS.filter(a => !approvedIds.has(a.id) && !returnedIds.has(a.id))

  const handleApprove = (id: string) => {
    setApprovedIds(s => new Set([...s, id]))
    setActionModal(null)
  }
  const handleReturn = (id: string) => {
    setReturnedIds(s => new Set([...s, id]))
    setActionModal(null)
    setReturnRemark('')
  }

  return (
    <AppShell
      user={{ name: user.name, role: user.role, email: user.email }}
      onNavigate={onNavigate}
      onLogout={openLogout}
      activeSection="dashboard"
    >
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">

        {/* ── Welcome Banner ──────────────────────────────────────────── */}
        <Card className="p-0 overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-[#075985] via-[#0284C7] to-[#0EA5E9]">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sky-200 text-sm font-medium">Department Dashboard</p>
                <h1 className="text-2xl font-bold text-white mt-0.5 tracking-tight">{user.name}</h1>
                <p className="text-sky-100 text-sm mt-1">{user.designation} · {user.department}</p>
                <div className="flex gap-2 mt-3">
                  <RoleBadge role={user.role} />
                  <span className="text-xs text-sky-200 self-center">{FACULTY_LIST.length} faculty under supervision</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { label: 'Total Sheets', value: totalAssigned, color: 'text-white' },
                  { label: 'Completed', value: totalCompleted, color: 'text-emerald-300' },
                  { label: 'Pending', value: totalPending, color: 'text-amber-300' },
                ].map(s => (
                  <div key={s.label}>
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-sky-200 text-xs mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* ── Alerts ──────────────────────────────────────────────────── */}
        {pendingApprovals.length > 0 && (
          <Alert variant="info" title={`${pendingApprovals.length} Evaluation${pendingApprovals.length > 1 ? 's' : ''} Awaiting Your Approval`}
            message="Review submitted faculty evaluations before forwarding to Dean." />
        )}

        {/* ── Stats ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Total Faculty" value={FACULTY_LIST.length} color="#0284C7" icon={<Users size={20} />} />
          <StatCard label="Pending Approvals" value={pendingApprovals.length} color="#D97706" icon={<ClipboardList size={20} />}
            trend={{ direction: pendingApprovals.length > 0 ? 'up' : 'neutral', text: 'awaiting review' }} />
          <StatCard label="Dept Progress" value={`${Math.round((totalCompleted / totalAssigned) * 100)}%`} color="#059669" icon={<TrendingUp size={20} />} />
          <StatCard label="Avg Eval Time" value="4.1h" sub="dept average" color="#3B5DE8" icon={<Clock size={20} />} />
          <StatCard label="Approved" value={307} sub="forwarded to Dean" color="#059669" icon={<CheckCircle size={20} />} />
          <StatCard label="Returned" value={19} sub="needs correction" color="#DC2626" icon={<Undo size={20} />} />
        </div>

        {/* ── Pending Approvals ────────────────────────────────────────── */}
        {pendingApprovals.length > 0 && (
          <Card padding={false}>
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-[#0F172A]">Pending Approvals</h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">Review and approve faculty evaluations before forwarding to Dean</p>
              </div>
              <WorkflowCard steps={[
                { label: 'Faculty Verified', status: 'done' },
                { label: 'HOD Review', status: 'active' },
                { label: 'Dean Approval', status: 'pending' },
                { label: 'Publish', status: 'pending' },
              ]} />
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
                {pendingApprovals.map(a => (
                  <tr key={a.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#EEF4FF] text-[#1B3A6B] text-xs font-bold flex items-center justify-center">
                          {a.faculty.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-[#0F172A]">{a.faculty}</span>
                      </div>
                    </Td>
                    <Td><span className="text-sm text-[#475569]">{a.exam}</span></Td>
                    <Td><span className="text-sm font-semibold text-[#0F172A]">{a.sheets}</span></Td>
                    <Td>
                      <span className={`text-sm font-semibold ${a.avgMarks >= 70 ? 'text-[#059669]' : a.avgMarks >= 50 ? 'text-[#D97706]' : 'text-[#DC2626]'}`}>
                        {a.avgMarks}/100
                      </span>
                    </Td>
                    <Td>
                      {a.lowConf > 0 ? (
                        <span className="text-xs font-semibold text-[#DC2626] bg-[#FEE2E2] px-2 py-0.5 rounded-full">{a.lowConf} flagged</span>
                      ) : (
                        <span className="text-xs font-semibold text-[#059669]">None</span>
                      )}
                    </Td>
                    <Td><span className="text-xs text-[#94A3B8]">{a.submittedAt}</span></Td>
                    <Td>
                      <div className="flex gap-1.5 flex-wrap">
                        <button onClick={() => setDetailFaculty(FACULTY_LIST.find(f => f.name === a.faculty) ?? null)}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold text-[#1B3A6B] bg-[#EEF4FF] hover:bg-[#BACFFB] transition-colors">View</button>
                        <button onClick={() => setActionModal({ type: 'approve', approval: a })}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold text-[#065F46] bg-[#D1FAE5] hover:bg-[#A7F3D0] transition-colors">Approve</button>
                        <button onClick={() => setActionModal({ type: 'return', approval: a })}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold text-[#92400E] bg-[#FEF3C7] hover:bg-[#FDE68A] transition-colors">Return</button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {approvedIds.size > 0 && (
              <div className="p-4 bg-[#D1FAE5] border-t border-[#A7F3D0] flex items-center justify-between">
                <span className="text-sm text-[#065F46] font-medium">{approvedIds.size} evaluation{approvedIds.size > 1 ? 's' : ''} approved — ready to forward to Dean</span>
                <Button variant="success" size="sm">Forward to Dean →</Button>
              </div>
            )}
          </Card>
        )}

        {/* ── Main Grid ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Left 2/3 */}
          <div className="xl:col-span-2 space-y-6">

            {/* Faculty Performance Table */}
            <Card padding={false}>
              <div className="p-5 border-b border-[#E2E8F0]">
                <h3 className="text-base font-semibold text-[#0F172A]">Faculty Performance</h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">Evaluation status for all department faculty</p>
              </div>
              <div className="divide-y divide-[#F1F5F9]">
                {FACULTY_LIST.map(f => {
                  const pct = f.assigned > 0 ? Math.round((f.completed / f.assigned) * 100) : 0
                  return (
                    <div key={f.id} className="p-5 hover:bg-[#F8FAFC] transition-colors">
                      <div className="flex items-start gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="w-9 h-9 rounded-full bg-[#EEF4FF] text-[#1B3A6B] text-sm font-bold flex items-center justify-center shrink-0">
                              {f.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-[#0F172A]">{f.name}</span>
                                <FacultyStatusPill status={f.status} />
                              </div>
                              <div className="text-xs text-[#94A3B8]">{f.designation}</div>
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {f.subjects.map(s => (
                              <span key={s} className="text-[10px] bg-[#F1F5F9] text-[#475569] px-2 py-0.5 rounded-md">{s}</span>
                            ))}
                          </div>
                          {/* Progress bar */}
                          <div className="mt-2">
                            <div className="flex justify-between text-[10px] text-[#94A3B8] mb-1">
                              <span>Progress</span>
                              <span className="font-semibold">{f.completed}/{f.assigned} sheets</span>
                            </div>
                            <div className="h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-[#0284C7] transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-center">
                            <div className="text-xs text-[#94A3B8]">Avg Time</div>
                            <div className="text-sm font-bold text-[#0F172A]">{f.avgTime}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-[#94A3B8]">Low Conf</div>
                            <div className={`text-sm font-bold ${f.lowConfPct > 8 ? 'text-[#DC2626]' : f.lowConfPct > 4 ? 'text-[#D97706]' : 'text-[#059669]'}`}>
                              {f.lowConfPct}%
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-[#94A3B8]">Workload</div>
                            <WorkloadBadge workload={f.workload} />
                          </div>
                          <ProgressRing value={pct} size={44} color={pct === 100 ? '#059669' : '#0284C7'} />
                          <button
                            onClick={() => setDetailFaculty(f)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#0284C7] bg-[#E0F2FE] hover:bg-[#BAE6FD] transition-colors"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Charts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Card>
                <CardHeader title="Faculty Comparison" subtitle="Completed vs. Pending sheets" />
                <GroupedBarChart
                  series={[
                    { label: 'Completed', color: '#059669' },
                    { label: 'Pending', color: '#D97706' },
                  ]}
                  data={COMPARISON_DATA}
                  height={180}
                />
              </Card>
              <Card>
                <CardHeader title="Approval Status" subtitle="Department-wide distribution" />
                <DonutChart
                  segments={APPROVAL_STATUS}
                  centerValue={641}
                  centerLabel="Total Sheets"
                  size={120}
                />
              </Card>
            </div>
          </div>

          {/* Right 1/3 */}
          <div className="space-y-6">
            <Card>
              <CardHeader title="Department Statistics" />
              <HBarChart data={[
                { label: 'Completion Rate', value: Math.round((totalCompleted / totalAssigned) * 100), color: '#059669' },
                { label: 'Approval Rate', value: Math.round((307 / totalCompleted) * 100), color: '#3B5DE8' },
                { label: 'On-time Rate', value: 78, color: '#D97706' },
                { label: 'Accuracy Score', value: 91, color: '#0284C7' },
              ]} maxValue={100} unit="%" />
            </Card>

            <Card>
              <CardHeader title="Notifications" subtitle={`${DEPT_NOTIFICATIONS.length} updates`} />
              <NotificationList items={DEPT_NOTIFICATIONS} />
            </Card>

            <Card>
              <CardHeader title="Recent Activity" />
              <ActivityTimeline events={DEPT_ACTIVITY} maxItems={5} />
            </Card>
          </div>
        </div>
      </div>

      <LogoutModal open={showLogout} onClose={closeLogout} onConfirm={onLogout} />

      {/* Faculty Detail Modal */}
      {detailFaculty && (
        <Modal open onClose={() => setDetailFaculty(null)} maxWidth="max-w-2xl">
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#EEF4FF] text-[#1B3A6B] text-xl font-bold flex items-center justify-center">
                {detailFaculty.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#0F172A]">{detailFaculty.name}</h3>
                <p className="text-sm text-[#475569]">{detailFaculty.designation}</p>
                <div className="flex gap-2 mt-1.5">
                  <FacultyStatusPill status={detailFaculty.status} />
                  <WorkloadBadge workload={detailFaculty.workload} />
                </div>
              </div>
              <div className="ml-auto">
                <ProgressRing value={detailFaculty.completed} max={detailFaculty.assigned} size={60} color="#0284C7" />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Assigned', value: detailFaculty.assigned, color: '#1B3A6B' },
                { label: 'Completed', value: detailFaculty.completed, color: '#059669' },
                { label: 'Pending', value: detailFaculty.pending, color: '#D97706' },
                { label: 'Low Conf %', value: `${detailFaculty.lowConfPct}%`, color: '#DC2626' },
              ].map(s => (
                <div key={s.label} className="text-center p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs text-[#94A3B8] mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            <div>
              <div className="text-sm font-semibold text-[#0F172A] mb-2">Subjects</div>
              <div className="space-y-1">
                {detailFaculty.subjects.map(s => (
                  <div key={s} className="flex items-center gap-2 text-sm text-[#475569]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0284C7] shrink-0" />
                    {s}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" size="md" fullWidth onClick={() => setDetailFaculty(null)}>Close</Button>
              <Button variant="primary" size="md" fullWidth onClick={() => {
                const approval = PENDING_APPROVALS.find(a => a.faculty === detailFaculty.name)
                if (approval) setActionModal({ type: 'approve', approval })
                setDetailFaculty(null)
              }}>Approve Evaluation</Button>
              <Button variant="ghost" size="md" onClick={() => {
                const approval = PENDING_APPROVALS.find(a => a.faculty === detailFaculty.name)
                if (approval) setActionModal({ type: 'return', approval })
                setDetailFaculty(null)
              }}>Return</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Action Confirmation Modal */}
      {actionModal && (
        <Modal open onClose={() => { setActionModal(null); setReturnRemark('') }} maxWidth="max-w-md">
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-bold text-[#0F172A]">
              {actionModal.type === 'approve' ? 'Approve Evaluation' : 'Return for Correction'}
            </h3>
            <p className="text-sm text-[#475569]">
              <strong>{actionModal.approval.faculty}</strong> — {actionModal.approval.exam} ({actionModal.approval.sheets} sheets)
            </p>
            {actionModal.type === 'return' && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#0F172A]">Reason for Return <span className="text-[#DC2626]">*</span></label>
                <textarea
                  value={returnRemark}
                  onChange={e => setReturnRemark(e.target.value)}
                  rows={3}
                  placeholder="Describe what needs to be corrected…"
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E2E8F0] text-sm resize-none outline-none focus:border-[#3B5DE8] focus:ring-2 focus:ring-[#3B5DE8]/20 placeholder:text-[#94A3B8]"
                />
              </div>
            )}
            {actionModal.type === 'approve' && (
              <div className="p-3 bg-[#EEF4FF] border border-[#BACFFB] rounded-lg text-xs text-[#1B3A6B]">
                Approving will forward this evaluation to the Dean for final sign-off.
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="secondary" size="md" fullWidth onClick={() => { setActionModal(null); setReturnRemark('') }}>Cancel</Button>
              {actionModal.type === 'approve' ? (
                <Button variant="success" size="md" fullWidth onClick={() => handleApprove(actionModal.approval.id)}>
                  Approve & Forward to Dean
                </Button>
              ) : (
                <Button variant="danger" size="md" fullWidth
                  disabled={!returnRemark.trim()}
                  onClick={() => handleReturn(actionModal.approval.id)}>
                  Return to Faculty
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </AppShell>
  )
}