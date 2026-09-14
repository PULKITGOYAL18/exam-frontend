// src/services/api/index.ts

export { API_CONFIG } from './config'
export { apiClient } from './client'
export { examService } from './examService'
export { answerKeyService } from './answerKeyService'
export type {
  ProcessBatchResponse,
  StudentResult,
  QuestionDetail,
  VerifiedDetail
} from './examService'