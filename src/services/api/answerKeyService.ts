
// src/services/api/answerKeyService.ts

import axios from 'axios'

import type {
  AnswerKey,
  AnswerKeyListItem,
  AnswerKeyCreateData,
} from '@/types'


// ============================================================
// API CONFIGURATION
// ============================================================

const API_URL = 'http://127.0.0.1:5000/api'


// ============================================================
// AUTHENTICATED REQUEST CONFIG
// ============================================================
//
// Used ONLY for endpoints protected by @jwt_required().
// ============================================================

const getAuthConfig = () => {

  const token =
    localStorage.getItem('exam_evaluate_token')

  if (!token) {
    throw new Error(
      'Authentication token not found. Please login again.'
    )
  }

  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  }
}


// ============================================================
// PUBLIC REQUEST CONFIG
// ============================================================
//
// IMPORTANT:
// This configuration intentionally does NOT include JWT.
//
// Used by:
// POST /api/answer-key/public-create
// ============================================================

const getPublicConfig = () => {

  return {
    headers: {
      'Content-Type': 'application/json',
    },
  }
}


// ============================================================
// ANSWER KEY SERVICE
// ============================================================

export const answerKeyService = {


  // ==========================================================
  // AUTHENTICATED CREATE
  // ==========================================================
  //
  // POST:
  // /api/answer-key/create
  //
  // Requires JWT.
  // ==========================================================

  create: async (
    data: AnswerKeyCreateData
  ): Promise<AnswerKey> => {

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

      console.error(
        '❌ Public create answer key error:',
        error.response?.data ||
        error.message
      )

      throw error
    }
  },

  // ... rest of the service methods remain the same ...
  list: async (): Promise<AnswerKeyListItem[]> => {

    try {
      const response = await axios.get(`${API_URL}/answer-key/list`, getAuthHeader())
      return response.data.data

    } catch (error: any) {

      console.error(
        '❌ List answer keys error:',
        error.response?.data ||
        error.message
      )

      throw error
    }
  },


  // ==========================================================
  // AUTHENTICATED GET BY ID
  // ==========================================================
  //
  // GET:
  // /api/answer-key/<id>
  //
  // Requires JWT.
  // ==========================================================

  getById: async (
    id: string
  ): Promise<AnswerKey> => {

    try {
      const response = await axios.get(`${API_URL}/answer-key/${id}`, getAuthHeader())
      return response.data.data

    } catch (error: any) {

      console.error(
        '❌ Get answer key error:',
        error.response?.data ||
        error.message
      )

      throw error
    }
  },


  // ==========================================================
  // AUTHENTICATED UPDATE
  // ==========================================================
  //
  // PUT:
  // /api/answer-key/<id>
  //
  // Requires JWT.
  // ==========================================================

  update: async (
    id: string,
    data: Partial<AnswerKeyCreateData>
  ): Promise<AnswerKey> => {

    try {
      const payload = preparePayload(data)
      const response = await axios.put(`${API_URL}/answer-key/${id}`, payload, getAuthHeader())
      return response.data.data

    } catch (error: any) {

      console.error(
        '❌ Update answer key error:',
        error.response?.data ||
        error.message
      )

      throw error
    }
  },


  // ==========================================================
  // AUTHENTICATED DELETE
  // ==========================================================
  //
  // DELETE:
  // /api/answer-key/<id>
  //
  // Requires JWT.
  // ==========================================================

  delete: async (
    id: string
  ): Promise<void> => {

    try {
      await axios.delete(`${API_URL}/answer-key/${id}`, getAuthHeader())
    } catch (error: any) {

      console.error(
        '❌ Delete answer key error:',
        error.response?.data ||
        error.message
      )

      throw error
    }
  },


  // ==========================================================
  // AUTHENTICATED GET BY SUBJECT
  // ==========================================================
  //
  // GET:
  // /api/answer-key/subject/<subject>
  //
  // Requires JWT.
  // ==========================================================

  getBySubject: async (
    subject: string
  ): Promise<AnswerKeyListItem[]> => {

    try {
      const response = await axios.get(`${API_URL}/answer-key/subject/${subject}`, getAuthHeader())
      return response.data.data

    } catch (error: any) {

      console.error(
        '❌ Get answer keys by subject error:',
        error.response?.data ||
        error.message
      )

      throw error
    }
  },


  // ==========================================================
  // DOWNLOAD ANSWER KEY AS JSON
  // ==========================================================
  //
  // This does NOT call the backend.
  //
  // It directly converts the AnswerKey object into JSON
  // and downloads it in the browser.
  // ==========================================================

  downloadJSON: (
    answerKey: AnswerKey
  ): void => {

    try {

      if (!answerKey) {
        throw new Error(
          'Answer key data is required.'
        )
      }


      // ------------------------------------------------------
      // JSON DATA
      // ------------------------------------------------------

      const jsonData = {

        id:
          answerKey.id,

        name:
          answerKey.name,

        subject:
          answerKey.subject,

        subject_code:
          answerKey.subject_code,

        college_name:
          answerKey.college_name,

        department:
          answerKey.department,

        semester:
          answerKey.semester,

        examination_type:
          answerKey.examination_type,

        academic_year:
          answerKey.academic_year,

        examination_date:
          answerKey.examination_date,

        total_marks:
          answerKey.total_marks,

        duration:
          answerKey.duration,

        total_questions:
          answerKey.total_questions,

        questions:
          answerKey.questions,

        created_at:
          answerKey.created_at,

        updated_at:
          answerKey.updated_at,

        created_by:
          answerKey.created_by,

        creation_mode:
          answerKey.creation_mode,
      }


      // ------------------------------------------------------
      // CONVERT TO JSON
      // ------------------------------------------------------

      const jsonString =
        JSON.stringify(
          jsonData,
          null,
          2
        )


      // ------------------------------------------------------
      // CREATE BLOB
      // ------------------------------------------------------

      const blob =
        new Blob(
          [jsonString],
          {
            type:
              'application/json;charset=utf-8',
          }
        )


      // ------------------------------------------------------
      // CREATE TEMPORARY URL
      // ------------------------------------------------------

      const url =
        URL.createObjectURL(
          blob
        )


      // ------------------------------------------------------
      // SAFE FILE NAME
      // ------------------------------------------------------

      const safeName =
        (
          answerKey.name ||
          'answer-key'
        )
          .trim()
          .replace(
            /[^a-zA-Z0-9-_ ]/g,
            ''
          )
          .replace(
            /\s+/g,
            '_'
          )


      const filename =
        `${safeName || 'answer-key'}.json`


      // ------------------------------------------------------
      // DOWNLOAD
      // ------------------------------------------------------

      const link =
        document.createElement(
          'a'
        )

      link.href =
        url

      link.download =
        filename

      document.body.appendChild(
        link
      )

      link.click()

      document.body.removeChild(
        link
      )


      // ------------------------------------------------------
      // CLEANUP
      // ------------------------------------------------------

      URL.revokeObjectURL(
        url
      )


      console.log(
        `✅ Answer key JSON downloaded: ${filename}`
      )

    } catch (error) {

      console.error(
        '❌ Failed to download answer key JSON:',
        error
      )

      throw new Error(
        'Failed to download answer key JSON'
      )
    }
  },


  // ==========================================================
  // DOWNLOAD JSON BY ID
  // ==========================================================
  //
  // IMPORTANT:
  // This operation uses getById(), which is AUTHENTICATED.
  //
  // Therefore it should be used from the logged-in
  // Answer Key List, not the public creation page.
  // ==========================================================

  downloadJSONById: async (
    id: string
  ): Promise<void> => {

    try {

      if (!id) {
        throw new Error(
          'Answer key ID is required.'
        )
      }

      const answerKey =
        await answerKeyService.getById(
          id
        )

      answerKeyService.downloadJSON(
        answerKey
      )

    } catch (error: any) {

      console.error(
        '❌ Download answer key error:',
        error.response?.data ||
        error.message
      )

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
