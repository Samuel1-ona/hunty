# Soroban / Stellar Integration

This directory provides the frontend layer for interacting with Stellar/Soroban smart contracts. It wraps the `@stellar/stellar-sdk` (previously `soroban-client`) and provides React hooks, RPC helpers, and retry logic used across the web app.

## Module Overview

| File | Purpose |
|------|---------|
| `client.ts` | Creates and configures the Soroban RPC `Server` instance, reads network settings from environment variables |
| `SorobanContext.tsx` | React context provider and `useSoroban()` hook for accessing the Server and connection state |
| `rpcRetry.ts` | Exponential-backoff retry wrapper for Soroban RPC calls with timeout and jitter support |

---

## Environment Variables

Both `client.ts` and `SorobanContext.tsx` read from these environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_SOROBAN_RPC_URL` | `https://rpc.futurenet.stellar.org` | Soroban RPC endpoint |
| `NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE` | `Test SDF Future Network ; October 2022` | Network passphrase for signing |

---

## `client.ts` — Server Factory

### `createSorobanServer(): Server`

Creates a new Soroban RPC `Server` instance pointing at the configured RPC URL. The returned `Server` object uses the same API as the deprecated `soroban-client` and is re-exported from `@stellar/stellar-sdk`.

```ts
import { createSorobanServer } from "@/lib/soroban/client"

const server = createSorobanServer()
const health = await server.getHealth()
```

**Returns:** A `Server` instance from `@stellar/stellar-sdk`. The type is cast as `any` due to SDK import patterns.

### `getSorobanNetworkPassphrase(): string`

Returns the configured network passphrase. Used when building Stellar transactions that need to be signed for the correct network (Futurenet / Testnet / Mainnet).

```ts
import { getSorobanNetworkPassphrase } from "@/lib/soroban/client"

const passphrase = getSorobanNetworkPassphrase()
// "Test SDF Future Network ; October 2022"
```

### `getSorobanRpcUrl(): string`

Returns the currently configured RPC URL string. Useful for debugging or displaying connection info in UI.

### Constants

- `DEFAULT_RPC_URL` — `"https://rpc.futurenet.stellar.org"`
- `DEFAULT_NETWORK_PASSPHRASE` — `"Test SDF Future Network ; October 2022"`

---

## `SorobanContext.tsx` — React Provider

Wraps the application (or a subtree) with a Soroban RPC connection. On mount it runs a health check against the RPC endpoint and exposes connection state.

### `SorobanProvider`

Wrap your component tree to provide Soroban connectivity:

```tsx
import { SorobanProvider } from "@/lib/soroban/SorobanContext"

function App() {
  return (
    <SorobanProvider>
      <MainContent />
    </SorobanProvider>
  )
}
```

### `useSoroban(): SorobanContextValue`

React hook that returns the current Soroban context. Must be called within a `SorobanProvider`.

**Returns `SorobanContextValue`:**

| Property | Type | Description |
|----------|------|-------------|
| `server` | `Server \| null` | The Soroban RPC Server instance. `null` before connection test completes |
| `networkPassphrase` | `string` | Resolved network passphrase from env |
| `rpcUrl` | `string` | Resolved RPC URL from env |
| `connectionStatus` | `SorobanConnectionStatus` | Current connection state: `"idle"` \| `"connecting"` \| `"connected"` \| `"error"` |
| `connectionError` | `Error \| null` | Set when `connectionStatus` is `"error"` |
| `reconnect` | `() => Promise<void>` | Manually re-trigger the RPC health check |

**Usage:**

```tsx
function MyComponent() {
  const { server, networkPassphrase, connectionStatus, connectionError, reconnect } = useSoroban()

  if (connectionStatus === "connecting") return <div>Connecting to Stellar...</div>
  if (connectionStatus === "error") return <div>Error: {connectionError?.message}</div>
  if (!server) return null

  return <div>Connected to {networkPassphrase}</div>
}
```

### `SorobanConnectionStatus`

Union type: `"idle" | "connecting" | "connected" | "error"`

### Lifecycle

1. On mount, `SorobanProvider` creates a `Server` instance via `createSorobanServer()`.
2. It immediately calls `server.getHealth()` and sets `connectionStatus` to `"connecting"`.
3. If the response's `status` is `"healthy"`, status becomes `"connected"`.
4. Otherwise, status becomes `"error"` with a descriptive error message.
5. Calling `reconnect()` repeats the health check from scratch.

