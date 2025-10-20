import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface UploadResponse {
  file_id: string;
  filename: string;
  status: string;
  message: string;
  upload_time: string;
}

export interface Question {
  _id?: string;
  type: 'mcq' | 'fill_in_blank' | 'true_false';
  question: string;
  options?: Array<{ label: string; text: string }>;
  correct_answer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic?: string;
  file_id?: string;
}

export interface ProcessingStatus {
  file_id: string;
  filename: string;
  status: string;
  progress: string;
  error?: string;
}

export interface GeneratedQuestionsResponse {
  file_id: string;
  questions: Question[];
  total_count: number;
  status: string;
}

// API Functions
export const uploadPDF = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<UploadResponse>('/api/upload/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

export const getProcessingStatus = async (fileId: string): Promise<ProcessingStatus> => {
  const response = await api.get<ProcessingStatus>(`/api/process/status/${fileId}`);
  return response.data;
};

export const runFullPipeline = async (fileId: string) => {
  const response = await api.post(`/api/process/full-pipeline/${fileId}`);
  return response.data;
};

export const getGeneratedQuestions = async (fileId: string): Promise<GeneratedQuestionsResponse> => {
  const response = await api.get<GeneratedQuestionsResponse>(`/api/process/questions/${fileId}`);
  return response.data;
};

export const saveQuestions = async (fileId: string, questions: Question[]) => {
  const response = await api.post('/api/questions/save', {
    file_id: fileId,
    questions,
  });
  return response.data;
};

export const getQuestions = async (params?: {
  skip?: number;
  limit?: number;
  question_type?: string;
  difficulty?: string;
  topic?: string;
}): Promise<Question[]> => {
  const response = await api.get<Question[]>('/api/questions/', { params });
  return response.data;
};

export const updateQuestion = async (questionId: string, updates: Partial<Question>) => {
  const response = await api.put(`/api/questions/${questionId}`, updates);
  return response.data;
};

export const deleteQuestion = async (questionId: string) => {
  const response = await api.delete(`/api/questions/${questionId}`);
  return response.data;
};
