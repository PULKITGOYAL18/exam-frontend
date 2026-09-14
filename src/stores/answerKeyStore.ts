// src/stores/answerKeyStore.ts

import { create } from 'zustand'

import type {
  AnswerKey,
  AnswerKeyListItem,
  AnswerKeyCreateData,
} from '@/types'

import { answerKeyService } from '@/services/api/answerKeyService'

// Extended type to support sections structure
interface AnswerKeyWithSections extends AnswerKey {
  sections?: Array<{
    id: string
    name: string
    description: string
    instruction: string
    questions: Array<{
      id: string
      question_number: string
      question_text: string
      model_answer: string
      max_marks: number
      question_type: string
      diagram_required: boolean
      diagram_weightage: number
      key_points: string[]
      keywords: string[]
      rubric: any[]
      sub_parts?: Array<{
        id: string
        question_text: string
        model_answer: string
        max_marks: number
        question_type: string
        diagram_required: boolean
        diagram_weightage: number
        key_points: string[]
        keywords: string[]
        rubric: any[]
      }>
    }>
  }>
}

interface AnswerKeyStore {

  // ─── State ────────────────────────────────────────────────

  answerKeys: AnswerKeyListItem[]
  currentAnswerKey: AnswerKeyWithSections | null
  isLoading: boolean

  error: string | null

  selectedKeyId: string | null


  // ─── Authenticated operations ─────────────────────────────

  fetchAll: () => Promise<void>
  fetchById: (id: string) => Promise<AnswerKeyWithSections | null>
  create: (data: any) => Promise<AnswerKey>
  update: (id: string, data: any) => Promise<AnswerKey>
  delete: (id: string) => Promise<void>
  selectForEvaluation: (id: string) => void
  reset: () => void

  getAnswerKeyContent: (
    id: string
  ) => Promise<string>
}

