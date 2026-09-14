import { apiClient } from './client';
import { API_CONFIG } from './config';

export interface ProcessBatchResponse {
  status: string;
  job_id?: string;
  summary?: {
    total_students: number;
    successful: number;
    failed: number;
    average_percentage: number;
  };
  results?: StudentResult[];
  request_id?: string;
  duration?: string;
  total_files: number;
}

export interface StudentResult {
  student_name: string;
  roll: string;
  filename: string;
  total_marks: number;
  max_marks: number;
  percentage: number;
  timestamp: string;
  questions: QuestionDetail[];
  verified: VerifiedDetail[];
  detailed_logs: Record<string, string>;
}

export interface QuestionDetail {
  question_number: string;
  question_text: string;
  model_answer: string;
  student_answer: string;
  max_marks: number;
  diagram_description: string;
  page: number;
  is_attempted: boolean;
  diagram_expected: boolean;
}

export interface VerifiedDetail {
  question_number: string;
  verified_marks: number;
  is_fair: boolean;
  reason: string;
  confidence: number;
}

export const examService = {
  processStudent: async (
    answerKey: string,
    pdfFile: File,
    studentName?: string,
    roll?: string
  ): Promise<any> => {
    const formData = new FormData();
    formData.append('answer_key', answerKey);
    formData.append('pdf_file', pdfFile);
    if (studentName) formData.append('student_name', studentName);
    if (roll) formData.append('roll', roll);

    const response = await apiClient.post(
      API_CONFIG.endpoints.processStudent,
      formData
    );
    return response.data;
  },

  processBatch: async (
    answerKey: string,
    pdfFiles: File[]
  ): Promise<ProcessBatchResponse> => {
    const formData = new FormData();
    formData.append('answer_key', answerKey);
    
    pdfFiles.forEach((file) => {
      formData.append('pdf_files', file);
    });

    const response = await apiClient.post(
      API_CONFIG.endpoints.processBatch,
      formData
    );
    return response.data;
  },

  validateFiles: async (pdfFiles: File[]): Promise<any> => {
    const formData = new FormData();
    pdfFiles.forEach((file) => {
      formData.append('pdf_files', file);
    });

    const response = await apiClient.post(
      '/api/exam/process/validate',
      formData
    );
    return response.data;
  },

  parseAnswerKey: async (answerKey: string): Promise<any> => {
    const response = await apiClient.post(
      API_CONFIG.endpoints.parseAnswerKey,
      { answer_key: answerKey }
    );
    return response.data;
  },

  validateAnswerKey: async (answerKey: string): Promise<any> => {
    const response = await apiClient.post(
      API_CONFIG.endpoints.validateAnswerKey,
      { answer_key: answerKey }
    );
    return response.data;
  },

  listAnswerKeys: async (): Promise<any> => {
    const response = await apiClient.get(
      '/api/answer-key/list'
    );
    return response.data;
  },

  getAnswerKey: async (id: string): Promise<any> => {
    const response = await apiClient.get(
      `/api/answer-key/${id}`
    );
    return response.data;
  },

  healthCheck: async (): Promise<any> => {
    const response = await apiClient.get(API_CONFIG.endpoints.health);
    return response.data;
  },
};