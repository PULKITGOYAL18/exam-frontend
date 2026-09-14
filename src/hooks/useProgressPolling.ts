import { useState, useEffect, useRef } from 'react'

export interface ProgressData {
  progress: number
  status: string
  message: string
  student: string
  isComplete: boolean
  results?: any[]
  summary?: any
}

export function useProgressPolling(jobId: string | null, onComplete?: (data: ProgressData) => void) {
  const [progress, setProgress] = useState<ProgressData>({
    progress: 0, status: 'idle', message: 'Waiting...', student: '', isComplete: false
  })
  const doneRef = useRef(false)
  const cbRef = useRef(onComplete)
  cbRef.current = onComplete
  const prevRef = useRef<string>('')

  useEffect(() => {
    if (!jobId) return
    doneRef.current = false
    prevRef.current = ''
    let active = true

    const poll = async () => {
      if (!active || doneRef.current) return
      try {
        const r = await fetch(`/api/progress/${jobId}`)
        if (!r.ok) return
        const j = await r.json()
        if (!active || j.status !== 'success') return

        const key = JSON.stringify(j.data)
        if (key === prevRef.current) return
        prevRef.current = key

        setProgress(j.data)

        // ✅ ONLY advance when results actually exist — ignore isComplete entirely
        const hasResults = j.data.results && Array.isArray(j.data.results) && j.data.results.length > 0
        
        if (hasResults && !doneRef.current) {
          doneRef.current = true
          cbRef.current?.(j.data)
        }
      } catch {}
    }

    poll()
    const id = setInterval(poll, 3000)
    return () => { active = false; clearInterval(id) }
  }, [jobId])

  return progress
}