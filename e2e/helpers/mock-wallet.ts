import { Page } from "@playwright/test";

/**
 * Mock Freighter wallet adapter for E2E testing.
 *
 * Intercepts the `@stellar/freighter-api` message-based communication to
 * simulate a connected Freighter extension without installing it.
 *
 * The real API posts `FREIGHTER_EXTERNAL_MSG_REQUEST` messages and listens
 * for `FREIGHTER_EXTERNAL_MSG_RESPONSE` replies. We listen for those
 * requests and reply with mock data so `isConnected`, `getAddress`, and
 * `requestAccess` all succeed.
 */

export const MOCK_PUBLIC_KEY =
  "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI";

export async function injectMockWallet(page: Page) {
  await page.addInitScript((publicKey: string) => {
    // 1. Set window.freighter so isConnected() short-circuits to true
    (window as any).freighter = true;

    // 2. Pre-seed localStorage so the hook restores session immediately
    localStorage.setItem("freighter_public_key", publicKey);

    // 3. Intercept Freighter extension message requests and reply with mocks
    window.addEventListener("message", (event) => {
      if (
        event.source !== window ||
        event.data?.source !== "FREIGHTER_EXTERNAL_MSG_REQUEST"
      ) {
        return;
      }

      const { messageId, type } = event.data;
      let response: Record<string, unknown> = {};

      switch (type) {
        case "REQUEST_CONNECTION_STATUS":
          response = { isConnected: true };
          break;
        case "REQUEST_PUBLIC_KEY":
          response = { publicKey };
          break;
        case "REQUEST_ACCESS":
          response = { publicKey };
          break;
        case "SUBMIT_TRANSACTION":
          response = {
            signedTransaction: event.data.transactionXdr || "mock_signed_xdr",
            signerAddress: publicKey,
          };
          break;
        case "REQUEST_NETWORK":
          response = {
            network: "TESTNET",
            networkPassphrase: "Test SDF Network ; September 2015",
          };
          break;
        case "REQUEST_NETWORK_DETAILS":
          response = {
            network: "TESTNET",
            networkUrl: "https://horizon-testnet.stellar.org",
            networkPassphrase: "Test SDF Network ; September 2015",
            sorobanRpcUrl: "https://soroban-testnet.stellar.org",
          };
          break;
        case "REQUEST_ALLOWED_STATUS":
          response = { isAllowed: true };
          break;
        default:
          response = {};
      }

      // Reply with the same messageId (note: freighter uses "messagedId" typo)
      window.postMessage(
        {
          source: "FREIGHTER_EXTERNAL_MSG_RESPONSE",
          messagedId: messageId,
          ...response,
        },
        window.location.origin
      );
    });

    // 4. Also expose window wallet objects for lib/contracts/hunt.ts and player-registration.ts
    const mockWallet = {
      isConnected: true,
      getPublicKey: () => Promise.resolve(publicKey),
      signTransaction: (xdr: string) => Promise.resolve(xdr),
      request: ({ method }: { method: string }) => {
        if (method === "getPublicKey") return Promise.resolve(publicKey);
        return Promise.resolve(null);
      },
    };
    (window as any).freighter = mockWallet;
    (window as any).soroban = mockWallet;
    (window as any).sorobanWallet = mockWallet;
  }, MOCK_PUBLIC_KEY);
}

/**
 * Seed hunt and clue data into localStorage so E2E tests have deterministic
 * data to work with (instead of relying on the runtime seed hunts).
 */
export async function seedHuntData(
  page: Page,
  options?: {
    hunts?: unknown[];
    clues?: unknown[];
  }
) {
  const hunts = options?.hunts ?? [
    {
      id: 100,
      title: "E2E Test Hunt",
      description: "A hunt created for automated E2E testing.",
      cluesCount: 2,
      status: "Active",
      startTime: Math.floor(Date.now() / 1000) - 86400,
      endTime: Math.floor(Date.now() / 1000) + 7 * 86400,
    },
    {
      id: 101,
      title: "Draft Hunt",
      description: "A draft hunt for testing activation flow.",
      cluesCount: 1,
      status: "Draft",
    },
  ];

  const clues = options?.clues ?? [
    { id: 1, huntId: 100, question: "What is 2+2?", answer: "4", points: 10 },
    {
      id: 2,
      huntId: 100,
      question: "Capital of France?",
      answer: "paris",
      points: 20,
    },
    {
      id: 3,
      huntId: 101,
      question: "Color of the sky?",
      answer: "blue",
      points: 10,
    },
  ];

  await page.addInitScript(
    ({ hunts, clues }: { hunts: unknown[]; clues: unknown[] }) => {
      localStorage.setItem("hunty_hunts", JSON.stringify(hunts));
      localStorage.setItem("hunty_clues", JSON.stringify(clues));
    },
    { hunts, clues }
  );
}

// ─────────────────────────────────────────────────────────────────
// Error Scenario Helpers
// ─────────────────────────────────────────────────────────────────

/**
 * Simulate wallet connection failure for testing error recovery.
 * The wallet modal will appear but connection attempts will fail.
 */
export async function simulateWalletConnectionFailure(page: Page) {
  await page.addInitScript(() => {
    (window as any).freighter = {
      request: async () => {
        throw new Error("User rejected the request");
      },
      isConnected: false,
    };
  });
}

/**
 * Simulate wallet disconnection after connection was established.
 * Useful for testing recovery when wallet becomes unavailable.
 */
export async function simulateWalletDisconnection(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem("freighter_public_key");
    (window as any).freighter = null;
    (window as any).soroban = null;
  });
}

/**
 * Intercept API responses and return specific error codes.
 * Useful for testing error handling for various HTTP errors.
 */
export async function mockApiErrorResponse(
  page: Page,
  pattern: string,
  statusCode: number = 500,
  responseBody: Record<string, unknown> = {}
) {
  await page.route(pattern, (route) => {
    route.abort("failed");
  });
}

/**
 * Mock API responses to timeout after a delay.
 * Useful for testing timeout handling and loading states.
 */
export async function mockApiTimeout(
  page: Page,
  pattern: string,
  delayMs: number = 10000
) {
  await page.route(pattern, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    route.abort("timedout");
  });
}

/**
 * Clear all stored hunt data from localStorage.
 * Useful for testing behavior with no cached data.
 */
export async function clearStoredHuntData(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem("hunty_hunts");
    localStorage.removeItem("hunty_clues");
    localStorage.removeItem("hunty_player_registrations");
  });
}

/**
 * Inject corrupted hunt data into localStorage.
 * Useful for testing recovery from malformed cached data.
 */
export async function injectCorruptedHuntData(page: Page) {
  await page.evaluate(() => {
    localStorage.setItem("hunty_hunts", "{ invalid json");
    localStorage.setItem("hunty_clues", "[ broken array");
  });
}

/**
 * Wait for a successful wallet connection and verify it worked.
 */
export async function verifyWalletConnected(
  page: Page,
  publicKey: string = MOCK_PUBLIC_KEY
) {
  const shortKey = `${publicKey.slice(0, 6)}...${publicKey.slice(-6)}`;
  
  // Check that shortened wallet address is visible
  await page.locator(`text=${shortKey}`).waitFor({ state: "visible", timeout: 10000 });
}

/**
 * Mock a contract call failure (used during hunt registration or submission).
 * Simulates what happens when blockchain interaction fails.
 */
export async function mockContractCallFailure(page: Page, method: string = "") {
  await page.route("**/api/contract/**", (route) => {
    route.abort("failed");
  });
}
