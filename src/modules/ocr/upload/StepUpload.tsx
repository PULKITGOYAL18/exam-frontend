import { useState, useEffect } from 'react'
import { Card, Button, Alert } from '@/components/common'
import { useOCRStore } from '@/stores/ocrStore'

interface AnswerKey {
  id: string
  name: string
  subject: string
  semester: number
  examType?: string
  totalMarks: number
  createdAt: string
  questions?: any[]
}

export default function StepUpload({ onNext, onJobStarted }: { onNext: () => void; onJobStarted?: (jobId: string) => void }) {
  const [files, setFiles] = useState<File[]>([])
  const [answerKeyId, setAnswerKeyId] = useState('')
  const [answerKeys, setAnswerKeys] = useState<AnswerKey[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingKeys, setLoadingKeys] = useState(true)
  const [error, setError] = useState('')
  const [selectedKeyDetails, setSelectedKeyDetails] = useState<AnswerKey | null>(null)
  const { setJobId, setProcessingStatus } = useOCRStore()

  useEffect(() => {
    fetchAnswerKeys()
  }, [])

  const getToken = () => {
    return localStorage.getItem('exam_evaluate_token')
  }

  const fetchAnswerKeys = async () => {
    try {
      setLoadingKeys(true)
      setError('')
      
      const token = getToken()
      if (!token) {
        throw new Error('No authentication token found. Please login again.')
      }

      const response = await fetch('http://127.0.0.1:5000/api/answer-key/list', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch answer keys: ${response.status}`)
      }
      
      const data = await response.json()
      
      let keysArray: AnswerKey[] = []
      if (Array.isArray(data)) {
        keysArray = data
      } else if (data.data && Array.isArray(data.data)) {
        keysArray = data.data
      } else if (data.keys && Array.isArray(data.keys)) {
        keysArray = data.keys
      }
      
      setAnswerKeys(keysArray)
      setLoadingKeys(false)
    } catch (err: any) {
      console.error('Error fetching answer keys:', err)
      setError(err.message || 'Failed to load answer keys')
      setLoadingKeys(false)
    }
  }

  const handleAnswerKeyChange = (value: string) => {
    setAnswerKeyId(value)
    const selected = answerKeys.find(key => key.id === value)
    setSelectedKeyDetails(selected || null)
  }

  const handleUpload = async () => {
    if (!answerKeyId) {
      setError('Please select an answer key')
      return
    }
    if (files.length === 0) {
      setError('Please upload at least one PDF')
      return
    }

    setLoading(true)
    setError('')

    try {
      const token = getToken()
      if (!token) {
        throw new Error('No authentication token found. Please login again.')
      }

      // Fetch full answer key with questions
      const keyResponse = await fetch(`http://127.0.0.1:5000/api/answer-key/${answerKeyId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!keyResponse.ok) {
        throw new Error(`Failed to fetch answer key: ${keyResponse.status}`)
      }
      
      const answerKeyData = await keyResponse.json()
      
      // Extract questions from various response structures
      let questions: any[] = []
      let keyMetadata: any = {}
      
      if (answerKeyData.questions && Array.isArray(answerKeyData.questions)) {
        questions = answerKeyData.questions
        keyMetadata = answerKeyData
      } else if (answerKeyData.data && answerKeyData.data.questions && Array.isArray(answerKeyData.data.questions)) {
        questions = answerKeyData.data.questions
        keyMetadata = answerKeyData.data
      } else if (answerKeyData.data && Array.isArray(answerKeyData.data)) {
        for (const item of answerKeyData.data) {
          if (item.questions && Array.isArray(item.questions)) {
            questions = item.questions
            keyMetadata = item
            break
          }
        }
        if (questions.length === 0) {
          questions = answerKeyData.data
          keyMetadata = { name: selectedKeyDetails?.name || 'Answer Key' }
        }
      } else if (answerKeyData.answerKey && answerKeyData.answerKey.questions) {
        questions = answerKeyData.answerKey.questions
        keyMetadata = answerKeyData.answerKey
      } else if (Array.isArray(answerKeyData)) {
        questions = answerKeyData
        keyMetadata = { name: selectedKeyDetails?.name || 'Answer Key' }
      }

      if (questions.length === 0) {
        throw new Error('No questions found in the selected answer key.')
      }
      
      // Build answer key for pipeline
      const answerKeyForPipeline = {
        name: keyMetadata.name || selectedKeyDetails?.name || 'Answer Key',
        subject: keyMetadata.subject || selectedKeyDetails?.subject || '',
        semester: keyMetadata.semester || selectedKeyDetails?.semester || 1,
        total_marks: questions.reduce((sum: number, q: any) => sum + (q.max_marks || q.marks || 10), 0),
        total_questions: questions.length,
        questions: questions.map((q: any, idx: number) => ({
          question_number: q.question_number || q.question_num || `Q. No. ${idx + 1}`,
          question_text: q.question_text || q.text || q.question || `Question ${idx + 1}`,
          model_answer: q.model_answer || q.answer || q.answer_text || '',
          max_marks: q.max_marks || q.marks || 10,
          question_type: q.question_type || 'theory',
          diagram_required: q.diagram_required || q.diagram_expected || false,
          rubric: q.rubric || [],
          key_points: q.key_points || [],
          keywords: q.keywords || []
        }))
      }
      
      const answerKeyText = JSON.stringify(answerKeyForPipeline)

      // ✅ Send to batch API — returns job_id immediately
      const formData = new FormData()
      formData.append('answer_key', answerKeyText)
      files.forEach((file) => {
        formData.append('pdf_files', file)
      })

      const response = await fetch('/api/exam/process/batch', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Batch request failed: ${response.status} - ${errText}`)
      }

      const data = await response.json()
      console.log('📋 Batch response:', data)

      if (data.job_id) {
        console.log(`✅ Job started: ${data.job_id}`)
        // Store job_id so StepProcessing can poll
        setJobId(data.job_id)
        setProcessingStatus({ status: 'processing', progress: 0, message: 'Starting...' })
        if (onJobStarted) {
          onJobStarted(data.job_id)
        }
        // Advance to processing step — results come via polling
        onNext()
      } else {
        throw new Error('No job_id in response')
      }
    } catch (err: any) {
      console.error('❌ Upload failed:', err)
      setError(err.message || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  const formatKeyDisplay = (key: AnswerKey) => {
    return `${key.name} - ${key.subject || 'No Subject'} (Sem ${key.semester || 1})`
  }

  const groupedKeys = answerKeys.reduce((acc, key) => {
    const subject = key.subject || 'General'
    if (!acc[subject]) acc[subject] = []
    acc[subject].push(key)
    return acc
  }, {} as Record<string, AnswerKey[]>)

  const hasKeys = Array.isArray(answerKeys) && answerKeys.length > 0

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="error" message={error} onClose={() => setError('')} />
      )}

      <Card>
        <h3 className="font-semibold text-[#0F172A] mb-2">1. Select Answer Key</h3>
        
        {loadingKeys ? (
          <div className="flex items-center gap-2 text-[#94A3B8] py-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#3B5DE8] border-t-transparent" />
            Loading answer keys...
          </div>
        ) : !hasKeys ? (
          <div className="space-y-3">
            <Alert variant="warning" message="No answer keys found. Please create an answer key first." />
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => window.location.href = '/answer-keys'}>Go to Answer Keys</Button>
              <Button variant="secondary" onClick={fetchAnswerKeys}>Retry</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <select
              value={answerKeyId}
              onChange={(e) => handleAnswerKeyChange(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:border-[#3B5DE8] focus:ring-2 focus:ring-[#3B5DE8]/20 outline-none bg-white"
            >
              <option value="">Select an answer key...</option>
              {Object.entries(groupedKeys).map(([subject, keys]) => (
                <optgroup key={subject} label={subject}>
                  {keys.map((key) => (
                    <option key={key.id} value={key.id}>
                      {formatKeyDisplay(key)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>

            {selectedKeyDetails && (
              <div className="mt-3 p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-[#94A3B8]">Name:</span><span className="ml-2 text-[#0F172A] font-medium">{selectedKeyDetails.name}</span></div>
                  <div><span className="text-[#94A3B8]">Subject:</span><span className="ml-2 text-[#0F172A] font-medium">{selectedKeyDetails.subject}</span></div>
                  <div><span className="text-[#94A3B8]">Semester:</span><span className="ml-2 text-[#0F172A] font-medium">{selectedKeyDetails.semester}</span></div>
                  <div><span className="text-[#94A3B8]">Total Marks:</span><span className="ml-2 text-[#0F172A] font-medium">{selectedKeyDetails.totalMarks || 0}</span></div>
                </div>
              </div>
            )}
          </div>
        )}

        {hasKeys && (
          <button onClick={fetchAnswerKeys} className="text-xs text-[#3B5DE8] hover:text-[#2A4BC8] mt-2" disabled={loadingKeys}>
            {loadingKeys ? 'Loading...' : '↻ Refresh list'}
          </button>
        )}
      </Card>

      <Card>
        <h3 className="font-semibold text-[#0F172A] mb-2">2. Upload Answer Sheets</h3>
        <div className="space-y-3">
          <div className={`w-full p-6 border-2 border-dashed rounded-lg transition-colors ${files.length > 0 ? 'border-[#3B5DE8] bg-[#F0F4FF]' : 'border-[#E2E8F0] hover:border-[#94A3B8]'}`}>
            <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => { const selectedFiles = Array.from(e.target.files || []); setFiles(prev => [...prev, ...selectedFiles]) }} className="w-full cursor-pointer" />
            <p className="text-sm text-[#94A3B8] mt-2">Supported formats: PDF, PNG, JPG, JPEG</p>
          </div>

          {files.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-[#0F172A]">Selected Files ({files.length})</p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-[#F8FAFC] rounded-lg text-sm">
                    <span className="text-[#0F172A] truncate flex-1">📄 {file.name}</span>
                    <span className="text-[#94A3B8] text-xs ml-2">{(file.size / 1024).toFixed(1)} KB</span>
                    <button onClick={() => setFiles(files.filter((_, i) => i !== index))} className="ml-2 text-[#DC2626] hover:text-[#B91C1C]">✕</button>
                  </div>
                ))}
              </div>
              <button onClick={() => setFiles([])} className="text-xs text-[#DC2626] hover:text-[#B91C1C]">Clear all files</button>
            </div>
          )}
        </div>
      </Card>

      <div className="flex gap-3">
        <Button variant="secondary" size="lg" onClick={() => window.location.href = '/answer-keys'}>Manage Answer Keys</Button>
        <div className="flex-1" />
        <Button variant="primary" size="lg" onClick={handleUpload} loading={loading} disabled={!answerKeyId || files.length === 0 || loading || loadingKeys || !hasKeys}>
          {loading ? 'Processing...' : 'Start Evaluation'}
        </Button>
      </div>

      {answerKeyId && files.length > 0 && !error && hasKeys && (
        <Alert variant="info" message={`Ready to evaluate ${files.length} sheet(s) using "${selectedKeyDetails?.name || 'selected'}" answer key`} />
      )}
    </div>
  )
}