'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface QuestionOption {
  label: string
  text: string
}

interface Question {
  _id?: string
  type: string
  question: string
  options?: QuestionOption[]
  correct_answer: string
  explanation: string
  difficulty: string
  topic?: string
  file_id: string
  created_at: string
}

export default function ReviewPage() {
  const params = useParams()
  const router = useRouter()
  const fileId = params.fileId as string

  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [editedQuestion, setEditedQuestion] = useState<Question | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        // Load questions from the generated file
        const response = await fetch(`http://localhost:8000/generated_questions/${fileId}.json`)
        if (!response.ok) {
          throw new Error('Failed to load questions')
        }
        const data = await response.json()
        const loadedQuestions = data.questions || []

        // Save questions to database if they don't have IDs yet
        if (loadedQuestions.length > 0 && !loadedQuestions[0]._id) {
          try {
            const saveResponse = await fetch('http://localhost:8000/api/questions/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                file_id: fileId,
                questions: loadedQuestions
              })
            })

            if (saveResponse.ok) {
              const saveData = await saveResponse.json()
              // Reload questions from database to get IDs
              const dbResponse = await fetch(`http://localhost:8000/api/process/questions/${fileId}`)
              if (dbResponse.ok) {
                const dbData = await dbResponse.json()
                setQuestions(dbData.questions || loadedQuestions)
              } else {
                setQuestions(loadedQuestions)
              }
            } else {
              setQuestions(loadedQuestions)
            }
          } catch (saveErr) {
            console.error('Error saving questions to DB:', saveErr)
            setQuestions(loadedQuestions)
          }
        } else {
          setQuestions(loadedQuestions)
        }

        setLoading(false)
      } catch (err: any) {
        console.error('Error loading questions:', err)
        setError(err.message)
        setLoading(false)
      }
    }

    if (fileId) {
      loadQuestions()
    }
  }, [fileId])

  const currentQuestion = questions[currentIndex]

  const handleEditClick = () => {
    setEditedQuestion({ ...currentQuestion })
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setEditedQuestion(null)
    setIsEditing(false)
  }

  const handleSaveEdit = async () => {
    if (!editedQuestion) return

    setSaving(true)
    try {
      if (editedQuestion._id) {
        // Update existing question in database
        const response = await fetch(`http://localhost:8000/api/questions/${editedQuestion._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: editedQuestion.question,
            options: editedQuestion.options,
            correct_answer: editedQuestion.correct_answer,
            explanation: editedQuestion.explanation,
            difficulty: editedQuestion.difficulty,
            topic: editedQuestion.topic
          })
        })

        if (!response.ok) {
          throw new Error('Failed to update question')
        }

        const updatedQuestion = await response.json()

        // Update local state with the response from server
        const updatedQuestions = [...questions]
        updatedQuestions[currentIndex] = updatedQuestion
        setQuestions(updatedQuestions)
      } else {
        // No ID yet, just update local state
        const updatedQuestions = [...questions]
        updatedQuestions[currentIndex] = editedQuestion
        setQuestions(updatedQuestions)
      }

      setIsEditing(false)
      setEditedQuestion(null)
    } catch (err) {
      console.error('Error saving question:', err)
      alert('Failed to save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteQuestion = async () => {
    if (!confirm('Are you sure you want to delete this question?')) return

    const questionToDelete = currentQuestion

    // Remove from local state immediately for better UX
    const updatedQuestions = questions.filter((_, index) => index !== currentIndex)
    setQuestions(updatedQuestions)

    if (currentIndex >= updatedQuestions.length && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }

    // Call API to delete from backend if it has an ID
    if (questionToDelete._id) {
      try {
        const response = await fetch(`http://localhost:8000/api/questions/${questionToDelete._id}`, {
          method: 'DELETE'
        })

        if (!response.ok) {
          throw new Error('Failed to delete question from database')
        }
      } catch (err) {
        console.error('Error deleting question:', err)
        alert('Question removed from view but may still exist in database. Please refresh.')
      }
    }
  }

  const handleFieldChange = (field: keyof Question, value: any) => {
    if (!editedQuestion) return
    setEditedQuestion({ ...editedQuestion, [field]: value })
  }

  const handleOptionChange = (index: number, text: string) => {
    if (!editedQuestion || !editedQuestion.options) return
    const newOptions = [...editedQuestion.options]
    newOptions[index] = { ...newOptions[index], text }
    setEditedQuestion({ ...editedQuestion, options: newOptions })
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'hard': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'mcq': return 'Multiple Choice'
      case 'fill_in_blank': return 'Fill in the Blank'
      case 'true_false': return 'True/False'
      default: return type
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading questions...</p>
        </div>
      </div>
    )
  }

  if (error || questions.length === 0) {
    return (
      <div className="px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <svg className="h-16 w-16 text-red-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">No Questions Found</h1>
          <p className="text-gray-600 mt-2">{error || 'No questions were generated for this document.'}</p>
          <Link href="/" className="mt-6 inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            Upload Another Document
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Review Generated Questions</h1>
          <Link href="/" className="text-primary-600 hover:text-primary-700">
            ← Back to Upload
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Progress indicator */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Question {currentIndex + 1} of {questions.length}</span>
              <span className="text-primary-600 font-medium">
                {Math.round(((currentIndex + 1) / questions.length) * 100)}% Complete
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Question header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {isEditing ? (
                <>
                  <select
                    value={editedQuestion?.difficulty || 'medium'}
                    onChange={(e) => handleFieldChange('difficulty', e.target.value)}
                    className={`px-3 py-1 rounded-full text-sm font-medium border-2 ${getDifficultyColor(editedQuestion?.difficulty || 'medium')}`}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {getTypeLabel(editedQuestion?.type || currentQuestion.type)}
                  </span>
                  <input
                    type="text"
                    value={editedQuestion?.topic || ''}
                    onChange={(e) => handleFieldChange('topic', e.target.value)}
                    placeholder="Topic"
                    className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 border-2 border-purple-300"
                  />
                </>
              ) : (
                <>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(currentQuestion.difficulty)}`}>
                    {currentQuestion.difficulty}
                  </span>
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {getTypeLabel(currentQuestion.type)}
                  </span>
                  {currentQuestion.topic && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                      {currentQuestion.topic}
                    </span>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <>
                  <button
                    onClick={handleEditClick}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={handleDeleteQuestion}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Question */}
          <div className="mb-8">
            {isEditing ? (
              <textarea
                value={editedQuestion?.question || ''}
                onChange={(e) => handleFieldChange('question', e.target.value)}
                className="w-full text-2xl font-bold text-gray-900 mb-6 p-3 border-2 border-blue-300 rounded-lg"
                rows={3}
              />
            ) : (
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {currentQuestion.question}
              </h2>
            )}

            {/* Options for MCQ */}
            {currentQuestion.type === 'mcq' && currentQuestion.options && (
              <div className="space-y-3">
                {(isEditing ? editedQuestion?.options : currentQuestion.options)?.map((option, index) => (
                  <div
                    key={option.label}
                    className={`p-4 rounded-lg border-2 ${
                      option.label === (isEditing ? editedQuestion?.correct_answer : currentQuestion.correct_answer)
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start">
                      <span className="font-bold text-lg text-gray-900 mr-3">{option.label}.</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={option.text}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          className="flex-1 text-gray-900 bg-white border-2 border-gray-300 rounded px-2 py-1"
                        />
                      ) : (
                        <span className="text-gray-900">{option.text}</span>
                      )}
                      {isEditing ? (
                        <input
                          type="radio"
                          name="correct_answer"
                          checked={option.label === editedQuestion?.correct_answer}
                          onChange={() => handleFieldChange('correct_answer', option.label)}
                          className="ml-auto flex-shrink-0 h-5 w-5"
                        />
                      ) : (
                        option.label === currentQuestion.correct_answer && (
                          <svg className="h-6 w-6 text-green-600 ml-auto flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Answer for other types */}
            {currentQuestion.type !== 'mcq' && (
              <div className="p-4 rounded-lg bg-green-50 border-2 border-green-500">
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 mr-2">Correct Answer:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedQuestion?.correct_answer || ''}
                      onChange={(e) => handleFieldChange('correct_answer', e.target.value)}
                      className="flex-1 text-gray-900 bg-white border-2 border-gray-300 rounded px-2 py-1"
                    />
                  ) : (
                    <span className="text-gray-900">{currentQuestion.correct_answer}</span>
                  )}
                  {!isEditing && (
                    <svg className="h-6 w-6 text-green-600 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Explanation */}
          <div className="mb-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
              <svg className="h-5 w-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Explanation
            </h3>
            {isEditing ? (
              <textarea
                value={editedQuestion?.explanation || ''}
                onChange={(e) => handleFieldChange('explanation', e.target.value)}
                className="w-full text-gray-700 p-3 border-2 border-blue-300 rounded-lg bg-white"
                rows={4}
              />
            ) : (
              <p className="text-gray-700">{currentQuestion.explanation}</p>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                currentIndex === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              ← Previous
            </button>

            <span className="text-gray-600">
              {currentIndex + 1} / {questions.length}
            </span>

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex(currentIndex + 1)}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
              >
                Next →
              </button>
            ) : (
              <Link
                href="/"
                className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors inline-block"
              >
                Upload Another Document
              </Link>
            )}
          </div>
        </div>

        {/* Summary card */}
        <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Question Bank Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-primary-600">{questions.length}</div>
              <div className="text-sm text-gray-600 mt-1">Total Questions</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">
                {questions.filter(q => q.difficulty === 'easy').length}
              </div>
              <div className="text-sm text-gray-600 mt-1">Easy</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-yellow-600">
                {questions.filter(q => q.difficulty === 'medium').length}
              </div>
              <div className="text-sm text-gray-600 mt-1">Medium</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-red-600">
                {questions.filter(q => q.difficulty === 'hard').length}
              </div>
              <div className="text-sm text-gray-600 mt-1">Hard</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
