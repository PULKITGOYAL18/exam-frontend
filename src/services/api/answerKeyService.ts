// src/services/api/answerKeyService.ts

import axios from 'axios'
import { AnswerKey, AnswerKeyListItem } from '@/types'

const API_URL = 'http://127.0.0.1:5000/api'

const getAuthHeader = () => {
  const token = localStorage.getItem('exam_evaluate_token')
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }
}

export const answerKeyService = {
  create: async (data: any): Promise<AnswerKey> => {
    try {
      // Transform data if needed for backend compatibility
      const payload = preparePayload(data)
      
      console.log('🚀 Service sending payload:', JSON.stringify(payload, null, 2)) // Debug log
      
      const response = await axios.post(
        `${API_URL}/answer-key/create`,
        payload,
        getAuthHeader()
      )
      return response.data.data
    } catch (error: any) {
      console.error('❌ Create answer key error:', error.response?.data || error.message)
      throw error
    }
  },

  // ... rest of the service methods remain the same ...
  list: async (): Promise<AnswerKeyListItem[]> => {
    try {
      const response = await axios.get(`${API_URL}/answer-key/list`, getAuthHeader())
      return response.data.data
    } catch (error: any) {
      console.error('❌ List answer keys error:', error.response?.data || error.message)
      throw error
    }
  },

  getById: async (id: string): Promise<AnswerKey> => {
    try {
      const response = await axios.get(`${API_URL}/answer-key/${id}`, getAuthHeader())
      return response.data.data
    } catch (error: any) {
      console.error('❌ Get answer key error:', error.response?.data || error.message)
      throw error
    }
  },

  update: async (id: string, data: any): Promise<AnswerKey> => {
    try {
      const payload = preparePayload(data)
      const response = await axios.put(`${API_URL}/answer-key/${id}`, payload, getAuthHeader())
      return response.data.data
    } catch (error: any) {
      console.error('❌ Update answer key error:', error.response?.data || error.message)
      throw error
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await axios.delete(`${API_URL}/answer-key/${id}`, getAuthHeader())
    } catch (error: any) {
      console.error('❌ Delete answer key error:', error.response?.data || error.message)
      throw error
    }
  },

  getBySubject: async (subject: string): Promise<AnswerKeyListItem[]> => {
    try {
      const response = await axios.get(`${API_URL}/answer-key/subject/${subject}`, getAuthHeader())
      return response.data.data
    } catch (error: any) {
      console.error('❌ Get by subject error:', error.response?.data || error.message)
      throw error
    }
  },

  getBySection: async (sectionId: string): Promise<AnswerKey> => {
    try {
      const response = await axios.get(`${API_URL}/answer-key/section/${sectionId}`, getAuthHeader())
      return response.data.data
    } catch (error: any) {
      console.error('❌ Get by section error:', error.response?.data || error.message)
      throw error
    }
  }
}

// Helper to prepare payload for backend
function preparePayload(data: any): any {
  // CASE 1: Data already has flattened 'questions' array (from StepCreateAnswerKey)
  // If your backend expects flat questions, return it as-is (with minor cleanup)
  if (data.questions && Array.isArray(data.questions) && !data.sections) {
    return {
      name: data.name,
      subject: data.subject,
      department: data.department,
      semester: data.semester,
      total_marks: data.total_marks,
      total_questions: data.total_questions,
      questions: data.questions, // Keep it flat!
      created_by: data.created_by || 'faculty'
    }
  }

  // CASE 2: Data has 'sections' (Nested structure)
  // Only use this if your backend specifically expects nested sections
  if (data.sections && data.sections.length > 0) {
    return {
      name: data.name,
      subject: data.subject,
      department: data.department,
      semester: data.semester,
      total_marks: data.total_marks,
      total_questions: data.total_questions,
      sections: data.sections.map((section: any) => ({
        name: section.name,
        description: section.description || '',
        instruction: section.instruction || '',
        questions: section.questions.map((q: any) => ({
          question_number: q.question_number,
          question_text: q.question_text,
          model_answer: q.model_answer,
          max_marks: q.max_marks,
          question_type: q.question_type,
          diagram_required: q.diagram_required || false,
          diagram_weightage: q.diagram_weightage || 0,
          key_points: q.key_points || [],
          keywords: q.keywords || [],
          rubric: q.rubric || [],
          sub_parts: q.sub_parts?.map((sp: any) => ({
            question_text: sp.question_text,
            model_answer: sp.model_answer,
            max_marks: sp.max_marks,
            question_type: sp.question_type,
            diagram_required: sp.diagram_required || false,
            diagram_weightage: sp.diagram_weightage || 0,
            key_points: sp.key_points || [],
            keywords: sp.keywords || [],
            rubric: sp.rubric || [],
          })) || []
        }))
      })),
      created_by: data.created_by || 'faculty'
    }
  }
  
  // Fallback
  return data
}