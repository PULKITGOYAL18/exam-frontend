// src/modules/answer-key/create/StepCreateAnswerKey.tsx
// Unified, easy-to-use answer-key creator.
// Keeps the existing create/update store contract and sends BOTH
// `sections` and top-level `questions` to the backend.

import { useMemo, useState } from 'react'
import { useAnswerKeyStore } from '@/stores/answerKeyStore'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type QuestionType =
  | 'mcq'
  | 'true_false'
  | 'one_word'
  | 'fill_blank'
  | 'one_line'
  | 'short_answer'
  | 'long_answer'
  | 'numerical'
  | 'diagram'
  | 'mixed'

type MarkingStrictness = 'easy' | 'moderate' | 'hard'
type EvaluationMode = 'automatic' | 'ai_human' | 'human'
type AttemptMode = 'all' | 'any'

interface RubricItem {
  id: string
  name: string
  marks: number
  description: string
  required: boolean
}

interface AnswerConfig {
  // MCQ
  options: string[]
  correct_option_index: number | null
  accepted_answer_formats: string[]
  accepted_answers: string[]

  // True/False
  correct_boolean: boolean | null

  // One-word / fill blank / one-line
  alternate_answers: string[]
  case_insensitive: boolean
  ignore_extra_spaces: boolean

  // Numerical
  final_answer: string
  tolerance: string
  formula: string
  solution_steps: string[]

  // General evaluator hints
  meaningful_content_threshold: number
  partial_credit: boolean
}

interface Question {
  id: string
  question_number: string
  question_text: string
  model_answer: string
  max_marks: number
  question_type: QuestionType
  diagram_required: boolean
  diagram_weightage: number
  key_points: string[]
  keywords: string[]
  rubric: RubricItem[]
  sub_parts: Question[]
  marking_strictness: MarkingStrictness
  evaluation_mode: EvaluationMode
  answer_config: AnswerConfig
}

interface AttemptRule {
  mode: AttemptMode
  questions_to_attempt: number
}

interface Section {
  id: string
  name: string
  description: string
  instruction: string
  attempt_rule: AttemptRule
  questions: Question[]
}

interface StepCreateAnswerKeyProps {
  onSave: () => void
  onCancel: () => void
  initialAnswerKey?: any
  onUpdate?: (id: string, data: any) => Promise<void>
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'mcq', label: 'MCQ' },
  { value: 'true_false', label: 'True / False' },
  { value: 'one_word', label: 'One Word' },
  { value: 'fill_blank', label: 'Fill in the Blank' },
  { value: 'one_line', label: 'One Line' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'long_answer', label: 'Long Answer' },
  { value: 'numerical', label: 'Numerical' },
  { value: 'diagram', label: 'Diagram' },
  { value: 'mixed', label: 'Mixed / Other' }
]

const COMMON_KEY_POINTS = [
  'Definition / core concept',
  'Key characteristics',
  'Working / mechanism',
  'Important components',
  'Steps / procedure',
  'Advantages / significance',
  'Limitations',
  'Comparison / differences',
  'Example / application',
  'Conclusion'
]

const COMMON_KEYWORDS: Record<string, string[]> = {
  'Machine Learning': [
    'supervised', 'unsupervised', 'training', 'testing', 'model', 'algorithm',
    'classification', 'regression', 'prediction', 'features', 'labels', 'dataset'
  ],
  'Artificial Intelligence': [
    'agent', 'environment', 'state', 'action', 'reward', 'learning', 'decision',
    'planning', 'knowledge', 'intelligent system'
  ],
  'Data Science': [
    'dataset', 'features', 'labels', 'training', 'validation', 'testing',
    'accuracy', 'precision', 'recall', 'f1-score', 'confusion matrix'
  ],
  Programming: [
    'function', 'class', 'object', 'method', 'variable', 'loop', 'condition',
    'array', 'list', 'dictionary', 'algorithm'
  ],
  Mathematics: [
    'formula', 'equation', 'calculation', 'mean', 'median', 'mode',
    'variance', 'standard deviation', 'probability'
  ]
}

const RUBRIC_TEMPLATES: Record<string, { name: string; criteria: { name: string; marks: number; description: string }[] }> = {
  mcq: {
    name: 'MCQ (1 mark)',
    criteria: [{ name: 'Correct Option', marks: 1, description: 'Selected the correct option' }]
  },
  'theory-standard': {
    name: 'Standard Theory (5 criteria)',
    criteria: [
      { name: 'Definition / Concept Understanding', marks: 3, description: 'Clear understanding of core concept' },
      { name: 'Explanation Depth', marks: 2, description: 'Thorough explanation with details' },
      { name: 'Relevant Examples', marks: 2, description: 'Appropriate and relevant examples' },
      { name: 'Structure and Clarity', marks: 2, description: 'Well-organized and clear' },
      { name: 'Accuracy', marks: 1, description: 'Factually correct information' }
    ]
  },
  'theory-detailed': {
    name: 'Detailed Theory (4 criteria)',
    criteria: [
      { name: 'Core Concept Accuracy', marks: 4, description: 'Accurate definition and explanation' },
      { name: 'Key Points Coverage', marks: 3, description: 'Covers all important points' },
      { name: 'Examples and Applications', marks: 2, description: 'Real-world applications' },
      { name: 'Clarity and Organization', marks: 1, description: 'Clear and well-structured' }
    ]
  },
  'numerical-standard': {
    name: 'Standard Numerical (4 criteria)',
    criteria: [
      { name: 'Correct Formula / Equation', marks: 3, description: 'Uses correct formula' },
      { name: 'Steps and Working', marks: 3, description: 'Shows all necessary steps' },
      { name: 'Accurate Calculation', marks: 3, description: 'All calculations correct' },
      { name: 'Final Answer with Units', marks: 1, description: 'Correct final answer' }
    ]
  },
  'short-answer': {
    name: 'Short Answer (3 criteria)',
    criteria: [
      { name: 'Key Concept Understanding', marks: 2, description: 'Demonstrates understanding' },
      { name: 'Key Points Covered', marks: 2, description: 'Covers important points' },
      { name: 'Clarity and Precision', marks: 1, description: 'Clear and precise answer' }
    ]
  },
  simple: {
    name: 'Simple (2 criteria)',
    criteria: [
      { name: 'Correct Answer', marks: 7, description: 'Answer is correct' },
      { name: 'Explanation', marks: 3, description: 'Good explanation' }
    ]
  }
}

function scaleRubricToMarks(criteria: { name: string; marks: number; description: string }[], maxMarks: number): RubricItem[] {
  if (!criteria.length || maxMarks <= 0) return []
  const sourceTotal = criteria.reduce((sum, item) => sum + Number(item.marks || 0), 0)
  if (sourceTotal <= 0) {
    return criteria.map((item, index) => ({
      id: id(`rubric-template-${index}`),
      name: item.name,
      marks: index === criteria.length - 1 ? maxMarks : 0,
      description: item.description,
      required: true
    }))
  }
  const exact = criteria.map(item => (item.marks / sourceTotal) * maxMarks)
  const values = exact.map(Math.floor)
  let allocated = values.reduce((sum, value) => sum + value, 0)
  const order = exact.map((value, index) => ({ index, remainder: value - values[index] })).sort((a, b) => b.remainder - a.remainder)
  let cursor = 0
  while (allocated < maxMarks && order.length) {
    values[order[cursor % order.length].index] += 1
    allocated += 1
    cursor += 1
  }
  return criteria.map((item, index) => ({
    id: id(`rubric-template-${index}`),
    name: item.name,
    marks: values[index],
    description: item.description,
    required: true
  }))
}

const STRICTNESS_INFO: Record<MarkingStrictness, { title: string; text: string; threshold: number }> = {
  easy: {
    title: 'Easy / Lenient',
    text: 'Around 30% meaningful coverage can receive high partial credit, depending on rubric and correctness.',
    threshold: 30
  },
  moderate: {
    title: 'Moderate / Balanced',
    text: 'Around 50% meaningful coverage is a useful mid-point; marks depend on the rubric and correctness.',
    threshold: 50
  },
  hard: {
    title: 'Hard / Strict',
    text: 'Around 60–70% meaningful coverage is expected for strong marks; missing important points reduces credit.',
    threshold: 65
  }
}

// -----------------------------------------------------------------------------
// Utility functions
// -----------------------------------------------------------------------------

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function emptyAnswerConfig(): AnswerConfig {
  return {
    options: ['', '', '', ''],
    correct_option_index: null,
    accepted_answer_formats: ['letter', 'roman', 'full_text', 'option_text'],
    accepted_answers: [],
    correct_boolean: null,
    alternate_answers: [],
    case_insensitive: true,
    ignore_extra_spaces: true,
    final_answer: '',
    tolerance: '',
    formula: '',
    solution_steps: [],
    meaningful_content_threshold: 50,
    partial_credit: true
  }
}

