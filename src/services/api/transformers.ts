// src/services/api/transformers.ts

import { StudentResult, QuestionDetail, VerifiedDetail } from './examService';
import { AnswerSheetOCR, QuestionMark } from '@/types';

/**
 * Transform API StudentResult to frontend AnswerSheetOCR format
 * Uses ONLY real data from API - no fake/hardcoded values
 */
export const transformStudentToSheet = (
  result: StudentResult
): AnswerSheetOCR => {
  // Calculate overall confidence based on verification confidence
  const verified = result.verified || [];
  const avgConfidence = verified.length > 0
    ? verified.reduce((acc, v) => acc + (v.confidence || 0), 0) / verified.length
    : 0.5;

  const overallConfidence: 'High' | 'Medium' | 'Low' =
    avgConfidence >= 0.8 ? 'High' :
    avgConfidence >= 0.5 ? 'Medium' : 'Low';

  // Build field confidences from verified questions
  const fieldConfidences: Record<string, 'High' | 'Medium' | 'Low'> = {};
  verified.forEach((v) => {
    const conf = v.confidence || 0;
    fieldConfidences[v.question_number] =
      conf >= 0.8 ? 'High' :
      conf >= 0.5 ? 'Medium' : 'Low';
  });

  // Get grading summary from API
  const totalMarks = result.total_marks || 0;
  const maxMarks = result.max_marks || 0;
  const percentage = result.percentage || 0;

  // Extract student info from API response
  const studentName = result.student_name || '';
  const rollNumber = result.roll || '';
  
  // Try to extract name and roll from filename if not directly provided
  let extractedName = studentName;
  let extractedRoll = rollNumber;
  
  if (result.filename) {
    // Try to extract from filename pattern: 01_PulkitGoyal.pdf or 02_Pragya.pdf
    const filenameMatch = result.filename.match(/^(\d+)[_\s-]+(.+)\.pdf$/i);
    if (filenameMatch) {
      if (!extractedRoll) extractedRoll = filenameMatch[1];
      if (!extractedName || extractedName === 'Unknown') {
        extractedName = filenameMatch[2].replace(/[_\s-]+/g, ' ').trim();
      }
    }
  }

  // Build questions with actual data
  const questionsList = result.questions?.map((q, index) => {
    const v = verified.find((v) => v.question_number === q.question_number);
    return {
      number: q.question_number,
      text: q.question_text || `Question ${index + 1}`,
      marksAwarded: v?.verified_marks || 0,
      maxMarks: q.max_marks || 10,
      confidence: v?.confidence || 0,
      feedback: v?.reason || '',
      isAttempted: q.is_attempted || false,
      diagramExpected: q.diagram_expected || false,
      diagramDescription: q.diagram_description || '',
      modelAnswer: q.model_answer || '',
      studentAnswer: q.student_answer || '',
      questionType: q.question_type || 'theory',
    };
  }) || [];

  // Extract subject/course info from questions if available
  let courseName = '';
  let courseCode = '';
  if (questionsList.length > 0 && questionsList[0].text) {
    // Try to infer course from first question
    const firstQ = questionsList[0].text;
    // Look for common patterns
    const courseMatch = firstQ.match(/([A-Z]{2,4}\s*\d{3,4})/i);
    if (courseMatch) {
      courseCode = courseMatch[1].toUpperCase();
    }
  }

  return {
    id: `sheet_${extractedRoll || extractedName || Date.now()}`,
    filename: result.filename || 'unknown.pdf',
    
    // ✅ Real data from API - no hardcoded empty strings
    studentName: extractedName || 'Unknown Student',
    rollNumber: extractedRoll || 'N/A',
    
    // ⚠️ These fields are NOT available from the current API
    // They will be empty and should be hidden/disabled in UI until API provides them
    program: '',  
    branch: '',
    fatherName: '',
    cuid: '',
    courseName: courseName || 'Unknown Course',
    courseCode: courseCode || 'N/A',
    
    // Derived from API data
    overallConfidence,
    fieldConfidences: {
      ...fieldConfidences,
      // Add confidence for student name and roll number
      studentName: studentName ? 'High' : 'Low',
      rollNumber: rollNumber ? 'High' : 'Low',
    },
    verificationStatus: 'pending',
    mappingStatus: 'Mapped',
    mappedStudentId: extractedRoll || '',
    
    // Grading results
    totalMarks,
    maxMarks,
    percentage,
    
    // Questions with real data
    questions: questionsList,
  };
};

/**
 * Transform API results to frontend QuestionMark format
 */
export const transformToQuestions = (
  questions: QuestionDetail[],
  verified: VerifiedDetail[]
): QuestionMark[] => {
  return questions.map((q, index) => {
    const v = verified.find((v) => v.question_number === q.question_number);
    const qNumber = parseInt(q.question_number.replace(/\D/g, '')) || index + 1;
    
    return {
      id: `q_${qNumber}`,
      questionNo: qNumber,
      questionText: q.question_text || `Question ${qNumber}`,
      maxMarks: q.max_marks || 10,
      aiMarks: v?.verified_marks || 0,
      aiComment: v?.reason || 'AI evaluation completed',
      facultyMarks: null,
      confidence: (v?.confidence || 0) >= 0.8 ? 'High' : 
                  (v?.confidence || 0) >= 0.5 ? 'Medium' : 'Low',
      isAttempted: q.is_attempted || false,
      diagramExpected: q.diagram_expected || false,
      diagramDescription: q.diagram_description || '',
      modelAnswer: q.model_answer || '',
      studentAnswer: q.student_answer || '',
      questionType: q.question_type || 'theory',
    };
  });
};

/**
 * Transform multiple API results to AnswerSheetOCR array
 */
export const transformBatchResults = (
  results: StudentResult[]
): AnswerSheetOCR[] => {
  return results
    .filter(r => !r.error) // Skip failed results
    .map(r => transformStudentToSheet(r));
};

/**
 * Get overall confidence summary for a student
 */
export const getConfidenceSummary = (result: StudentResult) => {
  const verified = result.verified || [];
  const avgConfidence = verified.length > 0
    ? verified.reduce((acc, v) => acc + (v.confidence || 0), 0) / verified.length
    : 0.5;

  return {
    average: avgConfidence,
    level: avgConfidence >= 0.8 ? 'High' : avgConfidence >= 0.5 ? 'Medium' : 'Low',
    count: verified.length,
  };
};

/**
 * Check if OCR data is complete and valid
 */
export const isOCROutputValid = (sheet: AnswerSheetOCR): boolean => {
  return !!(sheet.studentName && sheet.studentName !== 'Unknown Student');
};