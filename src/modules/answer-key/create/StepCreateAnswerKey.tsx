
// src/modules/answer-key/create/StepCreateAnswerKey.tsx

import { useState } from 'react'
import {
  Card,
  CardHeader,
  Button,
  Input,
  Alert,
  XIcon,
  PlusIcon,
} from '@/components/common'
import { useAnswerKeyStore } from '@/stores/answerKeyStore'
import type {
  AnswerKeyQuestionForm,
} from '../types'


// ─── Rubric Templates ─────────────────────────────────────────────────────────

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
  'theory-standard': {
    name: 'Standard Theory (5 criteria)',
    criteria: [
      {
        name: 'Definition / Concept Understanding',
        marks: 3,
        description: 'Clear understanding of core concept',
      },
      {
        name: 'Explanation Depth',
        marks: 2,
        description: 'Thorough explanation with details',
      },
      {
        name: 'Relevant Examples',
        marks: 2,
        description: 'Appropriate and relevant examples',
      },
      {
        name: 'Structure and Clarity',
        marks: 2,
        description: 'Well-organized and clear',
      },
      {
        name: 'Accuracy',
        marks: 1,
        description: 'Factually correct information',
      },
    ],
  },

  'theory-detailed': {
    name: 'Detailed Theory (4 criteria)',
    criteria: [
      {
        name: 'Core Concept Accuracy',
        marks: 4,
        description: 'Accurate definition and explanation',
      },
      {
        name: 'Key Points Coverage',
        marks: 3,
        description: 'Covers all important points',
      },
      {
        name: 'Examples and Applications',
        marks: 2,
        description: 'Real-world applications',
      },
      {
        name: 'Clarity and Organization',
        marks: 1,
        description: 'Clear and well-structured',
      },
    ],
  },

  'numerical-standard': {
    name: 'Standard Numerical (4 criteria)',
    criteria: [
      {
        name: 'Correct Formula / Equation',
        marks: 3,
        description: 'Uses correct formula',
      },
      {
        name: 'Steps and Working',
        marks: 3,
        description: 'Shows all necessary steps',
      },
      {
        name: 'Accurate Calculation',
        marks: 3,
        description: 'All calculations correct',
      },
      {
        name: 'Final Answer with Units',
        marks: 1,
        description: 'Correct final answer',
      },
    ],
  },

  'numerical-detailed': {
    name: 'Detailed Numerical (5 criteria)',
    criteria: [
      {
        name: 'Correct Approach',
        marks: 3,
        description: 'Selects appropriate method',
      },
      {
        name: 'Step-by-Step Working',
        marks: 3,
        description: 'Clear step-by-step working',
      },
      {
        name: 'Mathematical Accuracy',
        marks: 2,
        description: 'All calculations correct',
      },
      {
        name: 'Answer Justification',
        marks: 1,
        description: 'Justification for answer',
      },
      {
        name: 'Units and Formatting',
        marks: 1,
        description: 'Correct units and formatting',
      },
    ],
  },

  'diagram-flowchart': {
    name: 'Flowchart Diagram (5 criteria)',
    criteria: [
      {
        name: 'Correct Components',
        marks: 3,
        description: 'All required components present',
      },
      {
        name: 'Proper Labeling',
        marks: 2,
        description: 'All components clearly labeled',
      },
      {
        name: 'Flow and Connections',
        marks: 2,
        description: 'Proper flow arrows',
      },
      {
        name: 'Diagram Explanation',
        marks: 2,
        description: 'Clear explanation',
      },
      {
        name: 'Overall Presentation',
        marks: 1,
        description: 'Neat and professional',
      },
    ],
  },

  'diagram-block': {
    name: 'Block Diagram (4 criteria)',
    criteria: [
      {
        name: 'Correct Blocks',
        marks: 3,
        description: 'All required blocks present',
      },
      {
        name: 'Proper Labeling',
        marks: 3,
        description: 'Clear and accurate labels',
      },
      {
        name: 'Connections and Flow',
        marks: 2,
        description: 'Correct connections',
      },
      {
        name: 'Diagram Description',
        marks: 2,
        description: 'Comprehensive description',
      },
    ],
  },

  'mixed-standard': {
    name: 'Standard Mixed (4 criteria)',
    criteria: [
      {
        name: 'Theoretical Understanding',
        marks: 3,
        description: 'Demonstrates theoretical knowledge',
      },
      {
        name: 'Practical Application',
        marks: 3,
        description: 'Applies to practical scenarios',
      },
      {
        name: 'Clarity of Explanation',
        marks: 2,
        description: 'Clear and coherent',
      },
      {
        name: 'Examples and Illustrations',
        marks: 2,
        description: 'Uses appropriate examples',
      },
    ],
  },

  simple: {
    name: 'Simple (2 criteria)',
    criteria: [
      {
        name: 'Correct Answer',
        marks: 7,
        description: 'Answer is correct',
      },
      {
        name: 'Explanation',
        marks: 3,
        description: 'Good explanation',
      },
    ],
  },
}


