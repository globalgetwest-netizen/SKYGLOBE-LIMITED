export type { Case, TimelineEvent, Document } from './index'

export type CaseStatus = 'pending' | 'in_progress' | 'completed' | 'rejected'

export type ServiceType =
  | 'study_abroad'
  | 'visit_visa'
  | 'work_permit'
  | 'eu_employment'
  | 'immigration'
  | 'conference'

export interface CaseFilter {
  status?: CaseStatus
  service?: ServiceType
  country?: string
  dateFrom?: string
  dateTo?: string
}

export interface CaseCreateInput {
  country: string
  service: ServiceType
  documents?: string[]
  notes?: string
}
