
// src/stores/answerKeyStore.ts

import { create } from 'zustand'

import type {
  AnswerKey,
  AnswerKeyListItem,
  AnswerKeyCreateData,
} from '@/types'

import { answerKeyService } from '@/services/api/answerKeyService'


// ============================================================
// ANSWER KEY STORE INTERFACE
// ============================================================

interface AnswerKeyStore {

  // ─── State ────────────────────────────────────────────────

  answerKeys: AnswerKeyListItem[]

  currentAnswerKey: AnswerKey | null

  isLoading: boolean

  error: string | null

  selectedKeyId: string | null


  // ─── Authenticated operations ─────────────────────────────

  fetchAll: () => Promise<void>

  fetchById: (
    id: string
  ) => Promise<AnswerKey | null>

  create: (
    data: AnswerKeyCreateData
  ) => Promise<AnswerKey>

  update: (
    id: string,
    data: Partial<AnswerKeyCreateData>
  ) => Promise<AnswerKey>

  delete: (
    id: string
  ) => Promise<void>


  // ─── Public / Guest operation ────────────────────────────

  createPublic: (
    data: AnswerKeyCreateData
  ) => Promise<AnswerKey>


  // ─── JSON operations ─────────────────────────────────────

  downloadJSON: (
    answerKey: AnswerKey
  ) => void

  downloadJSONById: (
    id: string
  ) => Promise<void>


  // ─── Other operations ────────────────────────────────────

  selectForEvaluation: (
    id: string
  ) => void

  reset: () => void

  getAnswerKeyContent: (
    id: string
  ) => Promise<string>
}


// ============================================================
// ZUSTAND STORE
// ============================================================

