// src/modules/answer-key/AnswerKeyManager.tsx

import { AppShell } from '@/layouts'
import { useState } from 'react'
import {
  Card,
  ArrowLeftIcon,
} from '@/components/common'

import type {
  User,
  Screen,
} from '@/types'

import StepCreateAnswerKey from './create/StepCreateAnswerKey'
import StepAnswerKeyList from './list/StepAnswerKeyList'


interface AnswerKeyManagerProps {
  user: User
  onNavigate: (s: Screen, data?: any) => void
  onLogout: () => void
  initialScreen?: 'create' | 'list'
}


export default function AnswerKeyManager({
  user,
  onNavigate,
  onLogout,
  initialScreen = 'create',
}: AnswerKeyManagerProps) {

  const [activeTab, setActiveTab] =
    useState<'create' | 'list'>(initialScreen)


  /*
   * ============================================================
   * NAVIGATION
   * ============================================================
   */

  const handleBackToDashboard = () => {
    /*
     * Always return to the correct dashboard
     * based on the authenticated user's role.
     */

    switch (user.role) {
      case 'Faculty':
        onNavigate('dashboard-faculty')
        break

      case 'HOD':
        onNavigate('dashboard-hod')
        break

      case 'Dean':
        onNavigate('dashboard-dean')
        break

      case 'Admin':
        onNavigate('dashboard-admin')
        break

      default:
        onNavigate('dashboard-faculty')
    }
  }


  /*
   * ============================================================
   * ANSWER KEY SAVED
   * ============================================================
   */

  const handleAnswerKeySaved = () => {
    /*
     * After successfully creating an answer key,
     * open the answer-key list.
     */

    setActiveTab('list')
  }


  /*
   * ============================================================
   * CREATE ANSWER KEY
   * ============================================================
   */

  const handleCreateAnswerKey = () => {
    setActiveTab('create')
  }


  /*
   * ============================================================
   * ANSWER KEY LIST
   * ============================================================
   */

  const handleAnswerKeySelect = (id: string) => {
    /*
     * Open OCR workflow for the selected examination.
     */

    onNavigate(
      'ocr-workflow',
      {
        examId: id,
      }
    )
  }


  const handleAnswerKeyEdit = (id: string) => {
    /*
     * Edit functionality can be implemented later.
     *
     * Keeping this callback here prevents breaking
     * StepAnswerKeyList's existing interface.
     */

    console.log(
      'Edit answer key:',
      id
    )
  }


  const handleAnswerKeyDelete = (id: string) => {
    /*
     * Delete functionality can be connected to the
     * backend later.
     */

    console.log(
      'Delete answer key:',
      id
    )
  }


  return (
    <AppShell
      user={{
        name: user.name,
        role: user.role,
        email: user.email,
      }}
      onNavigate={onNavigate}
      onLogout={onLogout}
      activeSection="answer-key"
    >

      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">

        {/* ======================================================
            HEADER
            ====================================================== */}

        <div className="flex items-center justify-between gap-4 flex-wrap">

          <div>
            <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
              Answer Key Management
            </h1>

            <p className="text-sm text-[#475569] mt-0.5">
              Create and manage answer keys for examinations.
            </p>
          </div>


          <button
            type="button"
            onClick={handleBackToDashboard}
            className="flex items-center gap-1.5 text-sm text-[#475569] hover:text-[#1B3A6B] font-medium transition-colors"
          >
            <ArrowLeftIcon size={14} />

            Back to Dashboard
          </button>

        </div>


        {/* ======================================================
            TABS
            ====================================================== */}

        <Card className="p-0 overflow-hidden">

          <div className="flex border-b border-[#E2E8F0]">

            {/* CREATE TAB */}

            <button
              type="button"
              onClick={handleCreateAnswerKey}
              className={`px-6 py-3 text-sm font-semibold transition-all ${activeTab === 'create'
                ? 'text-[#1B3A6B] border-b-2 border-[#1B3A6B] bg-[#EEF4FF]'
                : 'text-[#94A3B8] hover:text-[#475569]'
                }`}
            >
              ✏️ Create New Answer Key
            </button>


            {/* LIST TAB */}

            <button
              type="button"
              onClick={() =>
                setActiveTab('list')
              }
              className={`px-6 py-3 text-sm font-semibold transition-all ${activeTab === 'list'
                ? 'text-[#1B3A6B] border-b-2 border-[#1B3A6B] bg-[#EEF4FF]'
                : 'text-[#94A3B8] hover:text-[#475569]'
                }`}
            >
              📋 My Answer Keys
            </button>

          </div>

        </Card>


        {/* ======================================================
            CREATE ANSWER KEY
            ====================================================== */}

        {activeTab === 'create' && (
          <StepCreateAnswerKey
            onSave={handleAnswerKeySaved}
            onCancel={handleBackToDashboard}
          />
        )}


        {/* ======================================================
            ANSWER KEY LIST
            ====================================================== */}

        {activeTab === 'list' && (
          <StepAnswerKeyList
            onSelect={handleAnswerKeySelect}

            onEdit={handleAnswerKeyEdit}

            onDelete={handleAnswerKeyDelete}
          />
        )}

      </div>

    </AppShell>
  )
}