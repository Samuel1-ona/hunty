export type HealthStatus = "healthy" | "degraded" | "unhealthy"

export interface HealthCheckResult {
  status: HealthStatus
  timestamp: string
  uptime: number
  dependencies: DependencyStatus[]
  version: string
}

export interface DependencyStatus {
  name: string
  status: HealthStatus
  latencyMs: number
  error?: string
}

export interface ApiMetric {
  route: string
  method: string
  statusCode: number
  durationMs: number
  timestamp: string
  error?: string
}

export interface AlertEvent {
  id: string
  level: "critical" | "warning" | "info"
  title: string
  message: string
  source: string
  timestamp: string
  metadata?: Record<string, unknown>
}

export type AlertChannel = "email" | "slack" | "discord"

export interface WebVitalMetric {
  name: string
  value: number
  rating: "good" | "needs-improvement" | "poor"
  delta: number
  id: string
  url: string
}

export interface AlertChannelConfig {
  enabled: boolean
  send: (event: AlertEvent) => Promise<boolean>
}

export interface MonitoringStore {
  metrics: ApiMetric[]
  alerts: AlertEvent[]
  healthHistory: HealthCheckResult[]
}
