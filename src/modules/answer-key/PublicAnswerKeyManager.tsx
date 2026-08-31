// src/modules/answer-key/PublicAnswerKeyManager.tsx

import { useState } from 'react'
import { useAnswerKeyStore } from '@/stores/answerKeyStore'
import StepCreateAnswerKey from './create/StepCreateAnswerKey'


interface PublicAnswerKeyManagerProps {
    onBack?: () => void
    onSuccess?: (answerKeyId: string) => void
}


export default function PublicAnswerKeyManager({
    onBack,
    onSuccess,
}: PublicAnswerKeyManagerProps) {

    const {
        createPublic,
        isLoading,
        error,
    } = useAnswerKeyStore()


    const [successMessage, setSuccessMessage] =
        useState<string | null>(null)


    /*
     * ==========================================================
     * CREATE ANSWER KEY
     * ==========================================================
     *
     * This handler uses createPublic().
     *
     * No login is required.
     * No JWT is required.
     *
     * The request goes to:
     *
     * POST /api/answer-key/public-create
     *
     * The backend then stores the answer key in MongoDB.
     */

    const handleSave = async (data?: any) => {

        try {

            setSuccessMessage(null)


            /*
             * StepCreateAnswerKey normally sends the answer-key
             * data through its onSave callback.
             *
             * If data is available, create the answer key using
             * the public API.
             */

            if (data) {

                const result =
                    await createPublic(data)


                setSuccessMessage(
                    'Answer key created successfully!'
                )


                /*
                 * Notify parent component.
                 */

                if (onSuccess && result?.id) {

                    onSuccess(result.id)
                }

                return
            }


            /*
             * If the existing StepCreateAnswerKey does not pass
             * data through onSave, it may already be handling
             * creation internally.
             *
             * In that situation this callback simply displays
             * the success state.
             */

            setSuccessMessage(
                'Answer key created successfully!'
            )

        } catch (err: any) {

            console.error(
                '❌ Public answer key creation failed:',
                err
            )

            setSuccessMessage(null)
        }
    }


    /*
     * ==========================================================
     * CANCEL
     * ==========================================================
     */

    const handleCancel = () => {

        if (onBack) {
            onBack()
        }
    }


    return (
        <div className="min-h-screen bg-[#F8FAFC]">

            {/* =====================================================
          HEADER
          ===================================================== */}

            <header className="bg-white border-b border-[#E2E8F0]">

                <div className="max-w-6xl mx-auto px-6 py-4">

                    <div className="flex items-center justify-between gap-4">

                        <div>

                            <h1 className="text-xl font-bold text-[#0F172A]">
                                Create Answer Key
                            </h1>

                            <p className="text-sm text-[#64748B] mt-1">
                                Create an answer key without logging in.
                            </p>

                        </div>


                        {onBack && (

                            <button
                                type="button"
                                onClick={handleCancel}
                                className="
                  px-4
                  py-2
                  text-sm
                  font-medium
                  text-[#475569]
                  border
                  border-[#CBD5E1]
                  rounded-lg
                  hover:bg-[#F8FAFC]
                  transition-colors
                "
                            >
                                ← Back
                            </button>

                        )}

                    </div>

                </div>

            </header>


            {/* =====================================================
          MAIN CONTENT
          ===================================================== */}

            <main className="max-w-6xl mx-auto px-6 py-8">

                {/* Public mode information */}

                <div
                    className="
            mb-6
            rounded-xl
            border
            border-[#BFDBFE]
            bg-[#EFF6FF]
            px-5
            py-4
          "
                >

                    <div className="flex gap-3">

                        <div className="text-lg">
                            ℹ️
                        </div>

                        <div>

                            <h2 className="text-sm font-semibold text-[#1E3A8A]">
                                Guest Answer Key Creation
                            </h2>

                            <p className="text-sm text-[#475569] mt-1">
                                You can create and save an answer key without
                                signing in. Your answer key will be securely
                                submitted to the system for evaluation.
                            </p>

                        </div>

                    </div>

                </div>


                {/* =================================================
            SUCCESS MESSAGE
            ================================================= */}

                {successMessage && (

                    <div
                        className="
              mb-6
              rounded-xl
              border
              border-[#BBF7D0]
              bg-[#F0FDF4]
              px-5
              py-4
            "
                    >

                        <div className="flex items-center gap-3">

                            <span className="text-lg">
                                ✅
                            </span>

                            <div>

                                <p className="font-semibold text-[#166534]">
                                    {successMessage}
                                </p>

                                <p className="text-sm text-[#475569] mt-1">
                                    Your answer key has been saved successfully.
                                </p>

                            </div>

                        </div>

                    </div>

                )}


                {/* =================================================
            ERROR MESSAGE
            ================================================= */}

                {error && (

                    <div
                        className="
              mb-6
              rounded-xl
              border
              border-[#FECACA]
              bg-[#FEF2F2]
              px-5
              py-4
            "
                    >

                        <div className="flex items-start gap-3">

                            <span className="text-lg">
                                ❌
                            </span>

                            <div>

                                <p className="font-semibold text-[#991B1B]">
                                    Unable to create answer key
                                </p>

                                <p className="text-sm text-[#475569] mt-1">
                                    {error}
                                </p>

                            </div>

                        </div>

                    </div>

                )}


                {/* =================================================
            ANSWER KEY FORM
            ================================================= */}

                <div className="relative">

                    {isLoading && (

                        <div
                            className="
                absolute
                inset-0
                z-20
                flex
                items-center
                justify-center
                rounded-xl
                bg-white/70
                backdrop-blur-[1px]
              "
                        >

                            <div className="flex items-center gap-3">

                                <div
                                    className="
                    h-5
                    w-5
                    animate-spin
                    rounded-full
                    border-2
                    border-[#CBD5E1]
                    border-t-[#1B3A6B]
                  "
                                />

                                <span className="text-sm font-medium text-[#475569]">
                                    Saving answer key...
                                </span>

                            </div>

                        </div>

                    )}


                    <StepCreateAnswerKey
                        onSave={handleSave}
                        onCancel={handleCancel}
                    />

                </div>

            </main>

        </div>
    )
}