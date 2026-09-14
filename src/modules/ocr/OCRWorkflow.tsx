import { useState } from 'react'
import { AppShell } from '@/layouts'
import { Card, Button, ArrowLeftIcon } from '@/components/common'
import { useOCRStore } from '@/stores/ocrStore'
import { Stepper, STEPS } from './shared'
import StepUpload from './upload/StepUpload'
import StepProcessing from './extraction/StepProcessing'
import StepResults from './extraction/StepResults'
import StepAIEvaluation from './../evaluation/ai-evaluation/StepAIEvaluation'
import StepSubmit from './steps/StepSubmit'

export default function OCRWorkflow({ user, onNavigate, onLogout }: any) {
  const [currentStep, setCurrentStep] = useState(0)
  const { setJobId } = useOCRStore()

  // ✅ 5 steps now — Verify removed
  const steps = [
    { id: 'upload', component: StepUpload, props: { onNext: () => setCurrentStep(1), onJobStarted: (id: string) => setJobId(id) } },
    { id: 'processing', component: StepProcessing, props: { onNext: () => setCurrentStep(2) } },
    { id: 'results', component: StepResults, props: { onNext: () => setCurrentStep(3) } },
    { id: 'ai-evaluation', component: StepAIEvaluation, props: { onNext: () => setCurrentStep(4) } },
    { id: 'submit', component: StepSubmit, props: { onSubmit: () => onNavigate('dashboard-faculty'), onNavigate } },
  ]

  const CurrentComponent = steps[currentStep].component
  const stepProps = steps[currentStep].props

  return (
    <AppShell user={user} onNavigate={onNavigate} onLogout={onLogout} activeSection="ocr">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A]">Exam Evaluation</h1>
            <p className="text-sm text-[#94A3B8]">AI-powered answer sheet evaluation</p>
          </div>
          <Button variant="ghost" onClick={() => onNavigate('dashboard-faculty')}>
            <ArrowLeftIcon size={14} /> Exit
          </Button>
        </div>

        <Card className="py-4">
          <Stepper current={STEPS[currentStep]} completed={STEPS.slice(0, currentStep)} />
        </Card>

        <CurrentComponent {...stepProps} />
      </div>
    </AppShell>
  )
}