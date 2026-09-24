export type WebVitalMetric = "LCP" | "FID" | "CLS" | "TTFB" | "INP" | "FCP";

export interface PerformanceMetric {
  name: WebVitalMetric;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  timestamp: number;
  url: string;
}

export interface PerformanceBudget {
  name: WebVitalMetric;
  good: number;
  poor: number;
}

export interface PerformanceReportEntry {
  id: string;
  metrics: PerformanceMetric[];
  timestamp: number;
  url: string;
  userAgent: string;
}

export interface PerformanceAlert {
  metric: WebVitalMetric;
  value: number;
  threshold: number;
  timestamp: number;
  url: string;
}
