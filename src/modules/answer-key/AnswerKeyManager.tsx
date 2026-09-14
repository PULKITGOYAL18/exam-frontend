// src/modules/answer-key/AnswerKeyManager.tsx

import { useEffect, useState } from 'react'
import { useAnswerKeyStore } from '@/stores/answerKeyStore'
import StepCreateAnswerKey from './create/StepCreateAnswerKey'

interface AnswerKeyManagerProps {
  user: any
  onNavigate: (screen: any) => void
  onLogout: () => void
  initialScreen?: 'create' | 'list'
}

export default function AnswerKeyManager({
  user,
  onNavigate,
  onLogout,
  initialScreen = 'list'
}: AnswerKeyManagerProps) {
  const {
    answerKeys,
    currentAnswerKey,
    isLoading,
    error,
    fetchAll,
    fetchById,
    create,
    update,
    delete: deleteAnswerKey,
    downloadJSON,
    downloadJSONById
  } = useAnswerKeyStore()

  const [screen, setScreen] = useState<'list' | 'create' | 'view' | 'success'>(initialScreen)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedKey, setSelectedKey] = useState<any | null>(null)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    void fetchAll().catch((err: any) => {
      console.error('Failed to load answer keys:', err)
    })
  }, [fetchAll])

  const dashboardScreen = () => {
    switch (user?.role) {
      case 'HOD':
        return 'dashboard-hod'
      case 'Dean':
        return 'dashboard-dean'
      case 'Admin':
        return 'dashboard-admin'
      case 'Faculty':
      default:
        return 'dashboard-faculty'
    }
  }

  const goDashboard = () => {
    const target = dashboardScreen()

    setNotice('')
    setSelectedId(null)
    setSelectedKey(null)
    setScreen('list')

    // Keep the parent application's persisted screen in sync as well.
    // This prevents a stale answer-key-create screen from reopening after
    // refresh in apps that persist the current screen in localStorage.
    try {
      localStorage.setItem('app_current_screen', target)
    } catch {
      // Ignore storage restrictions. Parent navigation still runs below.
    }

    onNavigate(target)
  }

  const openList = async () => {
    setNotice('')
    setSelectedId(null)
    setSelectedKey(null)
    setScreen('list')
    await fetchAll()
  }

  const openCreate = () => {
    setNotice('')
    setSelectedId(null)
    setSelectedKey(null)
    setScreen('create')
  }

  const handleSaved = () => {
    // Do NOT wait for the list request before leaving the editor.
    // If the list request fails for any reason, the user must still see the
    // successful save screen and be able to return to the dashboard.
    setSelectedId(null)
    setSelectedKey(null)
    setNotice('Answer key saved successfully.')
    setScreen('success')

    void fetchAll().catch((err: any) => {
      console.error('Failed to refresh answer-key list after save:', err)
    })
  }

  const handleView = async (id: string) => {
    setNotice('')
    setSelectedId(id)
    const result = await fetchById(id)
    if (!result) {
      setNotice('Unable to load this answer key.')
      return
    }
    setSelectedKey(result)
    setScreen('view')
  }

  const handleEdit = async (id: string) => {
    setNotice('')
    setSelectedId(id)
    const result = await fetchById(id)
    if (!result) {
      setNotice('Unable to load this answer key for editing.')
      return
    }
    setSelectedKey(result)
    setScreen('create')
  }

  const handleUpdate = async (id: string, data: any) => {
    await update(id, data)
    await fetchAll()
  }

  const handleDelete = async (id: string) => {
    const key = answerKeys.find(item => String(item.id) === String(id))
    const name = key?.name || 'this answer key'

    if (!window.confirm(`Delete ${name}? This action cannot be undone.`)) {
      return
    }

    try {
      await deleteAnswerKey(id)
      await fetchAll()
      setNotice('Answer key deleted successfully.')
      setScreen('list')
    } catch (err: any) {
      setNotice(err?.response?.data?.message || err?.message || 'Failed to delete answer key.')
    }
  }

  const handleDownload = async (id: string) => {
    try {
      if (downloadJSONById) {
        await downloadJSONById(id)
        return
      }

      const result = await fetchById(id)
      if (result && downloadJSON) {
        downloadJSON(result)
      }
    } catch (err: any) {
      setNotice(err?.message || 'Failed to download answer key JSON.')
    }
  }

  const handleLogout = () => {
    onLogout()
  }

  if (screen === 'create') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <StepCreateAnswerKey
            initialAnswerKey={selectedKey || undefined}
            onUpdate={selectedKey?.id ? handleUpdate : undefined}
            onSave={handleSaved}
            onCancel={goDashboard}
          />
        </div>
      </div>
    )
  }

  if (screen === 'success') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 flex items-center justify-center">
        <div className="w-full max-w-xl bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-8 text-center">
          <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-[#DCFCE7] flex items-center justify-center text-3xl text-[#166534]">
            ✓
          </div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Answer Key Saved Successfully</h1>
          <p className="mt-2 text-[#64748B]">
            Your answer key has been saved to the database successfully.
          </p>

          <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => openList()}
              className="px-5 py-3 rounded-lg bg-[#1B3A6B] text-white font-medium hover:bg-[#0F2142] transition-colors"
            >
              View Answer Keys
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="px-5 py-3 rounded-lg border border-[#1B3A6B] text-[#1B3A6B] font-medium hover:bg-[#F8FAFC] transition-colors"
            >
              Create Another
            </button>
            <button
              type="button"
              onClick={goDashboard}
              className="px-5 py-3 rounded-lg border border-[#E2E8F0] text-[#475569] font-medium hover:bg-[#F8FAFC] transition-colors sm:col-span-2"
            >
              ← Back to Faculty Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (screen === 'view' && selectedKey) {
    const questions = Array.isArray(selectedKey.questions)
      ? selectedKey.questions
      : Array.isArray(selectedKey.sections)
        ? selectedKey.sections.flatMap((section: any) => section.questions || [])
        : []

    return (
      <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-[#0F172A]">View Answer Key</h1>
              <p className="text-sm text-[#64748B] mt-1">Review the complete saved answer key.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => handleEdit(String(selectedKey.id))} className="px-4 py-2 rounded-lg bg-[#1B3A6B] text-white text-sm font-medium hover:bg-[#0F2142]">Edit</button>
              <button type="button" onClick={() => handleDownload(String(selectedKey.id))} className="px-4 py-2 rounded-lg border border-[#E2E8F0] bg-white text-[#1B3A6B] text-sm font-medium hover:bg-[#F8FAFC]">Download JSON</button>
              <button type="button" onClick={openList} className="px-4 py-2 rounded-lg border border-[#E2E8F0] bg-white text-[#475569] text-sm font-medium hover:bg-[#F8FAFC]">← Back to List</button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Info label="Name" value={selectedKey.name} />
            <Info label="Subject" value={selectedKey.subject} />
            <Info label="Department" value={selectedKey.department} />
            <Info label="Semester" value={selectedKey.semester} />
            <Info label="Total Marks" value={selectedKey.total_marks} />
            <Info label="Total Questions" value={selectedKey.total_questions || questions.length} />
            <Info label="Examination Type" value={selectedKey.examination_type} />
            <Info label="Academic Year" value={selectedKey.academic_year} />
          </div>

          <div className="space-y-4">
            {Array.isArray(selectedKey.sections) && selectedKey.sections.length > 0 ? (
              selectedKey.sections.map((section: any, si: number) => (
                <div key={section.id || si} className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#E2E8F0]">
                    <h2 className="font-bold text-[#0F172A]">{section.name}</h2>
                    {section.instruction && <p className="text-sm text-[#64748B] mt-1">{section.instruction}</p>}
                  </div>
                  <div className="p-5 space-y-4">
                    {(section.questions || []).map((q: any, qi: number) => (
                      <QuestionView key={q.id || qi} question={q} index={qi} />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 space-y-4">
                {questions.map((q: any, qi: number) => (
                  <QuestionView key={q.id || qi} question={q} index={qi} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A]">Answer Key Management</h1>
            <p className="text-sm text-[#64748B] mt-1">
              Create, view, edit and manage your saved answer keys.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={openCreate} className="px-4 py-2 rounded-lg bg-[#1B3A6B] text-white text-sm font-medium hover:bg-[#0F2142]">+ Create Answer Key</button>
            <button type="button" onClick={goDashboard} className="px-4 py-2 rounded-lg border border-[#E2E8F0] bg-white text-[#475569] text-sm font-medium hover:bg-[#F8FAFC]">← Faculty Dashboard</button>
            <button type="button" onClick={handleLogout} className="px-4 py-2 rounded-lg border border-[#FCA5A5] bg-white text-[#B91C1C] text-sm font-medium hover:bg-[#FEF2F2]">Sign Out</button>
          </div>
        </div>

        {notice && (
          <div className="rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 text-sm text-[#1E40AF]">
            {notice}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <h2 className="font-bold text-[#0F172A]">Saved Answer Keys</h2>
            <span className="text-sm text-[#64748B]">{answerKeys.length} key{answerKeys.length === 1 ? '' : 's'}</span>
          </div>

          {isLoading ? (
            <div className="p-10 text-center text-[#64748B]">Loading answer keys...</div>
          ) : answerKeys.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-[#64748B]">No answer keys found.</p>
              <button type="button" onClick={openCreate} className="mt-4 px-5 py-2 rounded-lg bg-[#1B3A6B] text-white text-sm font-medium hover:bg-[#0F2142]">Create Your First Answer Key</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px]">
                <thead className="bg-[#F8FAFC]">
                  <tr className="text-left text-xs uppercase tracking-wide text-[#64748B]">
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Subject</th>
                    <th className="px-5 py-3">Marks</th>
                    <th className="px-5 py-3">Questions</th>
                    <th className="px-5 py-3">Created</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {answerKeys.map((key: any) => {
                    const id = String(key.id)
                    return (
                      <tr key={id} className="hover:bg-[#F8FAFC]">
                        <td className="px-5 py-4 font-medium text-[#0F172A]">{key.name || 'Untitled'}</td>
                        <td className="px-5 py-4 text-[#475569]">{key.subject || '—'}</td>
                        <td className="px-5 py-4 text-[#475569]">{key.total_marks ?? '—'}</td>
                        <td className="px-5 py-4 text-[#475569]">{key.total_questions ?? '—'}</td>
                        <td className="px-5 py-4 text-[#64748B]">{formatDate(key.created_at)}</td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => handleView(id)} className="text-sm font-medium text-[#1B3A6B] hover:underline">View</button>
                            <button type="button" onClick={() => handleEdit(id)} className="text-sm font-medium text-[#166534] hover:underline">Edit</button>
                            <button type="button" onClick={() => handleDownload(id)} className="text-sm font-medium text-[#475569] hover:underline">JSON</button>
                            <button type="button" onClick={() => handleDelete(id)} className="text-sm font-medium text-[#B91C1C] hover:underline">Delete</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">{label}</div>
      <div className="mt-1 text-sm font-medium text-[#0F172A] break-words">{value ?? '—'}</div>
    </div>
  )
}

function QuestionView({ question, index }: { question: any; index: number }) {
  return (
    <div className="rounded-lg border border-[#E2E8F0] p-4">
      <div className="flex flex-wrap justify-between gap-2">
        <h3 className="font-semibold text-[#0F172A]">
          {question.question_number || `Q${index + 1}`}. {question.question_text || 'Question'}
        </h3>
        <span className="text-sm font-semibold text-[#1B3A6B]">{question.max_marks ?? 0} marks</span>
      </div>
      {question.model_answer && (
        <div className="mt-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Model Answer</div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-[#334155]">{question.model_answer}</p>
        </div>
      )}
      {Array.isArray(question.key_points) && question.key_points.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Key Points</div>
          <ul className="mt-1 list-disc pl-5 text-sm text-[#334155]">
            {question.key_points.map((item: string, i: number) => <li key={i}>{item}</li>)}
          </ul>
        </div>
      )}
      {Array.isArray(question.keywords) && question.keywords.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Keywords</div>
          <p className="mt-1 text-sm text-[#334155]">{question.keywords.join(', ')}</p>
        </div>
      )}
      {Array.isArray(question.rubric) && question.rubric.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Rubric</div>
          <div className="mt-1 space-y-1">
            {question.rubric.filter((r: any) => r?.name).map((r: any, i: number) => (
              <div key={i} className="flex justify-between gap-3 text-sm text-[#334155]">
                <span>{r.name}</span><span className="font-medium">{r.marks} marks</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function formatDate(value: any) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString()
}

