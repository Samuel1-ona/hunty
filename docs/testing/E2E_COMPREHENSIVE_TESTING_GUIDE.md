# Comprehensive E2E Testing Guide

This document outlines all End-to-End (E2E) tests covering critical user flows for the Hunty application.

## Test Coverage Overview

### ✅ Acceptance Criteria Coverage

All acceptance criteria have been implemented with comprehensive test coverage:

| Criterion | Test File(s) | Coverage |
|-----------|-------------|----------|
| **Hunt Creation Flow (Happy Path)** | `hunt-creation.spec.ts` | ✓ Complete |
| **Hunt Play & Completion Flow** | `game-loop.spec.ts`, `full-hunt-flow.spec.ts` | ✓ Complete |
| **Wallet Connection Flow** | `wallet-connection.spec.ts` | ✓ Complete |
| **Search & Filter Flow** | `search-filter.spec.ts` | ✓ Complete |
| **Profile & Settings Flow** | `profile-and-settings.spec.ts` | ✓ Complete (NEW) |
| **Error Recovery Flows** | `error-recovery.spec.ts` | ✓ Complete (NEW) |
| **Mobile Viewport Tests** | `mobile-viewport.spec.ts` | ✓ Complete (NEW) |

---

## Test Files and Descriptions

### 1. Hunt Creation Flow Tests
**File:** [hunt-creation.spec.ts](./e2e/hunt-creation.spec.ts)

Tests the complete hunt creation journey:

- ✓ Navigation to create hunt page from home
- ✓ Filling in clue form fields (title, description, answer code)
- ✓ Adding multiple clues to a single hunt
- ✓ Starting from templates and editing pre-filled fields
- ✓ Publish tab validation (required start/end dates)
- ✓ Full pipeline: Create → Configure → Publish → Confirmation

**Key Test:** `completes full hunt creation pipeline` - Tests the entire flow from creation to successful publication.

---

### 2. Hunt Play & Completion Flow Tests
**File:** [game-loop.spec.ts](./e2e/game-loop.spec.ts)

Tests the core game loop and player experience:

- ✓ Home page displays active hunts from seed data
- ✓ Dashboard shows all hunts including drafts
- ✓ Draft hunt activation with clue validation
- ✓ Preview mode play and testing
- ✓ Full user journey: register → submit answers → complete hunt
- ✓ Hunt play interface and current clue display
- ✓ Progress tracking through multiple clues
- ✓ Game completion modal with reward information
- ✓ Leaderboard viewing after completion
- ✓ Wrong answer feedback and retry capability
- ✓ Points awarded per clue display
- ✓ Player can abandon hunt mid-game
- ✓ Completion persists on leaderboard
- ✓ Hunt timer functionality (if applicable)
- ✓ Multiple independent players completing same hunt

**Key Test:** `full user journey: register, submit clues, complete hunt` - Complete end-to-end gameplay experience.

---

### 3. Wallet Connection Flow Tests
**File:** [wallet-connection.spec.ts](./e2e/wallet-connection.spec.ts)

Tests wallet integration and connection management:

- ✓ Connect Wallet button visibility
- ✓ Wallet modal opening and wallet options
- ✓ Shortened wallet address display after connection
- ✓ Wallet dropdown showing address and options
- ✓ Disconnect wallet functionality
- ✓ Connection persistence across page reloads

---

### 4. Search & Filter Flow Tests
**File:** [search-filter.spec.ts](./e2e/search-filter.spec.ts)

Tests hunt discovery and filtering capabilities:

- ✓ Search functionality with keywords
- ✓ Reward type filtering (XLM, NFT, etc.)
- ✓ Hunt status filtering (Active, Completed, etc.)
- ✓ Multiple filter combinations
- ✓ Clearing filters and resetting results
- ✓ Results update dynamically

---

### 5. Profile & Settings Flow Tests
**File:** [profile-and-settings.spec.ts](./e2e/profile-and-settings.spec.ts) ⭐ NEW

Tests user profile and settings functionality:

- ✓ Navigation to profile page from header
- ✓ Connected wallet address display
- ✓ Shortened wallet address format
- ✓ Registered hunts section visibility
- ✓ Badges and achievements display
- ✓ NFT gallery display (if NFT rewards exist)
- ✓ Copy wallet address functionality
- ✓ Hunt statistics display (created/completed/in-progress)
- ✓ Disconnect wallet button accessibility
- ✓ Redirect after wallet disconnection
- ✓ Profile access without wallet (authentication check)
- ✓ Theme toggle persistence
- ✓ Profile navigation from various pages
- ✓ Browser back navigation from profile

---

