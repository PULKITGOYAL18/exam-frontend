import { useState } from 'react'
import { Card, Button, CheckIcon } from '@/components/common'
import { useOCRStore } from '@/stores/ocrStore'

export default function StepAIEvaluation({ onNext }: { onNext: () => void }) {
  const { results } = useOCRStore()
  const [overrides, setOverrides] = useState<Record<string, number>>({})
  const [editValue, setEditValue] = useState('')
  const [editingKey, setEditingKey] = useState<string | null>(null)

  if (!results || results.length === 0) {
    return (
      <Card className="text-center py-12">
        <p className="text-[#94A3B8]">No results available</p>
      </Card>
    )
  }

  const getQData = (result: any, q: any) => {
    const verified = (result.verified || []).find((v: any) => v.question_number === q.question_number)
    const grade = (result.grades || []).find((g: any) => g.question_number === q.question_number)
    const aiMarks = verified?.verified_marks ?? grade?.marks_awarded ?? 0
    const confidence = verified?.confidence ?? grade?.confidence ?? 0
    const key = `${result.roll || result.student_name}|${q.question_number}`
    return {
      aiMarks,
      confidence,
      key,
      maxMarks: q.max_marks || 10,
      studentAnswer: q.student_answer || 'Not attempted',
      isLow: confidence < 0.7,
    }
  }

  const effectiveMark = (d: any) => overrides[d.key] ?? d.aiMarks

  const studentTotal = (result: any) =>
    (result.questions || []).reduce((sum: number, q: any) => sum + effectiveMark(getQData(result, q)), 0)

  const studentMax = (result: any) =>
    (result.questions || []).reduce((s: number, q: any) => s + (q.max_marks || 10), 0)

  const saveOverride = (key: string, maxMarks: number) => {
    const val = parseFloat(editValue)
    if (isNaN(val) || val < 0 || val > maxMarks) return
    setOverrides(prev => ({ ...prev, [key]: val }))
    setEditingKey(null)
  }

  const confBadge = (c: number) => {
    const level = c >= 0.8 ? 'High' : c >= 0.7 ? 'Medium' : 'Low'
    const color = level === 'High' ? '#059669' : level === 'Medium' ? '#D97706' : '#DC2626'
    const bg = level === 'High' ? '#D1FAE5' : level === 'Medium' ? '#FEF3C7' : '#FEE2E2'
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color, background: bg }}>
        {level} ({c.toFixed(2)})
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#0F172A]">🤖 AI Evaluation — All Students</h2>
        <p className="text-sm text-[#475569] mt-0.5">
          Low-confidence answers are flagged for manual grading with the student's answer shown.
        </p>
      </div>

      {results.map((result: any, sIdx: number) => {
        const total = studentTotal(result)
        const maxTotal = studentMax(result)
        return (
          <Card key={sIdx} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[#0F172A]">
                {result.student_name} ({result.roll})
              </h3>
              <span className="text-lg font-bold text-[#1B3A6B]">
                {total.toFixed(1)}/{maxTotal}
              </span>
            </div>

            <div className="space-y-2">
              {(result.questions || []).map((q: any, qIdx: number) => {
                const d = getQData(result, q)
                const isEditing = editingKey === d.key
                return (
                  <div key={qIdx} className={`rounded-lg border p-3 ${d.isLow ? 'border-[#FECACA] bg-[#FEF2F2]' : 'border-[#E2E8F0] bg-white'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-xs font-bold text-[#1B3A6B] bg-[#EEF4FF] px-2 py-0.5 rounded-md shrink-0">
                          {q.question_number}
                        </span>
                        {confBadge(d.confidence)}
                        {d.isLow && (
                          <span className="text-[10px] font-semibold text-[#DC2626]">⚠ Manual grading needed</span>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              max={d.maxMarks}
                              step={0.5}
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              className="w-16 h-7 text-center text-sm border border-[#3B5DE8] rounded-md outline-none"
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === 'Enter') saveOverride(d.key, d.maxMarks)
                                if (e.key === 'Escape') setEditingKey(null)
                              }}
                            />
                            <button onClick={() => saveOverride(d.key, d.maxMarks)} className="text-[#059669]">
                              <CheckIcon size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[#0F172A]">
                              {effectiveMark(d)}/{d.maxMarks}
                            </span>
                            {d.isLow && (
                              <button
                                onClick={() => { setEditingKey(d.key); setEditValue(String(effectiveMark(d))) }}
                                className="text-xs text-[#3B5DE8] font-semibold underline"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {d.isLow && (
                      <div className="mt-2 p-2 bg-white rounded border border-[#FECACA]">
                        <p className="text-[10px] font-semibold text-[#94A3B8] uppercase mb-1">Student Answer</p>
                        <p className="text-xs text-[#475569] max-h-24 overflow-y-auto whitespace-pre-wrap">
                          {d.studentAnswer}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        )
      })}

      <div className="flex justify-end">
        <Button variant="primary" size="lg" onClick={onNext}>
          Proceed to Submission
        </Button>
      </div>
    </div>
  )
}