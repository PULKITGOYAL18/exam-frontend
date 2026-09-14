// src/services/api/config.ts

export const API_CONFIG = {
  baseURL: 'http://localhost:8000',
  endpoints: {
    health: '/health',
    processStudent: '/api/exam/process/student',
    processBatch: '/api/exam/process/batch',
    parseAnswerKey: '/api/answer-key/parse',
    validateAnswerKey: '/api/answer-key/validate',
    listAnswerKeys: '/api/answer-key/list',
    getAnswerKey: '/api/answer-key',
    gradeSingle: '/api/grading/single',
    getTemplates: '/api/grading/templates',
  },
  timeout: 1800000, // 10 minutes for batch processing
  maxFileSize: 100 * 1024 * 1024, // 100MB
};