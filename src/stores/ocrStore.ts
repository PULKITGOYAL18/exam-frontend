// src/stores/ocrStore.ts

import { create } from 'zustand'
import { StudentResult, ProcessBatchResponse } from '@/services/api/examService'
import { AnswerSheetOCR, QuestionMark } from '@/types'

interface OCRStore {
  results: StudentResult[]
  summary: ProcessBatchResponse['summary'] | null
  sheets: AnswerSheetOCR[]
  questions: QuestionMark[]
  jobId: string | null
  processingStatus: {
    status: 'pending' | 'processing' | 'completed' | 'failed'
    progress: number
    message: string
  } | null
  isLoading: boolean
  error: string | null
  
  setResults: (results: StudentResult[]) => void
  setSummary: (summary: ProcessBatchResponse['summary']) => void
  setSheets: (sheets: AnswerSheetOCR[]) => void
  setQuestions: (questions: QuestionMark[]) => void
  setJobId: (jobId: string) => void
  setProcessingStatus: (status: any) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  updateVerificationStatus: (sheetId: string, status: 'approved' | 'rejected') => void
  updateSheetData: (sheetId: string, data: Partial<AnswerSheetOCR>) => void
  updateMappingStatus: (sheetId: string, status: 'Mapped' | 'Needs Review' | 'Not Found') => void
  
  reset: () => void
}

