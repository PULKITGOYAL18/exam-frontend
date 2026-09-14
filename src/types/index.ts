// src/types/index.ts

export type UserRole = 'Faculty' | 'HOD' | 'Dean' | 'Admin'

export type AccountStatus =
  | 'Active'
  | 'Pending Activation'
  | 'Inactive'
  | 'Suspended'
  | 'Locked'

export type Screen =
  | 'login'
  | 'forgot-password'
  | 'reset-password'
  | 'account-activation'
  | 'profile'
  | 'edit-profile'
  | 'change-password'
  | 'dashboard-faculty'
  | 'dashboard-hod'
  | 'dashboard-dean'
  | 'dashboard-admin'
  | 'admin-users'
  | 'admin-create-user'
  | 'session-expired'
  | 'unauthorized'
  | 'ocr-workflow'
  | 'answer-key-create'
  | 'answer-key-list'


// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  // MongoDB user ID
  // Used for notifications and other backend operations
  id: string

  name: string
  email: string
  employeeId: string
  department: string
  designation: string
  role: UserRole
  status: AccountStatus
  lastLogin: string
  phone: string
}


// ─── Admin User ────────────────────────────────────────────────────────────────

export interface AdminUserRecord extends User {
  id: string
  createdDate: string
}


// ─── Navigation Context ───────────────────────────────────────────────────────

export interface NavContext {
  currentUser: User | null
  navigate: (screen: Screen) => void
  logout: () => void
}


// ─── OCR Workflow Types ───────────────────────────────────────────────────────

export type OCRConfidence = 'High' | 'Medium' | 'Low'

export type MappingStatus =
  | 'Mapped'
  | 'Needs Review'
  | 'Not Found'


export interface OCRField {
  label: string
  value: string
  confidence: OCRConfidence
  editable?: boolean
}


export interface AnswerSheetOCR {
  id: string
  filename: string

  // These fields may not be available from the current API
  program?: string
  branch?: string
  fatherName?: string
  cuid?: string
  courseName?: string
  courseCode?: string

  // Required fields available from the API
  studentName: string
  rollNumber: string

  overallConfidence: OCRConfidence
  fieldConfidences: Record<string, OCRConfidence>

  verificationStatus:
    | 'pending'
    | 'approved'
    | 'rejected'

  mappingStatus: MappingStatus
  mappedStudentId?: string

  // Grading results from the API
  totalMarks?: number
  maxMarks?: number
  percentage?: number
  questions?: AnswerSheetQuestion[]
}


export interface AnswerSheetQuestion {
  number: string
  text: string
  marksAwarded: number
  maxMarks: number
  confidence: number
  feedback: string
  isAttempted: boolean
  diagramExpected: boolean
  diagramDescription: string
  modelAnswer: string
  studentAnswer: string
  questionType?: string
}


export interface QuestionMark {
  id?: string
  questionNo: number
  questionText: string
  maxMarks: number
  aiMarks: number
  aiComment: string
  facultyMarks: number | null
  confidence: OCRConfidence
  isAttempted: boolean
  diagramExpected: boolean
  diagramDescription: string
  modelAnswer: string
  studentAnswer: string
  questionType: 'theory' | 'numerical' | 'diagram' | 'mixed'
}


export interface Examination {
  id: string
  code: string
  name: string
  department: string
  semester: string
  date: string
  totalStudents: number
  status: 'Active' | 'Closed' | 'Processing'
}


// ─── Notifications ─────────────────────────────────────────────────────────────

export type NotificationType =
  | 'system'
  | 'warning'
  | 'approval'
  | 'evaluation'
  | 'result'
  | 'exam'
  | 'user'
  | 'success'
  | 'info'
  | 'error'


export interface Notification {
  id: string
  recipient_id: string
  title: string
  message: string
  type: NotificationType
  is_read: boolean
  created_at: string
}


// ─── Answer Key Types ─────────────────────────────────────────────────────────

export interface AnswerKey {
  id: string
  name: string
  subject: string
  department: string
  semester: number
  total_marks: number
  total_questions: number
  questions: AnswerKeyQuestion[]
  created_at: string
  updated_at: string
  created_by: string
}


export interface AnswerKeyQuestion {
  id: number
  question_number: string
  question_text: string
  model_answer: string
  max_marks: number
  question_type:
    | 'theory'
    | 'numerical'
    | 'diagram'
    | 'mixed'
  diagram_required: boolean
  diagram_weightage?: number
  key_points: string[]
  keywords: string[]
  rubric: RubricCriterion[]
}


export interface RubricCriterion {
  name: string
  marks: number
  description: string
  required: boolean
}


export interface AnswerKeyListItem {
  id: string
  name: string
  subject: string
  semester: number
  total_marks: number
  total_questions: number
  created_at: string
}

export interface SubPart {
  id: string
  question_text: string
  model_answer: string
  max_marks: number
  question_type: 'theory' | 'numerical' | 'diagram' | 'mixed'
  diagram_required: boolean
  diagram_weightage: number
  key_points: string[]
  keywords: string[]
  rubric: RubricCriterion[]
}

export interface QuestionWithSubParts {
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
  rubric: RubricCriterion[]
  sub_parts: SubPart[]
}

export interface Section {
  id: string
  name: string
  description: string
  instruction: string
  questions: QuestionWithSubParts[]
}

export interface AnswerKeyWithSections extends AnswerKey {
  sections: Section[]
}

export interface RubricCriterion {
  name: string
  marks: number
  description: string
  required: boolean
}