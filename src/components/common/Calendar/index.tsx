import { useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from 'lucide-react'

// ─── Mini Calendar ───────────────────────────────────────────────────────────

export function MiniCalendar() {
  const today = new Date()

  const [currentDate, setCurrentDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  )

  // --------------------------------------------------------------------------
  // Calendar calculations
  // --------------------------------------------------------------------------

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const monthName = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const firstDayOfMonth = new Date(
    year,
    month,
    1
  ).getDay()

  const daysInMonth = new Date(
    year,
    month + 1,
    0
  ).getDate()

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = []

    // Empty cells before the first day
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null)
    }

    // Actual days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }

    // Complete the final week
    while (days.length % 7 !== 0) {
      days.push(null)
    }

    return days
  }, [firstDayOfMonth, daysInMonth])

  // --------------------------------------------------------------------------
  // Navigation
  // --------------------------------------------------------------------------

  const goToPreviousMonth = () => {
    setCurrentDate(
      new Date(
        year,
        month - 1,
        1
      )
    )
  }

  const goToNextMonth = () => {
    setCurrentDate(
      new Date(
        year,
        month + 1,
        1
      )
    )
  }

  const goToToday = () => {
    setCurrentDate(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      )
    )
  }

  // --------------------------------------------------------------------------
  // Check today's date
  // --------------------------------------------------------------------------

  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    )
  }

  const isCurrentMonth =
    month === today.getMonth() &&
    year === today.getFullYear()

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <div className="w-full">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">

        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#EEF4FF]">
            <CalendarDays
              size={16}
              className="text-[#1B3A6B]"
            />
          </div>

          <div>
            <div className="text-sm font-semibold text-[#0F172A]">
              Calendar
            </div>

            <div className="text-[10px] text-[#94A3B8]">
              {monthName}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1">

          <button
            type="button"
            onClick={goToPreviousMonth}
            className="flex items-center justify-center w-7 h-7 rounded-md text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft size={15} />
          </button>

          <button
            type="button"
            onClick={goToToday}
            className="px-2 py-1 rounded-md text-[10px] font-semibold text-[#1B3A6B] bg-[#EEF4FF] hover:bg-[#E0EAFF] transition-colors"
          >
            Today
          </button>

          <button
            type="button"
            onClick={goToNextMonth}
            className="flex items-center justify-center w-7 h-7 rounded-md text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors"
            aria-label="Next month"
          >
            <ChevronRight size={15} />
          </button>

        </div>
      </div>

      {/* Week days */}
      <div className="grid grid-cols-7 mb-1">

        {[
          'S',
          'M',
          'T',
          'W',
          'T',
          'F',
          'S',
        ].map((day, index) => (
          <div
            key={`${day}-${index}`}
            className="flex items-center justify-center h-7 text-[10px] font-semibold text-[#94A3B8]"
          >
            {day}
          </div>
        ))}

      </div>

      {/* Dates */}
      <div className="grid grid-cols-7 gap-y-1">

        {calendarDays.map((day, index) => {

          if (day === null) {
            return (
              <div
                key={`empty-${index}`}
                className="h-7"
              />
            )
          }

          const todayDate = isToday(day)

          return (
            <div
              key={day}
              className="flex items-center justify-center h-7"
            >
              <button
                type="button"
                className={`
                  flex items-center justify-center
                  w-7 h-7 rounded-full
                  text-[10px] font-medium
                  transition-all
                  ${todayDate
                    ? 'bg-[#1B3A6B] text-white font-bold shadow-sm'
                    : 'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                  }
                `}
                title={
                  todayDate
                    ? 'Today'
                    : `${day} ${monthName}`
                }
              >
                {day}
              </button>
            </div>
          )
        })}

      </div>

      {/* Today indicator */}
      {isCurrentMonth && (
        <div className="flex items-center justify-center gap-1.5 mt-3">

          <div className="w-1.5 h-1.5 rounded-full bg-[#1B3A6B]" />

          <span className="text-[10px] text-[#64748B]">
            Today · {today.toLocaleDateString('en-US', {
              day: 'numeric',
              month: 'short',
            })}
          </span>

        </div>
      )}

    </div>
  )
}