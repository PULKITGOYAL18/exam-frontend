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

  listPublic: () => Promise<AnswerKeyListItem[]>

  fetchByIdPublic: (
    id: string
  ) => Promise<AnswerKey | null>

  updatePublic: (
    id: string,
    data: Partial<AnswerKeyCreateData>
  ) => Promise<AnswerKey>

  deletePublic: (
    id: string
  ) => Promise<void>


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
// HELPER FUNCTIONS
// ============================================================

/**
 * Safely extract an answer-key ID from different backend
 * response formats.
 */
const getAnswerKeyId = (
  result: any
): string => {
  return (
    result?.id ||
    result?._id ||
    result?.answer_key_id ||
    ''
  )
}


/**
 * Convert any value to a safe number.
 */
const toNumber = (
  value: any,
  fallback = 0
): number => {

  const number =
    Number(value)

  return Number.isFinite(number)
    ? number
    : fallback
}


/**
 * Normalize an MCQ answer for display/storage.
 *
 * Examples:
 *
 * B       -> B
 * b       -> B
 * (B)     -> B
 * B.      -> B
 * II      -> II
 * ii      -> II
 * (ii)    -> II
 * 2       -> 2
 */
const normalizeAnswer = (
  value: any
): string => {

  if (
    value === null ||
    value === undefined
  ) {
    return ''
  }

  return String(value)
    .trim()
    .replace(/^[([{]\s*/g, '')
    .replace(/[\])}.,:;]+$/g, '')
    .replace(/\s+/g, ' ')
    .toUpperCase()
}


/**
 * Generate common accepted representations for MCQ answers.
 *
 * Example:
 *
 * B
 *
 * becomes:
 *
 * B
 * b
 * (B)
 * B.
 * II
 * ii
 * (ii)
 * 2
 * Option B
 * option b
 * Option 2
 */
const buildAcceptedAnswers = (
  answer: any
): string[] => {

  const normalized =
    normalizeAnswer(answer)

  if (!normalized) {
    return []
  }

  const aliases = new Set<string>()

  aliases.add(normalized)
  aliases.add(normalized.toLowerCase())
  aliases.add(`(${normalized})`)
  aliases.add(`${normalized}.`)

  const letterToRoman: Record<string, string> = {
    A: 'I',
    B: 'II',
    C: 'III',
    D: 'IV',
    E: 'V',
    F: 'VI',
  }

  const letterToNumber: Record<string, string> = {
    A: '1',
    B: '2',
    C: '3',
    D: '4',
    E: '5',
    F: '6',
  }

  if (letterToRoman[normalized]) {

    const roman =
      letterToRoman[normalized]

    aliases.add(roman)
    aliases.add(roman.toLowerCase())
    aliases.add(`(${roman})`)
    aliases.add(`(${roman.toLowerCase()})`)

  }

  if (letterToNumber[normalized]) {

    const number =
      letterToNumber[normalized]

    aliases.add(number)
    aliases.add(`(${number})`)
    aliases.add(`Option ${normalized}`)
    aliases.add(`option ${normalized}`)
    aliases.add(`Option ${number}`)
    aliases.add(`option ${number}`)
  }

  return Array.from(aliases)
}


/**
 * Calculate the marks that are actually part of the
 * examination according to section attempt rules.
 *
 * Example:
 *
 * Section A:
 * 10 questions × 1 = 10
 *
 * Section B:
 * 1 of 2 × 10 = 10
 *
 * Section C:
 * 2 of 3 × 5 = 10
 *
 * Total = 30
 */
const calculateAttemptMarks = (
  sections: any[]
): number => {

  return sections.reduce(
    (
      total: number,
      section: any
    ) => {

      const questionsToAttempt =
        toNumber(
          section?.questions_to_attempt,
          section?.total_questions || 0
        )

      const marksPerQuestion =
        toNumber(
          section?.marks_per_question,
          0
        )

      return (
        total +
        (
          questionsToAttempt *
          marksPerQuestion
        )
      )
    },
    0
  )
}


