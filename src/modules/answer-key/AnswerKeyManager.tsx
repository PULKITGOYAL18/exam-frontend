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
  AnswerKey,
} from '@/types'

import { useAnswerKeyStore } from '@/stores/answerKeyStore'

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
   * ANSWER KEY STORE
   * ============================================================
   *
   * IMPORTANT:
   *
   * This component is used AFTER Faculty/HOD/Dean/Admin login.
   *
   * Therefore we MUST use authenticated methods:
   *
   *   fetchById()
   *   update()
   *   delete()
   *
   * NOT:
   *
   *   fetchByIdPublic()
   *   updatePublic()
   *   deletePublic()
   *
   * The public methods are only for the guest/public
   * answer-key workflow.
   */

  const {
    fetchById,
    update,
    delete: deleteAnswerKey,
  } = useAnswerKeyStore()


  /*
   * ============================================================
   * EDITING STATE
   * ============================================================
   */

  const [editingAnswerKey, setEditingAnswerKey] =
    useState<AnswerKey | null>(null)

  const [loadingEdit, setLoadingEdit] =
    useState(false)


  /*
   * ============================================================
   * NAVIGATION
   * ============================================================
   */

  const handleBackToDashboard = () => {

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

    setEditingAnswerKey(null)

    setActiveTab('list')
  }


  /*
   * ============================================================
   * CREATE ANSWER KEY
   * ============================================================
   */

  const handleCreateAnswerKey = () => {

    setEditingAnswerKey(null)

    setActiveTab('create')
  }


  /*
   * ============================================================
   * ANSWER KEY SELECT
   * ============================================================
   */

  const handleAnswerKeySelect = (id: string) => {

    onNavigate(
      'ocr-workflow',
      {
        examId: id,
      }
    )
  }


  /*
   * ============================================================
   * EDIT ANSWER KEY
   * ============================================================
   *
   * Faculty/HOD/Dean/Admin:
   *
   * GET:
   *   /api/answer-key/<id>
   *
   * NOT:
   *   /api/answer-key/public/<id>
   *
   * This fixes the 404 problem shown in your Flask logs.
   */

  const handleAnswerKeyEdit = async (id: string) => {

    try {

      setLoadingEdit(true)

      console.log(
        'Loading authenticated answer key:',
        id
      )

      const answerKey =
        await fetchById(id)


      if (!answerKey) {

        alert(
          'Answer key could not be found or you do not have permission to access it.'
        )

        return
      }


      console.log(
        'Answer key loaded successfully:',
        answerKey
      )


      setEditingAnswerKey(answerKey)

      setActiveTab('create')

    } catch (error: any) {

      console.error(
        'Error loading answer key for editing:',
        error
      )

      alert(
        error?.response?.data?.message ||
        error?.message ||
        'Failed to load answer key for editing.'
      )

    } finally {

      setLoadingEdit(false)
    }
  }


  /*
   * ============================================================
   * UPDATE ANSWER KEY
   * ============================================================
   *
   * Authenticated Faculty/HOD/Dean/Admin endpoint:
   *
   * PUT /api/answer-key/<id>
   */

  const handleAnswerKeyUpdate = async (
    id: string,
    data: any
  ) => {

    try {

      console.log(
        'Updating authenticated answer key:',
        id
      )

      await update(
        id,
        data
      )


      console.log(
        'Answer key updated successfully'
      )


      setEditingAnswerKey(null)

      setActiveTab('list')

    } catch (error: any) {

      console.error(
        'Error updating answer key:',
        error
      )

      throw error
    }
  }


  /*
   * ============================================================
   * DELETE ANSWER KEY
   * ============================================================
   *
   * ONLY FACULTY can delete.
   *
   * The UI hides the delete action for other roles.
   *
   * The backend should ALSO enforce Faculty-only deletion.
   */

  const handleAnswerKeyDelete = async (id: string) => {

    /*
     * Frontend safety check.
     *
     * Backend protection is still required.
     */

    if (user.role !== 'Faculty') {

      alert(
        'Only Faculty users can delete answer keys.'
      )

      return
    }


    const confirmed =
      window.confirm(
        'Are you sure you want to delete this answer key?\n\nThis action cannot be undone.'
      )


    if (!confirmed) {
      return
    }


    try {

      console.log(
        'Deleting authenticated answer key:',
        id
      )


      /*
       * IMPORTANT:
       *
       * Authenticated DELETE:
       *
       * DELETE /api/answer-key/<id>
       */

      await deleteAnswerKey(id)


      console.log(
        'Answer key deleted successfully'
      )


      setEditingAnswerKey(null)

      setActiveTab('list')

    } catch (error: any) {

      console.error(
        'Error deleting answer key:',
        error
      )

      alert(
        error?.response?.data?.message ||
        error?.message ||
        'Failed to delete answer key.'
      )
    }
  }


  /*
   * ============================================================
   * CANCEL CREATE / EDIT
   * ============================================================
   */

  const handleCancelCreate = () => {

    setEditingAnswerKey(null)


    /*
     * If user was editing:
     * return to list.
     *
     * If user was creating:
     * return to dashboard.
     */

    if (editingAnswerKey) {

      setActiveTab('list')

    } else {

      handleBackToDashboard()
    }
  }


  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

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
            ANSWER KEY FEATURES
            ====================================================== */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">


          {/* MCQ */}

          <Card className="p-4">

            <div className="flex items-start gap-3">

              <div className="w-10 h-10 rounded-lg bg-[#EEF4FF] flex items-center justify-center text-lg">
                📝
              </div>

              <div>

                <h3 className="font-semibold text-[#0F172A]">
                  Flexible MCQ Answers
                </h3>

                <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                  Student answers such as B, b, (B), B.,
                  II, ii, (ii), or 2 can be normalized
                  during evaluation.
                </p>

              </div>

            </div>

          </Card>


          {/* SECTION RULES */}

          <Card className="p-4">

            <div className="flex items-start gap-3">

              <div className="w-10 h-10 rounded-lg bg-[#EEF4FF] flex items-center justify-center text-lg">
                📚
              </div>

              <div>

                <h3 className="font-semibold text-[#0F172A]">
                  Section-wise Rules
                </h3>

                <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                  Configure total questions, questions
                  to attempt, marks per question, and
                  compulsory rules independently.
                </p>

              </div>

            </div>

          </Card>


          {/* EVALUATION */}

          <Card className="p-4">

            <div className="flex items-start gap-3">

              <div className="w-10 h-10 rounded-lg bg-[#EEF4FF] flex items-center justify-center text-lg">
                ✅
              </div>

              <div>

                <h3 className="font-semibold text-[#0F172A]">
                  Smart Evaluation
                </h3>

                <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                  Attempt limits and section marks are
                  stored with the answer key for accurate
                  evaluation.
                </p>

              </div>

            </div>

          </Card>

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

              {editingAnswerKey
                ? '✏️ Edit Answer Key'
                : '✏️ Create New Answer Key'}

            </button>


            {/* LIST TAB */}

            <button
              type="button"
              onClick={() => {

                setEditingAnswerKey(null)

                setActiveTab('list')

              }}
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
            CREATE / EDIT ANSWER KEY
            ====================================================== */}

        {activeTab === 'create' && (

          <StepCreateAnswerKey

            /*
             * undefined = create mode
             * object = edit mode
             */

            initialAnswerKey={
              editingAnswerKey || undefined
            }


            /*
             * CREATE
             */

            onSave={
              handleAnswerKeySaved
            }


            /*
             * CANCEL
             */

            onCancel={
              handleCancelCreate
            }


            /*
             * UPDATE
             *
             * Only supplied while editing.
             */

            onUpdate={
              editingAnswerKey
                ? handleAnswerKeyUpdate
                : undefined
            }

          />

        )}


        {/* ======================================================
            ANSWER KEY LIST
            ====================================================== */}

        {activeTab === 'list' && (

          <>

            {loadingEdit && (

              <div className="text-center py-4 text-sm text-[#64748B]">
                Loading answer key...
              </div>

            )}


            <StepAnswerKeyList

              onSelect={
                handleAnswerKeySelect
              }

              onEdit={
                handleAnswerKeyEdit
              }

              /*
               * Delete is supplied ONLY for Faculty.
               *
               * HOD / Dean / Admin can still view/edit
               * according to the backend permissions,
               * but they cannot delete.
               */

              onDelete={
                user.role === 'Faculty'
                  ? handleAnswerKeyDelete
                  : undefined
              }

            />

          </>

        )}

      </div>

    </AppShell>
  )
}