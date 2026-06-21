export interface User {
  id: string
  name: string
  email: string
  role: 'client' | 'admin' | 'staff'
  profile?: {
    phone?: string
    country?: string
    avatar?: string
  }
  settings?: {
    notifications: boolean
    language: string
  }
}

export interface TimelineEvent {
  date: string
  event: string
  status: 'completed' | 'active' | 'pending'
}

export interface Case {
  id: string
  userId: string
  country: string
  service: 'study' | 'work' | 'visit' | 'immigration' | 'eu-employment' | 'conference'
  status: 'pending' | 'in_progress' | 'completed' | 'rejected'
  timeline: TimelineEvent[]
  createdAt: string
  updatedAt: string
}

export interface Document {
  id: string
  caseId: string
  name: string
  fileUrl: string
  verified: boolean
  uploadedAt: string
}

export interface Payment {
  id: string
  userId: string
  caseId?: string
  amount: number
  currency: string
  status: 'pending' | 'paid' | 'failed'
  reference: string
  createdAt: string
}

export interface Message {
  id: string
  userId: string
  content: string
  role: 'user' | 'noria'
  timestamp: string
  sources?: string[]
}

export interface ApiResponse<T> {
  data: T
  error?: string
  status: number
}

export interface NoriaResponse {
  answer: string
  sources?: string[]
  caseContext?: Partial<Case>
}
