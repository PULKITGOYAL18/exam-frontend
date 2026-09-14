import { CheckIcon } from '@/components/common'

// ✅ Removed 'Verify' — now 5 steps
export const STEPS = ['Upload', 'Processing', 'Results', 'AI Eval', 'Submit']

export function Stepper({ current, completed }: { current: string; completed: string[] }) {
  return (
    <div className="flex items-center justify-between">
      {STEPS.map((step, i) => {
        const isCompleted = completed.includes(step)
        const isCurrent = step === current
        const isPast = completed.includes(STEPS[i - 1]) || completed.includes(step)

        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  isCompleted
                    ? 'bg-[#059669] border-[#059669] text-white'
                    : isCurrent
                    ? 'bg-[#1B3A6B] border-[#1B3A6B] text-white'
                    : 'bg-white border-[#E2E8F0] text-[#94A3B8]'
                }`}
              >
                {isCompleted ? <CheckIcon size={14} /> : <span>{i + 1}</span>}
              </div>
              <span
                className={`text-[10px] font-medium ${
                  isCurrent ? 'text-[#1B3A6B]' : isCompleted ? 'text-[#059669]' : 'text-[#94A3B8]'
                }`}
              >
                {step}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 w-8 sm:w-16 mx-2 ${
                  i < STEPS.indexOf(current) ? 'bg-[#059669]' : 'bg-[#E2E8F0]'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}