export const useOCRStore = create<OCRStore>((set) => ({
  results: [],
  summary: null,
  sheets: [],
  questions: [],
  jobId: null,
  processingStatus: null,
  isLoading: false,
  error: null,

  setResults: (results) => {
    // ✅ Filter out failed results
    const validResults = results.filter(r => !r.error)
    
    // ✅ Transform API results to sheets - NO HARDCODING
    const sheets: AnswerSheetOCR[] = validResults.map((result) => {
      const verified = result.verified || []
      const avgConfidence = verified.length > 0
        ? verified.reduce((acc, v) => acc + (v.confidence || 0), 0) / verified.length
        : 0.5

      const overallConfidence: 'High' | 'Medium' | 'Low' =
        avgConfidence >= 0.8 ? 'High' :
        avgConfidence >= 0.5 ? 'Medium' : 'Low'

      // Build field confidences
      const fieldConfidences: Record<string, 'High' | 'Medium' | 'Low'> = {}
      verified.forEach((v) => {
        const conf = v.confidence || 0
        fieldConfidences[v.question_number] =
          conf >= 0.8 ? 'High' :
          conf >= 0.5 ? 'Medium' : 'Low'
      })

      // ✅ Extract from API
      const studentName = result.student_name || 'Unknown Student'
      const rollNumber = result.roll || 'N/A'

      // Try to extract from filename
      let extractedName = studentName
      let extractedRoll = rollNumber
      if (result.filename) {
        const filenameMatch = result.filename.match(/^(\d+)[_\s-]+(.+)\.pdf$/i)
        if (filenameMatch) {
          if (extractedRoll === 'N/A') extractedRoll = filenameMatch[1]
          if (extractedName === 'Unknown Student') {
            extractedName = filenameMatch[2].replace(/[_\s-]+/g, ' ').trim()
          }
        }
      }

      // ✅ Extract course info if available
      let courseName = ''
      let courseCode = ''
      if (result.questions && result.questions.length > 0) {
        const firstQ = result.questions[0]
        if (firstQ) {
          const codeMatch = firstQ.question_text?.match(/([A-Z]{2,4}\s*\d{3,4})/i)
          if (codeMatch) courseCode = codeMatch[1].toUpperCase()
        }
      }

      // ✅ Build questions
      const questionsList = (result.questions || []).map((q, index) => {
        const v = verified.find(v => v.question_number === q.question_number)
        return {
          number: q.question_number || `Q${index + 1}`,
          text: q.question_text || `Question ${index + 1}`,
          marksAwarded: v?.verified_marks || 0,
          maxMarks: q.max_marks || 10,
          confidence: v?.confidence || 0,
          feedback: v?.reason || '',
          isAttempted: q.is_attempted || false,
          diagramExpected: q.diagram_expected || false,
          diagramDescription: q.diagram_description || '',
          modelAnswer: q.model_answer || '',
          studentAnswer: q.student_answer || '',
          questionType: q.question_type || 'theory',
        }
      })

      // ✅ Return ONLY API data - optional fields left empty
      return {
        id: `sheet_${extractedRoll || extractedName || Date.now()}`,
        filename: result.filename || 'unknown.pdf',
        
        // ✅ Required fields - from API
        studentName: extractedName,
        rollNumber: extractedRoll,
        overallConfidence,
        fieldConfidences: {
          ...fieldConfidences,
          studentName: studentName ? 'High' : 'Low',
          rollNumber: rollNumber ? 'High' : 'Low',
        },
        verificationStatus: 'pending' as const,
        mappingStatus: 'Mapped' as const,
        mappedStudentId: extractedRoll || '',
        
        // ✅ Grading results
        totalMarks: result.total_marks || 0,
        maxMarks: result.max_marks || 0,
        percentage: result.percentage || 0,
        questions: questionsList,
        
        // ⚠️ Optional fields - not available from API, left empty
        program: '',
        branch: '',
        fatherName: '',
        cuid: '',
        courseName: courseName || '',
        courseCode: courseCode || '',
      }
    })

    // ✅ Transform questions
    const firstResult = validResults[0]
    let transformedQuestions: QuestionMark[] = []
    
    if (firstResult) {
      transformedQuestions = (firstResult.questions || []).map((q, index) => {
        const v = (firstResult.verified || []).find(
          (v) => v.question_number === q.question_number
        )
        const qNumber = parseInt(q.question_number?.replace(/\D/g, '') || String(index + 1))
        const confidenceLevel: 'High' | 'Medium' | 'Low' = 
          (v?.confidence || 0) >= 0.8 ? 'High' :
          (v?.confidence || 0) >= 0.5 ? 'Medium' : 'Low'
        
        return {
          id: `q_${qNumber}`,
          questionNo: qNumber,
          questionText: q.question_text || `Question ${qNumber}`,
          maxMarks: q.max_marks || 10,
          aiMarks: v?.verified_marks || 0,
          aiComment: v?.reason || 'AI evaluation completed',
          facultyMarks: null,
          confidence: confidenceLevel,
          isAttempted: q.is_attempted || false,
          diagramExpected: q.diagram_expected || false,
          diagramDescription: q.diagram_description || '',
          modelAnswer: q.model_answer || '',
          studentAnswer: q.student_answer || '',
          questionType: (q.question_type as 'theory' | 'numerical' | 'diagram' | 'mixed') || 'theory',
        }
      })
    }

    set({ 
      results: validResults, 
      sheets, 
      questions: transformedQuestions,
      error: null 
    })
  },
  
  setSummary: (summary) => set({ summary }),
  setSheets: (sheets) => set({ sheets }),
  setQuestions: (questions) => set({ questions }),
  setJobId: (jobId) => set({ jobId }),
  setProcessingStatus: (status) => set({ processingStatus: status }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  updateVerificationStatus: (sheetId, status) => {
    set((state) => ({
      sheets: state.sheets.map((s) =>
        s.id === sheetId ? { ...s, verificationStatus: status } : s
      ),
    }))
  },

  updateSheetData: (sheetId, data) => {
    set((state) => ({
      sheets: state.sheets.map((s) =>
        s.id === sheetId ? { ...s, ...data } : s
      ),
    }))
  },

  updateMappingStatus: (sheetId, status) => {
    set((state) => ({
      sheets: state.sheets.map((s) =>
        s.id === sheetId ? { ...s, mappingStatus: status } : s
      ),
    }))
  },

  reset: () =>
    set({
      results: [],
      summary: null,
      sheets: [],
      questions: [],
      jobId: null,
      processingStatus: null,
      isLoading: false,
      error: null,
    }),
}))