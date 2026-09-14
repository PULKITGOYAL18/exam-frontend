// src/modules/answer-key/types.ts

export interface RubricCriterionForm {
  name: string
  marks: number
  description: string
  required: boolean
}

export interface SubPartForm {
  id: string
  question_text: string
  model_answer: string
  max_marks: number
  question_type: 'theory' | 'numerical' | 'diagram' | 'mixed'
  diagram_required: boolean
  diagram_weightage: number
  key_points: string[]
  keywords: string[]
  rubric: RubricCriterionForm[]
}

export interface QuestionForm {
  id: string
  question_number: string
  question_text: string
  model_answer: string
  max_marks: number
  question_type: 'theory' | 'numerical' | 'diagram' | 'mixed'
  diagram_required: boolean
  diagram_weightage: number
  key_points: string[]
  keywords: string[]
  rubric: RubricCriterionForm[]
  sub_parts: SubPartForm[]
}

export interface SectionForm {
  id: string
  name: string
  description: string
  instruction: string
  questions: QuestionForm[]
}

// For API submission
export interface AnswerKeyQuestion {
  id: number
  question_number: string
  question_text: string
  model_answer: string
  max_marks: number
  question_type: string
  diagram_required: boolean
  diagram_weightage: number
  key_points: string[]
  keywords: string[]
  rubric: RubricCriterionForm[]
  sub_parts?: SubPartForm[]
}

export interface AnswerKeySection {
  id: string
  name: string
  description: string
  instruction: string
  questions: AnswerKeyQuestion[]
}

export interface CreateAnswerKeyData {
  name: string
  subject: string
  department: string
  semester: number
  total_marks: number
  total_questions: number
  sections: AnswerKeySection[]
  created_by: string
}

// Store types
export interface AnswerKey {
  id: string
  name: string
  subject: string
  department: string
  semester: number
  total_marks: number
  total_questions: number
  sections: AnswerKeySection[]
  created_by: string
  created_at: string
  updated_at: string
}

export interface AnswerKeyListResponse {
  items: AnswerKey[]
  total: number
  page: number
  limit: number
}

// Legacy support (if needed for backwards compatibility)
export interface AnswerKeyQuestionForm {
  id: number
  question_text: string
  model_answer: string
  max_marks: number
  question_type: string
  diagram_required: boolean
  diagram_weightage: number
  key_points: string[]
  keywords: string[]
  rubric: RubricCriterionForm[]
}