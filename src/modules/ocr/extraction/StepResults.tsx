import { Card, Button, ChevronRightIcon, Alert } from '@/components/common'
import { useOCRStore } from '@/stores/ocrStore'

export default function StepResults({ onNext }: { onNext: () => void }) {
  const { sheets, summary } = useOCRStore()

  if (!sheets || sheets.length === 0) {
    return (
      <Card className="text-center py-12">
        <p className="text-[#94A3B8]">No results yet. Process some sheets first.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Students', value: sheets.length },
          { label: 'Average Score', value: `${summary?.average_percentage || 0}%` },
          { label: 'Passed', value: sheets.filter(s => (s.percentage || 0) >= 40).length },
        ].map(stat => (
          <Card key={stat.label} className="text-center py-4">
            <div className="text-2xl font-bold text-[#1B3A6B]">{stat.value}</div>
            <div className="text-xs text-[#94A3B8]">{stat.label}</div>
          </Card>
        ))}
      </div>

      {summary && (
        <Alert
          variant="info"
          message={`${summary.successful} of ${summary.total_students} processed. Average score: ${summary.average_percentage}%`}
        />
      )}

      {/* Student cards */}
      <div className="space-y-3">
        {sheets.map((sheet, idx) => (
          <Card key={sheet.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-[#0F172A]">
                  {sheet.studentName} ({sheet.rollNumber})
                </h3>
                <p className="text-sm text-[#94A3B8]">
                  Score: {sheet.totalMarks || 0}/{sheet.maxMarks || 0} ({sheet.percentage || 0}%)
                </p>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-[#1B3A6B]">
                  {sheet.totalMarks?.toFixed(1) || 0}
                </span>
                <span className="text-sm text-[#94A3B8]">/{sheet.maxMarks || 0}</span>
              </div>
            </div>

            {/* Questions — ✅ FIXED: use marksAwarded from questions array */}
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(sheet.questions || []).map((q: any, i: number) => {
                // ✅ Get marks directly from the question object (not from verified lookup)
                const marks = q.marksAwarded ?? q.aiMarks ?? 0
                const maxMarks = q.maxMarks || 10
                const percentage = maxMarks > 0 ? (marks / maxMarks) * 100 : 0

                return (
                  <div key={i} className="p-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-[#475569]">{q.number || q.questionNo || `Q${i + 1}`}</span>
                      <span className="font-bold text-[#0F172A]">{marks}/{maxMarks}</span>
                    </div>
                    <div className="w-full h-1 bg-[#E2E8F0] rounded-full mt-1">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${percentage}%`,
                          background: percentage >= 70 ? '#059669' :
                                     percentage >= 40 ? '#D97706' : '#DC2626'
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        {/* ✅ FIXED: removed rightIcon prop, rendered icon inline */}
        <Button variant="primary" onClick={onNext}>
          Verify Students <ChevronRightIcon size={16} />
        </Button>
      </div>
    </div>
  )
}