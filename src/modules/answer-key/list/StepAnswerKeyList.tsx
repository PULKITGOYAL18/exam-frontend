// src/modules/answer-key/list/StepAnswerKeyList.tsx

import { useEffect } from 'react'
import { Card, Button, Alert, Spinner } from '@/components/common'
import { useAnswerKeyStore } from '@/stores/answerKeyStore'
import AnswerKeyCard from '../shared/AnswerKeyCard'

interface StepAnswerKeyListProps {
  onSelect: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export default function StepAnswerKeyList({ onSelect, onEdit, onDelete }: StepAnswerKeyListProps) {
  const { answerKeys, isLoading, error, fetchAll } = useAnswerKeyStore()

  useEffect(() => {
    console.log('📋 StepAnswerKeyList mounted, fetching answer keys...')
    fetchAll()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" color="navy" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert 
        variant="error" 
        title="Error Loading Answer Keys" 
        message={error}
      />
    )
  }

  if (answerKeys.length === 0) {
    return (
      <Card className="text-center py-12">
        <p className="text-[#94A3B8]">No answer keys found. Create your first one!</p>
        <Button variant="primary" className="mt-4" onClick={() => window.location.href = '#create'}>
          Create Answer Key
        </Button>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {answerKeys.map((key) => (
        <AnswerKeyCard
          key={key.id}
          answerKey={key}
          onSelect={() => onSelect(key.id)}
          onEdit={() => onEdit(key.id)}
          onDelete={() => onDelete(key.id)}
        />
      ))}
    </div>
  )
}