function makeRubric(count = 1): RubricItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: id(`rubric-${index}`),
    name: '',
    marks: 0,
    description: '',
    required: true
  }))
}

function makeQuestion(
  type: QuestionType = 'mcq',
  marks = 1,
  number = 'Q1'
): Question {
  const answerConfig = emptyAnswerConfig()
  answerConfig.meaningful_content_threshold = 50
  return {
    id: id('question'),
    question_number: number,
    question_text: '',
    model_answer: '',
    max_marks: marks,
    question_type: type,
    diagram_required: false,
    diagram_weightage: 0,
    key_points: [],
    keywords: [],
    rubric: makeRubric(1),
    sub_parts: [],
    marking_strictness: 'moderate',
    evaluation_mode: 'ai_human',
    answer_config: answerConfig
  }
}

function makeSection(name: string, description: string, type: 'A' | 'B' | 'C'): Section {
  const isA = type === 'A'
  const isB = type === 'B'
  const marks = isA ? 1 : isB ? 10 : 5
  const questionType: QuestionType = isA ? 'mcq' : isB ? 'long_answer' : 'short_answer'
  return {
    id: id('section'),
    name,
    description,
    instruction: isA
      ? 'Attempt all objective / short-objective questions.'
      : isB
        ? 'Attempt questions according to the attempt rule. Write complete answers where required.'
        : 'Attempt questions according to the attempt rule. Answer briefly and precisely.',
    attempt_rule: { mode: 'all', questions_to_attempt: 0 },
    // Start with no questions. Faculty adds them explicitly with + Add Question.
    questions: []
  }
}

function normalizeStringArray(value: any): string[] {
  return Array.isArray(value) ? value.map(String).filter(v => v.trim()) : []
}

function normalizeRubric(value: any, marks: number): RubricItem[] {
  if (!Array.isArray(value) || value.length === 0) return makeRubric(1)
  return value.map((item: any) => ({
    id: String(item?.id || id('rubric')),
    name: String(item?.name || ''),
    marks: Number(item?.marks) || 0,
    description: String(item?.description || ''),
    required: item?.required !== false
  }))
}

function normalizeQuestion(raw: any, index: number): Question {
  const type = (raw?.question_type || raw?.answer_type || 'mcq') as QuestionType
  const answer = raw?.answer_config || raw?.mcq_answer || {}
  const options = Array.isArray(raw?.options)
    ? raw.options.map((v: any) => String(v))
    : Array.isArray(answer?.options)
      ? answer.options.map((v: any) => String(v))
      : ['', '', '', '']

  const config = emptyAnswerConfig()
  config.options = [...options, '', '', '', ''].slice(0, 4)
  config.correct_option_index =
    typeof answer?.correct_option_index === 'number'
      ? answer.correct_option_index
      : typeof raw?.correct_option_index === 'number'
        ? raw.correct_option_index
        : null
  config.accepted_answer_formats = normalizeStringArray(
    answer?.accepted_answer_formats || raw?.accepted_answer_formats
  )
  if (!config.accepted_answer_formats.length && type === 'mcq') {
    config.accepted_answer_formats = ['letter', 'roman', 'full_text', 'option_text']
  }
  config.accepted_answers = normalizeStringArray(answer?.accepted_answers || raw?.accepted_answers)
  config.correct_boolean =
    typeof answer?.correct_boolean === 'boolean'
      ? answer.correct_boolean
      : typeof raw?.correct_boolean === 'boolean'
        ? raw.correct_boolean
        : null
  config.alternate_answers = normalizeStringArray(
    answer?.alternate_answers || raw?.alternate_answers
  )
  config.case_insensitive = answer?.case_insensitive !== false
  config.ignore_extra_spaces = answer?.ignore_extra_spaces !== false
  config.final_answer = String(answer?.final_answer || raw?.final_answer || '')
  config.tolerance = String(answer?.tolerance || raw?.tolerance || '')
  config.formula = String(answer?.formula || raw?.formula || '')
  config.solution_steps = normalizeStringArray(answer?.solution_steps || raw?.solution_steps)
  config.meaningful_content_threshold =
    Number(answer?.meaningful_content_threshold || raw?.meaningful_content_threshold) ||
    (raw?.marking_strictness === 'easy' ? 30 : raw?.marking_strictness === 'hard' ? 65 : 50)
  config.partial_credit = answer?.partial_credit !== false

  const subParts = Array.isArray(raw?.sub_parts)
    ? raw.sub_parts.map((sp: any, i: number) => normalizeQuestion(sp, i))
    : []

  return {
    id: String(raw?.id || id('question')),
    question_number: String(raw?.question_number || `Q${index + 1}`),
    question_text: String(raw?.question_text || ''),
    model_answer: String(raw?.model_answer || ''),
    max_marks: Number(raw?.max_marks) || 1,
    question_type: type,
    diagram_required: Boolean(raw?.diagram_required),
    diagram_weightage: Number(raw?.diagram_weightage) || 0,
    key_points: normalizeStringArray(raw?.key_points),
    keywords: normalizeStringArray(raw?.keywords),
    rubric: normalizeRubric(raw?.rubric, Number(raw?.max_marks) || 1),
    sub_parts: subParts,
    marking_strictness: raw?.marking_strictness || 'moderate',
    evaluation_mode: raw?.evaluation_mode || 'ai_human',
    answer_config: config
  }
}

function normalizeSection(raw: any, index: number): Section {
  const questions = Array.isArray(raw?.questions)
    ? raw.questions.map((q: any, qi: number) => normalizeQuestion(q, qi))
    : []
  const total = questions.length || 1
  const rawRule = raw?.attempt_rule || {}
  return {
    id: String(raw?.id || id('section')),
    name: String(raw?.name || `Section ${String.fromCharCode(65 + index)}`),
    description: String(raw?.description || ''),
    instruction: String(raw?.instruction || ''),
    attempt_rule: {
      mode: rawRule?.mode === 'any' || raw?.all_compulsory === false ? 'any' : 'all',
      questions_to_attempt: Math.min(
        total,
        Math.max(1, Number(rawRule?.questions_to_attempt || raw?.questions_to_attempt || total))
      )
    },
    questions
  }
}

function initialSections(initialAnswerKey: any): Section[] {
  if (Array.isArray(initialAnswerKey?.sections) && initialAnswerKey.sections.length) {
    return initialAnswerKey.sections.map((s: any, i: number) => normalizeSection(s, i))
  }
  if (Array.isArray(initialAnswerKey?.questions) && initialAnswerKey.questions.length) {
    return [
      {
        ...makeSection('Section A: Objective / Short Objective', 'MCQ, True/False, One Word, Fill Blank and One Line', 'A'),
        questions: initialAnswerKey.questions.map((q: any, i: number) => normalizeQuestion(q, i))
      }
    ]
  }
  return [
    makeSection('Section A: Objective / Short Objective', 'MCQ, True/False, One Word, Fill Blank and One Line', 'A'),
    makeSection('Section B: Descriptive / Long Answer', 'Long-answer questions with flexible marking', 'B'),
    makeSection('Section C: Short Answer', 'Short answers and questions with sub-parts', 'C')
  ]
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\s+/g, ' ').trim()
}

function mcqAliases(question: Question): string[] {
  const index = question.answer_config.correct_option_index
  if (index === null || index < 0 || index > 3) return question.answer_config.accepted_answers
  const letter = ['A', 'B', 'C', 'D'][index]
  const roman = ['I', 'II', 'III', 'IV'][index]
  const number = String(index + 1)
  const text = question.answer_config.options[index]?.trim() || ''
  const aliases = [
    letter, letter.toLowerCase(), roman, roman.toLowerCase(), number,
    `Option ${letter}`, `option ${letter}`, `Option ${number}`, `option ${number}`,
    `${letter}.`, `${letter})`, `${roman}.`, `${roman})`, `${number}.`, `${number})`
  ]
  if (text) {
    aliases.push(text, `${letter}. ${text}`, `${letter}) ${text}`, `${roman}. ${text}`, `${roman}) ${text}`, `${number}. ${text}`, `${number}) ${text}`)
  }
  return Array.from(new Set([...aliases, ...question.answer_config.accepted_answers].map(normalizeText)))
}

