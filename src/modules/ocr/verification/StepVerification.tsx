import { useState, useEffect } from 'react'
import { Card, Button, Alert, AlertTriangleIcon, CheckIcon, XIcon, Spinner } from '@/components/common'
import { ConfidenceBadge, AnswerSheetPreview } from '../shared'
import type { AnswerSheetOCR, OCRConfidence } from '@/types'
import { useOCRStore } from '@/stores/ocrStore'

export default function StepVerification({ onNext }: { onNext: () => void }) {
  const { sheets, updateVerificationStatus, updateSheetData } = useOCRStore()
  const [editFields, setEditFields] = useState<Partial<AnswerSheetOCR>>({})
  const [activeSheet, setActiveSheet] = useState<AnswerSheetOCR | null>(null)
  const [highlightField, setHighlightField] = useState<string | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Set active sheet when sheets load or change
  useEffect(() => {
    if (sheets.length > 0 && !activeSheet) {
      const pending = sheets.find(s => s.verificationStatus === 'pending')
      setActiveSheet(pending || sheets[0])
    }
  }, [sheets, activeSheet])

  // Early return if no sheets
  if (!sheets || sheets.length === 0) {
    return (
      <Card className="text-center py-12">
        <p className="text-[#94A3B8]">No sheets to verify</p>
      </Card>
    )
  }

  // Early return if no active sheet
  if (!activeSheet) {
    return (
      <Card className="text-center py-12">
        <p className="text-[#94A3B8]">No sheets to verify</p>
      </Card>
    )
  }

  const merged = { ...activeSheet, ...editFields }

  // Field definitions with dynamic values from OCR data
  const fieldDefs = [
    { 
      key: 'program', 
      label: 'Program', 
      placeholder: 'e.g. B.Tech',
      value: merged.program || ''
    },
    { 
      key: 'branch', 
      label: 'Branch / Specialization', 
      placeholder: 'e.g. Computer Science & Engineering',
      value: merged.branch || (merged as any).specialization || ''
    },
    { 
      key: 'studentName', 
      label: 'Student Name', 
      placeholder: 'Full name as on records',
      value: merged.studentName || (merged as any).name || ''
    },
    { 
      key: 'fatherName', 
      label: "Father's Name", 
      placeholder: "Father's full name",
      value: merged.fatherName || (merged as any).fathersName || ''
    },
    { 
      key: 'rollNumber', 
      label: 'University Roll Number', 
      placeholder: 'e.g. 2021UCS042',
      value: merged.rollNumber || (merged as any).roll || (merged as any).rollNo || ''
    },
    { 
      key: 'cuid', 
      label: 'CUID', 
      placeholder: 'e.g. CU21001234',
      value: merged.cuid || (merged as any).cuId || ''
    },
    { 
      key: 'courseName', 
      label: 'Course Name', 
      placeholder: 'Full course name',
      value: merged.courseName || (merged as any).subject || ''
    },
    { 
      key: 'courseCode', 
      label: 'Course Code', 
      placeholder: 'e.g. CS401',
      value: merged.courseCode || (merged as any).subjectCode || ''
    },
  ]

  const handleApprove = async () => {
    setIsSubmitting(true)
    setError(null)
    
    try {
      updateVerificationStatus(activeSheet.id, 'approved')
      
      if (Object.keys(editFields).length > 0) {
        updateSheetData(activeSheet.id, editFields)
      }
      
      // Find next pending sheet
      const updatedSheets = sheets.map(s => 
        s.id === activeSheet.id ? { ...s, ...editFields, verificationStatus: 'approved' as const } : s
      )
      const next = updatedSheets.find(s => s.id !== activeSheet.id && s.verificationStatus === 'pending')
      if (next) { 
        setActiveSheet(next)
        setEditFields({})
        setHighlightField(undefined)
      } else {
        onNext()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve sheet')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async () => {
    setIsSubmitting(true)
    setError(null)
    
    try {
      updateVerificationStatus(activeSheet.id, 'rejected')
      
      const updatedSheets = sheets.map(s => 
        s.id === activeSheet.id ? { ...s, verificationStatus: 'rejected' as const } : s
      )
      const next = updatedSheets.find(s => s.id !== activeSheet.id && s.verificationStatus === 'pending')
      if (next) { 
        setActiveSheet(next)
        setEditFields({})
        setHighlightField(undefined)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject sheet')
    } finally {
      setIsSubmitting(false)
    }
  }

  const pendingCount = sheets.filter(s => s.verificationStatus === 'pending').length
  const approvedCount = sheets.filter(s => s.verificationStatus === 'approved').length
  const rejectedCount = sheets.filter(s => s.verificationStatus === 'rejected').length

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="error" title="Error" message={error} />
      )}

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending', value: pendingCount, color: '#D97706', bg: '#FEF3C7' },
          { label: 'Approved', value: approvedCount, color: '#059669', bg: '#D1FAE5' },
          { label: 'Rejected', value: rejectedCount, color: '#DC2626', bg: '#FEE2E2' },
        ].map(stat => (
          <Card key={stat.label} className="text-center py-2">
            <div className="text-xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-xs text-[#94A3B8]">{stat.label}</div>
          </Card>
        ))}
      </div>

      <Card className="py-3">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mr-1">Sheets:</span>
          {sheets.map(s => (
            <button
              key={s.id}
              onClick={() => { setActiveSheet(s); setEditFields({}); setHighlightField(undefined); setError(null) }}
              disabled={isSubmitting}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                s.id === activeSheet.id ? 'bg-[#1B3A6B] border-[#1B3A6B] text-white' :
                s.verificationStatus === 'approved' ? 'bg-[#D1FAE5] border-[#A7F3D0] text-[#065F46]' :
                s.verificationStatus === 'rejected' ? 'bg-[#FEE2E2] border-[#FECACA] text-[#991B1B]' :
                'bg-white border-[#E2E8F0] text-[#475569] hover:border-[#1B3A6B]'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {s.rollNumber || s.studentName || s.id}
              {s.verificationStatus === 'approved' && ' ✓'}
              {s.verificationStatus === 'rejected' && ' ✗'}
            </button>
          ))}
          {pendingCount === 0 && (
            <span className="ml-2 text-xs font-semibold text-[#059669]">All sheets reviewed!</span>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#0F172A]">Answer Sheet Preview</h3>
            <ConfidenceBadge confidence={activeSheet.overallConfidence || 'High'} />
          </div>
          <AnswerSheetPreview sheet={merged as AnswerSheetOCR} highlight={highlightField} />
          <Alert variant="info"
            message={`OCR overall confidence: ${activeSheet.overallConfidence || 'High'}. Fields highlighted in red/amber need review.`} />
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-[#0F172A]">Extracted Data — Review & Correct</h3>
          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {fieldDefs.map(f => {
              const conf = (activeSheet.fieldConfidences?.[f.key] as OCRConfidence) || 'High'
              const val = f.value
              const isEdited = editFields[f.key as keyof AnswerSheetOCR] !== undefined
              
              return (
                <div key={f.key}
                  className={`relative rounded-lg border p-3 transition-all ${
                    conf === 'Low' ? 'border-[#FECACA] bg-[#FEF2F2]' :
                    conf === 'Medium' ? 'border-[#FDE68A] bg-[#FFFBEB]' :
                    'border-[#E2E8F0] bg-white'
                  } ${isSubmitting ? 'opacity-60 pointer-events-none' : ''}`}
                  onMouseEnter={() => setHighlightField(f.key)}
                  onMouseLeave={() => setHighlightField(undefined)}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-[#475569] uppercase tracking-wide">{f.label}</label>
                    <div className="flex items-center gap-1.5">
                      {isEdited && <span className="text-[10px] font-semibold text-[#3B5DE8] uppercase">Edited</span>}
                      <ConfidenceBadge confidence={conf} />
                    </div>
                  </div>
                  <input
                    value={val}
                    onChange={e => setEditFields(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    disabled={isSubmitting}
                    className="w-full text-sm text-[#0F172A] bg-transparent outline-none border-b border-dashed border-[#CBD5E1] pb-0.5 focus:border-[#3B5DE8] disabled:opacity-50"
                  />
                  {conf === 'Low' && (
                    <p className="text-[10px] text-[#DC2626] mt-1 flex items-center gap-1">
                      <AlertTriangleIcon size={10} /> Low confidence — please verify manually
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          {/* ✅ FIXED: removed leftIcon prop, rendered icons inline */}
          <div className="flex gap-3 pt-2">
            <Button 
              variant="danger" 
              size="md" 
              fullWidth 
              onClick={handleReject} 
              disabled={isSubmitting}
            >
              {isSubmitting ? <Spinner size="sm" color="white" /> : <XIcon size={14} />}
              {' '}{isSubmitting ? 'Processing...' : 'Reject Sheet'}
            </Button>
            <Button 
              variant="success" 
              size="md" 
              fullWidth 
              onClick={handleApprove} 
              disabled={isSubmitting}
            >
              {isSubmitting ? <Spinner size="sm" color="white" /> : <CheckIcon size={14} />}
              {' '}{isSubmitting ? 'Processing...' : 'Approve & Continue'}
            </Button>
          </div>
          
          {pendingCount === 0 && (
            <Button 
              variant="primary" 
              size="md" 
              fullWidth 
              onClick={onNext}
              disabled={isSubmitting}
            >
              All Verified — Proceed to Student Mapping →
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}