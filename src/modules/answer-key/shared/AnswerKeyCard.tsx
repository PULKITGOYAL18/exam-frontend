// src/modules/answer-key/shared/AnswerKeyCard.tsx

import { Card, Button } from '@/components/common'
import { BookOpen, Clock, FileText } from 'lucide-react'
import type { AnswerKeyListItem } from '@/types'

interface AnswerKeyCardProps {
  answerKey: AnswerKeyListItem
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
}

export default function AnswerKeyCard({ answerKey, onSelect, onEdit, onDelete }: AnswerKeyCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-[#0F172A]">{answerKey.name}</h3>
            <p className="text-sm text-[#475569]">{answerKey.subject}</p>
          </div>
          <span className="text-xs font-semibold text-[#1B3A6B] bg-[#EEF4FF] px-2 py-1 rounded-full">
            Sem {answerKey.semester}
          </span>
        </div>

        <div className="flex gap-4 text-xs text-[#94A3B8]">
          <span className="flex items-center gap-1">
            <FileText size={14} /> {answerKey.total_questions} Questions
          </span>
          <span className="flex items-center gap-1">
            <BookOpen size={14} /> {answerKey.total_marks} Marks
          </span>
          <span className="flex items-center gap-1">
            <Clock size={14} /> {new Date(answerKey.created_at).toLocaleDateString()}
          </span>
        </div>

        <div className="flex gap-2 mt-2">
          <Button variant="primary" size="sm" onClick={onSelect} className="flex-1">
            Select & Evaluate
          </Button>
          <Button variant="secondary" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <Button variant="danger" size="sm" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </div>
    </Card>
  )
}