function defaultRubricForType(type: QuestionType, marks: number): RubricItem[] {
  if (type === 'mcq' || type === 'true_false' || type === 'one_word' || type === 'fill_blank') {
    return [{ id: id('rubric'), name: 'Correct Answer', marks, description: 'Correct answer is selected / entered.', required: true }]
  }
  const templates = type === 'short_answer'
    ? [
      ['Key concept', 2],
      ['Important points', 2],
      ['Clarity / accuracy', 1]
    ]
    : [
      ['Core concept / definition', 3],
      ['Key points / explanation', 3],
      ['Example / application', 2],
      ['Accuracy / presentation', 2]
    ]
  const sourceTotal = templates.reduce((s, [, m]) => s + Number(m), 0)
  let allocated = 0
  return templates.map(([name, sourceMarks], index) => {
    const value = index === templates.length - 1
      ? Math.max(0, marks - allocated)
      : Math.floor((Number(sourceMarks) / sourceTotal) * marks)
    allocated += value
    return {
      id: id('rubric'),
      name: String(name),
      marks: value,
      description: '',
      required: true
    }
  })
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function StepCreateAnswerKey({
  onSave,
  onCancel,
  initialAnswerKey,
  onUpdate
}: StepCreateAnswerKeyProps) {
  const { create, isLoading, error } = useAnswerKeyStore()

  const [name, setName] = useState(String(initialAnswerKey?.name || ''))
  const [subject, setSubject] = useState(String(initialAnswerKey?.subject || ''))
  const [subjectCode, setSubjectCode] = useState(String(initialAnswerKey?.subject_code || ''))
  const [collegeName, setCollegeName] = useState(String(initialAnswerKey?.college_name || ''))
  const [department, setDepartment] = useState(String(initialAnswerKey?.department || 'Computer Science'))
  const [semester, setSemester] = useState(Number(initialAnswerKey?.semester) || 5)
  const [examinationType, setExaminationType] = useState(String(initialAnswerKey?.examination_type || 'End Semester'))
  const [academicYear, setAcademicYear] = useState(String(initialAnswerKey?.academic_year || '2026-27'))
  const [examinationDate, setExaminationDate] = useState(String(initialAnswerKey?.examination_date || ''))
  const [duration, setDuration] = useState(String(initialAnswerKey?.duration || '3 Hours'))
  const [declaredTotalMarks, setDeclaredTotalMarks] = useState(Number(initialAnswerKey?.total_marks) || 100)

  const [sections, setSections] = useState<Section[]>(() => initialSections(initialAnswerKey))
  const [activeSection, setActiveSection] = useState(0)
  const [openQuestions, setOpenQuestions] = useState<Record<string, boolean>>({})
  const [step, setStep] = useState<'edit' | 'review'>('edit')
  const [notice, setNotice] = useState('')

  const totalQuestionCount = useMemo(
    () => sections.reduce((sum, section) => sum + section.questions.length, 0),
    [sections]
  )

  const calculatedMarks = useMemo(
    () => sections.reduce(
      (sum, section) => sum + section.questions.reduce(
        (sectionSum, question) => {
          if (question.sub_parts.length) {
            return sectionSum + question.sub_parts.reduce((s, sp) => s + Number(sp.max_marks || 0), 0)
          }
          return sectionSum + Number(question.max_marks || 0)
        },
        0
      ),
      0
    ),
    [sections]
  )

  const getSubjectKeywords = () => {
    const match = Object.keys(COMMON_KEYWORDS).find(key => subject.toLowerCase().includes(key.toLowerCase()))
    return match ? COMMON_KEYWORDS[match] : []
  }

  // ---------------------------------------------------------------------------
  // Generic immutable update helpers
  // ---------------------------------------------------------------------------

  const updateSection = (sectionId: string, patch: Partial<Section>) => {
    setSections(prev => prev.map(section => section.id === sectionId ? { ...section, ...patch } : section))
  }

  const updateQuestion = (sectionId: string, questionId: string, patch: Partial<Question>) => {
    setSections(prev => prev.map(section => section.id === sectionId
      ? {
        ...section,
        questions: section.questions.map(question => question.id === questionId ? { ...question, ...patch } : question)
      }
      : section
    ))
  }

  const updateSubPart = (sectionId: string, questionId: string, subPartId: string, patch: Partial<Question>) => {
    setSections(prev => prev.map(section => section.id === sectionId
      ? {
        ...section,
        questions: section.questions.map(question => question.id === questionId
          ? { ...question, sub_parts: question.sub_parts.map(sp => sp.id === subPartId ? { ...sp, ...patch } : sp) }
          : question)
      }
      : section
    ))
  }

  const addSection = (type?: 'A' | 'B' | 'C') => {
    const letter = String.fromCharCode(65 + sections.length)
    const section = type === 'A'
      ? makeSection('Section A: Objective / Short Objective', 'MCQ, True/False, One Word, Fill Blank and One Line', 'A')
      : type === 'B'
        ? makeSection('Section B: Descriptive / Long Answer', 'Long-answer questions with flexible marking', 'B')
        : type === 'C'
          ? makeSection('Section C: Short Answer', 'Short answers and questions with sub-parts', 'C')
          : {
            id: id('section'),
            name: `Section ${letter}`,
            description: '',
            instruction: 'Enter section instructions.',
            attempt_rule: { mode: 'all' as AttemptMode, questions_to_attempt: 0 },
            questions: []
          }
    setSections(prev => [...prev, section])
    setActiveSection(sections.length)
  }

  const removeSection = (sectionId: string) => {
    if (sections.length <= 1) {
      setNotice('At least one section is required.')
      return
    }
    setSections(prev => prev.filter(s => s.id !== sectionId))
    setActiveSection(prev => Math.min(prev, Math.max(0, sections.length - 2)))
  }

  const addQuestion = (sectionId: string) => {
    setSections(prev => prev.map(section => {
      if (section.id !== sectionId) return section
      const index = section.questions.length + 1
      const first = section.questions[0]
      const isA = section.name.toLowerCase().includes('section a')
      const isB = section.name.toLowerCase().includes('section b')
      const isC = section.name.toLowerCase().includes('section c')
      const type: QuestionType = isA ? 'mcq' : isB ? 'long_answer' : 'short_answer'
      const marks = first?.max_marks || (isA ? 1 : isB ? 10 : isC ? 5 : 5)
      const prefix = isA ? 'A' : isB ? 'B' : isC ? 'C' : 'Q'
      return { ...section, questions: [...section.questions, makeQuestion(type, marks, `${prefix}${index}`)] }
    }))
  }

  const removeQuestion = (sectionId: string, questionId: string) => {
    setSections(prev => prev.map(section => {
      if (section.id !== sectionId) return section
      return { ...section, questions: section.questions.filter(q => q.id !== questionId) }
    }))
  }

  const applyRubricTemplate = (sectionId: string, question: Question, templateKey: string) => {
    const template = RUBRIC_TEMPLATES[templateKey]
    if (!template) return
    const marks = Math.max(1, Number(question.max_marks) || 1)
    updateQuestion(sectionId, question.id, { rubric: scaleRubricToMarks(template.criteria, marks) })
  }

  const addSubPart = (sectionId: string, questionId: string) => {
    setSections(prev => prev.map(section => section.id === sectionId
      ? {
        ...section,
        questions: section.questions.map(question => question.id === questionId
          ? { ...question, sub_parts: [...question.sub_parts, makeQuestion('short_answer', 2, `${question.question_number}.${question.sub_parts.length + 1}`)] }
          : question)
      }
      : section
    ))
  }

  const removeSubPart = (sectionId: string, questionId: string, subPartId: string) => {
    setSections(prev => prev.map(section => section.id === sectionId
      ? {
        ...section,
        questions: section.questions.map(question => question.id === questionId
          ? { ...question, sub_parts: question.sub_parts.filter(sp => sp.id !== subPartId) }
          : question)
      }
      : section
    ))
  }

  // ---------------------------------------------------------------------------
  // Question-type helpers
  // ---------------------------------------------------------------------------

  const setQuestionType = (sectionId: string, question: Question, type: QuestionType) => {
    let patch: Partial<Question> = { question_type: type }
    const marks = Number(question.max_marks) || 1
    const config = { ...question.answer_config }

    if (type === 'mcq') {
      config.options = config.options.length === 4 ? config.options : ['', '', '', '']
      config.accepted_answer_formats = ['letter', 'roman', 'full_text', 'option_text']
      patch = { ...patch, max_marks: Math.min(marks, 10), answer_config: config }
    } else if (type === 'true_false') {
      patch = {
        ...patch,
        max_marks: marks || 1,
        model_answer: question.model_answer || '',
        answer_config: { ...config, correct_boolean: config.correct_boolean ?? true }
      }
    } else if (type === 'one_word' || type === 'fill_blank') {
      patch = { ...patch, max_marks: Math.min(marks || 1, 5), answer_config: { ...config, alternate_answers: config.alternate_answers || [] } }
    } else if (type === 'short_answer') {
      patch = { ...patch, max_marks: marks || 5, rubric: defaultRubricForType(type, marks || 5) }
    } else if (type === 'long_answer') {
      patch = { ...patch, max_marks: marks || 10, rubric: defaultRubricForType(type, marks || 10) }
    } else if (type === 'numerical') {
      patch = { ...patch, max_marks: marks || 5, rubric: defaultRubricForType('short_answer', marks || 5) }
    } else if (type === 'diagram') {
      patch = { ...patch, max_marks: marks || 5, diagram_required: true, diagram_weightage: Math.min(100, question.diagram_weightage || 50) }
    }
    updateQuestion(sectionId, question.id, patch)
  }

  const updateOptions = (sectionId: string, question: Question, index: number, value: string) => {
    const options = [...question.answer_config.options]
    options[index] = value
    updateQuestion(sectionId, question.id, { answer_config: { ...question.answer_config, options } })
  }

  const setCorrectMCQ = (sectionId: string, question: Question, index: number) => {
    const config = { ...question.answer_config, correct_option_index: index }
    const aliases = mcqAliases({ ...question, answer_config: config })
    updateQuestion(sectionId, question.id, { answer_config: { ...config, accepted_answers: aliases } })
  }

  const addListValue = (
    sectionId: string,
    question: Question,
    field: 'key_points' | 'keywords' | 'alternate_answers',
    value: string
  ) => {
    const clean = value.trim()
    if (!clean) return
    const existing = field === 'alternate_answers'
      ? question.answer_config.alternate_answers
      : question[field]
    if (existing.includes(clean)) return
    if (field === 'alternate_answers') {
      updateQuestion(sectionId, question.id, { answer_config: { ...question.answer_config, alternate_answers: [...existing, clean] } })
    } else {
      updateQuestion(sectionId, question.id, { [field]: [...existing, clean] } as Partial<Question>)
    }
  }

  const removeListValue = (
    sectionId: string,
    question: Question,
    field: 'key_points' | 'keywords' | 'alternate_answers',
    value: string
  ) => {
    if (field === 'alternate_answers') {
      updateQuestion(sectionId, question.id, { answer_config: { ...question.answer_config, alternate_answers: question.answer_config.alternate_answers.filter(v => v !== value) } })
    } else {
      updateQuestion(sectionId, question.id, { [field]: question[field].filter(v => v !== value) } as Partial<Question>)
    }
  }

  const addRubric = (sectionId: string, question: Question) => {
    updateQuestion(sectionId, question.id, { rubric: [...question.rubric, { id: id('rubric'), name: '', marks: 0, description: '', required: true }] })
  }

  const removeRubric = (sectionId: string, question: Question, rubricId: string) => {
    if (question.rubric.length <= 1) return
    updateQuestion(sectionId, question.id, { rubric: question.rubric.filter(r => r.id !== rubricId) })
  }

  const updateRubric = (sectionId: string, question: Question, rubricId: string, patch: Partial<RubricItem>) => {
    updateQuestion(sectionId, question.id, { rubric: question.rubric.map(r => r.id === rubricId ? { ...r, ...patch } : r) })
  }

  const applyRubric = (sectionId: string, question: Question) => {
    updateQuestion(sectionId, question.id, { rubric: defaultRubricForType(question.question_type, Number(question.max_marks) || 1) })
  }

  const applySuggestedPoints = (sectionId: string, question: Question) => {
    const points = COMMON_KEY_POINTS.slice(0, question.question_type === 'long_answer' ? 5 : 3)
    updateQuestion(sectionId, question.id, { key_points: Array.from(new Set([...question.key_points, ...points])) })
  }

  const applySuggestedKeywords = (sectionId: string, question: Question) => {
    updateQuestion(sectionId, question.id, { keywords: Array.from(new Set([...question.keywords, ...getSubjectKeywords().slice(0, 8)])) })
  }

  // ---------------------------------------------------------------------------
  // Validation and serialization
  // ---------------------------------------------------------------------------

  const validateQuestion = (section: Section, question: Question, path: string): string | null => {
    if (!question.question_text.trim() && question.sub_parts.length === 0) return `${path}: enter the question text.`
    if (question.sub_parts.length === 0 && Number(question.max_marks) <= 0) return `${path}: marks must be greater than 0.`

    if (question.question_type === 'mcq') {
      if (question.answer_config.options.some(option => !option.trim())) return `${path}: all four MCQ options are required.`
      if (question.answer_config.correct_option_index === null) return `${path}: select the correct MCQ option.`
    }
    if (question.question_type === 'true_false' && question.answer_config.correct_boolean === null) return `${path}: select True or False.`
    if ((question.question_type === 'one_word' || question.question_type === 'fill_blank') && !question.model_answer.trim() && question.answer_config.alternate_answers.length === 0) {
      return `${path}: enter the correct answer.`
    }
    if (['one_line', 'short_answer', 'long_answer', 'mixed', 'diagram'].includes(question.question_type) && !question.model_answer.trim()) {
      return `${path}: enter a model answer.`
    }
    if (question.diagram_required && (question.diagram_weightage < 0 || question.diagram_weightage > 100)) return `${path}: diagram weightage must be 0–100%.`

    if (question.sub_parts.length) {
      let subMarks = 0
      for (let i = 0; i < question.sub_parts.length; i += 1) {
        const errorText = validateQuestion(section, question.sub_parts[i], `${path}.${String.fromCharCode(97 + i)}`)
        if (errorText) return errorText
        subMarks += Number(question.sub_parts[i].max_marks) || 0
      }
      if (subMarks <= 0) return `${path}: sub-part marks must be greater than 0.`
    }

    const rubricMarks = question.rubric.filter(r => r.name.trim()).reduce((sum, r) => sum + Number(r.marks || 0), 0)
    if (rubricMarks > 0 && question.sub_parts.length === 0 && rubricMarks !== Number(question.max_marks)) {
      return `${path}: rubric total (${rubricMarks}) must equal question marks (${question.max_marks}).`
    }
    return null
  }

  const serializeQuestion = (question: Question, numberOverride?: string): any => {
    const config = question.answer_config
    const accepted = question.question_type === 'mcq'
      ? mcqAliases(question)
      : question.question_type === 'true_false'
        ? [
          config.correct_boolean ? 'true' : 'false',
          config.correct_boolean ? 't' : 'f',
          config.correct_boolean ? 'TRUE' : 'FALSE',
          config.correct_boolean ? 'True' : 'False'
        ]
        : question.question_type === 'one_word' || question.question_type === 'fill_blank'
          ? [question.model_answer, ...config.alternate_answers]
          : config.accepted_answers

    return {
      id: question.id,
      question_number: numberOverride || question.question_number,
      question_text: question.question_text.trim(),
      model_answer: question.model_answer.trim(),
      max_marks: Number(question.max_marks),
      question_type: question.question_type,
      answer_type: question.question_type,
      options: question.question_type === 'mcq' ? question.answer_config.options.map(v => v.trim()) : [],
      correct_option_index: question.question_type === 'mcq' ? question.answer_config.correct_option_index : undefined,
      correct_answer: accepted[0] || question.model_answer.trim(),
      accepted_answers: Array.from(new Set(accepted.map(v => normalizeText(String(v))).filter(Boolean))),
      accepted_answer_formats: question.answer_config.accepted_answer_formats,
      mcq_answer: question.question_type === 'mcq' ? {
        correct_answer: accepted[0] || '',
        accepted_answers: Array.from(new Set(accepted.map(v => normalizeText(String(v))).filter(Boolean))),
        option_labels: ['A', 'B', 'C', 'D'],
        roman_labels: ['I', 'II', 'III', 'IV'],
        numeric_labels: ['1', '2', '3', '4']
      } : undefined,
      alternate_answers: question.answer_config.alternate_answers,
      correct_boolean: question.question_type === 'true_false' ? question.answer_config.correct_boolean : undefined,
      case_insensitive: question.answer_config.case_insensitive,
      ignore_extra_spaces: question.answer_config.ignore_extra_spaces,
      final_answer: question.question_type === 'numerical' ? question.answer_config.final_answer : undefined,
      tolerance: question.question_type === 'numerical' ? question.answer_config.tolerance : undefined,
      formula: question.question_type === 'numerical' ? question.answer_config.formula : undefined,
      solution_steps: question.question_type === 'numerical' ? question.answer_config.solution_steps : undefined,
      diagram_required: Boolean(question.diagram_required),
      diagram_weightage: Number(question.diagram_weightage || 0),
      key_points: question.key_points.map(v => v.trim()).filter(Boolean),
      keywords: question.keywords.map(v => v.trim()).filter(Boolean),
      rubric: question.rubric.filter(r => r.name.trim()).map(r => ({
        name: r.name.trim(),
        marks: Number(r.marks) || 0,
        description: r.description.trim(),
        required: r.required !== false
      })),
      marking_strictness: question.marking_strictness,
      marking_policy: {
        name: STRICTNESS_INFO[question.marking_strictness].title,
        meaningful_content_threshold: Number(question.answer_config.meaningful_content_threshold),
        partial_credit: Boolean(question.answer_config.partial_credit),
        description: STRICTNESS_INFO[question.marking_strictness].text,
        human_override: true
      },
      evaluation_mode: question.evaluation_mode,
      answer_config: {
        ...config,
        accepted_answers: accepted
      },
      sub_parts: question.sub_parts.map((sp, i) => serializeQuestion(sp, `${question.question_number}.${String.fromCharCode(97 + i)}`)),
      is_sub_question: question.sub_parts.length > 0
    }
  }

  const buildPayload = () => {
    const serializedSections = sections.map(section => ({
      id: section.id,
      name: section.name.trim(),
      description: section.description.trim(),
      instruction: section.instruction.trim(),
      attempt_rule: {
        mode: section.attempt_rule.mode,
        questions_to_attempt: section.attempt_rule.mode === 'all'
          ? section.questions.length
          : Math.min(section.questions.length, Number(section.attempt_rule.questions_to_attempt) || 1)
      },
      all_compulsory: section.attempt_rule.mode === 'all',
      total_questions: section.questions.length,
      questions_to_attempt: section.attempt_rule.mode === 'all'
        ? section.questions.length
        : Math.min(section.questions.length, Number(section.attempt_rule.questions_to_attempt) || 1),
      questions: section.questions.map(question => serializeQuestion(question))
    }))

    const questions = serializedSections.flatMap(section => section.questions)
    return {
      name: name.trim(),
      subject: subject.trim(),
      subject_code: subjectCode.trim(),
      college_name: collegeName.trim(),
      department: department.trim(),
      semester: Number(semester),
      examination_type: examinationType,
      academic_year: academicYear.trim(),
      examination_date: examinationDate,
      duration: duration.trim(),
      total_marks: calculatedMarks,
      declared_total_marks: Number(declaredTotalMarks),
      total_questions: questions.length,
      questions,
      sections: serializedSections,
      created_by: 'faculty',
      creation_mode: 'faculty'
    }
  }

  const handleReview = () => {
    setNotice('')
    if (!name.trim() || !subject.trim()) {
      setNotice('Please enter Answer Key Name and Subject.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    for (const section of sections) {
      if (!section.name.trim()) {
        setNotice('Every section must have a name.')
        return
      }
      if (!section.questions.length) {
        setNotice(`${section.name} must contain at least one question.`)
        return
      }
      if (section.attempt_rule.mode === 'any' && Number(section.attempt_rule.questions_to_attempt) > section.questions.length) {
        setNotice(`${section.name}: questions to attempt cannot exceed the number of questions.`)
        return
      }
      for (let i = 0; i < section.questions.length; i += 1) {
        const errorText = validateQuestion(section, section.questions[i], `${section.name} Q${i + 1}`)
        if (errorText) {
          setNotice(errorText)
          setActiveSection(sections.findIndex(s => s.id === section.id))
          return
        }
      }
    }
    if (calculatedMarks <= 0) {
      setNotice('Total marks must be greater than 0.')
      return
    }
    setStep('review')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSaveDirect = async () => {
    setNotice('')
    if (!name.trim() || !subject.trim()) {
      setNotice('Please enter Answer Key Name and Subject.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    for (const currentSection of sections) {
      if (!currentSection.name.trim()) {
        setNotice('Every section must have a name.')
        return
      }
      if (!currentSection.questions.length) {
        setNotice(`${currentSection.name} must contain at least one question.`)
        return
      }
      if (currentSection.attempt_rule.mode === 'any' && Number(currentSection.attempt_rule.questions_to_attempt) > currentSection.questions.length) {
        setNotice(`${currentSection.name}: questions to attempt cannot exceed the number of questions.`)
        return
      }
      for (let i = 0; i < currentSection.questions.length; i += 1) {
        const errorText = validateQuestion(currentSection, currentSection.questions[i], `${currentSection.name} Q${i + 1}`)
        if (errorText) {
          setNotice(errorText)
          setActiveSection(sections.findIndex(s => s.id === currentSection.id))
          return
        }
      }
    }
    if (calculatedMarks <= 0) {
      setNotice('Total marks must be greater than 0.')
      return
    }
    await handleSubmit()
  }

  const handleSubmit = async () => {
    const data = buildPayload()
    try {
      if (initialAnswerKey?.id && onUpdate) {
        await onUpdate(String(initialAnswerKey.id), data)
      } else {
        await create(data)
      }
      onSave()
    } catch (err: any) {
      console.error('Failed to save answer key:', err)
      setNotice(err?.response?.data?.message || err?.message || 'Failed to save answer key. Please try again.')
    }
  }

  // ---------------------------------------------------------------------------
  // Small UI helpers
  // ---------------------------------------------------------------------------

  const inputClass = 'w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 outline-none focus:border-[#3B5DE8] focus:ring-2 focus:ring-[#3B5DE8]/10'
  const textAreaClass = 'w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 outline-none focus:border-[#3B5DE8] focus:ring-2 focus:ring-[#3B5DE8]/10 min-h-[80px]'
  const buttonPrimary = 'px-4 py-2 rounded-lg bg-[#1B3A6B] text-white text-sm font-semibold hover:bg-[#0F2142] disabled:opacity-50'
  const buttonSecondary = 'px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50'
  const section = sections[activeSection]

  const renderObjectiveConfig = (currentSection: Section, question: Question) => {
    const type = question.question_type
    if (type === 'mcq') {
      return (
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-4">
          <div>
            <h4 className="font-semibold text-slate-900">MCQ Answer</h4>
            <p className="text-xs text-slate-500 mt-1">Select the correct option. The system automatically accepts letter, Roman, numeric, option-label and full-answer forms.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {question.answer_config.options.map((option, index) => {
              const letter = ['A', 'B', 'C', 'D'][index]
              return (
                <div key={letter} className="flex gap-2 items-center">
                  <div className="w-8 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-semibold text-slate-600">{letter}</div>
                  <input className={inputClass} placeholder={`Option ${letter}`} value={option} onChange={e => updateOptions(currentSection.id, question, index, e.target.value)} />
                  <label className="flex items-center gap-1 text-xs whitespace-nowrap text-slate-600">
                    <input type="radio" name={`correct-${question.id}`} checked={question.answer_config.correct_option_index === index} onChange={() => setCorrectMCQ(currentSection.id, question, index)} /> Correct
                  </label>
                </div>
              )
            })}
          </div>
          <div className="rounded-lg bg-white border border-blue-100 p-3 text-xs text-slate-600">
            <strong>Accepted automatically:</strong> A/B/C/D, I/II/III/IV, 1/2/3/4, Option A/Option 1, punctuation variants, and the complete correct option text.
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={question.answer_config.accepted_answer_formats.includes('numeric')} onChange={e => {
              const formats = question.answer_config.accepted_answer_formats.filter(v => v !== 'numeric')
              updateQuestion(currentSection.id, question.id, { answer_config: { ...question.answer_config, accepted_answer_formats: e.target.checked ? [...formats, 'numeric'] : formats } })
            }} />
            Accept numeric 1/2/3/4
          </label>
        </div>
      )
    }

    if (type === 'true_false') {
      return (
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
          <h4 className="font-semibold text-slate-900">True / False Answer</h4>
          <div className="mt-3 flex gap-5">
            {[true, false].map(value => (
              <label key={String(value)} className="flex items-center gap-2 text-sm text-slate-700">
                <input type="radio" name={`tf-${question.id}`} checked={question.answer_config.correct_boolean === value} onChange={() => updateQuestion(currentSection.id, question.id, { answer_config: { ...question.answer_config, correct_boolean: value } })} />
                {value ? 'True' : 'False'}
              </label>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3">The evaluator can normalize True/true/TRUE/T/t and False/false/FALSE/F/f.</p>
        </div>
      )
    }

    if (type === 'one_word' || type === 'fill_blank') {
      return (
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-3">
          <div>
            <h4 className="font-semibold text-slate-900">Accepted Answer</h4>
            <p className="text-xs text-slate-500 mt-1">Enter the main answer and optional acceptable alternatives.</p>
          </div>
          <input className={inputClass} placeholder="Correct answer" value={question.model_answer} onChange={e => updateQuestion(currentSection.id, question.id, { model_answer: e.target.value })} />
          <div className="flex flex-wrap gap-2">
            {question.answer_config.alternate_answers.map(answer => (
              <span key={answer} className="px-2 py-1 rounded-full bg-white border border-blue-100 text-xs text-slate-700">{answer}<button type="button" className="ml-2 text-red-500" onClick={() => removeListValue(currentSection.id, question, 'alternate_answers', answer)}>×</button></span>
            ))}
          </div>
          <input className={inputClass} placeholder="Add alternative and press Enter" onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addListValue(currentSection.id, question, 'alternate_answers', e.currentTarget.value)
              e.currentTarget.value = ''
            }
          }} />
          <div className="flex gap-4 text-xs text-slate-600">
            <label className="flex items-center gap-2"><input type="checkbox" checked={question.answer_config.case_insensitive} onChange={e => updateQuestion(currentSection.id, question.id, { answer_config: { ...question.answer_config, case_insensitive: e.target.checked } })} /> Ignore case</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={question.answer_config.ignore_extra_spaces} onChange={e => updateQuestion(currentSection.id, question.id, { answer_config: { ...question.answer_config, ignore_extra_spaces: e.target.checked } })} /> Ignore extra spaces</label>
          </div>
        </div>
      )
    }

    return null
  }

  const renderMarkingSettings = (currentSection: Section, question: Question) => {
    const info = STRICTNESS_INFO[question.marking_strictness]
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="font-semibold text-slate-900">Marking Strictness</h4>
            <p className="text-xs text-slate-500">This controls how lenient the AI-assisted marking policy should be. It is not question difficulty.</p>
          </div>
          <select className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm" value={question.marking_strictness} onChange={e => {
            const strictness = e.target.value as MarkingStrictness
            updateQuestion(currentSection.id, question.id, {
              marking_strictness: strictness,
              answer_config: { ...question.answer_config, meaningful_content_threshold: STRICTNESS_INFO[strictness].threshold }
            })
          }}>
            <option value="easy">Easy / Lenient</option>
            <option value="moderate">Moderate / Balanced</option>
            <option value="hard">Hard / Strict</option>
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {(Object.keys(STRICTNESS_INFO) as MarkingStrictness[]).map(level => (
            <button key={level} type="button" onClick={() => updateQuestion(currentSection.id, question.id, { marking_strictness: level, answer_config: { ...question.answer_config, meaningful_content_threshold: STRICTNESS_INFO[level].threshold } })} className={`text-left rounded-lg border p-3 ${question.marking_strictness === level ? 'border-[#1B3A6B] bg-white ring-1 ring-[#1B3A6B]/20' : 'border-slate-200 bg-white'}`}>
              <div className="font-semibold text-sm text-slate-900">{STRICTNESS_INFO[level].title}</div>
              <div className="text-xs text-slate-500 mt-1">~{STRICTNESS_INFO[level].threshold}% meaningful coverage reference</div>
            </button>
          ))}
        </div>
        <div className="text-xs text-slate-600 bg-white rounded-lg border border-slate-200 p-3">{info.text}</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="text-sm text-slate-700">Meaningful coverage reference
            <div className="flex items-center gap-2 mt-1"><input type="number" min={0} max={100} className={inputClass} value={question.answer_config.meaningful_content_threshold} onChange={e => updateQuestion(currentSection.id, question.id, { answer_config: { ...question.answer_config, meaningful_content_threshold: Math.min(100, Math.max(0, Number(e.target.value) || 0)) } })} /><span>%</span></div>
          </label>
          <label className="text-sm text-slate-700">Evaluation mode
            <select className={`${inputClass} mt-1`} value={question.evaluation_mode} onChange={e => updateQuestion(currentSection.id, question.id, { evaluation_mode: e.target.value as EvaluationMode })}>
              <option value="automatic">Automatic</option>
              <option value="ai_human">AI + Human Review</option>
              <option value="human">Human Only</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 sm:pt-7"><input type="checkbox" checked={question.answer_config.partial_credit} onChange={e => updateQuestion(currentSection.id, question.id, { answer_config: { ...question.answer_config, partial_credit: e.target.checked } })} /> Allow partial credit</label>
        </div>
        <p className="text-xs text-amber-700">Human/faculty review should always be able to override the AI suggestion.</p>
      </div>
    )
  }

  const renderRubric = (currentSection: Section, question: Question) => {
    const total = question.rubric.reduce((sum, r) => sum + Number(r.marks || 0), 0)
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="font-semibold text-slate-900">Rubric</h4>
            <p className={`text-xs mt-1 ${total === Number(question.max_marks) ? 'text-emerald-600' : 'text-amber-600'}`}>Rubric total: {total} / {question.max_marks}</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <select
              className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700"
              defaultValue=""
              onChange={e => {
                if (e.target.value) applyRubricTemplate(currentSection.id, question, e.target.value)
                e.currentTarget.value = ''
              }}
              aria-label="Apply marking template"
            >
              <option value="">Marking Template...</option>
              {Object.entries(RUBRIC_TEMPLATES).map(([key, template]) => (
                <option key={key} value={key}>{template.name}</option>
              ))}
            </select>
            <button type="button" className={buttonSecondary} onClick={() => applyRubric(currentSection.id, question)}>Auto Rubric</button>
            <button type="button" className={buttonSecondary} onClick={() => addRubric(currentSection.id, question)}>+ Criterion</button>
          </div>
        </div>
        <div className="space-y-2">
          {question.rubric.map((rubric, index) => (
            <div key={rubric.id} className="grid grid-cols-1 md:grid-cols-[1fr_90px_1fr_auto] gap-2 items-center rounded-lg border border-slate-200 bg-white p-2">
              <input className={inputClass} placeholder={`Criterion ${index + 1}`} value={rubric.name} onChange={e => updateRubric(currentSection.id, question, rubric.id, { name: e.target.value })} />
              <input type="number" min={0} className={inputClass} value={rubric.marks} onChange={e => updateRubric(currentSection.id, question, rubric.id, { marks: Math.max(0, Number(e.target.value) || 0) })} />
              <input className={inputClass} placeholder="What should receive these marks?" value={rubric.description} onChange={e => updateRubric(currentSection.id, question, rubric.id, { description: e.target.value })} />
              <button type="button" className="text-red-500 text-sm px-2" onClick={() => removeRubric(currentSection.id, question, rubric.id)}>Remove</button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderQuestionEditor = (currentSection: Section, question: Question, index: number, subPart = false) => {
    const isOpen = openQuestions[question.id] !== false
    const hasSubParts = question.sub_parts.length > 0
    const qMarks = hasSubParts
      ? question.sub_parts.reduce((sum, sp) => sum + Number(sp.max_marks || 0), 0)
      : Number(question.max_marks || 0)

    return (
      <div key={question.id} className={`rounded-xl border ${subPart ? 'border-slate-200' : 'border-slate-200'} bg-white overflow-hidden`}>
        <div className="px-4 py-3 flex items-center justify-between gap-3 bg-slate-50 border-b border-slate-200">
          <button type="button" onClick={() => setOpenQuestions(prev => ({ ...prev, [question.id]: !isOpen }))} className="flex items-center gap-2 text-left flex-1">
            <span className="text-xs">{isOpen ? '▼' : '▶'}</span>
            <span className="font-semibold text-slate-900">{question.question_number || `Q${index + 1}`}</span>
            <span className="text-xs text-slate-500">{QUESTION_TYPES.find(t => t.value === question.question_type)?.label}</span>
            <span className="text-xs text-slate-500">{qMarks} marks</span>
          </button>
          {!subPart && (
            <div className="flex gap-2">
              <button type="button" className="text-xs font-semibold text-[#1B3A6B]" onClick={() => addSubPart(currentSection.id, question.id)}>+ Sub-part</button>
              <button type="button" className="text-xs font-semibold text-red-600 hover:text-red-800" onClick={() => removeQuestion(currentSection.id, question.id)}>Delete Question</button>
            </div>
          )}
        </div>

        {isOpen && (
          <div className="p-4 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-[120px_1fr_120px] gap-3">
              <div>
                <label className="label">Number</label>
                <input className={inputClass} value={question.question_number} onChange={e => updateQuestion(currentSection.id, question.id, { question_number: e.target.value })} />
              </div>
              <div>
                <label className="label">Question Type</label>
                <select className={inputClass} value={question.question_type} onChange={e => setQuestionType(currentSection.id, question, e.target.value as QuestionType)}>
                  {QUESTION_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Marks</label>
                <input type="number" min={1} max={100} className={inputClass} value={question.max_marks} onChange={e => {
                  const marks = Math.max(1, Number(e.target.value) || 1)
                  updateQuestion(currentSection.id, question.id, { max_marks: marks })
                }} />
              </div>
            </div>

            <div>
              <label className="label">Question Text *</label>
              <textarea className={textAreaClass} placeholder="Enter the exact examination question..." value={question.question_text} onChange={e => updateQuestion(currentSection.id, question.id, { question_text: e.target.value })} />
            </div>

            {renderObjectiveConfig(currentSection, question)}

            {question.question_type === 'numerical' && (
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label className="label">Final Answer</label><input className={inputClass} value={question.answer_config.final_answer} onChange={e => updateQuestion(currentSection.id, question.id, { answer_config: { ...question.answer_config, final_answer: e.target.value } })} /></div>
                <div><label className="label">Tolerance (optional)</label><input className={inputClass} placeholder="e.g. ±0.01" value={question.answer_config.tolerance} onChange={e => updateQuestion(currentSection.id, question.id, { answer_config: { ...question.answer_config, tolerance: e.target.value } })} /></div>
                <div><label className="label">Formula</label><input className={inputClass} value={question.answer_config.formula} onChange={e => updateQuestion(currentSection.id, question.id, { answer_config: { ...question.answer_config, formula: e.target.value } })} /></div>
                <div><label className="label">Required Steps</label><input className={inputClass} placeholder="Separate steps with Enter" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const value = e.currentTarget.value.trim(); if (value) updateQuestion(currentSection.id, question.id, { answer_config: { ...question.answer_config, solution_steps: [...question.answer_config.solution_steps, value] } }); e.currentTarget.value = '' } }} /></div>
                <div className="md:col-span-2 flex flex-wrap gap-2">{question.answer_config.solution_steps.map(stepValue => <span key={stepValue} className="px-2 py-1 rounded-full bg-white border text-xs">{stepValue}<button type="button" className="ml-2 text-red-500" onClick={() => updateQuestion(currentSection.id, question.id, { answer_config: { ...question.answer_config, solution_steps: question.answer_config.solution_steps.filter(v => v !== stepValue) } })}>×</button></span>)}</div>
              </div>
            )}

            {['one_line', 'short_answer', 'long_answer', 'numerical', 'diagram', 'mixed'].includes(question.question_type) && (
              <div>
                <label className="label">Model Answer *</label>
                <textarea className={textAreaClass} placeholder="Enter the ideal / expected answer..." value={question.model_answer} onChange={e => updateQuestion(currentSection.id, question.id, { model_answer: e.target.value })} />
              </div>
            )}

            {['one_line', 'short_answer', 'long_answer', 'numerical', 'diagram', 'mixed'].includes(question.question_type) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <div className="flex items-center justify-between"><label className="label">Key Points</label><button type="button" className="text-xs text-[#1B3A6B] font-semibold" onClick={() => applySuggestedPoints(currentSection.id, question)}>+ Suggestions</button></div>
                  <div className="flex flex-wrap gap-2 mt-2">{question.key_points.map(point => <span key={point} className="px-2 py-1 rounded-full bg-blue-50 text-blue-800 text-xs">{point}<button type="button" className="ml-2" onClick={() => removeListValue(currentSection.id, question, 'key_points', point)}>×</button></span>)}</div>
                  <input className={`${inputClass} mt-2`} placeholder="Type a key point and press Enter" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addListValue(currentSection.id, question, 'key_points', e.currentTarget.value); e.currentTarget.value = '' } }} />
                </div>
                <div>
                  <div className="flex items-center justify-between"><label className="label">Keywords</label><button type="button" className="text-xs text-[#1B3A6B] font-semibold" onClick={() => applySuggestedKeywords(currentSection.id, question)}>+ Suggestions</button></div>
                  <div className="flex flex-wrap gap-2 mt-2">{question.keywords.map(keyword => <span key={keyword} className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs">{keyword}<button type="button" className="ml-2" onClick={() => removeListValue(currentSection.id, question, 'keywords', keyword)}>×</button></span>)}</div>
                  <input className={`${inputClass} mt-2`} placeholder="Type a keyword and press Enter" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addListValue(currentSection.id, question, 'keywords', e.currentTarget.value.toLowerCase()); e.currentTarget.value = '' } }} />
                </div>
              </div>
            )}

            {['short_answer', 'long_answer', 'numerical', 'diagram', 'mixed'].includes(question.question_type) && renderRubric(currentSection, question)}

            {['short_answer', 'long_answer', 'numerical', 'diagram', 'mixed'].includes(question.question_type) && renderMarkingSettings(currentSection, question)}

            {['short_answer', 'long_answer', 'numerical', 'diagram', 'mixed'].includes(question.question_type) && (
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={question.diagram_required} onChange={e => updateQuestion(currentSection.id, question.id, { diagram_required: e.target.checked })} /> Diagram Required</label>
                  {question.diagram_required && <div className="flex items-center gap-2"><span className="text-sm text-slate-600">Diagram weightage</span><input type="number" min={0} max={100} className="w-24 h-10 px-3 rounded-lg border border-slate-200" value={question.diagram_weightage} onChange={e => updateQuestion(currentSection.id, question.id, { diagram_weightage: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })} /><span className="text-sm">%</span></div>}
                </div>
                {question.diagram_required && <p className="text-xs text-slate-500 mt-2">Use the percentage to tell the evaluator how much of the question's marks should be influenced by diagram correctness.</p>}
              </div>
            )}

            {question.sub_parts.length > 0 && (
              <div className="rounded-xl border-2 border-dashed border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between"><div><h4 className="font-semibold text-slate-900">Sub-parts / Split Marks</h4><p className="text-xs text-slate-500">Useful for questions such as Q2(a) = 2 marks and Q2(b) = 3 marks.</p></div><button type="button" className={buttonSecondary} onClick={() => addSubPart(currentSection.id, question.id)}>+ Add Part</button></div>
                {question.sub_parts.map((subPart, subIndex) => (
                  <div key={subPart.id}>
                    {renderQuestionEditor(currentSection, subPart, subIndex, true)}
                    <div className="text-right mt-1"><button type="button" className="text-xs text-red-600" onClick={() => removeSubPart(currentSection.id, question.id, subPart.id)}>Remove this part</button></div>
                  </div>
                ))}
                <div className="text-xs font-semibold text-slate-700">Sub-part total: {question.sub_parts.reduce((sum, sp) => sum + Number(sp.max_marks || 0), 0)} marks</div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Review screen
  // ---------------------------------------------------------------------------

  if (step === 'review') {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h1 className="text-2xl font-bold text-slate-900">Review Answer Key</h1><p className="text-sm text-slate-500 mt-1">Check the complete configuration before saving.</p></div>
          <div className="flex gap-2"><button type="button" className={buttonSecondary} onClick={() => setStep('edit')}>← Edit</button><button type="button" className={buttonSecondary} onClick={onCancel}>Cancel</button></div>
        </div>

        {notice && <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{notice}</div>}

        <div className="rounded-xl bg-white border border-slate-200 p-5 grid grid-cols-2 md:grid-cols-5 gap-4">
          <Stat label="Exam" value={name} /><Stat label="Subject" value={subject} /><Stat label="Questions" value={totalQuestionCount} /><Stat label="Calculated Marks" value={calculatedMarks} /><Stat label="Declared Marks" value={declaredTotalMarks} />
        </div>

        <div className="space-y-4">
          {sections.map((currentSection, sectionIndex) => (
            <div key={currentSection.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap justify-between gap-2">
                <div><h2 className="font-bold text-slate-900">{currentSection.name}</h2><p className="text-xs text-slate-500 mt-1">{currentSection.instruction}</p></div>
                <div className="text-sm text-slate-600">Attempt {currentSection.attempt_rule.mode === 'all' ? 'All' : `${currentSection.attempt_rule.questions_to_attempt} out of ${currentSection.questions.length}`}</div>
              </div>
              <div className="p-4 space-y-3">
                {currentSection.questions.map((question, index) => (
                  <div key={question.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex justify-between gap-3"><div className="font-semibold text-slate-900">{question.question_number || `Q${index + 1}`} · {QUESTION_TYPES.find(t => t.value === question.question_type)?.label}</div><div className="font-semibold text-[#1B3A6B]">{question.sub_parts.length ? question.sub_parts.reduce((s, sp) => s + sp.max_marks, 0) : question.max_marks} marks</div></div>
                    <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{question.question_text}</p>
                    {question.question_type === 'mcq' && <p className="text-xs text-slate-500 mt-2">Correct: {question.answer_config.options[question.answer_config.correct_option_index ?? -1] || '—'} · Accepted A/B/C/D + I/II/III/IV + full answer</p>}
                    {question.question_type === 'true_false' && <p className="text-xs text-slate-500 mt-2">Correct: {question.answer_config.correct_boolean === null ? '—' : question.answer_config.correct_boolean ? 'True' : 'False'} · T/F variants accepted</p>}
                    {question.model_answer && <div className="mt-3"><div className="text-xs font-semibold uppercase text-slate-400">Model Answer</div><p className="text-sm text-slate-600 whitespace-pre-wrap mt-1">{question.model_answer}</p></div>}
                    {question.sub_parts.length > 0 && <div className="mt-3 pl-4 border-l-2 border-slate-200 space-y-2">{question.sub_parts.map(sp => <div key={sp.id} className="text-sm text-slate-600"><strong>{sp.question_number}</strong> — {sp.max_marks} marks — {sp.question_text}</div>)}</div>}
                    {['short_answer', 'long_answer', 'numerical', 'diagram', 'mixed'].includes(question.question_type) && <div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="px-2 py-1 rounded-full bg-slate-100">Strictness: {question.marking_strictness}</span><span className="px-2 py-1 rounded-full bg-slate-100">Coverage: {question.answer_config.meaningful_content_threshold}%</span><span className="px-2 py-1 rounded-full bg-slate-100">Evaluation: {question.evaluation_mode}</span>{question.diagram_required && <span className="px-2 py-1 rounded-full bg-slate-100">Diagram: {question.diagram_weightage}%</span>}</div>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="sticky bottom-4 rounded-xl border border-slate-200 bg-white/95 backdrop-blur p-4 shadow-lg flex flex-wrap items-center justify-between gap-3">
          <div><div className="font-semibold text-slate-900">Ready to save?</div><div className="text-xs text-slate-500">The answer key will contain both section-wise and top-level question data.</div></div>
          <div className="flex gap-2"><button type="button" className={buttonSecondary} onClick={() => setStep('edit')}>← Edit Answer Key</button><button type="button" className={buttonPrimary} disabled={isLoading} onClick={handleSubmit}>{isLoading ? 'Saving...' : initialAnswerKey?.id ? 'Update Answer Key' : 'Save Answer Key'}</button></div>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Main editor
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-5">
      <style>{`.label{display:block;font-size:.875rem;font-weight:600;color:#0f172a;margin-bottom:.375rem}`}</style>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-slate-900">{initialAnswerKey?.id ? 'Edit Answer Key' : 'Create Answer Key'}</h1><p className="text-sm text-slate-500 mt-1">Simple setup for objective, descriptive and short-answer evaluation.</p></div>
        <button type="button" className={buttonSecondary} onClick={onCancel}>← Back to Faculty Dashboard</button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{String(error)}</div>}
      {notice && <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{notice}</div>}

      <div className="rounded-xl bg-white border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4"><div><h2 className="font-bold text-slate-900">Basic Exam Information</h2><p className="text-xs text-slate-500 mt-1">Only enter the information that applies to your exam.</p></div><span className="text-xs text-slate-400">Step 1</span></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div><label className="label">Answer Key Name *</label><input className={inputClass} placeholder="e.g. End Semester ML 2026" value={name} onChange={e => setName(e.target.value)} /></div>
          <div><label className="label">Subject *</label><input className={inputClass} placeholder="e.g. Machine Learning" value={subject} onChange={e => setSubject(e.target.value)} /></div>
          <div><label className="label">Subject Code</label><input className={inputClass} placeholder="e.g. BTCSE401" value={subjectCode} onChange={e => setSubjectCode(e.target.value)} /></div>
          <div><label className="label">Department</label><input className={inputClass} value={department} onChange={e => setDepartment(e.target.value)} /></div>
          <div><label className="label">College / University</label><input className={inputClass} value={collegeName} onChange={e => setCollegeName(e.target.value)} /></div>
          <div><label className="label">Semester</label><input type="number" min={1} max={12} className={inputClass} value={semester} onChange={e => setSemester(Math.max(1, Number(e.target.value) || 1))} /></div>
          <div><label className="label">Examination Type</label><select className={inputClass} value={examinationType} onChange={e => setExaminationType(e.target.value)}><option>Mid Semester</option><option>End Semester</option><option>Back Exam</option><option>Internal Assessment</option><option>Other</option></select></div>
          <div><label className="label">Academic Year</label><input className={inputClass} value={academicYear} onChange={e => setAcademicYear(e.target.value)} /></div>
          <div><label className="label">Examination Date</label><input type="date" className={inputClass} value={examinationDate} onChange={e => setExaminationDate(e.target.value)} /></div>
          <div><label className="label">Duration</label><input className={inputClass} value={duration} onChange={e => setDuration(e.target.value)} /></div>
          <div><label className="label">Declared Total Marks</label><input type="number" min={1} className={inputClass} value={declaredTotalMarks} onChange={e => setDeclaredTotalMarks(Math.max(1, Number(e.target.value) || 1))} /></div>
        </div>
      </div>

      <div className="rounded-xl bg-white border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-bold text-slate-900">Sections</h2><p className="text-xs text-slate-500 mt-1">Use the ready-made sections or add your own.</p></div>
          <div className="flex flex-wrap gap-2"><button type="button" className={buttonPrimary} onClick={() => addSection('A')}>+ Section A</button><button type="button" className={buttonPrimary} onClick={() => addSection('B')}>+ Section B</button><button type="button" className={buttonPrimary} onClick={() => addSection('C')}>+ Section C</button><button type="button" className={buttonSecondary} onClick={() => addSection()}>+ Custom Section</button></div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4 border-t border-slate-100 pt-4">
          {sections.map((s, index) => <button key={s.id} type="button" onClick={() => setActiveSection(index)} className={`px-4 py-2 rounded-lg text-sm font-semibold ${activeSection === index ? 'bg-[#1B3A6B] text-white' : 'bg-slate-100 text-slate-600'}`}>{s.name || `Section ${index + 1}`}</button>)}
        </div>
      </div>

      {section && (
        <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-200">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Section {String.fromCharCode(65 + activeSection)}</div><h2 className="text-xl font-bold text-slate-900 mt-1">{section.name}</h2><p className="text-sm text-slate-500 mt-1">{section.description}</p></div>
              {sections.length > 1 && <button type="button" className="text-sm text-red-600 font-semibold" onClick={() => removeSection(section.id)}>Remove Section</button>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
              <div><label className="label">Section Name</label><input className={inputClass} value={section.name} onChange={e => updateSection(section.id, { name: e.target.value })} /></div>
              <div><label className="label">Description</label><input className={inputClass} value={section.description} onChange={e => updateSection(section.id, { description: e.target.value })} /></div>
              <div><label className="label">Instruction</label><input className={inputClass} value={section.instruction} onChange={e => updateSection(section.id, { instruction: e.target.value })} /></div>
            </div>
            <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 p-3">
              <div className="flex flex-wrap items-center gap-4"><span className="text-sm font-semibold text-slate-800">Attempt Rule</span><label className="flex items-center gap-2 text-sm"><input type="radio" name={`attempt-${section.id}`} checked={section.attempt_rule.mode === 'all'} onChange={() => updateSection(section.id, { attempt_rule: { mode: 'all', questions_to_attempt: section.questions.length } })} /> Attempt All</label><label className="flex items-center gap-2 text-sm"><input type="radio" name={`attempt-${section.id}`} checked={section.attempt_rule.mode === 'any'} onChange={() => updateSection(section.id, { attempt_rule: { mode: 'any', questions_to_attempt: Math.min(1, section.questions.length) || 1 } })} /> Attempt Any</label>{section.attempt_rule.mode === 'any' && <div className="flex items-center gap-2"><input type="number" min={1} max={section.questions.length} className="w-20 h-9 px-2 rounded-lg border border-slate-200" value={section.attempt_rule.questions_to_attempt} onChange={e => updateSection(section.id, { attempt_rule: { mode: 'any', questions_to_attempt: Math.min(section.questions.length, Math.max(1, Number(e.target.value) || 1)) } })} /><span className="text-sm">out of {section.questions.length}</span></div>}</div>
              <p className="text-xs text-slate-500 mt-2">Example: Attempt any 3 out of 5 questions.</p>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {section.questions.length === 0 && (
              <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                No questions in this section. Click <strong>+ Add Question</strong> to add the first question.
              </div>
            )}
            {section.questions.map((question, index) => renderQuestionEditor(section, question, index))}
            <button type="button" className="w-full py-3 rounded-xl border-2 border-dashed border-slate-200 text-sm font-semibold text-[#1B3A6B] hover:bg-slate-50" onClick={() => addQuestion(section.id)}>+ Add Question</button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3 sticky bottom-4 shadow-lg">
        <div><div className="font-semibold text-slate-900">{totalQuestionCount} questions · {calculatedMarks} calculated marks</div><div className="text-xs text-slate-500">Review will validate every answer and rubric before saving.</div></div>
        <div className="flex flex-wrap gap-2"><button type="button" className={buttonSecondary} onClick={onCancel}>Cancel</button><button type="button" className={buttonSecondary} onClick={handleReview}>Review →</button><button type="button" className={buttonPrimary} onClick={handleSaveDirect} disabled={isLoading}>{isLoading ? 'Saving...' : initialAnswerKey?.id ? 'Save Changes' : 'Save Answer Key'}</button></div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: any }) {
  return <div><div className="text-xs uppercase tracking-wide font-semibold text-slate-400">{label}</div><div className="mt-1 text-sm font-semibold text-slate-900 break-words">{value || '—'}</div></div>
}
