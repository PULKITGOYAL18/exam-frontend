
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

      const response = await axios.post(
        `${API_URL}/answer-key/create`,
        data,
        getAuthConfig()
      )

      return response.data.data

    } catch (error: any) {

      console.error(
        '❌ Authenticated create answer key error:',
        error.response?.data ||
        error.message
      )

      throw error
    }
  },


  // ==========================================================
  // PUBLIC CREATE
  // ==========================================================
  //
  // POST:
  // /api/answer-key/public-create
  //
  // IMPORTANT:
  // No login required.
  // No JWT required.
  //
  // This MUST be used by the public Answer Key Manager.
  // ==========================================================

  createPublic: async (
    data: AnswerKeyCreateData
  ): Promise<AnswerKey> => {

    try {

      console.log(
        '🌐 Sending PUBLIC answer-key creation request...'
      )

      console.log(
        '🌐 Endpoint:',
        `${API_URL}/answer-key/public-create`
      )

      const response = await axios.post(
        `${API_URL}/answer-key/public-create`,
        data,
        getPublicConfig()
      )

      console.log(
        '✅ Public answer key created:',
        response.data
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


  // ==========================================================
  // AUTHENTICATED LIST
  // ==========================================================
  //
  // GET:
  // /api/answer-key/list
  //
  // Requires JWT.
  // ==========================================================

  list: async (): Promise<AnswerKeyListItem[]> => {

    try {

      const response = await axios.get(
        `${API_URL}/answer-key/list`,
        getAuthConfig()
      )

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

      if (!id) {
        throw new Error(
          'Answer key ID is required.'
        )
      }

      const response = await axios.get(
        `${API_URL}/answer-key/${encodeURIComponent(id)}`,
        getAuthConfig()
      )

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

      if (!id) {
        throw new Error(
          'Answer key ID is required.'
        )
      }

      const response = await axios.put(
        `${API_URL}/answer-key/${encodeURIComponent(id)}`,
        data,
        getAuthConfig()
      )

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

      if (!id) {
        throw new Error(
          'Answer key ID is required.'
        )
      }

      await axios.delete(
        `${API_URL}/answer-key/${encodeURIComponent(id)}`,
        getAuthConfig()
      )

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

      if (!subject) {
        throw new Error(
          'Subject is required.'
        )
      }

      const response = await axios.get(
        `${API_URL}/answer-key/subject/${encodeURIComponent(subject)}`,
        getAuthConfig()
      )

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

}
