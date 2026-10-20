export interface MonitorApp {
  appId: string
  projectName: string
  events: number
  lastSeen: number
}

export interface TimelinePoint {
  bucket: number
  pageViews: number
  errors: number
}

export interface Vital {
  metric: string
  samples: number
  p75: number
  good: number
  needsImprovement: number
  poor: number
}

export interface ErrorType {
  type: string
  count: number
}

export interface Issue {
  fingerprint: string
  message: string
  type: string
  count: number
  affectedSessions: number
  lastSeen: number
}

export interface RouteStat {
  route: string
  pageViews: number
  visitors: number
}

export interface MonitorEvent {
  eventId: string
  eventType: string
  timestamp: number
  route: string
  label: string
  detail: string
}

export interface MonitorEventPage {
  events: MonitorEvent[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export type EventCategory = 'error' | 'behavior' | 'performance'

export interface MonitorEventDetail {
  appId: string
  eventId: string
  category: EventCategory
  event: Record<string, unknown>
}

export interface SymbolicatedFrame {
  raw: string
  label: string
  status: string
  generated?: { filename: string; line: number; column: number }
  original?: { source: string; line: number; column: number; name?: string }
  context?: { start_line: number; lines: string[] }
}

export interface SymbolicationResult {
  event_id: string
  app_id: string
  release: string
  status: 'mapped' | 'partial' | 'unmapped'
  reason?: string
  stack: string
  frames: SymbolicatedFrame[]
}

export interface Overview {
  appId: string
  from: number
  to: number
  hours: number
  summary: {
    pageViews: number
    visitors: number
    sessions: number
    errors: number
    stabilityIssues: number
    requests: number
    failedRequests: number
  }
  timeline: TimelinePoint[]
  vitals: Vital[]
  errorTypes: ErrorType[]
  issues: Issue[]
  routes: RouteStat[]
  recentEvents: MonitorEvent[]
}

export type ViewKey = 'overview' | 'errors' | 'performance' | 'behavior' | 'events'
export type RoleKey = 'engineering' | 'product'
export type DataSourceMode = 'demo' | 'live'
export type EventTypeKey =
  | 'error'
  | 'stability'
  | 'performance'
  | 'request'
  | 'resource'
  | 'behavior'
export type EventTypeFilter = EventTypeKey | 'all'