export const useAnswerKeyStore = create<AnswerKeyStore>((set, get) => ({
  answerKeys: [],
  currentAnswerKey: null,
  isLoading: false,
  error: null,
  selectedKeyId: null,

  fetchAll: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await answerKeyService.list()
      set({ answerKeys: data, isLoading: false })
    } catch (error: any) {
      console.error('❌ Fetch all error:', error)
      set({ 
        error: error.response?.data?.message || error.message || 'Failed to fetch answer keys', 
        isLoading: false 
      })
    }
  },

  fetchById: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const data = await answerKeyService.getById(id)
      // Transform legacy format if needed
      const transformedData = transformAnswerKeyData(data)
      set({ currentAnswerKey: transformedData, isLoading: false })
      return transformedData
    } catch (error: any) {
      console.error('❌ Fetch by ID error:', error)
      set({ 
        error: error.response?.data?.message || error.message || `Failed to fetch answer key ${id}`, 
        isLoading: false 
      })
      return null
    }
  },

  getAnswerKeyContent: async (id: string): Promise<string> => {
    try {
      const state = get()
      let key = state.currentAnswerKey
      
      if (!key || key.id !== id) {
        key = await state.fetchById(id)
      }
      
      if (!key) {
        throw new Error('Answer key not found')
      }
    },

      // Build structured JSON with sections support
      const jsonData: any = {
        name: key.name,
        subject: key.subject,
        department: key.department || '',
        semester: key.semester || 1,
        total_marks: key.total_marks || 0,
      }

      // Check if we have sections (new format) or flat questions (legacy format)
      if (key.sections && key.sections.length > 0) {
        // New format with sections
        jsonData.sections = key.sections.map((section) => ({
          id: section.id,
          name: section.name,
          description: section.description || '',
          instruction: section.instruction || '',
          questions: section.questions.map((q) => ({
            id: q.id,
            question_number: q.question_number || '',
            question_text: q.question_text || '',
            model_answer: q.model_answer || '',
            max_marks: q.max_marks || 0,
            question_type: q.question_type || 'theory',
            diagram_required: q.diagram_required || false,
            diagram_weightage: q.diagram_weightage || 0,
            key_points: q.key_points || [],
            keywords: q.keywords || [],
            rubric: q.rubric || [],
            sub_parts: q.sub_parts?.map((sp) => ({
              id: sp.id,
              question_text: sp.question_text || '',
              model_answer: sp.model_answer || '',
              max_marks: sp.max_marks || 0,
              question_type: sp.question_type || 'theory',
              diagram_required: sp.diagram_required || false,
              diagram_weightage: sp.diagram_weightage || 0,
              key_points: sp.key_points || [],
              keywords: sp.keywords || [],
              rubric: sp.rubric || [],
            })) || []
          }))
        }))
        
        // Calculate total marks from sections
        jsonData.total_marks = jsonData.sections.reduce((total: number, section: any) => {
          return total + section.questions.reduce((sum: number, q: any) => {
            if (q.sub_parts && q.sub_parts.length > 0) {
              return sum + q.sub_parts.reduce((s: number, sp: any) => s + sp.max_marks, 0)
            }
            return sum + q.max_marks
          }, 0)
        }, 0)
      } else if (key.questions && key.questions.length > 0) {
        // Legacy format - convert to sections for consistency
        jsonData.sections = [{
          id: 'section-1',
          name: 'Questions',
          description: '',
          instruction: 'Answer all questions',
          questions: key.questions.map((q: any) => ({
            id: q.id,
            question_number: q.question_number || `Q${q.id}`,
            question_text: q.question_text || q.text || '',
            model_answer: q.model_answer || q.answer || '',
            max_marks: q.max_marks || 10,
            question_type: q.question_type || 'theory',
            diagram_required: q.diagram_required || q.diagram_expected || false,
            diagram_weightage: q.diagram_weightage || 0,
            key_points: q.key_points || [],
            keywords: q.keywords || [],
            rubric: q.rubric || [],
            sub_parts: q.sub_parts || []
          }))
        }]
        jsonData.total_marks = key.questions.reduce((sum: number, q: any) => sum + (q.max_marks || 10), 0)
      } else {
        throw new Error('Answer key has no questions or sections')
      }
      
      // Return as JSON string
      const jsonString = JSON.stringify(jsonData)
      
      console.log(`📤 Sending answer key as JSON with sections`)
      console.log(`📤 Sections: ${jsonData.sections?.length || 0}`)
      console.log(`📤 JSON Length: ${jsonString.length} chars`)
      
      // Save debug info to localStorage
      try {
        const debugData = {
          timestamp: new Date().toISOString(),
          format: 'json_with_sections',
          sections: jsonData.sections?.map((s: any) => ({
            name: s.name,
            questions: s.questions.length,
            total_marks: s.questions.reduce((sum: number, q: any) => {
              if (q.sub_parts?.length > 0) {
                return sum + q.sub_parts.reduce((s: number, sp: any) => s + sp.max_marks, 0)
              }
              return sum + q.max_marks
            }, 0)
          })) || []
        }
        localStorage.setItem('last_answer_key_json_debug', JSON.stringify(debugData, null, 2))
        console.log('📝 Debug info saved to localStorage')
      } catch (e) {
        // Ignore localStorage errors
      }
      
      return jsonString
      
    } catch (error) {
      console.error('❌ Failed to get answer key content:', error)
      throw error
    }
  },

  create: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const result = await answerKeyService.create(data)
      set((state) => ({
        answerKeys: [...state.answerKeys, result],
        isLoading: false
      }))
      return result
    } catch (error: any) {
      console.error('❌ Create error:', error)
      set({ 
        error: error.response?.data?.message || error.message || 'Failed to create answer key', 
        isLoading: false 
      })
      throw error
    }
  },

  update: async (id, data) => {
    set({ isLoading: true, error: null })
    try {
      const result = await answerKeyService.update(id, data)
      set((state) => ({
        answerKeys: state.answerKeys.map((k) => (k.id === id ? result : k)),
        currentAnswerKey: result,
        isLoading: false
      }))
      return result
    } catch (error: any) {
      console.error('❌ Update error:', error)
      set({ 
        error: error.response?.data?.message || error.message || 'Failed to update answer key', 
        isLoading: false 
      })
      throw error
    }
  },

  delete: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await answerKeyService.delete(id)
      set((state) => ({
        answerKeys: state.answerKeys.filter((k) => k.id !== id),
        isLoading: false
      }))
    } catch (error: any) {
      console.error('❌ Delete error:', error)
      set({ 
        error: error.response?.data?.message || error.message || 'Failed to delete answer key', 
        isLoading: false 
      })
      throw error
    }
  },

  selectForEvaluation: (id: string) => {
    set({ selectedKeyId: id })
  },

  reset: () => {
    set({
      answerKeys: [],
      currentAnswerKey: null,
      isLoading: false,
      error: null,
      selectedKeyId: null,
    })
  },
}))

// Helper function to transform legacy data to new format
function transformAnswerKeyData(data: any): AnswerKeyWithSections {
  // If data already has sections, return as is
  if (data.sections && data.sections.length > 0) {
    return data as AnswerKeyWithSections
  }

  // If data has questions but no sections, wrap in a section
  if (data.questions && data.questions.length > 0) {
    return {
      ...data,
      sections: [{
        id: 'section-1',
        name: 'Questions',
        description: '',
        instruction: 'Answer all questions',
        questions: data.questions.map((q: any) => ({
          id: q.id || `q${Date.now()}-${Math.random()}`,
          question_number: q.question_number || `Q${q.id || 1}`,
          question_text: q.question_text || q.text || '',
          model_answer: q.model_answer || q.answer || '',
          max_marks: q.max_marks || 10,
          question_type: q.question_type || 'theory',
          diagram_required: q.diagram_required || q.diagram_expected || false,
          diagram_weightage: q.diagram_weightage || 0,
          key_points: q.key_points || [],
          keywords: q.keywords || [],
          rubric: q.rubric || [],
          sub_parts: q.sub_parts || []
        }))
      }]
    }
  }

  // Return as is if no questions or sections
  return data as AnswerKeyWithSections
}
