// src/modules/answer-key/create/AnswerKeymanger.tsx

import { useState } from 'react'
import {
  Card,
  CardHeader,
  Input,
  Alert,
  XIcon,
  PlusIcon,
} from '@/components/common'
import { useAnswerKeyStore } from '@/stores/answerKeyStore'
import type { RubricCriterionForm } from '../types'

// ─── Types ──────────────────────────────────────────────────────────────────────

interface SubPart {
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

interface Question {
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
  sub_parts: SubPart[]
  is_sub_question: boolean
  parent_question_id?: string
}

interface Section {
  id: string
  name: string
  description: string
  instruction: string
  questions: Question[]
}

// ─── Rubric Templates ──────────────────────────────────────────────────────────

const RUBRIC_TEMPLATES: Record<
  string,
  {
    name: string
    criteria: {
      name: string
      marks: number
      description: string
    }[]
  }
> = {
  mcq: {
    name: 'MCQ (1 mark)',
    criteria: [
      {
        name: 'Correct Option',
        marks: 1,
        description: 'Selected the correct option'
      }
    ]
  },

  'theory-standard': {
    name: 'Standard Theory (5 criteria)',
    criteria: [
      {
        name: 'Definition / Concept Understanding',
        marks: 3,
        description: 'Clear understanding of core concept'
      },
      {
        name: 'Explanation Depth',
        marks: 2,
        description: 'Thorough explanation with details'
      },
      {
        name: 'Relevant Examples',
        marks: 2,
        description: 'Appropriate and relevant examples'
      },
      {
        name: 'Structure and Clarity',
        marks: 2,
        description: 'Well-organized and clear'
      },
      {
        name: 'Accuracy',
        marks: 1,
        description: 'Factually correct information'
      }
    ]
  },

  'theory-detailed': {
    name: 'Detailed Theory (4 criteria)',
    criteria: [
      {
        name: 'Core Concept Accuracy',
        marks: 4,
        description: 'Accurate definition and explanation'
      },
      {
        name: 'Key Points Coverage',
        marks: 3,
        description: 'Covers all important points'
      },
      {
        name: 'Examples and Applications',
        marks: 2,
        description: 'Real-world applications'
      },
      {
        name: 'Clarity and Organization',
        marks: 1,
        description: 'Clear and well-structured'
      }
    ]
  },

  'numerical-standard': {
    name: 'Standard Numerical (4 criteria)',
    criteria: [
      {
        name: 'Correct Formula / Equation',
        marks: 3,
        description: 'Uses correct formula'
      },
      {
        name: 'Steps and Working',
        marks: 3,
        description: 'Shows all necessary steps'
      },
      {
        name: 'Accurate Calculation',
        marks: 3,
        description: 'All calculations correct'
      },
      {
        name: 'Final Answer with Units',
        marks: 1,
        description: 'Correct final answer'
      }
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

  'short-answer': {
    name: 'Short Answer (3 criteria)',
    criteria: [
      {
        name: 'Key Concept Understanding',
        marks: 2,
        description: 'Demonstrates understanding'
      },
      {
        name: 'Key Points Covered',
        marks: 2,
        description: 'Covers important points'
      },
      {
        name: 'Clarity and Precision',
        marks: 1,
        description: 'Clear and precise answer'
      }
    ]
  },

  simple: {
    name: 'Simple (2 criteria)',
    criteria: [
      {
        name: 'Correct Answer',
        marks: 7,
        description: 'Answer is correct'
      },
      {
        name: 'Explanation',
        marks: 3,
        description: 'Good explanation'
      }
    ]
  }
  return [
    makeSection('Section A: Objective / Short Objective', 'MCQ, True/False, One Word, Fill Blank and One Line', 'A'),
    makeSection('Section B: Descriptive / Long Answer', 'Long-answer questions with flexible marking', 'B'),
    makeSection('Section C: Short Answer', 'Short answers and questions with sub-parts', 'C')
  ]
}

// ─── Common Keywords ──────────────────────────────────────────────────────────

const COMMON_KEYWORDS: Record<string, string[]> = {
  Pharmacology: [
    'hypertension',
    'diuretic',
    'beta blocker',
    'calcium channel blocker',
    'ACE inhibitor',
    'ARB',
    'statin',
    'anticoagulant',
    'antiarrhythmic',
    'fibrinolytic',
    'digoxin',
    'amlodipine',
    'warfarin',
    'heparin',
    'furosemide',
    'spironolactone',
    'amiodarone',
    'atenolol',
    'losartan',
    'mechanism of action',
    'therapeutic uses',
    'adverse effects',
    'drug classification',
    'pharmacokinetics',
    'pharmacodynamics'
  ],

  'Machine Learning': [
    'supervised',
    'unsupervised',
    'reinforcement',
    'training',
    'testing',
    'model',
    'algorithm',
    'data',
    'prediction',
    'classification',
    'regression',
    'clustering'
  ],

  'Artificial Intelligence': [
    'agent',
    'environment',
    'reward',
    'policy',
    'action',
    'state',
    'learning',
    'decision',
    'planning',
    'knowledge'
  ],

  'Data Science': [
    'dataset',
    'features',
    'labels',
    'training',
    'validation',
    'testing',
    'accuracy',
    'precision',
    'recall',
    'f1-score',
    'confusion matrix'
  ],

  Programming: [
    'function',
    'class',
    'object',
    'method',
    'variable',
    'loop',
    'condition',
    'array',
    'list',
    'dictionary'
  ],

  Mathematics: [
    'equation',
    'formula',
    'calculation',
    'average',
    'mean',
    'median',
    'mode',
    'standard deviation',
    'variance'
  ]
}

// ─── Common Key Points ────────────────────────────────────────────────────────

const COMMON_KEY_POINTS: string[] = [
  'Clear definition of the concept',
  'Key characteristics',
  'Real-world relevance',
  'Step-by-step explanation',
  'Key components',
  'Working mechanism',
  'Compare with related concepts',
  'Key differences',
  'Similarities',
  'Practical application',
  'Use case scenario',
  'Real-world example'
]

// ─── Section Templates ────────────────────────────────────────────────────────

const SECTION_TEMPLATES = {
  mcq: {
    name: 'Section A: MCQs',
    description: 'Multiple Choice Questions',
    instruction:
      'Attempt all questions. Each question carries 1 mark.',
    defaultQuestionType: 'theory' as const,
    defaultMarks: 1
  },

  'long-answer': {
    name: 'Section B: Long Answers',
    description: 'Long Answer Questions',
    instruction:
      'Attempt any one question. Each question carries 10 marks.',
    defaultQuestionType: 'mixed' as const,
    defaultMarks: 10
  },

  'short-answer': {
    name: 'Section C: Short Answers',
    description: 'Short Answer Questions',
    instruction:
      'Attempt any two questions. Each question carries 5 marks.',
    defaultQuestionType: 'theory' as const,
    defaultMarks: 5
  }
}

interface StepCreateAnswerKeyProps {
  onSave: () => void
  onCancel: () => void
  initialAnswerKey?: any
  onUpdate?: (id: string, data: any) => Promise<void>
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StepCreateAnswerKey({
  onSave,
  onCancel,
  initialAnswerKey,
  onUpdate
}: StepCreateAnswerKeyProps) {
  const { create, isLoading, error } = useAnswerKeyStore()

  // ─── State ──────────────────────────────────────────────────────────────────

  const [name, setName] = useState(initialAnswerKey?.name || '')
  const [subject, setSubject] = useState(initialAnswerKey?.subject || '')
  const [department, setDepartment] = useState(initialAnswerKey?.department || 'Pharmacy')
  const [semester, setSemester] = useState(Number(initialAnswerKey?.semester) || 5)

  const normalizeQuestion = (question: any, index: number): Question => ({
    id: String(question?.id || `q-${index + 1}`),
    question_number: String(question?.question_number || `Q${index + 1}`),
    question_text: question?.question_text || '',
    model_answer: question?.model_answer || '',
    max_marks: Number(question?.max_marks) || 1,
    question_type: question?.question_type || 'theory',
    diagram_required: Boolean(question?.diagram_required),
    diagram_weightage: Number(question?.diagram_weightage) || 0,
    key_points: Array.isArray(question?.key_points) ? question.key_points : [],
    keywords: Array.isArray(question?.keywords) ? question.keywords : [],
    rubric: Array.isArray(question?.rubric) && question.rubric.length ? question.rubric : [{ name: '', marks: 0, description: '', required: true }],
    sub_parts: Array.isArray(question?.sub_parts) ? question.sub_parts.map((sp: any, i: number) => ({
      id: String(sp?.id || `sub-${index + 1}-${i + 1}`),
      question_text: sp?.question_text || '',
      model_answer: sp?.model_answer || '',
      max_marks: Number(sp?.max_marks) || 1,
      question_type: sp?.question_type || 'theory',
      diagram_required: Boolean(sp?.diagram_required),
      diagram_weightage: Number(sp?.diagram_weightage) || 0,
      key_points: Array.isArray(sp?.key_points) ? sp.key_points : [],
      keywords: Array.isArray(sp?.keywords) ? sp.keywords : [],
      rubric: Array.isArray(sp?.rubric) && sp.rubric.length ? sp.rubric : [{ name: '', marks: 0, description: '', required: true }]
    })) : [],
    is_sub_question: Boolean(question?.is_sub_question),
    parent_question_id: question?.parent_question_id
  })

  const [sections, setSections] = useState<Section[]>(() => {
    const sourceSections = Array.isArray(initialAnswerKey?.sections) ? initialAnswerKey.sections : []
    if (sourceSections.length) {
      return sourceSections.map((section: any, si: number) => ({
        id: String(section?.id || `section-${si + 1}`),
        name: section?.name || `Section ${String.fromCharCode(65 + si)}`,
        description: section?.description || '',
        instruction: section?.instruction || '',
        questions: Array.isArray(section?.questions) ? section.questions.map((q: any, qi: number) => normalizeQuestion(q, qi)) : []
      }))
    }

    const questions = Array.isArray(initialAnswerKey?.questions) ? initialAnswerKey.questions : []
    if (questions.length) {
      return [{
        id: 'section-1',
        name: 'Section A: MCQ Questions',
        description: 'Multiple Choice Questions',
        instruction: 'Attempt all questions. Each question carries 1 mark.',
        questions: questions.map((q: any, qi: number) => normalizeQuestion(q, qi))
      }]
    }

    return [{
      id: 'section-1',
      name: 'Section A: MCQ Questions',
      description: 'Multiple Choice Questions',
      instruction: 'Attempt all questions. Each question carries 1 mark.',
      questions: [createDefaultQuestion('1', 'theory', 1)]
    }]
  })

  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({})

  const [expandedQuestions, setExpandedQuestions] = useState<
    Record<string, boolean>
  >({})

  // ─── Helper Functions ──────────────────────────────────────────────────────

  function createDefaultQuestion(
    id: string,
    type:
      | 'theory'
      | 'numerical'
      | 'diagram'
      | 'mixed' = 'theory',
    marks: number = 10
  ): Question {
    return {
      id,
      question_number: `Q${id}`,
      question_text: '',
      model_answer: '',
      max_marks: marks,
      question_type: type,
      diagram_required: false,
      diagram_weightage: 0,
      key_points: [],
      keywords: [],
      rubric: [
        {
          name: '',
          marks: 0,
          description: '',
          required: true
        }
      ],
      sub_parts: [],
      is_sub_question: false
    }
  }

  function createDefaultSubPart(id: string): SubPart {
    return {
      id,
      question_text: '',
      model_answer: '',
      max_marks: 2,
      question_type: 'theory',
      diagram_required: false,
      diagram_weightage: 0,
      key_points: [],
      keywords: [],
      rubric: [
        {
          name: '',
          marks: 0,
          description: '',
          required: true
        }
      ]
    }
  }

  function generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`
  }

  // ─── Rubric Utility ────────────────────────────────────────────────────────

  /**
   * Scales a template so that the final rubric marks always equal maxMarks.
   *
   * Uses largest-remainder allocation instead of Math.round() so that
   * 1-mark, 5-mark, 10-mark, etc. questions always get an exact total.
   */
  const scaleRubricToMarks = (
    criteria: {
      name: string
      marks: number
      description: string
    }[],
    maxMarks: number
  ): RubricCriterionForm[] => {
    if (criteria.length === 0 || maxMarks <= 0) {
      return []
    }

    const sourceTotal = criteria.reduce(
      (sum, criterion) => sum + criterion.marks,
      0
    )

    if (sourceTotal <= 0) {
      return criteria.map((criterion, index) => ({
        ...criterion,
        marks:
          index === criteria.length - 1
            ? maxMarks
            : 0,
        required: true
      }))
    }

    const exactValues = criteria.map(
      criterion => (criterion.marks / sourceTotal) * maxMarks
    )

    const floorValues = exactValues.map(value =>
      Math.floor(value)
    )

    let allocated = floorValues.reduce(
      (sum, value) => sum + value,
      0
    )

    const remainderOrder = exactValues
      .map((value, index) => ({
        index,
        remainder: value - floorValues[index]
      }))
      .sort((a, b) => b.remainder - a.remainder)

    let remainderIndex = 0

    while (allocated < maxMarks) {
      const target = remainderOrder[
        remainderIndex % remainderOrder.length
      ]

      floorValues[target.index] += 1
      allocated += 1
      remainderIndex += 1
    }

    return criteria.map((criterion, index) => ({
      ...criterion,
      marks: floorValues[index],
      required: true
    }))
  }

  // ─── Section Functions ─────────────────────────────────────────────────────

  const addSection = (templateKey?: string) => {
    const template = templateKey
      ? SECTION_TEMPLATES[
          templateKey as keyof typeof SECTION_TEMPLATES
        ]
      : null

    const sectionNumber = sections.length

    const newSection: Section = {
      id: generateId('section'),
      name:
        template?.name ||
        `Section ${String.fromCharCode(65 + sectionNumber)}`,
      description: template?.description || '',
      instruction: template?.instruction || '',
      questions: [
        createDefaultQuestion(
          generateId('q'),
          template?.defaultQuestionType || 'theory',
          template?.defaultMarks || 10
        )
      ]
    }

    setSections(prev => [...prev, newSection])

    setExpandedSections(prev => ({
      ...prev,
      [newSection.id]: true
    }))
  }

  const removeSection = (sectionId: string) => {
    if (sections.length <= 1) {
      return
    }

    setSections(prev =>
      prev.filter(section => section.id !== sectionId)
    )
  }

  const updateSection = (
    sectionId: string,
    field: keyof Section,
    value: unknown
  ) => {
    setSections(prev =>
      prev.map(section =>
        section.id === sectionId
          ? {
              ...section,
              [field]: value
            }
          : section
      )
    )
  }

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }))
  }

  // ─── Question Functions ────────────────────────────────────────────────────

  const addQuestion = (sectionId: string) => {
    setSections(prev =>
      prev.map(section => {
        if (section.id !== sectionId) {
          return section
        }

        const defaultMarks =
          section.questions.length > 0
            ? section.questions[0].max_marks
            : 10

        const newQuestion = createDefaultQuestion(
          generateId('q'),
          'theory',
          defaultMarks
        )

        return {
          ...section,
          questions: [
            ...section.questions,
            newQuestion
          ]
        }
      })
    )
  }

  const removeQuestion = (
    sectionId: string,
    questionId: string
  ) => {
    setSections(prev =>
      prev.map(section => {
        if (section.id !== sectionId) {
          return section
        }

        if (section.questions.length <= 1) {
          return section
        }

        return {
          ...section,
          questions: section.questions.filter(
            question => question.id !== questionId
          )
        }
      })
    )
  }

  const updateQuestion = (
    sectionId: string,
    questionId: string,
    field: keyof Question,
    value: unknown
  ) => {
    setSections(prev =>
      prev.map(section => {
        if (section.id !== sectionId) {
          return section
        }

        return {
          ...section,
          questions: section.questions.map(question =>
            question.id === questionId
              ? {
                  ...question,
                  [field]: value
                }
              : question
          )
        }
      })
    )
  }

  const toggleQuestion = (questionId: string) => {
    setExpandedQuestions(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
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

  // ─── Sub-Part Functions ────────────────────────────────────────────────────

  const addSubPart = (
    sectionId: string,
    questionId: string
  ) => {
    setSections(prev =>
      prev.map(section => {
        if (section.id !== sectionId) {
          return section
        }

        return {
          ...section,
          questions: section.questions.map(question => {
            if (question.id !== questionId) {
              return question
            }

            const subPart = createDefaultSubPart(
              generateId('sub')
            )

            return {
              ...question,
              sub_parts: [
                ...question.sub_parts,
                subPart
              ]
            }
          })
        }
      })
    )
  }

  const removeSubPart = (
    sectionId: string,
    questionId: string,
    subPartId: string
  ) => {
    setSections(prev =>
      prev.map(section => {
        if (section.id !== sectionId) {
          return section
        }

        return {
          ...section,
          questions: section.questions.map(question => {
            if (question.id !== questionId) {
              return question
            }

            return {
              ...question,
              sub_parts: question.sub_parts.filter(
                subPart => subPart.id !== subPartId
              )
            }
          })
        }
      })
    )
  }

  const updateSubPart = (
    sectionId: string,
    questionId: string,
    subPartId: string,
    field: keyof SubPart,
    value: unknown
  ) => {
    setSections(prev =>
      prev.map(section => {
        if (section.id !== sectionId) {
          return section
        }

        return {
          ...section,
          questions: section.questions.map(question => {
            if (question.id !== questionId) {
              return question
            }

            return {
              ...question,
              sub_parts: question.sub_parts.map(subPart =>
                subPart.id === subPartId
                  ? {
                      ...subPart,
                      [field]: value
                    }
                  : subPart
              )
            }
          })
        }
      })
    )
  }

  // ─── Rubric Functions ──────────────────────────────────────────────────────

  const applyRubricTemplate = (
    sectionId: string,
    questionId: string,
    templateKey: string
  ) => {
    const template = RUBRIC_TEMPLATES[templateKey]

    if (!template) {
      return
    }

    const question = sections
      .find(section => section.id === sectionId)
      ?.questions.find(
        item => item.id === questionId
      )

    if (!question) {
      return
    }

    const maxMarks = Math.max(
      1,
      Number(question.max_marks) || 1
    )

    const criteria = scaleRubricToMarks(
      template.criteria,
      maxMarks
    )

    updateQuestion(
      sectionId,
      questionId,
      'rubric',
      criteria
    )
  }

  const addRubric = (
    sectionId: string,
    questionId: string
  ) => {
    const question = sections
      .find(section => section.id === sectionId)
      ?.questions.find(
        item => item.id === questionId
      )

    if (!question) {
      return
    }
    setStep('review')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

    const newRubric: RubricCriterionForm = {
      name: '',
      marks: 0,
      description: '',
      required: true
    }

    updateQuestion(
      sectionId,
      questionId,
      'rubric',
      [...question.rubric, newRubric]
    )
  }

  const removeRubric = (
    sectionId: string,
    questionId: string,
    rIdx: number
  ) => {
    const question = sections
      .find(section => section.id === sectionId)
      ?.questions.find(
        item => item.id === questionId
      )

    if (!question) {
      return
    }

    const newRubric = question.rubric.filter(
      (_, index) => index !== rIdx
    )

    updateQuestion(
      sectionId,
      questionId,
      'rubric',
      newRubric
    )
  }

  const updateRubric = (
    sectionId: string,
    questionId: string,
    rIdx: number,
    field: string,
    value: unknown
  ) => {
    const question = sections
      .find(section => section.id === sectionId)
      ?.questions.find(
        item => item.id === questionId
      )

    if (!question || !question.rubric[rIdx]) {
      return
    }

    const newRubric = [...question.rubric]

    newRubric[rIdx] = {
      ...newRubric[rIdx],
      [field]: value
    }

    updateQuestion(
      sectionId,
      questionId,
      'rubric',
      newRubric
    )
  }

  // ─── Sub-Part Rubric Functions ────────────────────────────────────────────

  const applySubPartRubricTemplate = (
    sectionId: string,
    questionId: string,
    subPartId: string,
    templateKey: string
  ) => {
    const template = RUBRIC_TEMPLATES[templateKey]

    if (!template) {
      return
    }

    const subPart = sections
      .find(section => section.id === sectionId)
      ?.questions.find(
        question => question.id === questionId
      )
      ?.sub_parts.find(
        item => item.id === subPartId
      )

    if (!subPart) {
      return
    }

    const maxMarks = Math.max(
      1,
      Number(subPart.max_marks) || 1
    )

    const criteria = scaleRubricToMarks(
      template.criteria,
      maxMarks
    )

    updateSubPart(
      sectionId,
      questionId,
      subPartId,
      'rubric',
      criteria
    )
  }

  const addSubPartRubric = (
    sectionId: string,
    questionId: string,
    subPartId: string
  ) => {
    const subPart = sections
      .find(section => section.id === sectionId)
      ?.questions.find(
        question => question.id === questionId
      )
      ?.sub_parts.find(
        item => item.id === subPartId
      )

    if (!subPart) {
      return
    }

    const newRubric: RubricCriterionForm = {
      name: '',
      marks: 0,
      description: '',
      required: true
    }

    updateSubPart(
      sectionId,
      questionId,
      subPartId,
      'rubric',
      [...subPart.rubric, newRubric]
    )
  }

  const removeSubPartRubric = (
    sectionId: string,
    questionId: string,
    subPartId: string,
    rIdx: number
  ) => {
    const subPart = sections
      .find(section => section.id === sectionId)
      ?.questions.find(
        question => question.id === questionId
      )
      ?.sub_parts.find(
        item => item.id === subPartId
      )

    if (!subPart) {
      return
    }

    const newRubric = subPart.rubric.filter(
      (_, index) => index !== rIdx
    )

    updateSubPart(
      sectionId,
      questionId,
      subPartId,
      'rubric',
      newRubric
    )
  }

  const updateSubPartRubric = (
    sectionId: string,
    questionId: string,
    subPartId: string,
    rIdx: number,
    field: string,
    value: unknown
  ) => {
    const subPart = sections
      .find(section => section.id === sectionId)
      ?.questions.find(
        question => question.id === questionId
      )
      ?.sub_parts.find(
        item => item.id === subPartId
      )

    if (!subPart || !subPart.rubric[rIdx]) {
      return
    }

    const newRubric = [...subPart.rubric]

    newRubric[rIdx] = {
      ...newRubric[rIdx],
      [field]: value
    }

    updateSubPart(
      sectionId,
      questionId,
      subPartId,
      'rubric',
      newRubric
    )
  }

  // ─── Keyword Functions ────────────────────────────────────────────────────

  const addKeywordSuggestion = (
    sectionId: string,
    questionId: string,
    keyword: string,
    isSubPart = false,
    subPartId?: string
  ) => {
    if (isSubPart && subPartId) {
      const subPart = sections
        .find(section => section.id === sectionId)
        ?.questions.find(
          question => question.id === questionId
        )
        ?.sub_parts.find(
          item => item.id === subPartId
        )

      if (!subPart) {
        return
      }

      const cleanKeyword = keyword.trim()

      if (!cleanKeyword) {
        return
      }

      const keywords = subPart.keywords.includes(
        cleanKeyword
      )
        ? subPart.keywords
        : [
            ...subPart.keywords,
            cleanKeyword
          ]

      updateSubPart(
        sectionId,
        questionId,
        subPartId,
        'keywords',
        keywords
      )

      return
    }

    const question = sections
      .find(section => section.id === sectionId)
      ?.questions.find(
        item => item.id === questionId
      )

    if (!question) {
      return
    }

    const cleanKeyword = keyword.trim()

    if (!cleanKeyword) {
      return
    }

    const keywords = question.keywords.includes(
      cleanKeyword
    )
      ? question.keywords
      : [
          ...question.keywords,
          cleanKeyword
        ]

    updateQuestion(
      sectionId,
      questionId,
      'keywords',
      keywords
    )
  }

  const removeKeyword = (
    sectionId: string,
    questionId: string,
    keyword: string,
    isSubPart = false,
    subPartId?: string
  ) => {
    if (isSubPart && subPartId) {
      const subPart = sections
        .find(section => section.id === sectionId)
        ?.questions.find(
          question => question.id === questionId
        )
        ?.sub_parts.find(
          item => item.id === subPartId
        )

      if (!subPart) {
        return
      }

      updateSubPart(
        sectionId,
        questionId,
        subPartId,
        'keywords',
        subPart.keywords.filter(
          item => item !== keyword
        )
      )

      return
    }

    const question = sections
      .find(section => section.id === sectionId)
      ?.questions.find(
        item => item.id === questionId
      )

    if (!question) {
      return
    }

    updateQuestion(
      sectionId,
      questionId,
      'keywords',
      question.keywords.filter(
        item => item !== keyword
      )
    )
  }

  // ─── Key Point Functions ──────────────────────────────────────────────────

  const addKeyPoint = (
    sectionId: string,
    questionId: string,
    point: string,
    isSubPart = false,
    subPartId?: string
  ) => {
    if (isSubPart && subPartId) {
      const subPart = sections
        .find(section => section.id === sectionId)
        ?.questions.find(
          question => question.id === questionId
        )
        ?.sub_parts.find(
          item => item.id === subPartId
        )

      if (!subPart) {
        return
      }

      const cleanPoint = point.trim()

      if (!cleanPoint) {
        return
      }

      const points = subPart.key_points.includes(
        cleanPoint
      )
        ? subPart.key_points
        : [
            ...subPart.key_points,
            cleanPoint
          ]

      updateSubPart(
        sectionId,
        questionId,
        subPartId,
        'key_points',
        points
      )

      return
    }

    const question = sections
      .find(section => section.id === sectionId)
      ?.questions.find(
        item => item.id === questionId
      )

    if (!question) {
      return
    }

    const cleanPoint = point.trim()

    if (!cleanPoint) {
      return
    }

    const points = question.key_points.includes(
      cleanPoint
    )
      ? question.key_points
      : [
          ...question.key_points,
          cleanPoint
        ]

    updateQuestion(
      sectionId,
      questionId,
      'key_points',
      points
    )
  }

  const removeKeyPoint = (
    sectionId: string,
    questionId: string,
    point: string,
    isSubPart = false,
    subPartId?: string
  ) => {
    if (isSubPart && subPartId) {
      const subPart = sections
        .find(section => section.id === sectionId)
        ?.questions.find(
          question => question.id === questionId
        )
        ?.sub_parts.find(
          item => item.id === subPartId
        )

      if (!subPart) {
        return
      }

      updateSubPart(
        sectionId,
        questionId,
        subPartId,
        'key_points',
        subPart.key_points.filter(
          item => item !== point
        )
      )

      return
    }

    const question = sections
      .find(section => section.id === sectionId)
      ?.questions.find(
        item => item.id === questionId
      )

    if (!question) {
      return
    }

    updateQuestion(
      sectionId,
      questionId,
      'key_points',
      question.key_points.filter(
        item => item !== point
      )
    )
  }

  // ─── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    const trimmedName = name.trim()
    const trimmedSubject = subject.trim()

    if (!trimmedName || !trimmedSubject) {
      alert(
        'Please fill in Answer Key Name and Subject.'
      )
      return
    }

    if (sections.length === 0) {
      alert(
        'Please add at least one section.'
      )
      return
    }

    let totalMarks = 0
    let totalQuestions = 0

    for (const section of sections) {
      if (!section.name.trim()) {
        alert(
          'Every section must have a section name.'
        )
        return
      }

      if (section.questions.length === 0) {
        alert(
          `Section "${section.name}" must contain at least one question.`
        )
        return
      }

      for (const question of section.questions) {
        const questionNumber =
          question.question_number || 'Question'

        // ── Questions with sub-parts ──

        if (question.sub_parts.length > 0) {
          let subPartMarks = 0

          for (
            let index = 0;
            index < question.sub_parts.length;
            index += 1
          ) {
            const subPart =
              question.sub_parts[index]

            const subPartLabel =
              `Sub-part ${index + 1}`

            if (
              !subPart.question_text.trim() ||
              !subPart.model_answer.trim()
            ) {
              alert(
                `Section "${section.name}", ${questionNumber}, ${subPartLabel}: Please fill in both question text and model answer.`
              )
              return
            }

            if (
              Number(subPart.max_marks) <= 0
            ) {
              alert(
                `Section "${section.name}", ${questionNumber}, ${subPartLabel}: Max marks must be greater than 0.`
              )
              return
            }

            if (
              subPart.diagram_required &&
              (subPart.diagram_weightage < 0 ||
                subPart.diagram_weightage > 100)
            ) {
              alert(
                `Section "${section.name}", ${questionNumber}, ${subPartLabel}: Diagram weightage must be between 0 and 100.`
              )
              return
            }

            const namedRubric =
              subPart.rubric.filter(
                rubric =>
                  rubric.name.trim()
              )

            if (namedRubric.length > 0) {
              const rubricMarks =
                namedRubric.reduce(
                  (sum, rubric) =>
                    sum +
                    (Number(rubric.marks) || 0),
                  0
                )

              if (
                rubricMarks !==
                Number(subPart.max_marks)
              ) {
                alert(
                  `Section "${section.name}", ${questionNumber}, ${subPartLabel}: Rubric marks (${rubricMarks}) must equal max marks (${subPart.max_marks}).`
                )
                return
              }
            }

            subPartMarks += Number(
              subPart.max_marks
            )
          }

          if (subPartMarks <= 0) {
            alert(
              `Section "${section.name}", ${questionNumber}: Total sub-part marks must be greater than 0.`
            )
            return
          }

          totalMarks += subPartMarks
        }

        // ── Normal question ──

        else {
          if (!question.question_text.trim()) {
            alert(
              `Section "${section.name}", ${questionNumber}: Please enter the question text.`
            )
            return
          }

          if (!question.model_answer.trim()) {
            alert(
              `Section "${section.name}", ${questionNumber}: Please enter the model answer.`
            )
            return
          }

          if (
            Number(question.max_marks) <= 0
          ) {
            alert(
              `Section "${section.name}", ${questionNumber}: Max marks must be greater than 0.`
            )
            return
          }

          if (
            question.diagram_required &&
            (question.diagram_weightage < 0 ||
              question.diagram_weightage > 100)
          ) {
            alert(
              `Section "${section.name}", ${questionNumber}: Diagram weightage must be between 0 and 100.`
            )
            return
          }

          const namedRubric =
            question.rubric.filter(
              rubric =>
                rubric.name.trim()
            )

          if (namedRubric.length > 0) {
            const rubricMarks =
              namedRubric.reduce(
                (sum, rubric) =>
                  sum +
                  (Number(rubric.marks) || 0),
                0
              )

            if (
              rubricMarks !==
              Number(question.max_marks)
            ) {
              alert(
                `Section "${section.name}", ${questionNumber}: Rubric marks (${rubricMarks}) must equal max marks (${question.max_marks}).`
              )
              return
            }
          }

          totalMarks += Number(
            question.max_marks
          )
        }

        totalQuestions += 1
      }
    }

    if (totalMarks <= 0) {
      alert(
        'Total marks must be greater than 0.'
      )
      return
    }

    // ─── Prepare API Data ────────────────────────────────────────────────────
    // The Flask answer-key API requires a TOP-LEVEL `questions` array.
    // The editor also keeps the richer section structure, so we send BOTH:
    //   1. sections   -> preserves the exam-section layout
    //   2. questions  -> satisfies the evaluator/backend contract
    // This fixes the 400 error: "Missing required field: questions".

    const serializedSections = sections.map(section => ({
        id: section.id,
        name: section.name.trim(),
        description:
          section.description.trim(),
        instruction:
          section.instruction.trim(),

        questions: section.questions.map(
          question => ({
            id: question.id,
            question_number:
              question.question_number.trim(),
            question_text:
              question.question_text.trim(),
            model_answer:
              question.model_answer.trim(),
            max_marks:
              Number(question.max_marks),
            question_type:
              question.question_type,
            diagram_required:
              question.diagram_required,
            diagram_weightage:
              Number(
                question.diagram_weightage
              ) || 0,

            key_points:
              question.key_points
                .map(point => point.trim())
                .filter(Boolean),

            keywords:
              question.keywords
                .map(keyword => keyword.trim())
                .filter(Boolean),

            rubric:
              question.rubric
                .filter(
                  rubric =>
                    rubric.name.trim()
                )
                .map(rubric => ({
                  name: rubric.name.trim(),
                  marks:
                    Number(rubric.marks) || 0,
                  description:
                    rubric.description?.trim() ||
                    '',
                  required:
                    rubric.required !== false
                })),

            sub_parts:
              question.sub_parts.map(
                subPart => ({
                  id: subPart.id,
                  question_text:
                    subPart.question_text.trim(),
                  model_answer:
                    subPart.model_answer.trim(),
                  max_marks:
                    Number(subPart.max_marks),
                  question_type:
                    subPart.question_type,
                  diagram_required:
                    subPart.diagram_required,
                  diagram_weightage:
                    Number(
                      subPart.diagram_weightage
                    ) || 0,

                  key_points:
                    subPart.key_points
                      .map(point =>
                        point.trim()
                      )
                      .filter(Boolean),

                  keywords:
                    subPart.keywords
                      .map(keyword =>
                        keyword.trim()
                      )
                      .filter(Boolean),

                  rubric:
                    subPart.rubric
                      .filter(
                        rubric =>
                          rubric.name.trim()
                      )
                      .map(rubric => ({
                        name:
                          rubric.name.trim(),
                        marks:
                          Number(
                            rubric.marks
                          ) || 0,
                        description:
                          rubric.description?.trim() ||
                          '',
                        required:
                          rubric.required !==
                          false
                      }))
                })
              )
          })
        )
      }))

    const flattenedQuestions = serializedSections.flatMap(
      section => section.questions
    )

    const data = {
      name: trimmedName,
      subject: trimmedSubject,
      department: department.trim(),
      semester,
      total_marks: totalMarks,
      total_questions: totalQuestions,
      questions: flattenedQuestions,
      sections: serializedSections,

      // Keep faculty creation separate from public creation.
      created_by: 'faculty'
    }

    console.log('📤 Answer key payload:', {
      total_questions: data.questions.length,
      total_marks: data.total_marks,
      sections: data.sections.length
    })

    try {
      if (initialAnswerKey?.id && onUpdate) {
        await onUpdate(initialAnswerKey.id, data)
      } else {
        await create(data)
      }
      onSave()
    } catch (err) {
      console.error('Failed to save answer key:', err)
      alert(err instanceof Error ? err.message : 'Failed to save answer key. Please try again.')
    }
  }

  // ─── Get Subject Keywords ──────────────────────────────────────────────────

  const getSubjectKeywords = () => {
    const normalizedSubject =
      subject.toLowerCase()

    for (const [key, keywords] of Object.entries(
      COMMON_KEYWORDS
    )) {
      if (
        normalizedSubject.includes(
          key.toLowerCase()
        )
      ) {
        return keywords
      }
    }

    return COMMON_KEYWORDS.Pharmacology
  }

  const subjectKeywords =
    getSubjectKeywords()

  // ─── Render Rubric Section ─────────────────────────────────────────────────

  const renderRubricSection = (
    rubric: RubricCriterionForm[],
    maxMarks: number,
    onAddRubric: () => void,
    onRemoveRubric: (idx: number) => void,
    onUpdateRubric: (
      idx: number,
      field: string,
      value: unknown
    ) => void,
    onApplyTemplate: (
      templateKey: string
    ) => void
  ) => {
    const totalRubricMarks =
      rubric.reduce(
        (sum, item) =>
          sum +
          (Number(item.marks) || 0),
        0
      )

    const hasRubric =
      rubric.some(
        item => item.name.trim()
      )

    const isBalanced =
      totalRubricMarks === maxMarks

    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-[#0F172A]">
            Rubric
          </label>

          <div className="flex items-center gap-2">
            <select
              className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] bg-white focus:border-[#3B5DE8] outline-none"
              onChange={event => {
                if (event.target.value) {
                  onApplyTemplate(
                    event.target.value
                  )
                }
              }}
              value=""
            >
              <option value="">
                Apply Template
              </option>

              {Object.entries(
                RUBRIC_TEMPLATES
              ).map(
                ([key, template]) => (
                  <option
                    key={key}
                    value={key}
                  >
                    {template.name}
                  </option>
                )
              )}

              <option value="custom">
                Custom Rubric
              </option>
            </select>

            <button
              type="button"
              onClick={onAddRubric}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-[#1B3A6B] bg-[#EEF4FF] hover:bg-[#BACFFB] transition-colors"
            >
              <PlusIcon size={14} />
              Add Criterion
            </button>
          </div>
        </div>

        {hasRubric && (
          <div className="space-y-2">
            {rubric.map(
              (item, rIdx) => (
                <div
                  key={rIdx}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder="Criterion name"
                    className="flex-1 h-9 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:border-[#3B5DE8] focus:ring-2 focus:ring-[#3B5DE8]/20 outline-none"
                    value={item.name}
                    onChange={event =>
                      onUpdateRubric(
                        rIdx,
                        'name',
                        event.target.value
                      )
                    }
                  />

                  <input
                    type="number"
                    placeholder="Marks"
                    className="w-20 h-9 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:border-[#3B5DE8] focus:ring-2 focus:ring-[#3B5DE8]/20 outline-none"
                    min={0}
                    max={maxMarks}
                    value={item.marks}
                    onChange={event =>
                      onUpdateRubric(
                        rIdx,
                        'marks',
                        Math.max(
                          0,
                          parseInt(
                            event.target.value,
                            10
                          ) || 0
                        )
                      )
                    }
                  />

                  {rubric.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        onRemoveRubric(
                          rIdx
                        )
                      }
                      className="text-[#94A3B8] hover:text-[#DC2626] transition-colors"
                    >
                      <XIcon size={16} />
                    </button>
                  )}
                </div>
              )
            )}
          </div>
        )}

        {!hasRubric && (
          <div className="p-4 bg-[#F8FAFC] rounded-lg border border-dashed border-[#E2E8F0] text-center text-sm text-[#94A3B8]">
            No rubric criteria added yet.
            Apply a template or add custom
            criteria.
          </div>
        )}

        {hasRubric && (
          <div
            className={`mt-2 text-sm ${
              isBalanced
                ? 'text-[#059669]'
                : 'text-[#D97706]'
            }`}
          >
            Total Rubric Marks:{' '}
            {totalRubricMarks} / {maxMarks}

            {isBalanced
              ? ' ✓ Balanced'
              : totalRubricMarks <
                  maxMarks
                ? ` (${maxMarks - totalRubricMarks} remaining)`
                : ` (${totalRubricMarks - maxMarks} over)`}
          </div>
        )}
      </div>
    )
  }

  // ─── Render Key Points & Keywords ──────────────────────────────────────────

  const renderKeyPointsAndKeywords = (
    keyPoints: string[],
    keywords: string[],
    onAddKeyPoint: (
      point: string
    ) => void,
    onRemoveKeyPoint: (
      point: string
    ) => void,
    onAddKeyword: (
      keyword: string
    ) => void,
    onRemoveKeyword: (
      keyword: string
    ) => void
  ) => {
    return (
      <>
        {/* Key Points */}

        <div>
          <label className="block text-sm font-medium text-[#0F172A] mb-1">
            Key Points
          </label>

          <div className="flex flex-wrap gap-2 mb-2">
            {COMMON_KEY_POINTS.slice(
              0,
              8
            ).map(point => {
              const isActive =
                keyPoints.includes(point)

              return (
                <button
                  type="button"
                  key={point}
                  onClick={() =>
                    isActive
                      ? onRemoveKeyPoint(
                          point
                        )
                      : onAddKeyPoint(
                          point
                        )
                  }
                  className={`px-3 py-1 rounded-full text-xs transition-colors ${
                    isActive
                      ? 'bg-[#1B3A6B] text-white'
                      : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                  }`}
                >
                  {isActive ? '✓' : '+'}{' '}
                  {point}
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap gap-1">
            {keyPoints.map(point => (
              <span
                key={point}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#EEF4FF] text-[#1B3A6B] rounded-full text-xs"
              >
                {point}

                <button
                  type="button"
                  onClick={() =>
                    onRemoveKeyPoint(
                      point
                    )
                  }
                  className="hover:text-[#DC2626]"
                >
                  ×
                </button>
              </span>
            ))}

            {keyPoints.length === 0 && (
              <span className="text-xs text-[#94A3B8]">
                Click suggestions above
                or type custom below
              </span>
            )}
          </div>

          <input
            type="text"
            placeholder="Add custom key point..."
            className="w-full mt-1 h-9 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:border-[#3B5DE8] focus:ring-2 focus:ring-[#3B5DE8]/20 outline-none"
            onKeyDown={event => {
              if (event.key === 'Enter') {
                const target =
                  event.currentTarget

                if (target.value.trim()) {
                  onAddKeyPoint(
                    target.value.trim()
                  )

                  target.value = ''
                }
              }
            }}
          />
        </div>

        {/* Keywords */}

        <div>
          <label className="block text-sm font-medium text-[#0F172A] mb-1">
            Keywords
          </label>

          <div className="flex flex-wrap gap-2 mb-2">
            {subjectKeywords
              .slice(0, 10)
              .map(keyword => {
                const isActive =
                  keywords.includes(
                    keyword
                  )

                return (
                  <button
                    type="button"
                    key={keyword}
                    onClick={() =>
                      isActive
                        ? onRemoveKeyword(
                            keyword
                          )
                        : onAddKeyword(
                            keyword
                          )
                    }
                    className={`px-3 py-1 rounded-full text-xs transition-colors ${
                      isActive
                        ? 'bg-[#1B3A6B] text-white'
                        : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                    }`}
                  >
                    {isActive
                      ? '✓'
                      : '+'}{' '}
                    {keyword}
                  </button>
                )
              })}
          </div>

          <div className="flex flex-wrap gap-1">
            {keywords.map(keyword => (
              <span
                key={keyword}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#EEF4FF] text-[#1B3A6B] rounded-full text-xs"
              >
                {keyword}

                <button
                  type="button"
                  onClick={() =>
                    onRemoveKeyword(
                      keyword
                    )
                  }
                  className="hover:text-[#DC2626]"
                >
                  ×
                </button>
              </span>
            ))}

            {keywords.length === 0 && (
              <span className="text-xs text-[#94A3B8]">
                Click suggestions above
                or type custom below
              </span>
            )}
          </div>

          <input
            type="text"
            placeholder="Add custom keyword..."
            className="w-full mt-1 h-9 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:border-[#3B5DE8] focus:ring-2 focus:ring-[#3B5DE8]/20 outline-none"
            onKeyDown={event => {
              if (event.key === 'Enter') {
                const target =
                  event.currentTarget

                if (target.value.trim()) {
                  onAddKeyword(
                    target.value
                      .trim()
                      .toLowerCase()
                  )

                  target.value = ''
                }
              }
            }}
          />
        </div>
      </>
    )
  }

  // ─── Main Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-[#E2E8F0] bg-white text-sm font-medium text-[#1B3A6B] hover:bg-[#F8FAFC] transition-colors"
        >
          ← Back to Faculty Dashboard
        </button>
        {initialAnswerKey?.id && (
          <span className="text-sm text-[#64748B]">Editing Answer Key</span>
        )}
      </div>
      {error && (
        <Alert
          variant="error"
          title="Error"
          message={error}
        />
      )}

      {/* Basic Information */}

      <Card>
        <CardHeader
          title="Basic Information"
          subtitle="Enter the details for this answer key"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1">
              Answer Key Name *
            </label>

            <Input
              placeholder="e.g., Pharmacology-II MTE-1 2026"
              value={name}
              onChange={event =>
                setName(event.target.value)
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1">
              Subject *
            </label>

            <Input
              placeholder="e.g., Pharmacology-II"
              value={subject}
              onChange={event =>
                setSubject(event.target.value)
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1">
              Department
            </label>

            <Input
              placeholder="e.g., Pharmacy"
              value={department}
              onChange={event =>
                setDepartment(
                  event.target.value
                )
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1">
              Semester
            </label>

            <Input
              type="number"
              min={1}
              max={8}
              value={semester}
              onChange={event =>
                setSemester(
                  Math.min(
                    8,
                    Math.max(
                      1,
                      parseInt(
                        event.target.value,
                        10
                      ) || 1
                    )
                  )
                )
              }
            />
          </div>
        </div>
      </Card>

      {/* Section Templates */}

      <Card>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-[#0F172A]">
            Add Section
          </h3>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                addSection()
              }
              className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-[#1B3A6B] bg-[#EEF4FF] hover:bg-[#BACFFB] transition-colors"
            >
              <PlusIcon size={16} />
              Empty Section
            </button>

            {Object.entries(
              SECTION_TEMPLATES
            ).map(([key, template]) => (
              <button
                type="button"
                key={key}
                onClick={() =>
                  addSection(key)
                }
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#1B3A6B] hover:bg-[#0F2142] transition-colors"
              >
                +{' '}
                {template.name
                  .split(':')[0]
                  .trim()}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Sections */}

      {sections.map(section => {
        const isSectionExpanded =
          expandedSections[
            section.id
          ] !== false

        return (
          <Card
            key={section.id}
            className="border-l-4 border-l-[#1B3A6B]"
          >
            {/* Section Header */}

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  toggleSection(
                    section.id
                  )
                }
                className="flex items-center gap-2 text-left flex-1"
              >
                {isSectionExpanded ? (
                  <span className="text-sm">▼</span>
                ) : (
                  <span className="text-sm">▶</span>
                )}

                <div>
                  <h3 className="text-base font-semibold text-[#0F172A]">
                    {section.name}
                  </h3>

                  <p className="text-sm text-[#94A3B8]">
                    {section.description}
                  </p>
                </div>
              </button>

              {sections.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    removeSection(
                      section.id
                    )
                  }
                  className="text-sm text-[#DC2626] hover:text-[#991B1B] transition-colors"
                >
                  Remove Section
                </button>
              )}
            </div>

            {isSectionExpanded && (
              <div className="mt-4 space-y-4">
                {/* Section Settings */}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-1">
                      Section Name
                    </label>

                    <Input
                      value={
                        section.name
                      }
                      onChange={event =>
                        updateSection(
                          section.id,
                          'name',
                          event.target
                            .value
                        )
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-1">
                      Description
                    </label>

                    <Input
                      value={
                        section.description
                      }
                      onChange={event =>
                        updateSection(
                          section.id,
                          'description',
                          event.target
                            .value
                        )
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-1">
                      Instruction
                    </label>

                    <Input
                      value={
                        section.instruction
                      }
                      onChange={event =>
                        updateSection(
                          section.id,
                          'instruction',
                          event.target
                            .value
                        )
                      }
                    />
                  </div>
                </div>

                {/* Questions */}

                {section.questions.map(
                  question => {
                    const isQuestionExpanded =
                      expandedQuestions[
                        question.id
                      ] !== false

                    const hasSubParts =
                      question.sub_parts
                        .length > 0

                    return (
                      <div
                        key={
                          question.id
                        }
                        className="border border-[#E2E8F0] rounded-lg p-4 mt-4"
                      >
                        {/* Question Header */}

                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() =>
                              toggleQuestion(
                                question.id
                              )
                            }
                            className="flex items-center gap-2 text-left flex-1"
                          >
                            {isQuestionExpanded ? (
                              <span className="text-sm">▼</span>
                            ) : (
                              <span className="text-sm">▶</span>
                            )}

                            <span className="font-medium text-[#0F172A]">
                              {
                                question.question_number
                              }

                              {hasSubParts && (
                                <span className="text-sm text-[#94A3B8] ml-2">
                                  (
                                  {
                                    question
                                      .sub_parts
                                      .length
                                  }{' '}
                                  sub-parts)
                                </span>
                              )}
                            </span>

                            <span className="text-sm text-[#94A3B8]">
                              {hasSubParts
                                ? `Total: ${question.sub_parts.reduce(
                                    (
                                      sum,
                                      subPart
                                    ) =>
                                      sum +
                                      Number(
                                        subPart.max_marks
                                      ),
                                    0
                                  )} marks`
                                : `${question.max_marks} marks`}
                            </span>
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                addSubPart(
                                  section.id,
                                  question.id
                                )
                              }
                              className="text-sm text-[#1B3A6B] hover:text-[#0F2142] transition-colors"
                            >
                              + Add Sub-part
                            </button>

                            {section.questions
                              .length >
                              1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  removeQuestion(
                                    section.id,
                                    question.id
                                  )
                                }
                                className="text-sm text-[#DC2626] hover:text-[#991B1B] transition-colors"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>

                        {isQuestionExpanded && (
                          <div className="mt-4 space-y-4">
                            {/* Main Question */}

                            <div>
                              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                                {hasSubParts
                                  ? 'Parent Question Text (Optional)'
                                  : 'Question Text *'}
                              </label>

                              <textarea
                                className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:border-[#3B5DE8] focus:ring-2 focus:ring-[#3B5DE8]/20 outline-none min-h-[60px]"
                                placeholder={
                                  hasSubParts
                                    ? 'Optional parent question text...'
                                    : 'Enter the question...'
                                }
                                value={
                                  question.question_text
                                }
                                onChange={event =>
                                  updateQuestion(
                                    section.id,
                                    question.id,
                                    'question_text',
                                    event.target
                                      .value
                                  )
                                }
                              />
                            </div>

                            {!hasSubParts && (
                              <>
                                {/* Model Answer */}

                                <div>
                                  <label className="block text-sm font-medium text-[#0F172A] mb-1">
                                    Model Answer *
                                  </label>

                                  <textarea
                                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8E0] text-sm text-[#0F172A] focus:border-[#3B5DE8] focus:ring-2 focus:ring-[#3B5DE8]/20 outline-none min-h-[80px]"
                                    placeholder="Enter the model answer..."
                                    value={
                                      question.model_answer
                                    }
                                    onChange={event =>
                                      updateQuestion(
                                        section.id,
                                        question.id,
                                        'model_answer',
                                        event.target
                                          .value
                                      )
                                    }
                                  />
                                </div>

                                {/* Settings */}

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-[#0F172A] mb-1">
                                      Max Marks *
                                    </label>

                                    <Input
                                      type="number"
                                      min={1}
                                      max={50}
                                      value={
                                        question.max_marks
                                      }
                                      onChange={event =>
                                        updateQuestion(
                                          section.id,
                                          question.id,
                                          'max_marks',
                                          Math.min(
                                            50,
                                            Math.max(
                                              1,
                                              parseInt(
                                                event
                                                  .target
                                                  .value,
                                                10
                                              ) || 1
                                            )
                                          )
                                        )
                                      }
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-[#0F172A] mb-1">
                                      Question Type
                                    </label>

                                    <select
                                      className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] bg-white focus:border-[#3B5DE8] focus:ring-2 focus:ring-[#3B5DE8]/20 outline-none"
                                      value={
                                        question.question_type
                                      }
                                      onChange={event =>
                                        updateQuestion(
                                          section.id,
                                          question.id,
                                          'question_type',
                                          event.target
                                            .value
                                        )
                                      }
                                    >
                                      <option value="theory">
                                        Theory
                                      </option>
                                      <option value="numerical">
                                        Numerical
                                      </option>
                                      <option value="diagram">
                                        Diagram
                                      </option>
                                      <option value="mixed">
                                        Mixed
                                      </option>
                                    </select>
                                  </div>

                                  <div className="flex items-end">
                                    <label className="flex items-center gap-2 text-sm font-medium text-[#0F172A]">
                                      <input
                                        type="checkbox"
                                        checked={
                                          question.diagram_required
                                        }
                                        onChange={event =>
                                          updateQuestion(
                                            section.id,
                                            question.id,
                                            'diagram_required',
                                            event.target
                                              .checked
                                          )
                                        }
                                        className="w-4 h-4 rounded border-[#E2E8F0] text-[#1B3A6B] focus:ring-[#1B3A6B]"
                                      />

                                      Diagram Required
                                    </label>
                                  </div>

                                  {question.diagram_required && (
                                    <div>
                                      <label className="block text-sm font-medium text-[#0F172A] mb-1">
                                        Diagram Weightage (%)
                                      </label>

                                      <Input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={
                                          question.diagram_weightage
                                        }
                                        onChange={event =>
                                          updateQuestion(
                                            section.id,
                                            question.id,
                                            'diagram_weightage',
                                            Math.min(
                                              100,
                                              Math.max(
                                                0,
                                                parseInt(
                                                  event
                                                    .target
                                                    .value,
                                                  10
                                                ) || 0
                                              )
                                            )
                                          )
                                        }
                                      />
                                    </div>
                                  )}
                                </div>

                                {/* Rubric */}

                                {renderRubricSection(
                                  question.rubric,
                                  question.max_marks,
                                  () =>
                                    addRubric(
                                      section.id,
                                      question.id
                                    ),
                                  idx =>
                                    removeRubric(
                                      section.id,
                                      question.id,
                                      idx
                                    ),
                                  (
                                    idx,
                                    field,
                                    value
                                  ) =>
                                    updateRubric(
                                      section.id,
                                      question.id,
                                      idx,
                                      field,
                                      value
                                    ),
                                  templateKey =>
                                    applyRubricTemplate(
                                      section.id,
                                      question.id,
                                      templateKey
                                    )
                                )}

                                {/* Key Points & Keywords */}

                                {renderKeyPointsAndKeywords(
                                  question.key_points,
                                  question.keywords,
                                  point =>
                                    addKeyPoint(
                                      section.id,
                                      question.id,
                                      point
                                    ),
                                  point =>
                                    removeKeyPoint(
                                      section.id,
                                      question.id,
                                      point
                                    ),
                                  keyword =>
                                    addKeywordSuggestion(
                                      section.id,
                                      question.id,
                                      keyword
                                    ),
                                  keyword =>
                                    removeKeyword(
                                      section.id,
                                      question.id,
                                      keyword
                                    )
                                )}
                              </>
                            )}

                            {/* Sub-parts */}

                            {hasSubParts && (
                              <div className="space-y-4 mt-4">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-semibold text-[#0F172A]">
                                    Sub-parts
                                  </h4>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      addSubPart(
                                        section.id,
                                        question.id
                                      )
                                    }
                                    className="text-sm text-[#1B3A6B] hover:text-[#0F2142] transition-colors"
                                  >
                                    + Add Sub-part
                                  </button>
                                </div>

                                {question.sub_parts.map(
                                  (
                                    subPart,
                                    subPartIndex
                                  ) => (
                                    <div
                                      key={
                                        subPart.id
                                      }
                                      className="border-l-4 border-l-[#E2E8F0] pl-4 space-y-3"
                                    >
                                      <div className="flex items-center justify-between">
                                        <h5 className="text-sm font-medium text-[#0F172A]">
                                          Sub-part{' '}
                                          {subPartIndex +
                                            1}
                                        </h5>

                                        {question
                                          .sub_parts
                                          .length >
                                          1 && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              removeSubPart(
                                                section.id,
                                                question.id,
                                                subPart.id
                                              )
                                            }
                                            className="text-sm text-[#DC2626] hover:text-[#991B1B] transition-colors"
                                          >
                                            Remove
                                          </button>
                                        )}
                                      </div>

                                      <div>
                                        <label className="block text-sm font-medium text-[#0F172A] mb-1">
                                          Question Text *
                                        </label>

                                        <textarea
                                          className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:border-[#3B5DE8] focus:ring-2 focus:ring-[#3B5DE8]/20 outline-none min-h-[50px]"
                                          placeholder="Enter sub-part question..."
                                          value={
                                            subPart.question_text
                                          }
                                          onChange={event =>
                                            updateSubPart(
                                              section.id,
                                              question.id,
                                              subPart.id,
                                              'question_text',
                                              event.target
                                                .value
                                            )
                                          }
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-sm font-medium text-[#0F172A] mb-1">
                                          Model Answer *
                                        </label>

                                        <textarea
                                          className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:border-[#3B5DE8] focus:ring-2 focus:ring-[#3B5DE8]/20 outline-none min-h-[60px]"
                                          placeholder="Enter model answer..."
                                          value={
                                            subPart.model_answer
                                          }
                                          onChange={event =>
                                            updateSubPart(
                                              section.id,
                                              question.id,
                                              subPart.id,
                                              'model_answer',
                                              event.target
                                                .value
                                            )
                                          }
                                        />
                                      </div>

                                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        <div>
                                          <label className="block text-sm font-medium text-[#0F172A] mb-1">
                                            Max Marks *
                                          </label>

                                          <Input
                                            type="number"
                                            min={1}
                                            max={20}
                                            value={
                                              subPart.max_marks
                                            }
                                            onChange={event =>
                                              updateSubPart(
                                                section.id,
                                                question.id,
                                                subPart.id,
                                                'max_marks',
                                                Math.min(
                                                  20,
                                                  Math.max(
                                                    1,
                                                    parseInt(
                                                      event
                                                        .target
                                                        .value,
                                                      10
                                                    ) || 1
                                                  )
                                                )
                                              )
                                            }
                                          />
                                        </div>

                                        <div>
                                          <label className="block text-sm font-medium text-[#0F172A] mb-1">
                                            Question Type
                                          </label>

                                          <select
                                            className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] bg-white focus:border-[#3B5DE8] outline-none"
                                            value={
                                              subPart.question_type
                                            }
                                            onChange={event =>
                                              updateSubPart(
                                                section.id,
                                                question.id,
                                                subPart.id,
                                                'question_type',
                                                event.target
                                                  .value
                                              )
                                            }
                                          >
                                            <option value="theory">
                                              Theory
                                            </option>
                                            <option value="numerical">
                                              Numerical
                                            </option>
                                            <option value="diagram">
                                              Diagram
                                            </option>
                                            <option value="mixed">
                                              Mixed
                                            </option>
                                          </select>
                                        </div>

                                        <div className="flex items-end">
                                          <label className="flex items-center gap-2 text-sm font-medium text-[#0F172A]">
                                            <input
                                              type="checkbox"
                                              checked={
                                                subPart.diagram_required
                                              }
                                              onChange={event =>
                                                updateSubPart(
                                                  section.id,
                                                  question.id,
                                                  subPart.id,
                                                  'diagram_required',
                                                  event.target
                                                    .checked
                                                )
                                              }
                                              className="w-4 h-4 rounded border-[#E2E8F0] text-[#1B3A6B] focus:ring-[#1B3A6B]"
                                            />
                                            Diagram Required
                                          </label>
                                        </div>

                                        {subPart.diagram_required && (
                                          <div>
                                            <label className="block text-sm font-medium text-[#0F172A] mb-1">
                                              Diagram Weightage (%)
                                            </label>

                                            <Input
                                              type="number"
                                              min={0}
                                              max={100}
                                              value={
                                                subPart.diagram_weightage
                                              }
                                              onChange={event =>
                                                updateSubPart(
                                                  section.id,
                                                  question.id,
                                                  subPart.id,
                                                  'diagram_weightage',
                                                  Math.min(
                                                    100,
                                                    Math.max(
                                                      0,
                                                      parseInt(
                                                        event
                                                          .target
                                                          .value,
                                                        10
                                                      ) || 0
                                                    )
                                                  )
                                                )
                                              }
                                            />
                                          </div>
                                        )}
                                      </div>

                                      {/* Sub-part Rubric */}

                                      {renderRubricSection(
                                        subPart.rubric,
                                        subPart.max_marks,
                                        () =>
                                          addSubPartRubric(
                                            section.id,
                                            question.id,
                                            subPart.id
                                          ),
                                        idx =>
                                          removeSubPartRubric(
                                            section.id,
                                            question.id,
                                            subPart.id,
                                            idx
                                          ),
                                        (
                                          idx,
                                          field,
                                          value
                                        ) =>
                                          updateSubPartRubric(
                                            section.id,
                                            question.id,
                                            subPart.id,
                                            idx,
                                            field,
                                            value
                                          ),
                                        templateKey =>
                                          applySubPartRubricTemplate(
                                            section.id,
                                            question.id,
                                            subPart.id,
                                            templateKey
                                          )
                                      )}

                                      {/* Sub-part Key Points & Keywords */}

                                      {renderKeyPointsAndKeywords(
                                        subPart.key_points,
                                        subPart.keywords,
                                        point =>
                                          addKeyPoint(
                                            section.id,
                                            question.id,
                                            point,
                                            true,
                                            subPart.id
                                          ),
                                        point =>
                                          removeKeyPoint(
                                            section.id,
                                            question.id,
                                            point,
                                            true,
                                            subPart.id
                                          ),
                                        keyword =>
                                          addKeywordSuggestion(
                                            section.id,
                                            question.id,
                                            keyword,
                                            true,
                                            subPart.id
                                          ),
                                        keyword =>
                                          removeKeyword(
                                            section.id,
                                            question.id,
                                            keyword,
                                            true,
                                            subPart.id
                                          )
                                      )}
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  }
                )}

                {/* Add Question */}

                <button
                  type="button"
                  onClick={() =>
                    addQuestion(
                      section.id
                    )
                  }
                  className="w-full py-3 rounded-lg border-2 border-dashed border-[#E2E8F0] text-sm text-[#94A3B8] hover:text-[#1B3A6B] hover:border-[#1B3A6B] transition-colors"
                >
                  + Add Question to{' '}
                  {section.name}
                </button>
              </div>
            )}
          </Card>
        )
      })}

      {/* Actions */}

      <div className="flex items-center gap-3">
        <div className="flex-1" />

        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm font-medium text-[#475569] hover:text-[#1B3A6B] transition-colors"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading}
          className={`px-6 py-2 rounded-lg text-sm font-medium text-white bg-[#1B3A6B] hover:bg-[#0F2142] transition-colors ${
            isLoading
              ? 'opacity-60 cursor-not-allowed'
              : ''
          }`}
        >
          {isLoading
            ? 'Saving...'
            : initialAnswerKey?.id
              ? 'Update Answer Key'
              : 'Save Answer Key'}
        </button>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: any }) {
  return <div><div className="text-xs uppercase tracking-wide font-semibold text-slate-400">{label}</div><div className="mt-1 text-sm font-semibold text-slate-900 break-words">{value || '—'}</div></div>
}