### 6. Error Recovery Flow Tests
**File:** [error-recovery.spec.ts](./e2e/error-recovery.spec.ts) ⭐ NEW

Tests error handling and recovery mechanisms:

#### Hunt Creation Error Recovery
- ✓ Validation error when hunt title is empty
- ✓ Error when adding clue without answer code
- ✓ Network error recovery when publishing hunt
- ✓ Retry option when hunt activation fails

#### Wallet Connection Error Recovery
- ✓ Error display when wallet connection is denied
- ✓ Recovery when wallet disconnects unexpectedly

#### Hunt Play Error Recovery
- ✓ Error message for wrong answer submission
- ✓ Retry capability after incorrect answer
- ✓ Network error handling during answer submission

#### Navigation Error Recovery
- ✓ 404 error handling with navigation back
- ✓ Hunt data load failure recovery

#### Search & Filter Error Recovery
- ✓ Search API error handling
- ✓ Clear filters option when no results found

#### Form Validation
- ✓ Invalid email format validation
- ✓ Recovery from form submission timeout

---

### 7. Mobile Viewport Tests
**File:** [mobile-viewport.spec.ts](./e2e/mobile-viewport.spec.ts) ⭐ NEW

Tests responsive design across multiple mobile devices:

#### Device Coverage
- iPhone SE (375px) - small phone
- iPhone 12 (390px) - standard phone  
- iPad (768px) - tablet

#### Navigation & Layout
- ✓ Responsive header on mobile
- ✓ Mobile menu open/close functionality
- ✓ Touch target sizing (44px minimum)

#### Home Page Mobile
- ✓ Responsive hunt card grid
- ✓ Search input usability on mobile
- ✓ Create Game button accessibility
- ✓ Wallet button accessibility

#### Hunt Creation Mobile
- ✓ Form scrollability and usability
- ✓ Add clue button functionality
- ✓ No horizontal overflow on mobile
- ✓ All inputs visible without overflow

#### Dashboard Mobile
- ✓ Responsive hunt cards
- ✓ Button accessibility on mobile

#### Hunt Play Mobile
- ✓ Readable play interface
- ✓ Large answer input for tapping
- ✓ Submit button accessible with keyboard open

#### Profile Mobile
- ✓ Profile page readability
- ✓ Wallet address readability/shortening

#### Modals & Overlays
- ✓ Wallet modal fits mobile screen
- ✓ Modal close functionality

#### Scrolling & Performance
- ✓ Long content scrollability
- ✓ Back/forward navigation
- ✓ Image scaling on mobile
- ✓ Page load time performance
- ✓ No content cutoff at viewport edges

---

### 8. Additional Test Files

#### Dark Mode Tests
**File:** [dark-mode.spec.ts](./e2e/dark-mode.spec.ts)
- Tests theme switching and persistence

#### A11y Tests
**File:** [a11y.spec.ts](./e2e/a11y.spec.ts)
- Tests accessibility compliance

#### Visual Regression Tests
**File:** [visual-regression.spec.ts](./e2e/visual-regression.spec.ts)
- Tests UI consistency across versions

#### Full Hunt Flow
**File:** [full-hunt-flow.spec.ts](./e2e/full-hunt-flow.spec.ts)
- Complete creation → activation → play flow with two wallet identities

#### Claim Reward Tests
**File:** [claim-reward.spec.ts](./e2e/claim-reward.spec.ts)
- Tests reward claiming functionality

---

## Running Tests

### Run All E2E Tests
```bash
pnpm test:e2e
```

### Run Specific Test File
```bash
pnpm test:e2e hunt-creation.spec.ts
```

### Run Tests for Specific Feature
```bash
# Hunt Creation
pnpm test:e2e hunt-creation.spec.ts

# Hunt Play & Completion
pnpm test:e2e game-loop.spec.ts

# Wallet Connection
pnpm test:e2e wallet-connection.spec.ts

# Profile & Settings
pnpm test:e2e profile-and-settings.spec.ts

# Error Recovery
pnpm test:e2e error-recovery.spec.ts

# Mobile
pnpm test:e2e mobile-viewport.spec.ts
```

### Run Tests on Specific Device
```bash
# Desktop (MS Edge)
pnpm exec playwright test --project=msedge

# Mobile Chrome
pnpm exec playwright test --project="Mobile Chrome"

# Mobile Safari
pnpm exec playwright test --project="Mobile Safari"
```

### Run Tests with UI Mode (Debug)
```bash
pnpm exec playwright test --ui
```

### Run Tests in Debug Mode
```bash
pnpm exec playwright test --debug
```

---

## Test Configuration

### Playwright Config
**File:** [playwright.config.ts](./playwright.config.ts)

