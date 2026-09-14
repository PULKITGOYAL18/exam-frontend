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
import { PublishResultsModal } from '@/modules/results/publishing'
import { University, ClipboardList, TrendingUp, Target, CheckCircle, Rocket } from 'lucide-react'

// ─── Mock Data ────────────────────────────────────────────────────────────────
import { DEPARTMENTS, DEAN_NOTIFICATIONS, DEAN_ACTIVITY, DEPT_COMPARISON, COLLEGE_STATUS, GRADE_DIST } from '@/services/dean/mockData'

// ─── Dept Status Pill ─────────────────────────────────────────────────────────
function DeptStatusPill({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    'Ready to Publish': 'bg-[#D1FAE5] text-[#065F46]',
    'Dean Approval Pending': 'bg-[#EEF4FF] text-[#1B3A6B]',
    'In Progress': 'bg-[#FEF3C7] text-[#92400E]',
    'Partial': 'bg-[#FEF3C7] text-[#92400E]',
    'Not Started': 'bg-[#FEE2E2] text-[#991B1B]',
    'Published': 'bg-[#D1FAE5] text-[#065F46]',
  }
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cfg[status] ?? 'bg-[#F1F5F9] text-[#475569]'}`}>{status}</span>
}

// ─── Dean Dashboard ───────────────────────────────────────────────────────────
interface DeanDashboardProps {
  user: User
  onNavigate: (s: Screen) => void
  onLogout: () => void
}

export default function DeanDashboard({ user, onNavigate, onLogout }: DeanDashboardProps) {
  const { showLogout, openLogout, closeLogout } = useLogout()
  const [detailDept, setDetailDept] = useState<typeof DEPARTMENTS[0] | null>(null)
  const [publishModal, setPublishModal] = useState<typeof DEPARTMENTS[0] | null>(null)
  const [approvedDepts, setApprovedDepts] = useState<Set<string>>(new Set())

  const totalSheets = DEPARTMENTS.reduce((s, d) => s + d.totalSheets, 0)
  const totalCompleted = DEPARTMENTS.reduce((s, d) => s + d.completed, 0)
  const totalApproved = DEPARTMENTS.reduce((s, d) => s + d.approved, 0)

  const pendingDeans = DEPARTMENTS.filter(d =>
    (d.status === 'Dean Approval Pending' || d.status === 'Ready to Publish') && !approvedDepts.has(d.id)
  )

  const handlePublish = (deptId: string) => {
    setApprovedDepts(s => new Set([...s, deptId]))
    setPublishModal(null)
  }

  return (
    <AppShell
      user={{ name: user.name, role: user.role, email: user.email }}
      onNavigate={onNavigate}
      onLogout={openLogout}
      activeSection="dashboard"
    >
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">

        {/* ── Welcome Banner ──────────────────────────────────── */}
        <Card className="p-0 overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-[#4C1D95] via-[#6D28D9] to-[#7C3AED]">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-purple-200 text-sm font-medium">College Overview Dashboard</p>
                <h1 className="text-2xl font-bold text-white mt-0.5 tracking-tight">{user.name}</h1>
                <p className="text-purple-100 text-sm mt-1">{user.designation}</p>
                <div className="flex gap-2 mt-3 flex-wrap">
                  <RoleBadge role={user.role} />
                  <span className="text-xs text-purple-200 self-center">{DEPARTMENTS.length} departments · {totalSheets.toLocaleString()} total sheets</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6 text-center">
                {[
                  { label: 'Total Sheets', value: totalSheets, color: 'text-white' },
                  { label: 'Completed', value: totalCompleted, color: 'text-emerald-300' },
                  { label: 'Approved', value: totalApproved, color: 'text-purple-200' },
                ].map(s => (
                  <div key={s.label}>
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value.toLocaleString()}</div>
                    <div className="text-purple-300 text-xs mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="px-6 py-3 bg-[#4C1D95]/80 border-t border-white/10 flex items-center gap-4">
            <div className="text-xs text-purple-200 font-medium">College Progress:</div>
            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#7C3AED] rounded-full" style={{ width: `${Math.round((totalCompleted / totalSheets) * 100)}%` }} />
            </div>
            <div className="text-white text-xs font-bold">{Math.round((totalCompleted / totalSheets) * 100)}% college-wide</div>
          </div>
        </Card>

        {/* ── Alerts ──────────────────────────────────────────── */}
        {pendingDeans.length > 0 && (
          <Alert variant="info" title={`${pendingDeans.length} Department${pendingDeans.length > 1 ? 's' : ''} Awaiting Dean Approval`}
            message={`${pendingDeans.map(d => d.code).join(', ')} evaluations have been HOD-approved and are ready for your review and publish authorization.`} />
        )}

        {/* ── Stats ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Departments" value={DEPARTMENTS.length} color="#7C3AED" icon={<University size={20} />} />
          <StatCard label="Pending Approval" value={pendingDeans.length} color="#D97706" icon={<ClipboardList size={20} />}
            trend={{ direction: 'neutral', text: 'awaiting Dean' }} />
          <StatCard label="College Progress" value={`${Math.round((totalCompleted / totalSheets) * 100)}%`} color="#059669" icon={<TrendingUp size={20} />} />
          <StatCard label="Avg Marks" value="68.5" sub="college average" color="#3B5DE8" icon={<Target size={20} />} />
          <StatCard label="Pass Rate" value="83%" sub="college-wide" color="#059669" icon={<CheckCircle size={20} />} />
          <StatCard label="Published" value={approvedDepts.size} sub="departments" color="#059669" icon={<Rocket size={20} />} />
        </div>

        {/* ── Department Cards ─────────────────────────────────── */}
        <div>
          <h2 className="text-lg font-semibold text-[#0F172A] mb-4">Department Status</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {DEPARTMENTS.map(dept => {
              const compPct = Math.round((dept.completed / dept.totalSheets) * 100)
              const appPct = dept.completed > 0 ? Math.round((dept.approved / dept.completed) * 100) : 0
              const isPublished = approvedDepts.has(dept.id)
              const displayStatus = isPublished ? 'Published' : dept.status
              return (
                <Card key={dept.id} className="hover:shadow-md transition-all hover:border-[#BACFFB]">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-[#94A3B8] bg-[#F1F5F9] px-2 py-0.5 rounded-md">{dept.code}</span>
                        <DeptStatusPill status={displayStatus} />
                      </div>
                      <h3 className="text-sm font-bold text-[#0F172A] mt-1.5 leading-snug">{dept.name}</h3>
                      <p className="text-xs text-[#94A3B8]">HOD: {dept.hod}</p>
                    </div>
                    <ProgressRing value={compPct} size={48} color={compPct === 100 ? '#059669' : '#7C3AED'} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { label: 'Faculty', value: dept.faculty },
                      { label: 'Courses', value: dept.courses },
                      { label: 'Subjects', value: dept.subjects },
                    ].map(s => (
                      <div key={s.label} className="text-center p-2 bg-[#F8FAFC] rounded-lg">
                        <div className="text-base font-bold text-[#0F172A]">{s.value}</div>
                        <div className="text-[10px] text-[#94A3B8]">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Progress bars */}
                  <div className="space-y-1.5 mb-3">
                    {[
                      { label: 'Completed', pct: compPct, color: '#059669' },
                      { label: 'Approved', pct: appPct, color: '#3B5DE8' },
                      { label: `Pass Rate · ${dept.passPercent}%`, pct: dept.passPercent, color: '#D97706' },
                    ].map(p => (
                      <div key={p.label}>
                        <div className="flex justify-between text-[10px] text-[#94A3B8] mb-0.5">
                          <span>{p.label}</span>
                          <span className="font-semibold">{p.pct}%</span>
                        </div>
                        <div className="h-1 bg-[#F1F5F9] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${p.pct}%`, backgroundColor: p.color }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setDetailDept(dept)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#7C3AED] bg-[#F3E8FF] hover:bg-[#E9D5FF] transition-colors flex-1">
                      View Details
                    </button>
                    {(displayStatus === 'Dean Approval Pending' || displayStatus === 'Ready to Publish') && (
                      <button onClick={() => setPublishModal(dept)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] transition-colors flex-1">
                        Approve & Publish
                      </button>
                    )}
                    {displayStatus === 'Published' && (
                      <span className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#065F46] bg-[#D1FAE5] flex-1 text-center">
                        ✓ Published
                      </span>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </div>

        {/* ── Analytics ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Card>
                <CardHeader title="Department Comparison" subtitle="Completed vs. Approved" />
                <GroupedBarChart
                  series={[{ label: 'Completed', color: '#7C3AED' }, { label: 'Approved', color: '#059669' }]}
                  data={DEPT_COMPARISON}
                  height={180}
                />
              </Card>
              <Card>
                <CardHeader title="College-wide Status" subtitle="Sheet evaluation distribution" />
                <DonutChart segments={COLLEGE_STATUS} centerValue={totalSheets} centerLabel="Total Sheets" size={120} />
              </Card>
            </div>

            <Card>
              <CardHeader title="Grade Distribution" subtitle="All evaluated & approved sheets (4 departments)" />
              <HBarChart
                data={GRADE_DIST}
                maxValue={Math.max(...GRADE_DIST.map(d => d.value))}
              />
            </Card>

            {/* Pending Approvals Table */}
            {pendingDeans.length > 0 && (
              <Card padding={false}>
                <div className="p-5 border-b border-[#E2E8F0]">
                  <h3 className="text-base font-semibold text-[#0F172A]">Pending Dean Approvals</h3>
                  <WorkflowCard steps={[
                    { label: 'HOD Approved', status: 'done' },
                    { label: 'Dean Review', status: 'active' },
                    { label: 'Publish Results', status: 'pending' },
                  ]} />
                </div>
                <Table>
                  <thead>
                    <tr>
                      <Th>Department</Th>
                      <Th>HOD</Th>
                      <Th>Sheets</Th>
                      <Th>Avg Marks</Th>
                      <Th>Pass %</Th>
                      <Th>Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingDeans.map(dept => (
                      <tr key={dept.id} className="hover:bg-[#F8FAFC]">
                        <Td>
                          <div>
                            <div className="text-sm font-semibold text-[#0F172A]">{dept.code}</div>
                            <div className="text-xs text-[#94A3B8]">{dept.name}</div>
                          </div>
                        </Td>
                        <Td><span className="text-sm text-[#475569]">{dept.hod}</span></Td>
                        <Td><span className="text-sm font-bold">{dept.completed.toLocaleString()}</span></Td>
                        <Td><span className={`text-sm font-bold ${dept.avgMarks >= 70 ? 'text-[#059669]' : 'text-[#D97706]'}`}>{dept.avgMarks}/100</span></Td>
                        <Td><span className={`text-sm font-bold ${dept.passPercent >= 80 ? 'text-[#059669]' : 'text-[#D97706]'}`}>{dept.passPercent}%</span></Td>
                        <Td>
                          <div className="flex gap-1.5">
                            <button onClick={() => setDetailDept(dept)} className="px-2.5 py-1 rounded-md text-xs font-semibold text-[#7C3AED] bg-[#F3E8FF] hover:bg-[#E9D5FF] transition-colors">View</button>
                            <button onClick={() => setPublishModal(dept)} className="px-2.5 py-1 rounded-md text-xs font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] transition-colors">Approve</button>
                          </div>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader title="Department Health" />
              <HBarChart data={DEPARTMENTS.map(d => ({
                label: d.code,
                value: d.totalSheets > 0 ? Math.round((d.completed / d.totalSheets) * 100) : 0,
                color: d.completed === d.totalSheets ? '#059669' : d.completed > 0 ? '#7C3AED' : '#94A3B8',
              }))} maxValue={100} unit="%" />
            </Card>

            <Card>
              <CardHeader title="Notifications" subtitle={`${DEAN_NOTIFICATIONS.length} updates`} />
              <NotificationList items={DEAN_NOTIFICATIONS} />
            </Card>

            <Card>
              <CardHeader title="Recent Activity" />
              <ActivityTimeline events={DEAN_ACTIVITY} maxItems={5} />
            </Card>
          </div>
        </div>
      </div>

      <LogoutModal open={showLogout} onClose={closeLogout} onConfirm={onLogout} />

      {/* Department Detail Modal */}
      {detailDept && (
        <Modal open onClose={() => setDetailDept(null)} maxWidth="max-w-2xl">
          <div className="p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-[#0F172A]">{detailDept.name}</h3>
                <p className="text-sm text-[#475569] mt-0.5">HOD: {detailDept.hod}</p>
                <div className="flex gap-2 mt-2">
                  <span className="text-xs font-bold text-[#94A3B8] bg-[#F1F5F9] px-2 py-0.5 rounded-md">{detailDept.code}</span>
                  <DeptStatusPill status={approvedDepts.has(detailDept.id) ? 'Published' : detailDept.status} />
                </div>
              </div>
              <ProgressRing value={detailDept.completed} max={detailDept.totalSheets} size={64} color="#7C3AED" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Faculty', value: detailDept.faculty, color: '#1B3A6B' },
                { label: 'Completed', value: detailDept.completed, color: '#059669' },
                { label: 'Approved', value: detailDept.approved, color: '#7C3AED' },
                { label: 'Rejected', value: detailDept.rejected, color: '#DC2626' },
              ].map(s => (
                <div key={s.label} className="text-center p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs text-[#94A3B8] mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            <div>
              <div className="text-sm font-semibold text-[#0F172A] mb-2">Grade Distribution</div>
              <HBarChart data={Object.entries(detailDept.grades).map(([g, v]) => ({
                label: g, value: v,
                color: g === 'O' ? '#059669' : g === 'A' ? '#3B5DE8' : g === 'B' ? '#0284C7' : g === 'C' ? '#D97706' : g === 'P' ? '#F59E0B' : '#DC2626',
              }))} />
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" size="md" fullWidth onClick={() => setDetailDept(null)}>Close</Button>
              {(detailDept.status === 'Dean Approval Pending' || detailDept.status === 'Ready to Publish') && !approvedDepts.has(detailDept.id) && (
                <Button variant="primary" size="md" fullWidth onClick={() => { setPublishModal(detailDept); setDetailDept(null) }}>
                  Approve & Publish
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Publish Confirmation Modal */}
      {publishModal && (
        <PublishResultsModal
          department={publishModal}
          onClose={() => setPublishModal(null)}
          onConfirm={handlePublish}
        />
      )}
    </AppShell>
  )
}