/**
 * Calculate all available marks.
 *
 * This is different from total exam marks when a section
 * allows students to attempt only some questions.
 */
const calculateAvailableMarks = (
  sections: any[]
): number => {

  return sections.reduce(
    (
      total: number,
      section: any
    ) => {

      const totalQuestions =
        toNumber(
          section?.total_questions,
          section?.questions?.length || 0
        )

      const marksPerQuestion =
        toNumber(
          section?.marks_per_question,
          0
        )

      return (
        total +
        (
          totalQuestions *
          marksPerQuestion
        )
      )
    },
    0
  )
}


/**
 * Normalize section/question data before storing/exporting.
 *
 * This makes the store tolerant of both:
 *
 * 1. New section-based answer keys
 * 2. Old flat answer keys
 */
const normalizeAnswerKeyData = (
  key: any
): any => {

  if (!key) {
    return key
  }

  const sourceSections =
    Array.isArray(key.sections)
      ? key.sections
      : []

  const sections =
    sourceSections.map(
      (
        section: any,
        sectionIndex: number
      ) => {

        const sectionQuestions =
          Array.isArray(section.questions)
            ? section.questions
            : []

        const normalizedQuestions =
          sectionQuestions.map(
            (
              question: any,
              questionIndex: number
            ) => {

              const correctAnswer =
                normalizeAnswer(
                  question.correct_answer ||
                  question.mcq_answer?.correct_answer ||
                  (
                    question.answer_type === 'MCQ'
                      ? question.model_answer
                      : ''
                  )
                )

              const acceptedAnswers =
                Array.from(
                  new Set([
                    ...(Array.isArray(
                      question.accepted_answers
                    )
                      ? question.accepted_answers
                      : []),

                    ...(Array.isArray(
                      question.mcq_answer?.accepted_answers
                    )
                      ? question.mcq_answer.accepted_answers
                      : []),

                    ...(
                      question.answer_type === 'MCQ'
                        ? buildAcceptedAnswers(
                          correctAnswer
                        )
                        : []
                    ),
                  ])
                )

              return {
                ...question,

                section_id:
                  question.section_id ||
                  section.id ||
                  `section-${sectionIndex + 1}`,

                question_number:
                  question.question_number ||
                  `Q. No. ${questionIndex + 1}`,

                question_type:
                  question.question_type ||
                  (
                    question.answer_type === 'MCQ'
                      ? 'mcq'
                      : 'theory'
                  ),

                answer_type:
                  question.answer_type ||
                  (
                    question.question_type === 'mcq'
                      ? 'MCQ'
                      : 'THEORY'
                  ),

                correct_answer:
                  correctAnswer || undefined,

                accepted_answers:
                  acceptedAnswers,

                mcq_answer:
                  question.answer_type === 'MCQ' ||
                    question.question_type === 'mcq'
                    ? {
                      correct_answer:
                        correctAnswer,

                      accepted_answers:
                        acceptedAnswers,

                      option_labels:
                        question.mcq_answer?.option_labels ||
                        question.options?.map(
                          (option: any) =>
                            option.label
                        ) ||
                        ['A', 'B', 'C', 'D'],
                    }
                    : question.mcq_answer,

                model_answer:
                  question.model_answer ||
                  correctAnswer ||
                  '',

                max_marks:
                  toNumber(
                    question.max_marks,
                    section.marks_per_question || 0
                  ),

                key_points:
                  Array.isArray(question.key_points)
                    ? question.key_points
                    : [],

                keywords:
                  Array.isArray(question.keywords)
                    ? question.keywords
                    : [],

                rubric:
                  Array.isArray(question.rubric)
                    ? question.rubric
                    : [],
              }
            }
          )

        const totalQuestions =
          toNumber(
            section.total_questions,
            normalizedQuestions.length
          )

        const questionsToAttempt =
          Math.min(
            Math.max(
              1,
              toNumber(
                section.questions_to_attempt,
                totalQuestions
              )
            ),
            Math.max(
              1,
              totalQuestions
            )
          )

        return {
          ...section,

          id:
            section.id ||
            `section-${sectionIndex + 1}`,

          name:
            section.name ||
            `Section ${String.fromCharCode(
              65 + sectionIndex
            )}`,

          type:
            section.type ||
            'LONG_ANSWER',

          total_questions:
            totalQuestions,

          questions_to_attempt:
            questionsToAttempt,

          marks_per_question:
            toNumber(
              section.marks_per_question,
              0
            ),

          all_compulsory:
            section.all_compulsory === true ||
            questionsToAttempt === totalQuestions,

          excess_attempt_policy:
            section.excess_attempt_policy ||
            'manual',

          questions:
            normalizedQuestions,
        }
      }
    )


  /*
   * Backward compatibility:
   *
   * If an old answer key does not contain sections,
   * preserve its existing flat questions array.
   */
  const flatQuestions =
    Array.isArray(key.questions)
      ? key.questions
      : []


  /*
   * If sections exist, build a flattened question list
   * as well. This is important because older parts of the
   * application still expect key.questions.
   */
  let normalizedFlatQuestions =
    flatQuestions


  if (sections.length > 0) {

    normalizedFlatQuestions =
      sections.flatMap(
        (section: any) =>
          section.questions.map(
            (question: any) => ({
              ...question,

              section_id:
                question.section_id ||
                section.id,

              section_name:
                section.name,

              section_type:
                section.type,

              questions_to_attempt:
                section.questions_to_attempt,

              section_total_questions:
                section.total_questions,

              section_marks_per_question:
                section.marks_per_question,

              excess_attempt_policy:
                section.excess_attempt_policy,
            })
          )
      )
  }


  const calculatedAttemptMarks =
    sections.length > 0
      ? calculateAttemptMarks(sections)
      : 0


  const calculatedAvailableMarks =
    sections.length > 0
      ? calculateAvailableMarks(sections)
      : flatQuestions.reduce(
        (
          sum: number,
          question: any
        ) =>
          sum +
          toNumber(
            question.max_marks,
            0
          ),
        0
      )


  return {

    ...key,

    sections,

    questions:
      normalizedFlatQuestions,

    total_questions:
      key.total_questions ||
      normalizedFlatQuestions.length,

    /*
     * Keep the explicitly supplied total marks if the backend
     * provided it.
     *
     * Otherwise use compulsory/attempt marks for section-based
     * keys.
     */
    total_marks:
      key.total_marks ||
      (
        sections.length > 0
          ? calculatedAttemptMarks
          : calculatedAvailableMarks
      ),

    available_marks:
      key.available_marks ||
      (
        sections.length > 0
          ? calculatedAvailableMarks
          : undefined
      ),

    attempt_marks:
      key.attempt_marks ||
      (
        sections.length > 0
          ? calculatedAttemptMarks
          : undefined
      ),
  }
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

        const normalizedData =
          Array.isArray(data)
            ? data
            : []

        set({
          answerKeys:
            normalizedData,

          isLoading:
            false,

          error:
            null,
        })

      } catch (error: any) {

        console.error(
          '❌ Fetch all answer keys error:',
          error
        )

        set({

          error:
            error?.response?.data?.message ||
            error?.message ||
            'Failed to fetch answer keys',

          isLoading:
            false,
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

        const normalizedData =
          normalizeAnswerKeyData(data)

        set({

          currentAnswerKey:
            normalizedData,

          isLoading:
            false,

          error:
            null,
        })

        return normalizedData

      } catch (error: any) {

        console.error(
          '❌ Fetch answer key by ID error:',
          error
        )

        set({

          error:
            error?.response?.data?.message ||
            error?.message ||
            `Failed to fetch answer key ${id}`,

          isLoading:
            false,
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

        const state =
          get()

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

        if (!key) {

          throw new Error(
            'Answer key could not be loaded'
          )
        }


        const normalizedKey =
          normalizeAnswerKeyData(key)


        if (
          !normalizedKey.questions ||
          normalizedKey.questions.length === 0
        ) {

          throw new Error(
            'Answer key has no questions'
          )
        }


        // ----------------------------------------------------
        // Section calculations
        // ----------------------------------------------------

        const sections =
          Array.isArray(
            normalizedKey.sections
          )
            ? normalizedKey.sections
            : []

        const availableMarks =
          sections.length > 0
            ? calculateAvailableMarks(
              sections
            )
            : normalizedKey.questions.reduce(
              (
                sum: number,
                question: any
              ) =>
                sum +
                toNumber(
                  question.max_marks,
                  0
                ),
              0
            )

        const attemptMarks =
          sections.length > 0
            ? calculateAttemptMarks(
              sections
            )
            : normalizedKey.total_marks ||
            availableMarks


        // ----------------------------------------------------
        // Build structured JSON
        // ----------------------------------------------------

        const jsonData: any = {

          id:
            normalizedKey.id,

          name:
            normalizedKey.name,

          subject:
            normalizedKey.subject,

          subject_code:
            normalizedKey.subject_code,

          college_name:
            normalizedKey.college_name,

          department:
            normalizedKey.department || '',

          semester:
            normalizedKey.semester || 1,

          examination_type:
            normalizedKey.examination_type,

          academic_year:
            normalizedKey.academic_year,

          examination_date:
            normalizedKey.examination_date,

          total_marks:
            normalizedKey.total_marks ||
            attemptMarks,

          available_marks:
            availableMarks,

          attempt_marks:
            attemptMarks,

          duration:
            normalizedKey.duration,

          total_questions:
            normalizedKey.total_questions ||
            normalizedKey.questions.length,


          // --------------------------------------------------
          // SECTION-WISE CONFIGURATION
          // --------------------------------------------------

          sections:
            sections.map(
              (section: any) => ({

                id:
                  section.id,

                name:
                  section.name,

                type:
                  section.type,

                instruction:
                  section.instruction || '',

                total_questions:
                  section.total_questions,

                questions_to_attempt:
                  section.questions_to_attempt,

                marks_per_question:
                  section.marks_per_question,

                all_compulsory:
                  section.all_compulsory,

                excess_attempt_policy:
                  section.excess_attempt_policy,

                questions:
                  section.questions.map(
                    (question: any) => ({

                      id:
                        question.id,

                      question_number:
                        question.question_number,

                      question_text:
                        question.question_text || '',

                      answer_type:
                        question.answer_type,

                      question_type:
                        question.question_type,

                      options:
                        question.options || [],

                      correct_answer:
                        question.correct_answer ||
                        question.mcq_answer?.correct_answer ||
                        '',

                      accepted_answers:
                        question.accepted_answers ||
                        question.mcq_answer?.accepted_answers ||
                        [],

                      mcq_answer:
                        question.mcq_answer,

                      model_answer:
                        question.model_answer || '',

                      max_marks:
                        question.max_marks || 0,

                      diagram_required:
                        question.diagram_required ||
                        false,

                      diagram_weightage:
                        question.diagram_weightage ||
                        0,

                      key_points:
                        question.key_points ||
                        [],

                      keywords:
                        question.keywords ||
                        [],

                      rubric:
                        question.rubric ||
                        [],
                    })
                  ),
              })
            ),


          // --------------------------------------------------
          // FLAT QUESTIONS
          //
          // Kept for compatibility with the existing
          // evaluation/OCR workflow.
          // --------------------------------------------------

          questions:
            normalizedKey.questions.map(
              (question: any) => ({

                id:
                  question.id,

                section_id:
                  question.section_id,

                section_name:
                  question.section_name,

                section_type:
                  question.section_type,

                question_number:
                  question.question_number,

                question_text:
                  question.question_text || '',

                answer_type:
                  question.answer_type,

                question_type:
                  question.question_type ||
                  'theory',

                options:
                  question.options || [],

                correct_answer:
                  question.correct_answer ||
                  question.mcq_answer?.correct_answer ||
                  '',

                accepted_answers:
                  question.accepted_answers ||
                  question.mcq_answer?.accepted_answers ||
                  [],

                mcq_answer:
                  question.mcq_answer,

                model_answer:
                  question.model_answer || '',

                max_marks:
                  question.max_marks || 0,

                diagram_required:
                  question.diagram_required ||
                  false,

                diagram_weightage:
                  question.diagram_weightage ||
                  0,

                key_points:
                  question.key_points ||
                  [],

                keywords:
                  question.keywords ||
                  [],

                rubric:
                  question.rubric ||
                  [],

                questions_to_attempt:
                  question.questions_to_attempt,

                section_total_questions:
                  question.section_total_questions,

                section_marks_per_question:
                  question.section_marks_per_question,

                excess_attempt_policy:
                  question.excess_attempt_policy,
              })
            ),


          created_at:
            normalizedKey.created_at,

          updated_at:
            normalizedKey.updated_at,

          created_by:
            normalizedKey.created_by,

          creation_mode:
            normalizedKey.creation_mode,
        }


        // ----------------------------------------------------
        // Convert to JSON
        // ----------------------------------------------------

        const jsonString =
          JSON.stringify(
            jsonData,
            null,
            2
          )


        console.log(
          '📤 Answer key converted to JSON'
        )

        console.log(
          `📤 Sections: ${sections.length}`
        )

        console.log(
          `📤 Questions: ${jsonData.questions.length}`
        )

        console.log(
          `📤 Attempt Marks: ${attemptMarks}`
        )

        console.log(
          `📤 Available Marks: ${availableMarks}`
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
              normalizedKey.id,

            sections:
              sections.length,

            total_questions:
              jsonData.questions.length,

            attempt_marks:
              attemptMarks,

            available_marks:
              availableMarks,

            question_preview:
              jsonData.questions.map(
                (question: any) => ({

                  id:
                    question.id,

                  question_number:
                    question.question_number,

                  section:
                    question.section_name,

                  answer_type:
                    question.answer_type,

                  correct_answer:
                    question.correct_answer,

                  accepted_answers:
                    question.accepted_answers,

                  question_text_preview:
                    String(
                      question.question_text || ''
                    ).substring(
                      0,
                      50
                    ) + '...',

                  model_answer_length:
                    String(
                      question.model_answer || ''
                    ).length,
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

        console.log(
          '📤 Authenticated answer key payload:',
          data
        )


        const result =
          await answerKeyService.create(
            data
          )

        const normalizedResult =
          normalizeAnswerKeyData(result)


        // ----------------------------------------------------
        // Update store
        // ----------------------------------------------------

        set((state) => ({

          answerKeys: [
            ...state.answerKeys,

            {
              id:
                normalizedResult.id ||
                getAnswerKeyId(
                  normalizedResult
                ),

              name:
                normalizedResult.name,

              subject:
                normalizedResult.subject,

              subject_code:
                normalizedResult.subject_code,

              college_name:
                normalizedResult.college_name,

              department:
                normalizedResult.department,

              semester:
                normalizedResult.semester,

              examination_type:
                normalizedResult.examination_type,

              academic_year:
                normalizedResult.academic_year,

              examination_date:
                normalizedResult.examination_date,

              total_marks:
                normalizedResult.total_marks,

              duration:
                normalizedResult.duration,

              total_questions:
                normalizedResult.total_questions,

              created_at:
                normalizedResult.created_at,
            },
          ],

          currentAnswerKey:
            normalizedResult,

          isLoading:
            false,

          error:
            null,
        }))


        console.log(
          '✅ Authenticated answer key created successfully'
        )

        return normalizedResult

      } catch (error: any) {

        console.error(
          '❌ Create answer key error:',
          error
        )


        const message =
          error?.response?.data?.message ||
          error?.message ||
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
        //
        // Public flow MUST use createPublic().
        //
        // It must NOT call create().
        // ----------------------------------------------------

        const result =
          await answerKeyService.createPublic(
            data
          )

        const normalizedResult =
          normalizeAnswerKeyData(result)


        console.log(
          '✅ Public answer key created:',
          getAnswerKeyId(
            normalizedResult
          )
        )


        // ----------------------------------------------------
        // Add newly created key to local store.
        // ----------------------------------------------------

        set((state) => ({

          answerKeys: [
            ...state.answerKeys,

            {
              id:
                normalizedResult.id ||
                getAnswerKeyId(
                  normalizedResult
                ),

              name:
                normalizedResult.name,

              subject:
                normalizedResult.subject,

              subject_code:
                normalizedResult.subject_code,

              college_name:
                normalizedResult.college_name,

              department:
                normalizedResult.department,

              semester:
                normalizedResult.semester,

              examination_type:
                normalizedResult.examination_type,

              academic_year:
                normalizedResult.academic_year,

              examination_date:
                normalizedResult.examination_date,

              total_marks:
                normalizedResult.total_marks,

              duration:
                normalizedResult.duration,

              total_questions:
                normalizedResult.total_questions,

              created_at:
                normalizedResult.created_at,
            },
          ],

          currentAnswerKey:
            normalizedResult,

          isLoading:
            false,

          error:
            null,
        }))


        return normalizedResult

      } catch (error: any) {

        console.error(
          '❌ Public create answer key error:',
          error
        )


        const message =
          error?.response?.data?.message ||
          error?.message ||
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
    // PUBLIC / GUEST LIST
    // ========================================================

    listPublic: async (): Promise<AnswerKeyListItem[]> => {

      set({
        isLoading: true,
        error: null,
      })

      try {
        console.log('🌐 Fetching public answer keys...')

        const data =
          await answerKeyService.listPublic()

        const normalizedData =
          Array.isArray(data) ? data : []

        set({
          answerKeys: normalizedData,
          isLoading: false,
          error: null,
        })

        console.log(
          `✅ Public answer keys fetched: ${normalizedData.length}`
        )

        return normalizedData
      } catch (error: any) {
        console.error(
          '❌ Fetch public answer keys error:',
          error
        )

        const message =
          error?.response?.data?.message ||
          error?.message ||
          'Failed to fetch public answer keys'

        set({
          error: message,
          isLoading: false,
        })

        throw error
      }
    },


    // ========================================================
    // PUBLIC / GUEST FETCH BY ID
    // ========================================================

    fetchByIdPublic: async (
      id: string
    ): Promise<AnswerKey | null> => {

      set({
        isLoading: true,
        error: null,
      })

      try {
        console.log(
          '🌐 Fetching public answer key:',
          id
        )

        const data =
          await answerKeyService.getPublicById(id)

        const normalizedData =
          normalizeAnswerKeyData(data)

        set({
          currentAnswerKey: normalizedData,
          isLoading: false,
          error: null,
        })

        console.log(
          '✅ Public answer key loaded:',
          getAnswerKeyId(normalizedData)
        )

        return normalizedData
      } catch (error: any) {
        console.error(
          '❌ Fetch public answer key by ID error:',
          error
        )

        const message =
          error?.response?.data?.message ||
          error?.message ||
          `Failed to fetch answer key ${id}`

        set({
          error: message,
          isLoading: false,
        })

        return null
      }
    },


    // ========================================================
    // PUBLIC / GUEST UPDATE
    // ========================================================

    updatePublic: async (
      id: string,
      data: Partial<AnswerKeyCreateData>
    ): Promise<AnswerKey> => {

      set({
        isLoading: true,
        error: null,
      })

      try {
        console.log(
          '🌐 Updating public answer key:',
          id
        )

        const result =
          await answerKeyService.updatePublic(
            id,
            data
          )

        const normalizedResult =
          normalizeAnswerKeyData(result)

        set((state) => ({
          answerKeys: state.answerKeys.map(
            (key) =>
              key.id === id
                ? {
                  id:
                    normalizedResult.id ||
                    getAnswerKeyId(normalizedResult),
                  name: normalizedResult.name,
                  subject: normalizedResult.subject,
                  subject_code: normalizedResult.subject_code,
                  college_name: normalizedResult.college_name,
                  department: normalizedResult.department,
                  semester: normalizedResult.semester,
                  examination_type: normalizedResult.examination_type,
                  academic_year: normalizedResult.academic_year,
                  examination_date: normalizedResult.examination_date,
                  total_marks: normalizedResult.total_marks,
                  duration: normalizedResult.duration,
                  total_questions: normalizedResult.total_questions,
                  created_at: normalizedResult.created_at,
                }
                : key
          ),
          currentAnswerKey: normalizedResult,
          isLoading: false,
          error: null,
        }))

        console.log(
          '✅ Public answer key updated successfully'
        )

        return normalizedResult
      } catch (error: any) {
        console.error(
          '❌ Update public answer key error:',
          error
        )

        const message =
          error?.response?.data?.message ||
          error?.message ||
          'Failed to update public answer key'

        set({
          error: message,
          isLoading: false,
        })

        throw error
      }
    },


    // ========================================================
    // PUBLIC / GUEST DELETE
    // ========================================================

    deletePublic: async (
      id: string
    ): Promise<void> => {

      set({
        isLoading: true,
        error: null,
      })

      try {
        console.log(
          '🌐 Deleting public answer key:',
          id
        )

        await answerKeyService.deletePublic(id)

        set((state) => ({
          answerKeys: state.answerKeys.filter(
            (key) => key.id !== id
          ),
          currentAnswerKey:
            state.currentAnswerKey?.id === id
              ? null
              : state.currentAnswerKey,
          selectedKeyId:
            state.selectedKeyId === id
              ? null
              : state.selectedKeyId,
          isLoading: false,
          error: null,
        }))

        console.log(
          '✅ Public answer key deleted successfully'
        )
      } catch (error: any) {
        console.error(
          '❌ Delete public answer key error:',
          error
        )

        const message =
          error?.response?.data?.message ||
          error?.message ||
          'Failed to delete public answer key'

        set({
          error: message,
          isLoading: false,
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

        const normalizedKey =
          normalizeAnswerKeyData(
            answerKey
          )


        answerKeyService.downloadJSON(
          normalizedKey
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

        /*
         * Fetch and normalize the key first.
         *
         * This ensures section information and MCQ aliases
         * are available even if the backend response uses
         * an older format.
         */

        const key =
          await answerKeyService.getById(id)

        const normalizedKey =
          normalizeAnswerKeyData(
            key
          )


        answerKeyService.downloadJSON(
          normalizedKey
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
            error?.response?.data?.message ||
            error?.message ||
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

        const normalizedResult =
          normalizeAnswerKeyData(
            result
          )


        set((state) => ({

          answerKeys:
            state.answerKeys.map(
              (key) =>
                key.id === id

                  ? {
                    id:
                      normalizedResult.id ||
                      getAnswerKeyId(
                        normalizedResult
                      ),

                    name:
                      normalizedResult.name,

                    subject:
                      normalizedResult.subject,

                    subject_code:
                      normalizedResult.subject_code,

                    college_name:
                      normalizedResult.college_name,

                    department:
                      normalizedResult.department,

                    semester:
                      normalizedResult.semester,

                    examination_type:
                      normalizedResult.examination_type,

                    academic_year:
                      normalizedResult.academic_year,

                    examination_date:
                      normalizedResult.examination_date,

                    total_marks:
                      normalizedResult.total_marks,

                    duration:
                      normalizedResult.duration,

                    total_questions:
                      normalizedResult.total_questions,

                    created_at:
                      normalizedResult.created_at,
                  }

                  : key
            ),

          currentAnswerKey:
            normalizedResult,

          isLoading:
            false,

          error:
            null,
        }))


        console.log(
          '✅ Answer key updated successfully'
        )

        return normalizedResult

      } catch (error: any) {

        console.error(
          '❌ Update answer key error:',
          error
        )


        set({

          error:
            error?.response?.data?.message ||
            error?.message ||
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


        console.log(
          '✅ Answer key deleted successfully'
        )

      } catch (error: any) {

        console.error(
          '❌ Delete answer key error:',
          error
        )


        set({

          error:
            error?.response?.data?.message ||
            error?.message ||
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

      console.log(
        '🎯 Answer key selected for evaluation:',
        id
      )
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