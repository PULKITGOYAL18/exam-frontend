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


// ─────────────────────────────────────────────────────────────────────────────
// ANSWER KEY TYPES
// ─────────────────────────────────────────────────────────────────────────────


// ─── Answer Key Creation Mode ────────────────────────────────────────────────

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


// ─── Examination Type ────────────────────────────────────────────────────────

/**
 * Examination types supported by the application.
 */
export type ExaminationType =
  | 'Mid Semester'
  | 'End Semester'
  | 'Back Exams'


// ─── Answer Key Section Type ─────────────────────────────────────────────────

/**
 * Type of questions contained inside a section.
 *
 * MCQ:
 * Multiple Choice Questions.
 *
 * LONG_ANSWER:
 * Long/theory answer questions.
 *
 * SHORT_ANSWER:
 * Short answer questions.
 */
export type AnswerKeySectionType =
  | 'MCQ'
  | 'LONG_ANSWER'
  | 'SHORT_ANSWER'


// ─── MCQ Option ──────────────────────────────────────────────────────────────

/**
 * An individual option for an MCQ question.
 *
 * Example:
 *
 * {
 *   label: "A",
 *   value: "Hypertension"
 * }
 */
export interface MCQOption {

  /**
   * Canonical option label.
   *
   * Normally:
   * A / B / C / D
   *
   * It can also represent:
   * I / II / III / IV
   */
  label: string

  /**
   * Text displayed for the option.
   */
  value: string
}


// ─── MCQ Answer Information ──────────────────────────────────────────────────

/**
 * Stores the canonical answer and accepted formats
 * for an MCQ.
 *
 * The evaluator should normalize the student's answer
 * before comparing it with correct_answer.
 *
 * Example:
 *
 * correct_answer: "B"
 *
 * accepted_answers:
 * [
 *   "B",
 *   "b",
 *   "(B)",
 *   "B.",
 *   "II",
 *   "ii",
 *   "(ii)",
 *   "2",
 *   "Option B",
 *   "option 2"
 * ]
 */
export interface MCQAnswer {

  /**
   * Canonical answer used internally for evaluation.
   *
   * Example:
   * "A", "B", "C", "D"
   */
  correct_answer: string

  /**
   * Alternative representations accepted during evaluation.
   *
   * The backend may also generate these automatically,
   * so this field is optional.
   */
  accepted_answers?: string[]

  /**
   * Optional option labels used by this question.
   *
   * Example:
   * ["A", "B", "C", "D"]
   */
  option_labels?: string[]
}


// ─── Answer Key Section ──────────────────────────────────────────────────────

/**
 * Defines the rules for one section of an examination.
 *
 * Example:
 *
 * Section A:
 *   type = MCQ
 *   total_questions = 10
 *   questions_to_attempt = 10
 *   marks_per_question = 1
 *
 * Section B:
 *   type = LONG_ANSWER
 *   total_questions = 2
 *   questions_to_attempt = 1
 *   marks_per_question = 10
 *
 * Section C:
 *   type = SHORT_ANSWER
 *   total_questions = 3
 *   questions_to_attempt = 2
 *   marks_per_question = 5
 */
export interface AnswerKeySection {

  /**
   * Unique section identifier.
   */
  id?: string

  /**
   * Display name.
   *
   * Example:
   * Section A
   * Section B
   * Section C
   */
  name: string

  /**
   * Question type of this section.
   */
  type: AnswerKeySectionType

  /**
   * Total number of questions present
   * in this section.
   */
  total_questions: number

  /**
   * Number of questions the student is required
   * to attempt.
   *
   * Examples:
   *
   * Attempt All:
   * total_questions = 10
   * questions_to_attempt = 10
   *
   * Attempt Any One:
   * total_questions = 2
   * questions_to_attempt = 1
   *
   * Attempt Any Two:
   * total_questions = 3
   * questions_to_attempt = 2
   */
  questions_to_attempt: number

  /**
   * Marks awarded for one question in this section.
   */
  marks_per_question: number

  /**
   * Optional instruction shown to the user.
   *
   * Example:
   * "Attempt All Questions"
   * "Attempt Any One Question"
   * "Attempt Any Two Questions"
   */
  instruction?: string

  /**
   * Questions belonging to this section.
   */
  questions: AnswerKeyQuestion[]