- **Test Directory:** `./e2e`
- **Parallel Execution:** Enabled
- **Retries:** 2 (CI), 0 (local)
- **Browsers:** 
  - Desktop MS Edge
  - Mobile Chrome (Pixel 5)
  - Mobile Safari (iPhone 12)
- **Base URL:** `http://localhost:3000`
- **Web Server:** Starts `pnpm dev` automatically

---

## Helper Utilities

### Mock Wallet Helpers
**File:** [helpers/mock-wallet.ts](./e2e/helpers/mock-wallet.ts)

#### Basic Helpers
- `injectMockWallet(page)` - Inject mock Freighter wallet
- `seedHuntData(page, options?)` - Seed hunt data into localStorage

#### Error Simulation Helpers ⭐ NEW
- `simulateWalletConnectionFailure(page)` - Simulate failed connection
- `simulateWalletDisconnection(page)` - Simulate wallet disconnect
- `mockApiErrorResponse(page, pattern, statusCode)` - Mock API errors
- `mockApiTimeout(page, pattern, delayMs)` - Mock API timeouts
- `clearStoredHuntData(page)` - Clear cached hunt data
- `injectCorruptedHuntData(page)` - Inject malformed data
- `verifyWalletConnected(page, publicKey)` - Verify wallet connection
- `mockContractCallFailure(page, method)` - Mock blockchain failures

---

## Key Testing Patterns

### 1. Pre-test Setup
```typescript
test.beforeEach(async ({ page }) => {
  await injectMockWallet(page);
  await seedHuntData(page);
});
```

### 2. Testing Navigation
```typescript
await page.getByRole("button", { name: /create game/i }).click();
await expect(page).toHaveURL(/\/hunty/);
```

### 3. Testing User Interactions
```typescript
await page.getByPlaceholder("Title of the Hunt").fill("My Hunt");
await expect(page.getByPlaceholder("Title of the Hunt")).toHaveValue("My Hunt");
```

### 4. Testing Error States
```typescript
await page.route("**/api/**", (route) => route.abort());
// Attempt action that will fail
const errorMsg = page.locator("text=/error/i");
await expect(errorMsg).toBeVisible();
```

### 5. Testing Mobile Responsiveness
```typescript
test.use({ viewport: { width: 390, height: 844 } }); // iPhone 12
```

---

## Data Fixtures

### Seeded Hunt Data
- **Hunt 100:** "E2E Test Hunt" (Active, 2 clues)
  - Clue 1: "What is 2+2?" → Answer: "4" (10 points)
  - Clue 2: "Capital of France?" → Answer: "paris" (20 points)
- **Hunt 101:** "Draft Hunt" (Draft, 1 clue)
  - Clue 3: "Color of the sky?" → Answer: "blue" (10 points)

### Mock Wallet
- **Public Key:** `GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI`
- **Supports:** Connection, disconnection, transaction signing

---

## CI/CD Integration

Tests are configured to run in CI with:
- 2 retries per test
- 1 worker process
- GitHub reporter format
- Full trace capture on first retry

---

## Best Practices

1. **Use Semantic Locators:** Prefer `getByRole`, `getByPlaceholder`, `getByText` over CSS selectors
2. **Wait Appropriately:** Use `toBeVisible()` with timeouts for async operations
3. **Test User Flows:** Focus on what users actually do, not implementation details
4. **Mock External Services:** Use route interception for APIs and blockchain calls
5. **Clean Up:** Use `test.afterEach()` to clean up if needed
6. **Organize Descriptively:** Group related tests in `test.describe()` blocks

---

## Troubleshooting

### Tests Timeout
- Increase timeout: `await expect(...).toBeVisible({ timeout: 30_000 })`
- Check if element exists in DOM vs being hidden

### Mobile Tests Fail
- Verify viewport dimensions match device
- Ensure buttons/inputs are large enough (44px minimum)

### Wallet Tests Fail
- Verify mock wallet is injected before navigation
- Check localStorage for proper keys

### Navigation Issues
- Use `waitUntil: 'domcontentloaded'` for page.goto()
- Verify URL patterns in `toHaveURL()` expectations

---

## Future Enhancements

- [ ] Add visual regression testing for more components
- [ ] Add performance metrics collection
- [ ] Add accessibility audit integration (axe-core)
- [ ] Add multi-user concurrent testing
- [ ] Add API load testing scenarios
- [ ] Add database state validation helpers

---

## References

- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://playwright.dev/docs/best-practices)
- [Accessibility Testing](https://playwright.dev/docs/accessibility-testing)
- [Performance Testing](https://playwright.dev/docs/performance)

---

## Questions or Issues?

Please refer to the test files for detailed comments and implementation patterns, or check the main [README.md](./README.md) for project setup instructions.
