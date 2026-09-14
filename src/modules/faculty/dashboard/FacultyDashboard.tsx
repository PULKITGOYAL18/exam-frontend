// src/modules/faculty/FacultyDashboard.tsx

import { AppShell } from '@/layouts'
import { useState } from 'react'
import { useLogout } from '@/hooks'
import { Card, CardHeader, Button, Alert, StatusBadge, RoleBadge, Modal, QuickAction } from '@/components/common'
import {
  StatCard, HBarChart, Sparkline, ActivityTimeline, ProgressRing,
  NotificationList, MiniCalendar, WorkflowCard, DonutChart,
} from '@/components/common'
import type { User, Screen } from '@/types'
import { LogoutModal } from '@/components/common'
import {
  ClipboardList, CheckCircle, Hourglass, Clock, AlertTriangle, Rocket,
  Upload, Play, Search, BarChart3, FileText
} from 'lucide-react'

// ─── Mock Data ────────────────────────────────────────────────────────────────
import { ASSIGNED_EXAMS, NOTIFICATIONS, ACTIVITY, EVAL_TREND, CAL_EVENTS, SUBJECT_PROGRESS, CONFIDENCE_DIST } from '@/services/faculty/mockData'

// ─── Status pill ─────────────────────────────────────────────────────────────
function ExamStatusPill({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    'Submitted to HOD': 'bg-[#D1FAE5] text-[#065F46]',
    'In Progress': 'bg-[#EEF4FF] text-[#1B3A6B]',
    'Pending Upload': 'bg-[#FEF3C7] text-[#92400E]',
    'Scheduled': 'bg-[#F1F5F9] text-[#475569]',
  }
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cfg[status] ?? 'bg-[#F1F5F9] text-[#475569]'}`}>{status}</span>
}

// ─── Faculty Dashboard ────────────────────────────────────────────────────────
interface FacultyDashboardProps {
  user: User
  onNavigate: (s: Screen, data?: any) => void
  onLogout: () => void
}

export default function FacultyDashboard({ user, onNavigate, onLogout }: FacultyDashboardProps) {
  const { showLogout, openLogout, closeLogout } = useLogout()
  const [reportModal, setReportModal] = useState(false)

  const totalSheets = ASSIGNED_EXAMS.reduce((s, e) => s + e.total, 0)
  const completedSheets = ASSIGNED_EXAMS.reduce((s, e) => s + e.verified, 0)
  const pendingSheets = totalSheets - completedSheets
  const todayProgress = 17

  // ─── Navigation handler for OCR ─────────────────────────────────────────────
  const goToOCR = (examId?: string, action?: string, examData?: any) => {
    onNavigate('ocr-workflow', { 
      examId: examId || '',
      action: action || 'new',
      from: 'dashboard',
      ...examData
    })
  }

  return (
    <AppShell
      user={{ name: user.name, role: user.role, email: user.email }}
      onNavigate={onNavigate}
      onLogout={openLogout}
      activeSection="dashboard"
    >
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">

        {/* ── Welcome Banner ─────────────────────────────────────── */}
        <Card className="p-0 overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-[#0F2142] via-[#1B3A6B] to-[#2030A6]">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-blue-300 text-sm font-medium">Welcome back,</p>
                <h1 className="text-2xl font-bold text-white mt-0.5 tracking-tight">{user.name}</h1>
                <p className="text-blue-200 text-sm mt-1">{user.designation} · {user.department}</p>
                <div className="flex gap-2 mt-3 flex-wrap">
                  <RoleBadge role={user.role} />
                  <StatusBadge status={user.status} />
                  <span className="text-xs text-blue-300 self-center">Last login: {user.lastLogin}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-3">
                <ProgressRing value={completedSheets} max={totalSheets} size={72} color="#3B5DE8" label="Complete" />
                <div className="text-right">
                  <div className="text-white text-sm font-bold">{completedSheets}/{totalSheets} sheets</div>
                  <div className="text-blue-300 text-xs">evaluated overall</div>
                </div>
              </div>
            </div>
          </div>
          {/* Today's Progress Bar */}
          <div className="px-6 py-3 bg-[#0F2142]/80 border-t border-white/10 flex items-center gap-4 flex-wrap">
            <div className="text-xs text-blue-300 font-medium shrink-0">Today's Progress:</div>
            <div className="flex-1 min-w-40 h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#3B5DE8] rounded-full" style={{ width: `${(todayProgress / 20) * 100}%` }} />
            </div>
            <div className="text-white text-xs font-bold shrink-0">{todayProgress} sheets evaluated today</div>
            <WorkflowCard steps={[
              { label: 'Upload', status: 'done' },
              { label: 'OCR', status: 'done' },
              { label: 'Verify', status: 'active' },
              { label: 'AI Eval', status: 'pending' },
              { label: 'HOD', status: 'pending' },
            ]} />
          </div>
        </Card>

        {/* ── Returned Alert ─────────────────────────────────────── */}
        <Alert variant="warning" title="HOD Returned Evaluation"
          message="CS302 — Database Management Systems evaluation was returned for correction. Review Q7 marks for 4 students before re-submitting." />

        {/* ── Stat Cards ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Assigned Sheets" value={totalSheets} sub="4 examinations" color="#1B3A6B"
            icon={<ClipboardList size={20} />} trend={{ direction: 'neutral', text: 'this semester' }} />
          <StatCard label="Completed" value={completedSheets} sub="verified & submitted" color="#059669"
            icon={<CheckCircle size={20} />} trend={{ direction: 'up', text: '+17 today' }} />
          <StatCard label="Pending" value={pendingSheets} sub="not yet submitted" color="#D97706"
            icon={<Hourglass size={20} />} trend={{ direction: 'down', text: '3 exams' }} />
          <StatCard label="Avg Eval Time" value="4.2h" sub="per sheet" color="#3B5DE8"
            icon={<Clock size={20} />} trend={{ direction: 'up', text: 'faster than avg' }} />
          <StatCard label="Low Confidence" value={7} sub="need manual review" color="#DC2626"
            icon={<AlertTriangle size={20} />} trend={{ direction: 'neutral', text: 'CS401 sheets' }} />
          <StatCard label="Today's Progress" value={`${todayProgress}`} sub="sheets today" color="#7C3AED"
            icon={<Rocket size={20} />} trend={{ direction: 'up', text: 'on track' }} />
        </div>

        {/* ── Main Grid ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Left 2/3: Exams + Charts */}
          <div className="xl:col-span-2 space-y-6">

            {/* ── Quick Actions ─────────────────────────────────────── */}
            <Card>
              <CardHeader title="Quick Actions" subtitle="Jump directly into your evaluation workflow" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <QuickAction 
                  icon={<Upload size={20} />} 
                  label="Upload Sheets" 
                  sub="Start new upload" 
                  color="#1B3A6B" 
                  onClick={() => goToOCR(undefined, 'new')} 
                />
                <QuickAction 
                  icon={<Play size={20} />} 
                  label="Continue Evaluation" 
                  sub="CS401 — 17 remaining" 
                  color="#3B5DE8" 
                  onClick={() => goToOCR('CS401', 'continue')} 
                />
                <QuickAction 
                  icon={<Search size={20} />} 
                  label="Pending Reviews" 
                  sub="7 low-confidence" 
                  color="#D97706" 
                  onClick={() => goToOCR(undefined, 'review')} 
                />
                <QuickAction 
                  icon={<FileText size={20} />} 
                  label="Create Answer Key" 
                  sub="Define questions & rubric" 
                  color="#7C3AED" 
                  onClick={() => onNavigate('answer-key-create')} 
                />
                <QuickAction 
                  icon={<BarChart3 size={20} />} 
                  label="Generate Report" 
                  sub="Export evaluation data" 
                  color="#059669" 
                  onClick={() => setReportModal(true)} 
                />
              </div>
            </Card>

            {/* ── Assigned Examinations ─────────────────────────────── */}
            <Card padding={false}>
              <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-[#0F172A]">Assigned Examinations</h3>
                  <p className="text-xs text-[#94A3B8] mt-0.5">This semester · {ASSIGNED_EXAMS.length} examinations</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => goToOCR(undefined, 'new')}>
                  Upload Sheets
                </Button>
              </div>
              <div className="divide-y divide-[#F1F5F9]">
                {ASSIGNED_EXAMS.map(exam => {
                  const pct = exam.total > 0 ? Math.round((exam.verified / exam.total) * 100) : 0
                  return (
                    <div key={exam.id} className="p-5 hover:bg-[#F8FAFC] transition-colors">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#EEF4FF] flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-[#1B3A6B]">{exam.code.slice(0, 4)}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-[#0F172A]">{exam.name}</span>
                              <ExamStatusPill status={exam.status} />
                            </div>
                            <div className="text-xs text-[#94A3B8] mt-0.5">Sem {exam.semester} · {exam.date} · {exam.total} students</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <ProgressRing value={exam.verified} max={exam.total} size={44} color={pct === 100 ? '#059669' : '#1B3A6B'} />
                          {exam.status === 'Pending Upload' || exam.status === 'Scheduled' ? (
                            <Button 
                              variant="primary" 
                              size="sm" 
                              onClick={() => goToOCR(exam.id, 'start', { 
                                examCode: exam.code, 
                                examName: exam.name,
                                totalStudents: exam.total 
                              })}
                            >
                              Start OCR →
                            </Button>
                          ) : exam.status === 'In Progress' ? (
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              onClick={() => goToOCR(exam.id, 'continue', { 
                                examCode: exam.code, 
                                examName: exam.name,
                                totalStudents: exam.total 
                              })}
                            >
                              Continue →
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm">View</Button>
                          )}
                        </div>
                      </div>
                      {/* Progress pipeline */}
                      <div className="mt-3 grid grid-cols-4 gap-1">
                        {[
                          { label: 'Uploaded', done: exam.uploaded, total: exam.total },
                          { label: 'OCR Done', done: exam.ocrDone, total: exam.total },
                          { label: 'Evaluated', done: exam.evaluated, total: exam.total },
                          { label: 'Verified', done: exam.verified, total: exam.total },
                        ].map(p => {
                          const pp = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0
                          return (
                            <div key={p.label}>
                              <div className="text-[10px] text-[#94A3B8] mb-1 flex justify-between">
                                <span>{p.label}</span>
                                <span className="font-semibold text-[#475569]">{p.done}/{p.total}</span>
                              </div>
                              <div className="h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-[#1B3A6B] transition-all" style={{ width: `${pp}%` }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* ── Charts Row ─────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Card>
                <CardHeader title="Subject Progress" subtitle="Evaluation completion %" />
                <HBarChart data={SUBJECT_PROGRESS} maxValue={100} unit="%" />
              </Card>
              <Card>
                <CardHeader title="OCR Confidence" subtitle="All sheets combined" />
                <DonutChart
                  segments={CONFIDENCE_DIST}
                  centerLabel="Total Sheets"
                  centerValue={187}
                  size={120}
                />
              </Card>
            </div>

            {/* ── Evaluation Trend ──────────────────────────────────── */}
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-[#0F172A]">Evaluation Trend</h3>
                  <p className="text-xs text-[#94A3B8]">Cumulative sheets completed (last 10 days)</p>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkline data={EVAL_TREND} color="#1B3A6B" width={100} height={32} />
                  <div className="text-right">
                    <div className="text-lg font-bold text-[#0F172A]">{EVAL_TREND[EVAL_TREND.length - 1]}</div>
                    <div className="text-[10px] text-[#059669] font-semibold">↑ +10.8%</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right 1/3: Notifications + Activity + Calendar */}
          <div className="space-y-6">
            {/* ── Notifications ──────────────────────────────────────── */}
            <Card>
              <CardHeader title="Notifications" subtitle={`${NOTIFICATIONS.length} updates`}
                action={<Button variant="ghost" size="sm">Mark all read</Button>} />
              <NotificationList items={NOTIFICATIONS} />
            </Card>

            {/* ── Calendar ───────────────────────────────────────────── */}
            <Card>
              <CardHeader title="Calendar" subtitle="Upcoming deadlines" />
              <MiniCalendar month="January 2026" events={CAL_EVENTS} />
              <div className="mt-4 space-y-1.5">
                {CAL_EVENTS.map(ev => (
                  <div key={ev.day} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ev.color }} />
                    <span className="text-[#94A3B8] w-8">Jan {ev.day}</span>
                    <span className="text-[#475569]">{ev.label}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* ── Activity ───────────────────────────────────────────── */}
            <Card>
              <CardHeader title="Recent Activity" subtitle="Your evaluation timeline" />
              <ActivityTimeline events={ACTIVITY} maxItems={5} />
            </Card>
          </div>
        </div>
      </div>

      <LogoutModal open={showLogout} onClose={closeLogout} onConfirm={onLogout} />

      {/* ── Report Modal ─────────────────────────────────────────────── */}
      <Modal open={reportModal} onClose={() => setReportModal(false)}>
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-bold text-[#0F172A]">Generate Evaluation Report</h3>
          <p className="text-sm text-[#475569]">Select the examination and report type to export.</p>
          <div className="space-y-3">
            {ASSIGNED_EXAMS.filter(e => e.verified > 0).map(exam => (
              <div key={exam.id} className="flex items-center justify-between p-3 rounded-lg border border-[#E2E8F0] hover:border-[#1B3A6B] transition-colors">
                <div>
                  <div className="text-sm font-semibold text-[#0F172A]">{exam.code} — {exam.name}</div>
                  <div className="text-xs text-[#94A3B8]">{exam.verified} sheets evaluated</div>
                </div>
                <Button variant="secondary" size="sm">Export PDF</Button>
              </div>
            ))}
          </div>
          <Button variant="ghost" size="md" fullWidth onClick={() => setReportModal(false)}>Close</Button>
        </div>
      </Modal>
    </AppShell>
  )
}