// src/types/index.ts


// ─── User Roles ───────────────────────────────────────────────────────────────

export type UserRole =
  | 'Faculty'
  | 'HOD'
  | 'Dean'
  | 'Admin'


// ─── Account Status ───────────────────────────────────────────────────────────

export type AccountStatus =
  | 'Active'
  | 'Pending Activation'
  | 'Inactive'
  | 'Suspended'
  | 'Locked'


// ─── Screens / Navigation ─────────────────────────────────────────────────────

export type Screen =
  | 'login'
  | 'forgot-password'
  | 'reset-password'
  | 'account-activation'
  | 'profile'
  | 'edit-profile'
  | 'change-password'

  // Dashboards
  | 'dashboard-faculty'
  | 'dashboard-hod'
  | 'dashboard-dean'
  | 'dashboard-admin'

  // Admin
  | 'admin-users'
  | 'admin-create-user'

  // Authentication
  | 'session-expired'
  | 'unauthorized'

  // OCR
  | 'ocr-workflow'

  // Authenticated Answer Key
  | 'answer-key-create'
  | 'answer-key-list'

  // Public Answer Key - NO LOGIN REQUIRED
  | 'public-answer-key-create'


// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {

  // MongoDB user ID
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

  navigate: (
    screen: Screen
  ) => void

  logout: () => void
}


// ─── OCR Workflow Types ───────────────────────────────────────────────────────

export type OCRConfidence =
  | 'High'
  | 'Medium'
  | 'Low'


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

  // These fields may not be available from
  // the current API
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

  fieldConfidences:
  Record<string, OCRConfidence>

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

  questionType:
  | 'theory'
  | 'numerical'
  | 'diagram'
  | 'mixed'
}


export interface Examination {

  id: string

  code: string

  name: string

  department: string

  semester: string

  date: string

  totalStudents: number

  status:
  | 'Active'
  | 'Closed'
  | 'Processing'
}


// ─── Notifications ───────────────────────────────────────────────────────────

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

/**
 * Indicates how the answer key was created.
 *
 * authenticated:
 * Created by a logged-in Faculty/HOD/Dean/Admin user.
 *
 * public:
 * Created through the Create Answer Key flow
 * without requiring login.
 */
export type AnswerKeyCreationMode =
  | 'authenticated'
  | 'public'


/**
 * Examination types supported by the application.
 */
export type ExaminationType =
  | 'Mid Semester'
  | 'End Semester'
  | 'Back Exams'


/**
 * Complete answer key stored in MongoDB
 * and returned by the backend.
 */
export interface AnswerKey {

  // MongoDB answer-key ID
  id: string


  // ─── Examination / Answer Key Information ─────────────────

  /**
   * Examination / Answer Key Name
   */
  name: string

  /**
   * Subject name
   */
  subject: string

  /**
   * Subject code
   */
  subject_code: string

  /**
   * Name of the college/institution
   */
  college_name: string

  /**
   * Department
   */
  department: string

  /**
   * Semester number
   */
  semester: number


  // ─── Examination Details ──────────────────────────────────

  /**
   * Examination type:
   * Mid Semester / End Semester / Back Exams
   */
  examination_type: ExaminationType

  /**
   * Academic year, e.g. 2026-27
   */
  academic_year: string

  /**
   * Examination date.
   *
   * Stored as a string so the frontend can
   * directly work with HTML date input values.
   */
  examination_date: string

  /**
   * Total marks for the examination
   */
  total_marks: number

  /**
   * Examination duration.
   *
   * Example:
   * "3 Hours"
   * "180 Minutes"
   */
  duration: string


  // ─── Questions ────────────────────────────────────────────

  total_questions: number

  questions: AnswerKeyQuestion[]


  // ─── Database Metadata ────────────────────────────────────

  created_at: string

  updated_at: string

  /**
   * MongoDB user ID for authenticated answer keys.
   *
   * For public answer keys this will be an empty string.
   */
  created_by: string

  /**
   * Indicates whether the answer key was created
   * through authenticated or public flow.
   */
  creation_mode?: AnswerKeyCreationMode
}


// ─── Answer Key Creation Data ────────────────────────────────────────────────

/**
 * Data sent from the frontend when creating
 * a new answer key.
 *
 * This is separate from AnswerKey because
 * id, timestamps and created_by are generated
 * by the backend.
 */
export interface AnswerKeyCreateData {

  // Examination / Answer Key Name
  name: string

  // Subject
  subject: string

  // Subject Code
  subject_code: string

  // College Name
  college_name: string

  // Department
  department: string

  // Semester
  semester: number

  // Examination Type
  examination_type: ExaminationType

  // Academic Year
  academic_year: string

  // Examination Date
  examination_date: string

  // Total Marks
  total_marks: number

  // Duration
  duration: string

  // Questions
  questions: AnswerKeyQuestion[]
}


// ─── Answer Key Question ──────────────────────────────────────────────────────

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


// ─── Rubric ───────────────────────────────────────────────────────────────────

export interface RubricCriterion {

  name: string

  marks: number

  description: string

  required: boolean
}


// ─── Answer Key List Item ─────────────────────────────────────────────────────

export interface AnswerKeyListItem {

  id: string

  name: string

  subject: string

  subject_code: string

  college_name: string

  department: string

  semester: number

  examination_type: ExaminationType

  academic_year: string

  examination_date: string

  total_marks: number

  duration: string

  total_questions: number

  created_at: string
}