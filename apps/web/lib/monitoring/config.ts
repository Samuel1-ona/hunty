export const MONITORING = {
  enabled: process.env.MONITORING_ENABLED !== "false",

  health: {
    checkIntervalMs: 60_000,
    timeoutMs: 5_000,
    expectedDependencies: ["soroban-rpc", "ipfs-gateway", "email-service"] as const,
  },

  alerts: {
    errorRateThreshold: 0.05,
    p95ResponseTimeMs: 2000,
    uptimeSlackMinutes: 5,
    cooldownMinutes: 15,
    channels: {
      email: {
        enabled: process.env.ALERT_EMAIL_ENABLED === "true",
        to: process.env.ALERT_EMAIL_TO || "",
        from: process.env.ALERT_EMAIL_FROM || "monitoring@hunty.app",
      },
      slack: {
        enabled: process.env.ALERT_SLACK_ENABLED === "true",
        webhookUrl: process.env.ALERT_SLACK_WEBHOOK_URL || "",
      },
      discord: {
        enabled: process.env.ALERT_DISCORD_ENABLED === "true",
        webhookUrl: process.env.ALERT_DISCORD_WEBHOOK_URL || "",
      },
    },
  },

  apis: {
    slowRequestThresholdMs: 1000,
    errorSampleRate: 1.0,
    trackedRoutes: [
      "/api/v1/hunts",
      "/api/v1/hunts/[id]",
      "/api/v1/hunts/[id]/leaderboard",
      "/api/admin/featured",
      "/api/admin/featured/rotate",
      "/api/analytics/hunt-view",
      "/api/ipfs",
      "/api/notifications/complete",
    ],
  },

  webVitals: {
    endpoint: process.env.WEB_VITALS_ENDPOINT || "",
    sampleRate: parseFloat(process.env.WEB_VITALS_SAMPLE_RATE || "0.1"),
  },
} as const

export type MonitoringConfig = typeof MONITORING
