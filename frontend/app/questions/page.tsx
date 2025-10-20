'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface QuestionFile {
  fileId: string
  filename: string
  questionCount: number
  uploadTime: string
}

interface Question {
  type: string
  question: string
  options?: Array<{ label: string; text: string }>
  correct_answer: string
  explanation: string
  difficulty: string
  topic?: string
}

export default function QuestionBankPage() {
  const [files, setFiles] = useState<QuestionFile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all')

  useEffect(() => {
    loadFiles()
  }, [])

  const loadFiles = async () => {
    try {
      // Get all files from MongoDB
      const response = await fetch('http://localhost:8000/api/upload/files')
      if (response.ok) {
        const data = await response.json()
        setFiles(data)
      }
    } catch (error) {
      console.error('Error loading files:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadQuestions = async (fileId: string, filename: string) => {
    try {
      const response = await fetch(`http://localhost:8000/generated_questions/${fileId}.json`)
      if (response.ok) {
        const data = await response.json()
        setQuestions(data.questions || [])
        setSelectedFile(filename)
        setSelectedFileId(fileId)
      }
    } catch (error) {
      console.error('Error loading questions:', error)
      setQuestions([])
    }
  }

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         q.explanation.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (q.topic && q.topic.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesDifficulty = difficultyFilter === 'all' || q.difficulty === difficultyFilter
    return matchesSearch && matchesDifficulty
  })

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
      case 'mcq': return 'MCQ'
      case 'fill_in_blank': return 'Fill-in-Blank'
      case 'true_false': return 'True/False'
      default: return type
    }
  }

  const stats = {
    total: questions.length,
    easy: questions.filter(q => q.difficulty === 'easy').length,
    medium: questions.filter(q => q.difficulty === 'medium').length,
    hard: questions.filter(q => q.difficulty === 'hard').length,
    mcq: questions.filter(q => q.type === 'mcq').length,
    fillBlank: questions.filter(q => q.type === 'fill_in_blank').length,
    trueFalse: questions.filter(q => q.type === 'true_false').length,
  }

  if (loading) {
    return (
      <div className="px-4 py-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading question bank...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Question Bank</h1>
          <p className="text-gray-600">Browse and manage all your generated questions</p>
        </div>

        {!selectedFile ? (
          /* File selection view */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {files.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">No documents yet</h3>
                <p className="mt-2 text-gray-500">Upload a PDF to start generating questions</p>
                <Link
                  href="/"
                  className="mt-6 inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Upload Document
                </Link>
              </div>
            ) : (
              files.map((file) => (
                <div
                  key={file.fileId}
                  onClick={() => loadQuestions(file.fileId, file.filename)}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow cursor-pointer border-2 border-transparent hover:border-primary-500"
                >
                  <div className="flex items-start justify-between mb-4">
                    <svg className="h-12 w-12 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate" title={file.filename}>
                    {file.filename}
                  </h3>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 font-medium">
                      {file.questionCount} questions
                    </span>
                    <span className="text-gray-600">
                      {new Date(file.uploadTime * 1000).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Questions view */
          <div>
            <div className="mb-6 flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedFile(null)
                  setSelectedFileId(null)
                  setQuestions([])
                  setSearchTerm('')
                  setDifficultyFilter('all')
                }}
                className="text-primary-600 hover:text-primary-700 flex items-center"
              >
                <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Documents
              </button>
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold text-gray-900">{selectedFile}</h2>
                {selectedFileId && (
                  <Link
                    href={`/review/${selectedFileId}`}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Questions
                  </Link>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-4 text-center">
                <div className="text-3xl font-bold text-primary-600">{stats.total}</div>
                <div className="text-sm text-gray-600 mt-1">Total</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 text-center">
                <div className="text-3xl font-bold text-green-600">{stats.easy}</div>
                <div className="text-sm text-gray-600 mt-1">Easy</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 text-center">
                <div className="text-3xl font-bold text-yellow-600">{stats.medium}</div>
                <div className="text-sm text-gray-600 mt-1">Medium</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 text-center">
                <div className="text-3xl font-bold text-red-600">{stats.hard}</div>
                <div className="text-sm text-gray-600 mt-1">Hard</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">{stats.mcq}</div>
                <div className="text-sm text-gray-600 mt-1">MCQ</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 text-center">
                <div className="text-3xl font-bold text-purple-600">{stats.fillBlank}</div>
                <div className="text-sm text-gray-600 mt-1">Fill-in</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 text-center">
                <div className="text-3xl font-bold text-indigo-600">{stats.trueFalse}</div>
                <div className="text-sm text-gray-600 mt-1">T/F</div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search questions, topics, or explanations..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                  <select
                    value={difficultyFilter}
                    onChange={(e) => setDifficultyFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="all">All Difficulties</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-4">
              {filteredQuestions.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                  <p className="text-gray-500">No questions found matching your filters</p>
                </div>
              ) : (
                filteredQuestions.map((question, index) => (
                  <div key={index} className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
                          {question.difficulty}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {getTypeLabel(question.type)}
                        </span>
                        {question.topic && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {question.topic}
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">#{index + 1}</span>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{question.question}</h3>

                    {question.type === 'mcq' && question.options && (
                      <div className="space-y-2 mb-4">
                        {question.options.map((option) => (
                          <div
                            key={option.label}
                            className={`p-3 rounded-lg ${
                              option.label === question.correct_answer
                                ? 'bg-green-50 border-2 border-green-500'
                                : 'bg-gray-50 border border-gray-200'
                            }`}
                          >
                            <span className="font-semibold text-gray-900 mr-2">{option.label}.</span>
                            <span className="text-gray-900">{option.text}</span>
                            {option.label === question.correct_answer && (
                              <span className="ml-2 text-green-600 font-medium">✓ Correct</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {question.type !== 'mcq' && (
                      <div className="mb-4 p-3 bg-green-50 border-2 border-green-500 rounded-lg">
                        <span className="font-semibold text-gray-700">Correct Answer: </span>
                        <span className="text-gray-900">{question.correct_answer}</span>
                      </div>
                    )}

                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-start">
                        <svg className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <div className="font-semibold text-gray-900 mb-1">Explanation</div>
                          <p className="text-gray-700">{question.explanation}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {filteredQuestions.length > 0 && (
              <div className="mt-6 text-center text-sm text-gray-500">
                Showing {filteredQuestions.length} of {questions.length} questions
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