// ─── Common Keywords ──────────────────────────────────────────────────────────

const COMMON_KEYWORDS: Record<string, string[]> = {
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
    'clustering',
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
    'knowledge',
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
    'confusion matrix',
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
    'dictionary',
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
    'variance',
  ],
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
  'Real-world example',
]


// ─── Examination Types ────────────────────────────────────────────────────────

const EXAMINATION_TYPES = [
  'Mid Semester',
  'End Semester',
  'Back Exams',
]


// ─── Props ────────────────────────────────────────────────────────────────────

interface StepCreateAnswerKeyProps {
  onSave: () => void
  onCancel: () => void
}


// ─── Component ────────────────────────────────────────────────────────────────

export default function StepCreateAnswerKey({
  onSave,
  onCancel,
}: StepCreateAnswerKeyProps) {

  /*
   * IMPORTANT:
   *
   * We use createPublic() instead of create().
   *
   * create() sends the JWT Authorization header.
   *
   * createPublic() sends NO JWT and calls:
   *
   * POST /api/answer-key/public-create
   *
   * This allows the Answer Key Manager to work
   * without login.
   */
  const {
    createPublic,
    isLoading,
    error,
  } = useAnswerKeyStore()


  // ─── Examination Details ────────────────────────────────────────────────────

  const [name, setName] = useState('')

  const [subject, setSubject] = useState('')

  const [subjectCode, setSubjectCode] = useState('')

  const [collegeName, setCollegeName] = useState('')

  const [department, setDepartment] =
    useState('Computer Science')

  const [semester, setSemester] = useState(1)

  const [examinationType, setExaminationType] =
    useState('End Semester')

  const [academicYear, setAcademicYear] =
    useState('2026-27')

  const [examinationDate, setExaminationDate] =
    useState('')

  const [totalMarks, setTotalMarks] =
    useState(100)

  const [duration, setDuration] =
    useState('3 Hours')


  // ─── Questions ─────────────────────────────────────────────────────────────

  const createEmptyQuestion = (
    id: number
  ): AnswerKeyQuestionForm => ({
    id,
    question_text: '',
    model_answer: '',
    max_marks: 10,
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
        required: true,
      },
    ],
  })


  const [questions, setQuestions] =
    useState<AnswerKeyQuestionForm[]>([
      createEmptyQuestion(1),
    ])


  // ─── Add Question ──────────────────────────────────────────────────────────

  const addQuestion = () => {
    setQuestions([
      ...questions,
      createEmptyQuestion(
        questions.length + 1
      ),
    ])
  }


  // ─── Remove Question ───────────────────────────────────────────────────────

  const removeQuestion = (id: number) => {

    if (questions.length <= 1) {
      return
    }

    const remaining =
      questions.filter(
        (q) => q.id !== id
      )

    setQuestions(
      remaining.map(
        (q, index) => ({
          ...q,
          id: index + 1,
        })
      )
    )
  }


  // ─── Update Question ───────────────────────────────────────────────────────

  const updateQuestion = (
    id: number,
    field: string,
    value: any
  ) => {

    setQuestions(
      questions.map((q) =>
        q.id === id
          ? {
            ...q,
            [field]: value,
          }
          : q
      )
    )
  }


  // ─── Rubric Functions ──────────────────────────────────────────────────────

  const applyRubricTemplate = (
    qId: number,
    templateKey: string
  ) => {

    const template =
      RUBRIC_TEMPLATES[templateKey]

    if (!template) {
      return
    }

    const question =
      questions.find(
        (q) => q.id === qId
      )

    const maxMarks =
      question?.max_marks || 10

    const rawMarks =
      template.criteria.map(
        (criterion) =>
          (criterion.marks / 10) *
          maxMarks
      )

    const scaledMarks =
      rawMarks.map(
        (value) =>
          Math.floor(value)
      )

    let currentTotal =
      scaledMarks.reduce(
        (sum, value) =>
          sum + value,
        0
      )

    let index =
      scaledMarks.length - 1

    while (
      currentTotal < maxMarks &&
      index >= 0
    ) {
      scaledMarks[index] += 1
      currentTotal += 1
      index -= 1

      if (
        index < 0 &&
        currentTotal < maxMarks
      ) {
        index =
          scaledMarks.length - 1
      }
    }

    while (
      currentTotal > maxMarks &&
      index >= 0
    ) {
      if (
        scaledMarks[index] > 0
      ) {
        scaledMarks[index] -= 1
        currentTotal -= 1
      } else {
        index -= 1
      }

      if (
        index < 0 &&
        currentTotal > maxMarks
      ) {
        index =
          scaledMarks.length - 1
      }
    }

    const criteria =
      template.criteria.map(
        (criterion, index) => ({
          ...criterion,
          marks:
            scaledMarks[index],
          required: true,
        })
      )

    setQuestions(
      questions.map((q) =>
        q.id === qId
          ? {
            ...q,
            rubric: criteria,
          }
          : q
      )
    )
  }


  const addRubric = (qId: number) => {

    setQuestions(
      questions.map((q) => {

        if (q.id !== qId) {
          return q
        }

        return {
          ...q,
          rubric: [
            ...q.rubric,
            {
              name: '',
              marks: 0,
              description: '',
              required: true,
            },
          ],
        }
      })
    )
  }


  const removeRubric = (
    qId: number,
    rIdx: number
  ) => {

    setQuestions(
      questions.map((q) => {

        if (q.id !== qId) {
          return q
        }

        return {
          ...q,
          rubric:
            q.rubric.filter(
              (_, i) =>
                i !== rIdx
            ),
        }
      })
    )
  }


  const updateRubric = (
    qId: number,
    rIdx: number,
    field: string,
    value: any
  ) => {

    setQuestions(
      questions.map((q) => {

        if (q.id !== qId) {
          return q
        }

        const newRubric =
          [...q.rubric]

        newRubric[rIdx] = {
          ...newRubric[rIdx],
          [field]: value,
        }

        return {
          ...q,
          rubric: newRubric,
        }
      })
    )
  }


  // ─── Keyword Functions ─────────────────────────────────────────────────────

  const addKeywordSuggestion = (
    qId: number,
    keyword: string
  ) => {

    setQuestions(
      questions.map((q) => {

        if (q.id !== qId) {
          return q
        }

        if (
          q.keywords.includes(keyword)
        ) {
          return q
        }

        return {
          ...q,
          keywords: [
            ...q.keywords,
            keyword,
          ],
        }
      })
    )
  }


  const removeKeyword = (
    qId: number,
    keyword: string
  ) => {

    setQuestions(
      questions.map((q) =>
        q.id === id
          ? {
            ...q,
            keywords:
              q.keywords.filter(
                (k) =>
                  k !== keyword
              ),
          }
          : q
      )
    )
  }


  // ─── Key Point Functions ───────────────────────────────────────────────────

  const addKeyPoint = (
    qId: number,
    point: string
  ) => {

    setQuestions(
      questions.map((q) => {

        if (q.id !== qId) {
          return q
        }

        if (
          q.key_points.includes(point)
        ) {
          return q
        }

        return {
          ...q,
          key_points: [
            ...q.key_points,
            point,
          ],
        }
      })
    )
  }


  const removeKeyPoint = (
    qId: number,
    point: string
  ) => {

    setQuestions(
      questions.map((q) =>
        q.id === qId
          ? {
            ...q,
            key_points:
              q.key_points.filter(
                (p) =>
                  p !== point
              ),
          }
          : q
      )
    )
  }


  // ─── Download JSON ─────────────────────────────────────────────────────────

  const downloadAnswerKeyJSON = (
    answerKey: any
  ) => {

    const jsonString =
      JSON.stringify(
        answerKey,
        null,
        2
      )

    const blob =
      new Blob(
        [jsonString],
        {
          type: 'application/json',
        }
      )

    const url =
      URL.createObjectURL(blob)

    const link =
      document.createElement('a')

    link.href = url

    const safeName =
      String(
        answerKey.name ||
        'answer-key'
      )
        .trim()
        .replace(
          /[^a-z0-9-_]+/gi,
          '_'
        )

    link.download =
      `${safeName}.json`

    document.body.appendChild(link)

    link.click()

    document.body.removeChild(link)

    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 100)
  }


  // ─── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {

    if (!name.trim()) {
      alert(
        'Please enter the Examination / Answer Key Name.'
      )
      return
    }

    if (!subject.trim()) {
      alert(
        'Please enter the Subject.'
      )
      return
    }

    if (!subjectCode.trim()) {
      alert(
        'Please enter the Subject Code.'
      )
      return
    }

    if (!collegeName.trim()) {
      alert(
        'Please enter the Name of College.'
      )
      return
    }

    if (!department.trim()) {
      alert(
        'Please enter the Department.'
      )
      return
    }

    if (
      semester < 1 ||
      semester > 8
    ) {
      alert(
        'Semester must be between 1 and 8.'
      )
      return
    }

    if (!academicYear.trim()) {
      alert(
        'Please enter the Academic Year.'
      )
      return
    }

    if (!examinationDate) {
      alert(
        'Please select the Examination Date.'
      )
      return
    }

    if (totalMarks <= 0) {
      alert(
        'Total Marks must be greater than 0.'
      )
      return
    }

    if (!duration.trim()) {
      alert(
        'Please enter the Examination Duration.'
      )
      return
    }


    // ─── Validate Questions ─────────────────────────────────────────────────

    for (const q of questions) {

      if (
        !q.question_text.trim()
      ) {
        alert(
          `Question ${q.id}: Please enter the question text.`
        )
        return
      }

      if (
        !q.model_answer.trim()
      ) {
        alert(
          `Question ${q.id}: Please enter the model answer.`
        )
        return
      }

      if (
        q.max_marks <= 0
      ) {
        alert(
          `Question ${q.id}: Max marks must be greater than 0.`
        )
        return
      }


      const activeRubric =
        q.rubric.filter(
          (r) =>
            r.name.trim()
        )

      if (
        activeRubric.length > 0
      ) {

        const invalidRubric =
          activeRubric.some(
            (r) =>
              r.marks < 0 ||
              !r.description.trim()
          )

        if (
          invalidRubric
        ) {
          alert(
            `Question ${q.id}: Please provide marks and description for every rubric criterion.`
          )
          return
        }

        const totalRubricMarks =
          activeRubric.reduce(
            (
              sum,
              r
            ) =>
              sum + r.marks,
            0
          )

        if (
          totalRubricMarks !==
          q.max_marks
        ) {
          alert(
            `Question ${q.id}: Rubric marks (${totalRubricMarks}) must equal max marks (${q.max_marks}).`
          )
          return
        }
      }
    }


    // ─── Calculate Question Marks ────────────────────────────────────────────

    const calculatedQuestionMarks =
      questions.reduce(
        (
          sum,
          q
        ) =>
          sum + q.max_marks,
        0
      )


    // ─── Check Total Marks ───────────────────────────────────────────────────

    if (
      calculatedQuestionMarks !==
      totalMarks
    ) {

      const proceed =
        window.confirm(
          `The question marks add up to ${calculatedQuestionMarks}, but the examination Total Marks is ${totalMarks}.\n\nDo you want to continue anyway?`
        )

      if (!proceed) {
        return
      }
    }


    // ─── Build Payload ───────────────────────────────────────────────────────

    const data = {

      name:
        name.trim(),

      subject:
        subject.trim(),

      subject_code:
        subjectCode.trim(),

      college_name:
        collegeName.trim(),

      department:
        department.trim(),

      semester:
        Number(semester),

      examination_type:
        examinationType,

      academic_year:
        academicYear.trim(),

      examination_date:
        examinationDate,

      total_marks:
        Number(totalMarks),

      duration:
        duration.trim(),

      total_questions:
        questions.length,

      questions:
        questions.map(
          (q, idx) => {

            const activeRubric =
              q.rubric
                .filter(
                  (r) =>
                    r.name.trim()
                )
                .map(
                  (r) => ({
                    name:
                      r.name.trim(),

                    marks:
                      Number(r.marks),

                    description:
                      r.description.trim(),

                    required:
                      r.required !==
                      false,
                  })
                )

            return {

              id:
                idx + 1,

              question_number:
                `Q. No. ${idx + 1}`,

              question_text:
                q.question_text.trim(),

              model_answer:
                q.model_answer.trim(),

              max_marks:
                Number(q.max_marks),

              question_type:
                q.question_type,

              diagram_required:
                Boolean(
                  q.diagram_required
                ),

              diagram_weightage:
                Number(
                  q.diagram_weightage || 0
                ),

              key_points:
                q.key_points
                  .filter(
                    (p) =>
                      p.trim()
                  )
                  .map(
                    (p) =>
                      p.trim()
                  ),

              keywords:
                q.keywords
                  .filter(
                    (k) =>
                      k.trim()
                  )
                  .map(
                    (k) =>
                      k.trim()
                  ),

              rubric:
                activeRubric,
            }
          }
        ),

      /*
       * Public creation does not depend on
       * the logged-in user's JWT.
       *
       * Keep a simple creation-mode marker
       * so the backend knows this was created
       * through the public Answer Key Manager.
       */
      created_by:
        'public',

      creation_mode:
        'public',
    }


    // ─── Create Answer Key ───────────────────────────────────────────────────

    try {

      console.log(
        '📤 Creating PUBLIC answer key with payload:',
        data
      )

      /*
       * IMPORTANT:
       *
       * This is the key change.
       *
       * DO NOT use:
       *
       * await create(data)
       *
       * because create() uses JWT authentication.
       *
       * Use:
       *
       * await createPublic(data)
       *
       * which calls:
       *
       * POST /api/answer-key/public-create
       *
       * without Authorization header.
       */
      const createdAnswerKey =
        await createPublic(data)


      console.log(
        '✅ Public answer key created:',
        createdAnswerKey
      )


      // ─── Build Downloadable JSON ──────────────────────────────────────────

      const downloadableAnswerKey = {

        ...(createdAnswerKey || {}),

        ...data,

        name:
          data.name,

        subject:
          data.subject,

        subject_code:
          data.subject_code,

        college_name:
          data.college_name,

        department:
          data.department,

        semester:
          data.semester,

        examination_type:
          data.examination_type,

        academic_year:
          data.academic_year,

        examination_date:
          data.examination_date,

        total_marks:
          data.total_marks,

        duration:
          data.duration,

        total_questions:
          data.total_questions,

        questions:
          data.questions,

        created_by:
          data.created_by,

        creation_mode:
          data.creation_mode,
      }


      // ─── Download JSON ────────────────────────────────────────────────────

      downloadAnswerKeyJSON(
        downloadableAnswerKey
      )


      // ─── Notify Parent ────────────────────────────────────────────────────

      onSave()

    } catch (err: any) {

      console.error(
        '❌ Failed to create PUBLIC answer key:',
        err?.response?.data ||
        err?.message ||
        err
      )

      /*
       * IMPORTANT:
       *
       * Do NOT call onSave() if creation fails.
       *
       * This keeps the user on the creation page
       * so they can see the error and fix it.
       */
    }
  }


  // ─── Subject Keywords ──────────────────────────────────────────────────────

  const getSubjectKeywords = () => {

    for (
      const [
        key,
        keywords,
      ] of Object.entries(
        COMMON_KEYWORDS
      )
    ) {

      if (
        subject
          .toLowerCase()
          .includes(
            key.toLowerCase()
          )
      ) {
        return keywords
      }
    }

    return COMMON_KEYWORDS[
      'Machine Learning'
    ]
  }


  const subjectKeywords =
    getSubjectKeywords()


  // ─── Render ────────────────────────────────────────────────────────────────

  return (

    <div className="space-y-6">

      {error && (
        <Alert
          variant="error"
          title="Error"
          message={error}
        />
      )}


      {/* ==================================================
          EXAMINATION INFORMATION
          ================================================== */}

      <Card>

        <CardHeader
          title="Examination Information"
          subtitle="Enter all examination details before creating the answer key"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1">
              Examination / Answer Key Name *
            </label>

            <Input
              placeholder="e.g., Data Structures End Semester 2026"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              disabled={isLoading}
            />
          </div>


          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1">
              Subject *
            </label>

            <Input
              placeholder="e.g., Data Structures"
              value={subject}
              onChange={(e) =>
                setSubject(e.target.value)
              }
              disabled={isLoading}
            />
          </div>


          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1">
              Subject Code *
            </label>

            <Input
              placeholder="e.g., BTCS208"
              value={subjectCode}
              onChange={(e) =>
                setSubjectCode(e.target.value)
              }
              disabled={isLoading}
            />
          </div>


          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1">
              Name of College *
            </label>

            <Input
              placeholder="e.g., ABC University"
              value={collegeName}
              onChange={(e) =>
                setCollegeName(e.target.value)
              }
              disabled={isLoading}
            />
          </div>


          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1">
              Department *
            </label>

            <Input
              placeholder="e.g., Computer Science and Engineering"
              value={department}
              onChange={(e) =>
                setDepartment(e.target.value)
              }
              disabled={isLoading}
            />
          </div>


          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1">
              Semester *
            </label>

            <Input
              type="number"
              min={1}
              max={8}
              value={semester}
              onChange={(e) =>
                setSemester(
                  parseInt(e.target.value) || 1
                )
              }
              disabled={isLoading}
            />
          </div>


          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1">
              Examination Type *
            </label>

            <select
              className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] bg-white focus:border-[#3B5DE8] focus:ring-2 focus:ring-[#3B5DE8]/20 outline-none"
              value={examinationType}
              onChange={(e) =>
                setExaminationType(e.target.value)
              }
              disabled={isLoading}
            >

              {EXAMINATION_TYPES.map(
                (type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {type}
                  </option>
                )
              )}

            </select>
          </div>


          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1">
              Academic Year *
            </label>

            <Input
              placeholder="e.g., 2026-27"
              value={academicYear}
              onChange={(e) =>
                setAcademicYear(e.target.value)
              }
              disabled={isLoading}
            />
          </div>


          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1">
              Examination Date *
            </label>

            <Input
              type="date"
              value={examinationDate}
              onChange={(e) =>
                setExaminationDate(e.target.value)
              }
              disabled={isLoading}
            />
          </div>


          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1">
              Total Marks *
            </label>

            <Input
              type="number"
              min={1}
              value={totalMarks}
              onChange={(e) =>
                setTotalMarks(
                  parseInt(e.target.value) || 0
                )
              }
              disabled={isLoading}
            />
          </div>


          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1">
              Duration *
            </label>

            <Input
              placeholder="e.g., 3 Hours"
              value={duration}
              onChange={(e) =>
                setDuration(e.target.value)
              }
              disabled={isLoading}
            />
          </div>

        </div>

      </Card>


      {/* ==================================================
          QUESTIONS
          ================================================== */}

      {questions.map((q) => {

        const totalRubricMarks =
          q.rubric.reduce(
            (sum, r) =>
              sum + Number(r.marks || 0),
            0
          )

        const hasRubric =
          q.rubric.some(
            (r) =>
              r.name.trim()
          )

        const isBalanced =
          totalRubricMarks ===
          q.max_marks


        return (

          <Card key={q.id}>

            <div className="flex items-center justify-between">

              <div>
                <h3 className="text-base font-semibold text-[#0F172A]">
                  Question {q.id}
                </h3>

                <p className="text-sm text-[#94A3B8]">
                  Max Marks: {q.max_marks}
                </p>
              </div>


              {questions.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    removeQuestion(q.id)
                  }
                  className="text-sm text-[#DC2626] hover:text-[#991B1B] transition-colors"
                >
                  Remove
                </button>
              )}

            </div>


            <div className="mt-4 space-y-4">

              {/* Question Text */}

              <div>

                <label className="block text-sm font-medium text-[#0F172A] mb-1">
                  Question Text *
                </label>

                <textarea
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:border-[#3B5DE8] focus:ring-2 focus:ring-[#3B5DE8]/20 outline-none min-h-[60px]"
                  placeholder="Enter the question..."
                  value={q.question_text}
                  onChange={(e) =>
                    updateQuestion(
                      q.id,
                      'question_text',
                      e.target.value
                    )
                  }
                  disabled={isLoading}
                />

              </div>


              {/* Model Answer */}

              <div>

                <label className="block text-sm font-medium text-[#0F172A] mb-1">
                  Model Answer *
                </label>

                <textarea
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:border-[#3B5DE8] focus:ring-2 focus:ring-[#3B5DE8]/20 outline-none min-h-[80px]"
                  placeholder="Enter the model answer..."
                  value={q.model_answer}
                  onChange={(e) =>
                    updateQuestion(
                      q.id,
                      'model_answer',
                      e.target.value
                    )
                  }
                  disabled={isLoading}
                />

              </div>


              {/* Question Settings */}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">

                <div>

                  <label className="block text-sm font-medium text-[#0F172A] mb-1">
                    Max Marks *
                  </label>

                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={q.max_marks}
                    onChange={(e) =>
                      updateQuestion(
                        q.id,
                        'max_marks',
                        parseInt(e.target.value) || 1
                      )
                    }
                    disabled={isLoading}
                  />

                </div>


                <div>

                  <label className="block text-sm font-medium text-[#0F172A] mb-1">
                    Question Type
                  </label>

                  <select
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] bg-white focus:border-[#3B5DE8] focus:ring-2 focus:ring-[#3B5DE8]/20 outline-none"
                    value={q.question_type}
                    onChange={(e) =>
                      updateQuestion(
                        q.id,
                        'question_type',
                        e.target.value
                      )
                    }
                    disabled={isLoading}
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
                      checked={q.diagram_required}
                      onChange={(e) =>
                        updateQuestion(
                          q.id,
                          'diagram_required',
                          e.target.checked
                        )
                      }
                      disabled={isLoading}
                      className="w-4 h-4 rounded border-[#E2E8F0] text-[#1B3A6B] focus:ring-[#1B3A6B]"
                    />

                    Diagram Required

                  </label>

                </div>


                {q.diagram_required && (

                  <div>

                    <label className="block text-sm font-medium text-[#0F172A] mb-1">
                      Diagram Weightage (%)
                    </label>

                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={q.diagram_weightage}
                      onChange={(e) =>
                        updateQuestion(
                          q.id,
                          'diagram_weightage',
                          parseInt(e.target.value) || 0
                        )
                      }
                      disabled={isLoading}
                    />

                  </div>

                )}

              </div>


              {/* Rubric */}

              <div>

                <div className="flex items-center justify-between mb-2">

                  <label className="block text-sm font-medium text-[#0F172A]">
                    Rubric
                  </label>

                  <div className="flex items-center gap-2">

                    <select
                      className="h-9 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] bg-white focus:border-[#3B5DE8] outline-none"
                      onChange={(e) => {

                        if (
                          e.target.value
                        ) {
                          applyRubricTemplate(
                            q.id,
                            e.target.value
                          )
                        }

                      }}
                      value=""
                      disabled={isLoading}
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
                      onClick={() =>
                        addRubric(q.id)
                      }
                      disabled={isLoading}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-[#1B3A6B] bg-[#EEF4FF] hover:bg-[#BACFFB] transition-colors"
                    >

                      <PlusIcon size={14} />

                      Add Criterion

                    </button>

                  </div>

                </div>


                {hasRubric && (

                  <div className="space-y-2">

                    {q.rubric.map(
                      (r, rIdx) => (

                        <div
                          key={rIdx}
                          className="flex items-center gap-2"
                        >

                          <input
                            type="text"
                            placeholder="Criterion name"
                            className="flex-1 h-9 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:border-[#3B5DE8] focus:ring-2 focus:ring-[#3B5DE8]/20 outline-none"
                            value={r.name}
                            onChange={(e) =>
                              updateRubric(
                                q.id,
                                rIdx,
                                'name',
                                e.target.value
                              )
                            }
                            disabled={isLoading}
                          />

                          <input
                            type="number"
                            placeholder="Marks"
                            className="w-20 h-9 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:border-[#3B5DE8] focus:ring-2 focus:ring-[#3B5DE8]/20 outline-none"
                            min={0}
                            max={q.max_marks}
                            value={r.marks}
                            onChange={(e) =>
                              updateRubric(
                                q.id,
                                rIdx,
                                'marks',
                                parseInt(e.target.value) || 0
                              )
                            }
                            disabled={isLoading}
                          />

                          <input
                            type="text"
                            placeholder="Description"
                            className="flex-1 h-9 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:border-[#3B5DE8] focus:ring-2 focus:ring-[#3B5DE8]/20 outline-none"
                            value={r.description}
                            onChange={(e) =>
                              updateRubric(
                                q.id,
                                rIdx,
                                'description',
                                e.target.value
                              )
                            }
                            disabled={isLoading}
                          />

                          {q.rubric.length > 1 && (

                            <button
                              type="button"
                              onClick={() =>
                                removeRubric(
                                  q.id,
                                  rIdx
                                )
                              }
                              disabled={isLoading}
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
                    Apply a template or add custom criteria.

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

                    Total Rubric Marks:
                    {' '}
                    {totalRubricMarks}
                    {' / '}
                    {q.max_marks}

                    {isBalanced
                      ? ' - Balanced'
                      : ` (${q.max_marks - totalRubricMarks} remaining)`}

                  </div>

                )}

              </div>


              {/* Key Points */}

              <div>

                <label className="block text-sm font-medium text-[#0F172A] mb-1">
                  Key Points
                </label>

                <div className="flex flex-wrap gap-2 mb-2">

                  {COMMON_KEY_POINTS
                    .slice(0, 8)
                    .map((point) => {

                      const isActive =
                        q.key_points.includes(point)

                      return (

                        <button
                          type="button"
                          key={point}
                          onClick={() =>
                            isActive
                              ? removeKeyPoint(
                                q.id,
                                point
                              )
                              : addKeyPoint(
                                q.id,
                                point
                              )
                          }
                          disabled={isLoading}
                          className={`px-3 py-1 rounded-full text-xs transition-colors ${
                            isActive
                              ? 'bg-[#1B3A6B] text-white'
                              : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                          }`}
                        >

                          {isActive ? '✓' : '+'}
                          {' '}
                          {point}

                        </button>

                      )
                    })}

                </div>


                <div className="flex flex-wrap gap-1">

                  {q.key_points.map(
                    (point) => (

                      <span
                        key={point}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#EEF4FF] text-[#1B3A6B] rounded-full text-xs"
                      >

                        {point}

                        <button
                          type="button"
                          onClick={() =>
                            removeKeyPoint(
                              q.id,
                              point
                            )
                          }
                          disabled={isLoading}
                          className="hover:text-[#DC2626]"
                        >
                          ×
                        </button>

                      </span>

                    )
                  )}

                  {q.key_points.length === 0 && (

                    <span className="text-xs text-[#94A3B8]">
                      Click suggestions above or type custom below
                    </span>

                  )}

                </div>


                <input
                  type="text"
                  placeholder="Add custom key point..."
                  className="w-full mt-1 h-9 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:border-[#3B5DE8] focus:ring-2 focus:ring-[#3B5DE8]/20 outline-none"
                  disabled={isLoading}
                  onKeyDown={(e) => {

                    if (
                      e.key === 'Enter'
                    ) {

                      e.preventDefault()

                      const target =
                        e.target as HTMLInputElement

                      if (
                        target.value.trim()
                      ) {

                        addKeyPoint(
                          q.id,
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
                    .map(
                      (keyword) => {

                        const isActive =
                          q.keywords.includes(keyword)

                        return (

                          <button
                            type="button"
                            key={keyword}
                            onClick={() =>
                              isActive
                                ? removeKeyword(
                                  q.id,
                                  keyword
                                )
                                : addKeywordSuggestion(
                                  q.id,
                                  keyword
                                )
                            }
                            disabled={isLoading}
                            className={`px-3 py-1 rounded-full text-xs transition-colors ${
                              isActive
                                ? 'bg-[#1B3A6B] text-white'
                                : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                            }`}
                          >

                            {isActive ? '✓' : '+'}
                            {' '}
                            {keyword}

                          </button>

                        )
                      }
                    )}

                </div>


                <div className="flex flex-wrap gap-1">

                  {q.keywords.map(
                    (keyword) => (

                      <span
                        key={keyword}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#EEF4FF] text-[#1B3A6B] rounded-full text-xs"
                      >

                        {keyword}

                        <button
                          type="button"
                          onClick={() =>
                            removeKeyword(
                              q.id,
                              keyword
                            )
                          }
                          disabled={isLoading}
                          className="hover:text-[#DC2626]"
                        >
                          ×
                        </button>

                      </span>

                    )
                  )}

                  {q.keywords.length === 0 && (

                    <span className="text-xs text-[#94A3B8]">
                      Click suggestions above or type custom below
                    </span>

                  )}

                </div>


                <input
                  type="text"
                  placeholder="Add custom keyword..."
                  className="w-full mt-1 h-9 px-3 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:border-[#3B5DE8] focus:ring-2 focus:ring-[#3B5DE8]/20 outline-none"
                  disabled={isLoading}
                  onKeyDown={(e) => {

                    if (
                      e.key === 'Enter'
                    ) {

                      e.preventDefault()

                      const target =
                        e.target as HTMLInputElement

                      if (
                        target.value.trim()
                      ) {

                        addKeywordSuggestion(
                          q.id,
                          target.value.trim().toLowerCase()
                        )

                        target.value = ''

                      }

                    }

                  }}
                />

              </div>

            </div>

          </Card>

        )
      })}


      {/* ==================================================
          ACTIONS
          ================================================== */}

      <div className="flex items-center gap-3">

        <button
          type="button"
          onClick={addQuestion}
          disabled={isLoading}
          className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-[#1B3A6B] bg-[#EEF4FF] hover:bg-[#BACFFB] transition-colors"
        >

          <PlusIcon size={16} />

          Add Question

        </button>


        <div className="flex-1" />


        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 rounded-lg text-sm font-medium text-[#475569] hover:text-[#1B3A6B] transition-colors"
        >
          Cancel
        </button>


        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading
            ? 'Creating...'
            : 'Create Answer Key'}
        </Button>

      </div>

    </div>
  )
}
