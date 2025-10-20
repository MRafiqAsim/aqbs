'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getProcessingStatus, runFullPipeline } from '@/lib/api'

export default function ProcessPage() {
  const params = useParams()
  const router = useRouter()
  const fileId = params.fileId as string

  const [status, setStatus] = useState<string>('uploaded')
  const [progress, setProgress] = useState<string>('Initializing...')
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [questionCount, setQuestionCount] = useState<number>(0)
  const [progressPercentage, setProgressPercentage] = useState<number>(10)

  useEffect(() => {
    if (!fileId) return

    const startProcessing = async () => {
      setIsProcessing(true)
      try {
        // Start the pipeline
        await runFullPipeline(fileId)

        // Poll for status
        const pollInterval = setInterval(async () => {
          try {
            const statusData = await getProcessingStatus(fileId)
            setStatus(statusData.status)
            setProgress(statusData.progress)

            // Calculate progress percentage based on status and progress message
            let percentage = 10
            if (statusData.status === 'uploaded') {
              percentage = 10
            } else if (statusData.status === 'extracting') {
              percentage = 30
            } else if (statusData.status === 'extracted') {
              percentage = 50
            } else if (statusData.status === 'generating') {
              // Extract percentage from progress message if available
              const match = statusData.progress.match(/\((\d+)%\)/)
              if (match) {
                const genProgress = parseInt(match[1])
                // Map 0-100% of generation to 50-95% overall
                percentage = 50 + (genProgress * 0.45)
              } else {
                percentage = 70
              }
            } else if (statusData.status === 'ready') {
              percentage = 100
            }
            setProgressPercentage(percentage)

            // Try to get question count during generation
            if (statusData.status === 'generating') {
              try {
                const response = await fetch(`http://localhost:8000/generated_questions/${fileId}.json`)
                if (response.ok) {
                  const data = await response.json()
                  setQuestionCount(data.questions?.length || 0)
                }
              } catch {
                // Ignore errors - file might not exist yet
              }
            }

            if (statusData.status === 'ready') {
              clearInterval(pollInterval)
              // Redirect to review page after a short delay
              setTimeout(() => {
                router.push(`/review/${fileId}`)
              }, 1500)
            } else if (statusData.status === 'failed') {
              clearInterval(pollInterval)
              setError(statusData.error || 'Processing failed')
              setIsProcessing(false)
            }
          } catch (err: any) {
            console.error('Status check error:', err)
          }
        }, 2000) // Poll every 2 seconds for faster updates

        return () => clearInterval(pollInterval)
      } catch (err: any) {
        console.error('Pipeline error:', err)
        setError(err.response?.data?.detail || 'Failed to start processing')
        setIsProcessing(false)
      }
    }

    startProcessing()
  }, [fileId, router])

  const getStatusIcon = () => {
    if (error) {
      return (
        <svg className="h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )
    }

    if (status === 'ready') {
      return (
        <svg className="h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )
    }

    return (
      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600"></div>
    )
  }

  return (
    <div className="px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              {getStatusIcon()}
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {error ? 'Processing Failed' : status === 'ready' ? 'Processing Complete!' : 'Processing Document'}
            </h1>

            <p className="text-lg text-gray-600 mb-4">
              {error || progress}
            </p>

            {status === 'generating' && questionCount > 0 && (
              <div className="mb-6 text-center">
                <p className="text-2xl font-bold text-primary-600 animate-pulse">
                  {questionCount} questions generated so far...
                </p>
              </div>
            )}

            {!error && status !== 'ready' && (
              <div className="space-y-6">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-primary-600 h-2.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${progressPercentage}%`
                    }}
                  ></div>
                </div>
                <div className="text-center text-sm text-gray-600">
                  {Math.round(progressPercentage)}% Complete
                </div>

                <div className="grid grid-cols-1 gap-4 text-left">
                  <div className={`p-4 rounded-lg ${status === 'uploaded' || status === 'extracting' || status === 'extracted' || status === 'generating' || status === 'ready' ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                    <div className="flex items-center">
                      {(status === 'uploaded' || status === 'extracting' || status === 'extracted' || status === 'generating' || status === 'ready') ? (
                        <svg className="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <div className="h-5 w-5 border-2 border-gray-300 rounded-full mr-3"></div>
                      )}
                      <span className="font-medium">File Uploaded</span>
                    </div>
                  </div>

                  <div className={`p-4 rounded-lg ${status === 'extracting' || status === 'extracted' || status === 'generating' || status === 'ready' ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                    <div className="flex items-center">
                      {(status === 'extracted' || status === 'generating' || status === 'ready') ? (
                        <svg className="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : status === 'extracting' ? (
                        <div className="animate-spin h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full mr-3"></div>
                      ) : (
                        <div className="h-5 w-5 border-2 border-gray-300 rounded-full mr-3"></div>
                      )}
                      <span className="font-medium">Extracting Text</span>
                    </div>
                  </div>

                  <div className={`p-4 rounded-lg ${status === 'generating' || status === 'ready' ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                    <div className="flex items-center">
                      {status === 'ready' ? (
                        <svg className="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : status === 'generating' ? (
                        <div className="animate-spin h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full mr-3"></div>
                      ) : (
                        <div className="h-5 w-5 border-2 border-gray-300 rounded-full mr-3"></div>
                      )}
                      <span className="font-medium">Generating Questions</span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-500 mt-6">
                  This may take 1-3 minutes depending on document size...
                </p>
              </div>
            )}

            {error && (
              <div className="mt-6">
                <button
                  onClick={() => router.push('/')}
                  className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Try Another Document
                </button>
              </div>
            )}

            {status === 'ready' && (
              <p className="text-sm text-gray-500 mt-4">
                Redirecting to review page...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
