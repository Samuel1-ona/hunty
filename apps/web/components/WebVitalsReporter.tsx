'use client';

import { useEffect, useRef } from 'react';

import { logger } from '@/lib/logger';
import { observeWebVitals, reportPerformanceMetric } from '@/lib/web-vitals';

export function WebVitalsReporter() {
  const reported = useRef(new Set<string>());

  useEffect(() => {
    const unsubscribe = observeWebVitals((metric) => {
      const key = `${metric.name}:${metric.value}`;
      if (reported.current.has(key)) return;
      reported.current.add(key);

      logger.info(`[Web Vitals] ${metric.name}: ${metric.value} (${metric.rating})`);

      reportPerformanceMetric(metric);
    });

    return unsubscribe;
  }, []);

  return null;
}