export const useAnswerKeyStore =
  create<AnswerKeyStore>((set, get) => ({


    // ========================================================
    // INITIAL STATE
    // ========================================================

    answerKeys: [],

    currentAnswerKey: null,

    isLoading: false,

    error: null,

    selectedKeyId: null,


    // ========================================================
    // FETCH ALL ANSWER KEYS
    // ========================================================

    fetchAll: async () => {

      set({
        isLoading: true,
        error: null,
      })

      try {

        const data =
          await answerKeyService.list()

        set({
          answerKeys: data,
          isLoading: false,
          error: null,
        })

      } catch (error: any) {

        console.error(
          '❌ Fetch all answer keys error:',
          error
        )

        set({
          error:
            error.response?.data?.message ||
            error.message ||
            'Failed to fetch answer keys',

          isLoading: false,
        })
      }
    },


    // ========================================================
    // FETCH ANSWER KEY BY ID
    // ========================================================

    fetchById: async (
      id: string
    ): Promise<AnswerKey | null> => {

      set({
        isLoading: true,
        error: null,
      })

      try {

        const data =
          await answerKeyService.getById(id)

        set({
          currentAnswerKey: data,
          isLoading: false,
          error: null,
        })

        return data

      } catch (error: any) {

        console.error(
          '❌ Fetch answer key by ID error:',
          error
        )

        set({
          error:
            error.response?.data?.message ||
            error.message ||
            `Failed to fetch answer key ${id}`,

          isLoading: false,
        })

        return null
      }
    },


    // ========================================================
    // GET ANSWER KEY CONTENT
    // ========================================================

    getAnswerKeyContent: async (
      id: string
    ): Promise<string> => {

      try {

        const state = get()

        let key =
          state.currentAnswerKey


        // ----------------------------------------------------
        // Fetch answer key if it is not already loaded
        // ----------------------------------------------------

        if (
          !key ||
          key.id !== id
        ) {

          key =
            await state.fetchById(id)
        }


        // ----------------------------------------------------
        // Validate answer key
        // ----------------------------------------------------

        if (
          !key ||
          !key.questions ||
          key.questions.length === 0
        ) {

          throw new Error(
            'Answer key has no questions'
          )
        }


        // ----------------------------------------------------
        // Build structured JSON
        // ----------------------------------------------------

        const jsonData = {

          id:
            key.id,

          name:
            key.name,

          subject:
            key.subject,

          subject_code:
            key.subject_code,

          college_name:
            key.college_name,

          department:
            key.department || '',

          semester:
            key.semester || 1,

          examination_type:
            key.examination_type,

          academic_year:
            key.academic_year,

          examination_date:
            key.examination_date,

          total_marks:
            key.total_marks ||
            key.questions.reduce(
              (
                sum: number,
                q
              ) =>
                sum +
                (q.max_marks || 0),
              0
            ),

          duration:
            key.duration,

          total_questions:
            key.total_questions ||
            key.questions.length,

          questions:
            key.questions.map(
              (q) => ({

                id:
                  q.id,

                question_number:
                  q.question_number,

                question_text:
                  q.question_text || '',

                model_answer:
                  q.model_answer || '',

                max_marks:
                  q.max_marks || 0,

                question_type:
                  q.question_type ||
                  'theory',

                diagram_required:
                  q.diagram_required ||
                  false,

                diagram_weightage:
                  q.diagram_weightage ||
                  0,

                key_points:
                  q.key_points || [],

                keywords:
                  q.keywords || [],

                rubric:
                  q.rubric || [],
              })
            ),

          created_at:
            key.created_at,

          updated_at:
            key.updated_at,

          created_by:
            key.created_by,

          creation_mode:
            key.creation_mode,
        }


        // ----------------------------------------------------
        // Convert to JSON
        // ----------------------------------------------------

        const jsonString =
          JSON.stringify(
            jsonData
          )


        console.log(
          '📤 Answer key converted to JSON'
        )

        console.log(
          `📤 Questions: ${jsonData.questions.length}`
        )

        console.log(
          `📤 JSON Length: ${jsonString.length} chars`
        )


        // ----------------------------------------------------
        // Save debug information
        // ----------------------------------------------------

        try {

          const debugData = {

            timestamp:
              new Date().toISOString(),

            format:
              'json',

            answer_key_id:
              key.id,

            total_questions:
              jsonData.questions.length,

            question_preview:
              jsonData.questions.map(
                (q) => ({

                  id:
                    q.id,

                  question_number:
                    q.question_number,

                  question_text_preview:
                    q.question_text.substring(
                      0,
                      50
                    ) + '...',

                  model_answer_length:
                    q.model_answer.length,
                })
              ),
          }


          localStorage.setItem(
            'last_answer_key_json_debug',
            JSON.stringify(
              debugData,
              null,
              2
            )
          )

        } catch (debugError) {

          console.warn(
            '⚠️ Could not save debug information'
          )
        }


        return jsonString

      } catch (error) {

        console.error(
          '❌ Failed to get answer key content:',
          error
        )

        throw error
      }
    },


    // ========================================================
    // AUTHENTICATED CREATE
    // ========================================================
    //
    // Used by logged-in Faculty/HOD/Dean/Admin users.
    //
    // Sends JWT through answerKeyService.create().
    //

    create: async (
      data: AnswerKeyCreateData
    ): Promise<AnswerKey> => {

      set({
        isLoading: true,
        error: null,
      })

      try {

        console.log(
          '🔐 Creating answer key as authenticated user...'
        )


        const result =
          await answerKeyService.create(
            data
          )


        // ----------------------------------------------------
        // Update store
        // ----------------------------------------------------

        set((state) => ({

          answerKeys: [
            ...state.answerKeys,

            {
              id:
                result.id,

              name:
                result.name,

              subject:
                result.subject,

              subject_code:
                result.subject_code,

              college_name:
                result.college_name,

              department:
                result.department,

              semester:
                result.semester,

              examination_type:
                result.examination_type,

              academic_year:
                result.academic_year,

              examination_date:
                result.examination_date,

              total_marks:
                result.total_marks,

              duration:
                result.duration,

              total_questions:
                result.total_questions,

              created_at:
                result.created_at,
            },
          ],

          currentAnswerKey:
            result,

          isLoading:
            false,

          error:
            null,
        }))


        console.log(
          '✅ Authenticated answer key created successfully'
        )

        return result

      } catch (error: any) {

        console.error(
          '❌ Create answer key error:',
          error
        )


        const message =
          error.response?.data?.message ||
          error.message ||
          'Failed to create answer key'


        set({

          error:
            message,

          isLoading:
            false,
        })


        throw error
      }
    },


    // ========================================================
    // PUBLIC / GUEST CREATE
    // ========================================================
    //
    // Used by the PUBLIC Answer Key Manager.
    //
    // IMPORTANT:
    // This function does NOT use JWT.
    //
    // The service calls:
    //
    // POST /api/answer-key/public-create
    //
    // instead of:
    //
    // POST /api/answer-key/create
    //

    createPublic: async (
      data: AnswerKeyCreateData
    ): Promise<AnswerKey> => {

      set({
        isLoading: true,
        error: null,
      })

      try {

        console.log(
          '🌐 Creating answer key as guest...'
        )

        console.log(
          '📤 Public answer key payload:',
          data
        )


        // ----------------------------------------------------
        // IMPORTANT:
        // Use createPublic(), NOT create().
        // ----------------------------------------------------

        const result =
          await answerKeyService.createPublic(
            data
          )


        console.log(
          '✅ Public answer key created:',
          result
        )


        // ----------------------------------------------------
        // Add newly created key to local store.
        // ----------------------------------------------------

        set((state) => ({

          answerKeys: [
            ...state.answerKeys,

            {
              id:
                result.id,

              name:
                result.name,

              subject:
                result.subject,

              subject_code:
                result.subject_code,

              college_name:
                result.college_name,

              department:
                result.department,

              semester:
                result.semester,

              examination_type:
                result.examination_type,

              academic_year:
                result.academic_year,

              examination_date:
                result.examination_date,

              total_marks:
                result.total_marks,

              duration:
                result.duration,

              total_questions:
                result.total_questions,

              created_at:
                result.created_at,
            },
          ],

          currentAnswerKey:
            result,

          isLoading:
            false,

          error:
            null,
        }))


        return result

      } catch (error: any) {

        console.error(
          '❌ Public create answer key error:',
          error
        )


        const message =
          error.response?.data?.message ||
          error.message ||
          'Failed to create answer key'


        set({

          error:
            message,

          isLoading:
            false,
        })


        throw error
      }
    },


    // ========================================================
    // DOWNLOAD JSON
    // ========================================================

    downloadJSON: (
      answerKey: AnswerKey
    ): void => {

      try {

        answerKeyService.downloadJSON(
          answerKey
        )

        console.log(
          '✅ Answer key JSON download started'
        )

      } catch (error) {

        console.error(
          '❌ JSON download failed:',
          error
        )

        throw error
      }
    },


    // ========================================================
    // DOWNLOAD JSON BY ID
    // ========================================================

    downloadJSONById: async (
      id: string
    ): Promise<void> => {

      set({
        isLoading: true,
        error: null,
      })

      try {

        await answerKeyService.downloadJSONById(
          id
        )

        set({
          isLoading:
            false,

          error:
            null,
        })

      } catch (error: any) {

        console.error(
          '❌ Download JSON by ID error:',
          error
        )


        set({

          error:
            error.response?.data?.message ||
            error.message ||
            'Failed to download answer key JSON',

          isLoading:
            false,
        })


        throw error
      }
    },


    // ========================================================
    // UPDATE ANSWER KEY
    // ========================================================

    update: async (
      id: string,
      data: Partial<AnswerKeyCreateData>
    ): Promise<AnswerKey> => {

      set({
        isLoading: true,
        error: null,
      })

      try {

        const result =
          await answerKeyService.update(
            id,
            data
          )


        set((state) => ({

          answerKeys:
            state.answerKeys.map(
              (key) =>
                key.id === id
                  ? {
                      id:
                        result.id,

                      name:
                        result.name,

                      subject:
                        result.subject,

                      subject_code:
                        result.subject_code,

                      college_name:
                        result.college_name,

                      department:
                        result.department,

                      semester:
                        result.semester,

                      examination_type:
                        result.examination_type,

                      academic_year:
                        result.academic_year,

                      examination_date:
                        result.examination_date,

                      total_marks:
                        result.total_marks,

                      duration:
                        result.duration,

                      total_questions:
                        result.total_questions,

                      created_at:
                        result.created_at,
                    }
                  : key
            ),

          currentAnswerKey:
            result,

          isLoading:
            false,

          error:
            null,
        }))


        console.log(
          '✅ Answer key updated successfully'
        )

        return result

      } catch (error: any) {

        console.error(
          '❌ Update answer key error:',
          error
        )


        set({

          error:
            error.response?.data?.message ||
            error.message ||
            'Failed to update answer key',

          isLoading:
            false,
        })


        throw error
      }
    },


    // ========================================================
    // DELETE ANSWER KEY
    // ========================================================

    delete: async (
      id: string
    ): Promise<void> => {

      set({
        isLoading: true,
        error: null,
      })

      try {

        await answerKeyService.delete(
          id
        )


        set((state) => ({

          answerKeys:
            state.answerKeys.filter(
              (key) =>
                key.id !== id
            ),

          currentAnswerKey:
            state.currentAnswerKey?.id === id
              ? null
              : state.currentAnswerKey,

          selectedKeyId:
            state.selectedKeyId === id
              ? null
              : state.selectedKeyId,

          isLoading:
            false,

          error:
            null,
        }))

      } catch (error: any) {

        console.error(
          '❌ Delete answer key error:',
          error
        )


        set({

          error:
            error.response?.data?.message ||
            error.message ||
            'Failed to delete answer key',

          isLoading:
            false,
        })


        throw error
      }
    },


    // ========================================================
    // SELECT FOR EVALUATION
    // ========================================================

    selectForEvaluation: (
      id: string
    ): void => {

      set({
        selectedKeyId:
          id,
      })
    },


    // ========================================================
    // RESET STORE
    // ========================================================

    reset: (): void => {

      set({

        answerKeys: [],

        currentAnswerKey:
          null,

        isLoading:
          false,

        error:
          null,

        selectedKeyId:
          null,
      })
    },

  }))

