# Soroban / Stellar Integration

This directory provides the frontend layer for interacting with Stellar/Soroban smart contracts. It wraps the `@stellar/stellar-sdk` (previously `soroban-client`) and provides React hooks, RPC helpers, retry logic, and type-safe contract interaction helpers used across the web app.

## Module Overview

| File | Purpose |
|------|---------|
| `client.ts` | Creates and configures the Soroban RPC `Server` instance, reads network settings from environment variables |
| `SorobanContext.tsx` | React context provider and `useSoroban()` hook for accessing the Server and connection state |
| `rpcRetry.ts` | Exponential-backoff retry wrapper for Soroban RPC calls with timeout and jitter support |
| `contractHelpers.ts` | **NEW** Type-safe helpers for contract interactions: write/read wrappers, gas estimation, transaction simulation, retry logic |

---

## Contract Interaction Helpers (`contractHelpers.ts`)

The `contractHelpers.ts` module provides a comprehensive set of utilities for interacting with Soroban smart contracts. All helpers include automatic error handling, retry logic, and type safety.

### Key Features

✅ **Type-safe wrappers** for contract reads and writes
✅ **Automatic gas estimation** before transaction submission
✅ **Transaction simulation** to validate before submission
✅ **Typed return values** from contract reads with custom parsers
✅ **Built-in retry logic** for transient RPC failures
✅ **Error normalization** using `parseStellarError`

### `writeContract(config)`

Executes a contract write operation with automatic gas estimation, simulation, and retry logic.

```ts
import { writeContract } from "@/lib/soroban/contractHelpers"
import { getActiveWalletAdapter } from "@/lib/walletAdapter"

const result = await writeContract({
  contractId: "CCONTRACT...",
  method: "register_player",
  args: [huntId, playerAddress],
  wallet: getActiveWalletAdapter(),
})

console.log(`Transaction submitted: ${result.txHash}`)
console.log(`Gas cost: ${result.gasEstimate} stroops`)
```

**Configuration:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `contractId` | `string` | ✓ | Contract address on Stellar network |
| `method` | `string` | ✓ | Method name to invoke |
| `args` | `unknown[]` | | Method arguments (Soroban-compatible types) |
| `wallet` | `ActiveWalletAdapter` | ✓ | Wallet adapter for signing |
| `fee` | `string` | | Custom fee in stroops (auto-estimated if omitted) |
| `timeout` | `number` | | Transaction timeout in seconds (default: 180) |
| `memo` | `string` | | Optional transaction memo |

**Returns:**

```ts
{
  txHash: string          // Transaction hash
  gasEstimate: number     // Estimated gas cost in stroops
  simulationStatus: string // Status from simulation
  raw?: unknown           // Raw RPC response
}
```

### `readContract<T>(config)`

Reads data from a contract with automatic retry logic and type-safe parsing.

```ts
import { readContract } from "@/lib/soroban/contractHelpers"

type PlayerProgress = {
  hunt_id: number
  player: string
  current_clue_index: number
  completed: boolean
}

const result = await readContract<PlayerProgress>({
  contractId: "CCONTRACT...",
  method: "get_player_progress",
  args: [huntId, playerAddress],
  parser: (raw) => ({
    hunt_id: raw.hunt_id,
    player: raw.player,
    current_clue_index: raw.current_clue_index,
    completed: raw.completed,
  }),
})

console.log(`Player completed: ${result.data.completed}`)
```

**Configuration:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `contractId` | `string` | ✓ | Contract address on Stellar network |
| `method` | `string` | ✓ | Method name to call |
| `args` | `unknown[]` | | Method arguments |
| `parser` | `<T>(raw: unknown) => T` | | Optional parser to transform the raw response |

### `estimateGas(server, transaction)`

Estimates gas cost for a transaction before submission.

```ts
import { estimateGas } from "@/lib/soroban/contractHelpers"

const estimation = await estimateGas(server, transaction)

console.log(`Estimated fee: ${estimation.fee} stroops`)
console.log(`CPU instructions: ${estimation.cpuInstructions}`)
console.log(`Memory bytes: ${estimation.memoryBytes}`)
```

### `simulateTransaction(server, transaction)`

Simulates a transaction to validate it will succeed before submission.

```ts
import { simulateTransaction } from "@/lib/soroban/contractHelpers"

const simulation = await simulateTransaction(server, transaction)

if (simulation.success) {
  console.log("Simulation successful!")
  console.log(`Cost: ${simulation.cost?.cpuInsns} CPU instructions`)
} else {
  console.error(`Simulation failed: ${simulation.error}`)
}
```

### `pollTransactionStatus(txHash, options?)`

Polls for transaction confirmation on the network.

```ts
import { pollTransactionStatus } from "@/lib/soroban/contractHelpers"

const confirmed = await pollTransactionStatus(txHash, {
  maxAttempts: 15,
  pollInterval: 2000,
  onPoll: (attempt) => console.log(`Polling attempt ${attempt}`),
})

console.log("Transaction confirmed!")
```

### `writeContractAndWait(config, pollOptions?)`

Convenience function that writes a contract and waits for confirmation in one call.

```ts
import { writeContractAndWait } from "@/lib/soroban/contractHelpers"

const result = await writeContractAndWait({
  contractId: "CCONTRACT...",
  method: "create_hunt",
  args: [title, description, startTime, endTime],
  wallet: getActiveWalletAdapter(),
})

// Transaction is confirmed when this returns
console.log(`Hunt created! Tx: ${result.txHash}`)
```

### `batchReadContracts<T>(configs)`

Reads multiple contract values in parallel with individual error handling.

```ts
import { batchReadContracts } from "@/lib/soroban/contractHelpers"

const results = await batchReadContracts([
  { contractId: "C1...", method: "get_balance", args: [address] },
  { contractId: "C2...", method: "get_status", args: [huntId] },
  { contractId: "C3...", method: "get_rewards", args: [playerId] },
])

results.forEach((result, i) => {
  if ("data" in result) {
    console.log(`Result ${i}:`, result.data)
  } else {
    console.error(`Error ${i}:`, result.error.message)
  }
})
```

### Error Handling

All helpers use `normalizeContractError` to wrap errors with:
- Structured error codes (from `parseStellarError`)
- User-friendly messages
- Context information (method name, operation type)
- Original raw error for debugging

```ts
import { normalizeContractError } from "@/lib/soroban/contractHelpers"

try {
  await writeContract({ ... })
} catch (error) {
  const stellarError = normalizeContractError(error, "registerPlayer")
  console.error(`${stellarError.code}: ${stellarError.message}`)
  // Example: "WALLET_REJECTED: Transaction cancelled in wallet"
}
```

### Integration with Existing Code

The contract helpers integrate seamlessly with existing Soroban modules:

```ts
// Automatic retry logic from rpcRetry.ts
import { withSorobanRpcRetry } from "@/lib/soroban/rpcRetry"
// Used internally by all helpers

// Error classification from stellarErrors.ts
import { parseStellarError } from "@/lib/stellarErrors"
// Used by normalizeContractError

// Network configuration from client.ts
import { getSorobanRpcUrl, getSorobanNetworkPassphrase } from "@/lib/soroban/client"
// Used to construct server instances and transactions
```

### Testing

Comprehensive tests are available in `__tests__/contractHelpers.test.ts` covering:
- Type-safe wrappers and error handling
- Gas estimation with simulation
- Transaction simulation validation
- Typed return values with custom parsers
- Retry logic for transient failures
- Write/read operations
- Batch operations with error isolation

Run tests:
```bash
cd apps/web
pnpm test lib/soroban/__tests__/contractHelpers.test.ts
```

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