  /**
   * Whether the section requires all questions
   * to be attempted.
   *
   * This is derived from:
   *
   * questions_to_attempt === total_questions
   */
  all_compulsory?: boolean

  /**
   * What should happen if the student attempts
   * more questions than required.
   *
   * "best"    -> Count the highest-scoring answers.
   * "first"   -> Count the first attempted questions.
   * "manual"  -> Flag for manual review.
   */
  excess_attempt_policy?:
  | 'best'
  | 'first'
  | 'manual'
}


// ─── Answer Key ──────────────────────────────────────────────────────────────

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


  // ─── Section-wise Configuration ──────────────────────────

  /**
   * Section-wise question and attempt configuration.
   *
   * This allows different rules for:
   *
   * Section A -> Attempt All
   * Section B -> Attempt Any One
   * Section C -> Attempt Any Two
   */
  sections?: AnswerKeySection[]


  // ─── Questions ────────────────────────────────────────────

  /**
   * Total number of questions across all sections.
   */
  total_questions: number

  /**
   * Flat question list.
   *
   * Kept for backward compatibility with the
   * existing evaluation system.
   */
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


  // ─── Section-wise Configuration ──────────────────────────

  /**
   * Section configuration.
   *
   * This is the main new structure used to define
   * compulsory/attempt rules.
   */
  sections?: AnswerKeySection[]


  // ─── Questions ────────────────────────────────────────────

  /**
   * Flat question list retained for compatibility
   * with the existing application.
   */
  questions: AnswerKeyQuestion[]
}


// ─── Answer Key Question ──────────────────────────────────────────────────────

/**
 * Individual question in an answer key.
 */
export interface AnswerKeyQuestion {

  /**
   * Internal numeric question ID.
   */
  id: number

  /**
   * Question number as printed on the examination paper.
   *
   * Examples:
   *
   * "1"
   * "1(a)"
   * "1(b)"
   * "Q2"
   * "Q4"
   */
  question_number: string

  /**
   * Question text.
   */
  question_text: string

  /**
   * Model/reference answer.
   *
   * For MCQs this can contain the canonical answer
   * such as "B".
   */
  model_answer: string

  /**
   * Maximum marks for this question.
   */
  max_marks: number

  /**
   * Existing/general question type.
   *
   * Kept separate from section type for
   * backward compatibility.
   */
  question_type:
  | 'theory'
  | 'numerical'
  | 'diagram'
  | 'mixed'


  // ─── New Section / Evaluation Information ────────────────

  /**
   * Optional section ID/name to which this question belongs.
   *
   * Example:
   * "Section A"
   */
  section_id?: string

  /**
   * Question category used by the new evaluation system.
   */
  answer_type?:
  | 'MCQ'
  | 'LONG_ANSWER'
  | 'SHORT_ANSWER'


  // ─── MCQ Specific Fields ─────────────────────────────────

  /**
   * MCQ options.
   *
   * Example:
   *
   * [
   *   { label: "A", value: "Option one" },
   *   { label: "B", value: "Option two" },
   *   { label: "C", value: "Option three" },
   *   { label: "D", value: "Option four" }
   * ]
   */
  options?: MCQOption[]

  /**
   * MCQ answer information.
   *
   * Example:
   *
   * {
   *   correct_answer: "B",
   *   accepted_answers: ["B", "b", "(B)", "II", "ii", "2"]
   * }
   */
  mcq_answer?: MCQAnswer

  /**
   * Canonical MCQ answer.
   *
   * This provides a simpler field for evaluation
   * and backend compatibility.
   *
   * Example:
   * "A"
   * "B"
   * "C"
   * "D"
   */
  correct_answer?: string

  /**
   * Alternative representations accepted
   * for this MCQ answer.
   *
   * Example:
   *
   * ["B", "b", "(B)", "B.", "II", "ii", "(ii)", "2"]
   */
  accepted_answers?: string[]


  // ─── Existing Evaluation Fields ──────────────────────────

  /**
   * Whether a diagram is required.
   */
  diagram_required: boolean

  /**
   * Percentage/marks weightage assigned to diagram.
   */
  diagram_weightage?: number

  /**
   * Important points expected in the answer.
   */
  key_points: string[]

  /**
   * Important keywords expected in the answer.
   */
  keywords: string[]

  /**
   * Rubric criteria used for evaluation.
   */
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

  /**
   * Section configuration is included when
   * returned by the backend.
   */
  sections?: AnswerKeySection[]

  created_at: string
}