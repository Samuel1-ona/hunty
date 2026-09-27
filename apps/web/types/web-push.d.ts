/**
 * Type declarations for the `web-push` package.
 * Replace with @types/web-push once installed.
 */
declare module "web-push" {
  export interface VapidKeys {
    publicKey: string
    privateKey: string
  }

  /** The shape web-push expects for a push subscription endpoint. */
  export interface PushSubscription {
    endpoint: string
    keys?: {
      p256dh: string
      auth: string
    }
  }

  export interface RequestDetails {
    method: string
    headers: Record<string, string>
    endpoint: string
    body?: Buffer | null
  }

  export interface SendResult {
    statusCode: number
    body: string
    headers: Record<string, string>
  }

  export class WebPushError extends Error {
    statusCode: number
    headers: Record<string, string>
    body: string
    endpoint: string
  }

  export interface SendOptions {
    gcmAPIKey?: string
    vapidDetails?: { subject: string; publicKey: string; privateKey: string }
    TTL?: number
    headers?: Record<string, string>
    contentEncoding?: string
    proxy?: string
    agent?: unknown
    timeout?: number
  }

  export function generateVAPIDKeys(): VapidKeys
  export function setVapidDetails(subject: string, publicKey: string, privateKey: string): void
  export function setGCMAPIKey(apiKey: string): void
  export function sendNotification(
    pushSubscription: PushSubscription,
    payload?: string | Buffer | null,
    options?: SendOptions
  ): Promise<SendResult>
  export function generateRequestDetails(
    pushSubscription: PushSubscription,
    payload?: string | Buffer | null,
    options?: Record<string, unknown>
  ): Promise<RequestDetails>

  // Default export mirrors all named exports so callers can use either style.
  const webpush: {
    PushSubscription: PushSubscription
    WebPushError: typeof WebPushError
    generateVAPIDKeys: typeof generateVAPIDKeys
    setVapidDetails: typeof setVapidDetails
    setGCMAPIKey: typeof setGCMAPIKey
    sendNotification: typeof sendNotification
    generateRequestDetails: typeof generateRequestDetails
  }
  export default webpush
}
