import { useState } from 'react'
import * as XLSX from 'xlsx'
import { Card, Button, CheckIcon, DownloadIcon } from '@/components/common'
import { useOCRStore } from '@/stores/ocrStore'
import type { Screen } from '@/types'

interface StepSubmitProps {
  onSubmit: () => void
  onNavigate?: (screen: Screen) => void
}

export default function StepSubmit({ onSubmit, onNavigate }: StepSubmitProps) {
  const { results } = useOCRStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const totalStudents = results?.length || 0
  let totalMarks = 0
  let totalMaxMarks = 0
  results?.forEach((r: any) => {
    totalMarks += r.total_marks || 0
    totalMaxMarks += r.max_marks || 0
  })
  const overallPercentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0
  const averageScore = totalStudents > 0 ? totalMarks / totalStudents : 0

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSubmitted(true)
      setTimeout(() => onSubmit(), 1000)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDownloadExcel = () => {
    const date = new Date().toISOString().split('T')[0]

    // Sheet 1: Summary
    const summaryRows = (results || []).map((r: any) => ({
      'Student Name': r.student_name || 'Unknown',
      'Roll No': r.roll || 'N/A',
      'Total Marks': r.total_marks || 0,
      'Max Marks': r.max_marks || 0,
      'Percentage': r.percentage || 0,
    }))

    // Sheet 2: Question Details with feedback + student answers
    const detailRows: any[] = []
    ;(results || []).forEach((r: any) => {
      ;(r.questions || []).forEach((q: any) => {
        const verified = (r.verified || []).find((v: any) => v.question_number === q.question_number)
        const grade = (r.grades || []).find((g: any) => g.question_number === q.question_number)
        detailRows.push({
          'Student Name': r.student_name || 'Unknown',
          'Roll No': r.roll || 'N/A',
          'Question': q.question_number || '',
          'Question Text': q.question_text || '',
          'Max Marks': q.max_marks || 10,
          'Marks Awarded': verified?.verified_marks ?? grade?.marks_awarded ?? 0,
          'Confidence': (verified?.confidence ?? grade?.confidence ?? 0),
          'Feedback': grade?.feedback || verified?.reason || '',
          'Student Answer': q.student_answer || 'Not attempted',
          'Model Answer': q.model_answer || '',
        })
      })
    })

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Summary')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailRows), 'Question Details')
    XLSX.writeFile(wb, `evaluation_report_${date}.xlsx`)
  }

  if (submitted) {
    return (
      <Card className="text-center py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-[#D1FAE5] flex items-center justify-center">
            <CheckIcon size={40} className="text-[#059669]" />
          </div>
          <h2 className="text-2xl font-bold text-[#0F172A]">✅ Evaluation Submitted Successfully!</h2>
          <Button variant="primary" onClick={() => onNavigate?.('dashboard-faculty')}>
            Return to Dashboard
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#0F172A]">📋 Final Summary</h2>
      </div>

      {/* 3 summary cards only */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Students', value: totalStudents, color: '#1B3A6B' },
          { label: 'Average Score', value: averageScore.toFixed(1), color: '#059669' },
          { label: 'Overall Percentage', value: `${overallPercentage.toFixed(0)}%`, color: '#3B5DE8' },
        ].map(stat => (
          <Card key={stat.label} className="text-center py-4">
            <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-xs text-[#94A3B8] mt-1">{stat.label}</div>
          </Card>
        ))}
      </div>

      {/* Student list only */}
      <Card className="p-4">
        <h3 className="font-semibold text-[#0F172A] mb-3">Student Results</h3>
        <div className="divide-y divide-[#F1F5F9]">
          {results?.map((result: any, idx: number) => {
            const pct = result.max_marks > 0 ? (result.total_marks / result.max_marks) * 100 : 0
            return (
              <div key={idx} className="py-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-[#0F172A]">
                  {result.student_name} ({result.roll})
                </span>
                <span className="text-sm font-bold text-[#1B3A6B]">
                  {result.total_marks}/{result.max_marks} ({pct.toFixed(0)}%)
                </span>
              </div>
            )
          })}
        </div>
      </Card>

      <div className="flex gap-3 pt-2">
        <Button variant="secondary" size="lg" onClick={handleDownloadExcel}>
          <DownloadIcon size={16} /> Download Excel
        </Button>
        <div className="flex-1" />
        <Button variant="primary" size="lg" onClick={handleSubmit} loading={isSubmitting} disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit to HOD'}
        </Button>
      </div>
    </div>
  )
}