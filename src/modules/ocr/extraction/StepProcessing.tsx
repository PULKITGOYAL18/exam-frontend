import { useEffect } from 'react'
import { Card, Spinner } from '@/components/common'
import { useProgressPolling } from '@/hooks/useProgressPolling'
import { useOCRStore } from '@/stores/ocrStore'

export default function StepProcessing({ onNext }: { onNext: () => void }) {
  const { jobId, results, setResults, setSummary, setProcessingStatus } = useOCRStore()

  // ✅ If results are already in the store (sync upload flow), skip polling and advance immediately
  useEffect(() => {
    if (results && results.length > 0 && !jobId) {
      console.log('✅ Results already in store (sync flow), advancing to Results step')
      setTimeout(onNext, 300)
    }
  }, [results, jobId, onNext])

  const progress = useProgressPolling(jobId, (data) => {
    console.log('🔍 POLLING COMPLETE:', data)
    if (data.results) {
      setResults(data.results)
    }
    if (data.summary) {
      setSummary(data.summary)
    }
    setProcessingStatus({ status: 'completed', progress: 100, message: 'Complete!' })
    setTimeout(onNext, 500)
  })

  const pct = Math.round(progress.progress || 0)
  const message = progress.message || 'Processing...'
  const student = progress.student || ''

  useEffect(() => {
    if (progress.status && !progress.isComplete) {
      setProcessingStatus({ status: 'processing', progress: pct, message })
    }
  }, [progress.status, progress.isComplete, pct, message, setProcessingStatus])

  return (
    <Card className="text-center py-12">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full border-4 border-[#EEF4FF] flex items-center justify-center">
            <Spinner size="lg" color="#1B3A6B" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold text-[#1B3A6B]">{pct}%</span>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-[#0F172A]">
            {pct === 100 ? 'Complete!' : 'Processing...'}
          </h2>
          <p className="text-sm text-[#94A3B8] mt-1">{message}</p>
          {student && (
            <p className="text-xs text-[#64748B] mt-1">Student: {student}</p>
          )}
        </div>

        <div className="w-full max-w-md">
          <div className="h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1B3A6B] rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="flex gap-6 text-sm text-[#94A3B8]">
          <span>🔄 {jobId ? 'Polling' : 'Waiting...'}</span>
          <span>📊 {pct}%</span>
        </div>
      </div>
    </Card>
  )
}