---

## `rpcRetry.ts` — Resilient RPC Calls

Provides a retry wrapper that handles transient Soroban RPC failures (network timeouts, rate limits, server errors) with exponential backoff, jitter, and `Retry-After` header support.

### `withSorobanRpcRetry<T>(operation, options?): Promise<T>`

Wraps an async Soroban operation so it automatically retries on retryable failures.

```ts
import { withSorobanRpcRetry } from "@/lib/soroban/rpcRetry"

const result = await withSorobanRpcRetry(
  () => server.callContract(contractId, method, args),
  { maxAttempts: 3, timeoutMs: 10000 }
)
```

**Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `operation` | `() => Promise<T>` | — | The async RPC call to execute |
| `options.maxAttempts` | `number` | `4` | Maximum retry attempts (including the initial call) |
| `options.initialDelayMs` | `number` | `800` | Delay before first retry in ms |
| `options.maxDelayMs` | `number` | `12000` | Cap for backoff delay in ms |
| `options.backoffMultiplier` | `number` | `2` | Delay multiplier per attempt |
| `options.jitterRatio` | `number` | `0.2` | Random jitter as fraction of current delay |
| `options.timeoutMs` | `number` | `15000` | Per-attempt timeout in ms |

**Retryable errors:**

The wrapper considers these errors retryable:
- HTTP status codes: `408`, `409`, `425`, `429`, `500`, `502`, `503`, `504`
- Messages matching patterns like: `timeout`, `socket hang up`, `ECONNRESET`, `ECONNREFUSED`, `ENOTFOUND`, `too many requests`, `rate limit`, `fetch failed`

**Behavior:**

1. Executes the operation with a per-attempt timeout.
2. On success, returns the result immediately.
3. On failure, checks if the error is retryable and if attempts remain.
4. Respects `Retry-After` response headers when present.
5. Adds random jitter to prevent thundering herd on shared RPC endpoints.
6. After exhausting all attempts, throws the last error wrapped as `"Soroban RPC request failed"`.

---

## Smart Contract Interaction Pattern

The frontend interacts with Soroban smart contracts through a standard pattern:

1. **Get the Server** — Use `useSoroban()` or call `createSorobanServer()` to obtain a connected `Server` instance.
2. **Build the Contract call** — Construct a `new Contract(contractId).call(method, ...args)` invocation.
3. **Simulate** — Call `server.simulateContract(operation)` to dry-run and validate.
4. **Send with retry** — Wrap `server.sendTransaction(...)` or `server.callContract(...)` with `withSorobanRpcRetry` to handle transient failures.
5. **Await receipt** — Use `server.getTransaction(hash)` to poll until the transaction is confirmed.

```tsx
import { useSoroban } from "@/lib/soroban/SorobanContext"
import { withSorobanRpcRetry } from "@/lib/soroban/rpcRetry"
import { SorobanRpc, Contract } from "@stellar/stellar-sdk"

function HuntActions({ contractId }: { contractId: string }) {
  const { server } = useSoroban()

  const registerPlayer = async (huntId: number) => {
    if (!server) throw new Error("Soroban not connected")

    const contract = new Contract(contractId)
    const operation = contract.call("register_player", new SorobanRpc.Int128(huntId))

    const result = await withSorobanRpcRetry(
      () => server.callContract(contractId, "register_player", [new SorobanRpc.Int128(huntId)]),
      { maxAttempts: 3 }
    )

    return result
  }

  return { registerPlayer }
}
```

---

## Web vs Mobile

| Layer | Web | Mobile |
|-------|-----|--------|
| RPC Server | `createSorobanServer()` via `SorobanContext.tsx` | Direct import of `client.ts` |
| Connection state | `useSoroban()` hook | `SorobanContext.tsx` can be wrapped in Expo |
| Retry logic | `withSorobanRpcRetry()` | Same function — pure async, no DOM dependency |
| Transaction feedback | `TxToaster` (sonner) | `ToastProvider` with Reanimated popups |

Both platforms share the same `client.ts` and `rpcRetry.ts` modules. Only the React context layer (`SorobanContext.tsx`) is web-specific in its current form but can be adapted for React Native.
```
