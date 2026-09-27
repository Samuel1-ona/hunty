# Development Guide

Hey there! 👋 Welcome to the Hunty frontend development guide. This is your friendly walkthrough for getting the Hunty web app up and running on your machine. Whether you're fixing bugs, adding features, or just exploring the codebase, this guide will help you get started.

## Getting Started

### What You'll Need

Before we dive in, make sure you have these installed on your computer:

**Node.js and npm** (or yarn/pnpm if you prefer)
- You'll need Node.js version 18 or higher
- Check if you have it: `node --version` and `npm --version`
- If not, grab it from [nodejs.org](https://nodejs.org/)

**A code editor**
- VS Code is popular, but use whatever you're comfortable with
- We recommend having the ESLint and Prettier extensions installed

**Git** (for version control)
- Most developers already have this, but if not: [git-scm.com](https://git-scm.com/)

That's it! No need for Rust or Stellar CLI here - that's for the smart contracts. We're just building the web interface.

### Setting Up the Project

First things first, let's get the code on your machine:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Samuel1-ona/hunty.git
   cd hunty
   ```

2. **Install all the dependencies:**
   ```bash
   #  pnpm
   pnpm install
   ```

3. **Start the development server:**
   ```bash
 
   # 
   pnpm dev
   ```

4. **Open your browser:**
   - Navigate to `http://localhost:3000`
   - You should see the Hunty landing page!

That's it! The dev server will automatically reload when you make changes to the code. Pretty neat, right?

## How We Work Around Here

### Starting a New Feature

When you're ready to add something new or fix a bug, here's the workflow we follow:

1. **Create a new branch:**
   ```bash
   git checkout -b feature/your-awesome-feature
   # or for bug fixes
   git checkout -b fix/that-annoying-bug
   ```
   This keeps your work separate from the main code until it's ready.

2. **Make your changes:**
   - Edit the files you need to change
   - Test it in your browser (the dev server should auto-reload)
   - Make sure everything looks good and works as expected

3. **Check for any issues:**
   ```bash
   pnpm run lint
   ```
   This will catch any code style problems or potential bugs.

4. **Build it to make sure everything compiles:**
   ```bash
   pnpm run build
   ```
   If this works, you're good to go!

5. **Commit your changes:**
   ```bash
   git add .
   git commit -m "Add awesome new feature that does X"
   git push origin feature/your-awesome-feature
   ```

Then create a pull request on GitHub so others can review your work. We're all about collaboration here!

### Running the App

**Development mode** (with hot reload):
```bash
pnpm run dev
```
This starts the Next.js dev server with Turbopack. Changes you make will show up instantly in your browser.

**Production build** (to test how it'll work when deployed):
```bash
pnpm run build
pnpm start
```
This builds an optimized version and runs it locally. Good for catching issues before deployment.

**Linting** (checking code quality):
```bash
pnpm run lint
```
This runs ESLint to catch potential problems and style issues. Fix any errors before committing!

## Understanding the Codebase

Let's take a quick tour of how everything is organized. Don't worry, it's not as complicated as it might seem!

### The Big Picture

This is a Next.js app using the App Router (the newer way Next.js does routing). Everything lives in the `app/` directory, and components are in `components/`.

### Main Pages

**`app/page.tsx`** - This is the landing page
- The "Game Arcade" homepage where users first land
- Shows available hunts and lets users connect their wallet
- Has the "Create Game" and "Play Game" buttons

**`app/hunty/page.tsx`** - The game creation page
- Where hunt creators build their scavenger hunts
- Has tabs for creating clues, setting rewards, and publishing
- Also shows the leaderboard when you're viewing a completed game

### Key Components

**`components/Header.tsx`** - The top navigation bar
- Shows the Hunty logo
- Has wallet connection button (when not connected)
- Shows wallet address and balance (when connected)

**`components/WalletModal.tsx`** - The wallet connection popup
- Currently empty (we removed Starknet wallets)
- This is where you'll add Stellar wallet integration later

**`components/PlayGame.tsx`** - The actual game playing interface
- Shows hunt cards one at a time
- Lets players enter codes to unlock clues
- Handles the game flow from start to completion

**`components/HuntCards.tsx`** - Individual hunt clue cards
- The visual cards that show each clue
- Handles answer input and verification
- Shows hints and images

**`components/CreateGameTabs.tsx`** - Tab navigation for game creation
- Switches between Create, Rewards, Publish, and Leaderboard tabs

**`components/HuntForm.tsx`** - Form for adding clues
- Where creators input questions, descriptions, links, and answer codes

**`components/RewardsPanel.tsx`** - Reward configuration
- Lets creators set up XLM or NFT rewards
- Shows reward tiers and amounts

### UI Components

Everything in `components/ui/` is a reusable component built on Radix UI:
- `button.tsx` - Buttons with different variants
- `dialog.tsx` - Modal dialogs
- `input.tsx` - Text inputs
- `card.tsx` - Card containers
- And more...

### Utilities

**`lib/utils.ts`** - Helper functions
- Currently has `cn()` for merging Tailwind classes

**`lib/font.ts`** - Custom fonts
- Sets up the fonts we use (Hanken Grotesk, Dynapuff)

### Styling

We use **Tailwind CSS** for all styling. If you're not familiar with it, it's a utility-first CSS framework. Instead of writing separate CSS files, you add classes directly to your HTML/JSX.

For example:
```tsx
<div className="bg-blue-500 text-white p-4 rounded-lg">
  Hello!
</div>
```

The classes mean: blue background, white text, padding of 4, and rounded corners. Pretty intuitive once you get the hang of it!

## Testing

We have two layers of automated tests: **unit/component tests** with Vitest and **end-to-end (E2E) tests** with Playwright.

### Unit & Component Tests (Vitest)

Fast, isolated tests for individual components and utilities using [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/).

```bash
# Run all unit tests once
pnpm test

# Watch mode (re-runs on file changes)
pnpm test:watch
```

Test files live alongside their source code in `__tests__/` directories (e.g., `components/__tests__/`).

### End-to-End Tests (Playwright)

Full browser-based tests that verify the core game loop works end-to-end. These tests launch a real Next.js dev server and drive a Chromium browser through the entire user flow.

```bash
# Run all E2E tests (starts dev server automatically)
pnpm test:e2e

# Run with interactive UI for debugging
pnpm test:e2e:ui
```

#### What's Covered

The E2E suite covers the full **Create → Join → Solve → Complete** game loop:

| Test Suite | What It Verifies |
|---|---|
| `wallet-connection.spec.ts` | Connect Wallet button, Freighter modal, connected state display, disconnect flow |
| `hunt-creation.spec.ts` | Navigate to create page, fill clue forms, add multiple clues, publish form validation |
| `game-loop.spec.ts` | Active hunts displayed, play preview mode, submit correct/incorrect answers, leaderboard toggle |
| `dashboard.spec.ts` | Dashboard navigation, hunt status badges, Add Clues modal, Activate button, leaderboard access |

#### Mock Wallet Adapter

Since E2E tests run in a real browser without the Freighter extension installed, we use a **mock wallet adapter** (`e2e/helpers/mock-wallet.ts`) that:

- Injects a fake `window.freighter` object so wallet detection succeeds
- Pre-seeds `localStorage` with a mock public key so the app renders in "connected" state
- Provides mock `signTransaction` that passes through the XDR (no real signing)
- Seeds deterministic hunt/clue data in `localStorage` for predictable test scenarios

#### Adding New E2E Tests

1. Create a new `.spec.ts` file in the `e2e/` directory
2. Import helpers from `e2e/helpers/mock-wallet.ts` as needed
3. Use `injectMockWallet(page)` in `beforeEach` for tests that need wallet state
4. Use `seedHuntData(page)` to load deterministic test data

#### CI Integration

The Playwright config (`playwright.config.ts`) is CI-ready:
- Retries failed tests twice in CI
- Uses a single worker for stability
- Auto-starts the Next.js dev server
- Uses the GitHub reporter for PR annotations

To run in CI, install browsers first:
```bash
npx playwright install --with-deps chromium
pnpm test:e2e
```

## When Things Go Wrong (Debugging)

We've all been there - something's not working and you're not sure why. Here are some common issues and how to fix them:

### Common Problems

**"Module not found" errors:**
- Usually means you forgot to install dependencies
- Fix: Run `pnpm install` again

**Port 3000 already in use:**
- Something else is running on that port
- Fix: Kill the other process or use a different port: `pnpm run dev -- -p 3001`

**Styles not updating:**
- Sometimes Tailwind needs a refresh
- Fix: Restart the dev server

**TypeScript errors:**
- Check the error message - it usually tells you what's wrong
- Common issues: wrong types, missing props, undefined values

**React hydration errors:**
- Usually happens when server and client HTML don't match
- Check for `useEffect` or browser-only code running on the server

### Debugging Tools

**Browser DevTools** - Your best friend!
- Open with F12 or right-click → Inspect
- Check the Console tab for errors
- Use the React DevTools extension to see component state
- Network tab shows API calls (when we add them)

**Console.log** - The classic debugger
```tsx
console.log('Current state:', state);
console.log('Props received:', props);
```
Just remember to remove these before committing!

**React DevTools** - See what's happening
- Install the React DevTools browser extension
- It shows you component hierarchy, props, and state
- Super helpful for understanding data flow

**VS Code Debugger** - For the serious stuff
- Set breakpoints in your code
- Step through execution line by line
- See variable values at each step

## Code Style & Best Practices

We want the codebase to be clean, readable, and consistent. Here's how we do things:

### Formatting

We use **Prettier** for automatic code formatting (it should be set up with the project). Before committing, make sure your code is formatted:

```bash
# If you have prettier installed globally
prettier --write .

# Or just let your editor format on save
```

Most editors can be configured to format on save, which is super convenient.

### Naming Conventions

**Components:** `PascalCase`
```tsx
// Good
export function HuntCard() { }
export const WalletModal = () => { }

// Bad
export function huntCard() { }
```

**Functions and variables:** `camelCase`
```tsx
// Good
const handleClick = () => { }
const userName = "John"

// Bad
const HandleClick = () => { }
const user_name = "John"
```

**Constants:** `UPPER_SNAKE_CASE`
```tsx
// Good
const MAX_HUNTS = 10
const API_BASE_URL = "https://api.example.com"
```

**Files:** Match the component/function name
- Component files: `HuntCard.tsx`
- Utility files: `utils.ts`
- Type files: `types.ts`

### TypeScript

We use TypeScript for type safety. Always type your props and state:

```tsx
// Good
interface HuntCardProps {
  title: string
  description: string
  onComplete: () => void
}

export function HuntCard({ title, description, onComplete }: HuntCardProps) {
  // ...
}

// Bad
export function HuntCard(props: any) {
  // ...
}
```

### Component Structure

Keep components focused and small. If a component is getting too big, break it into smaller pieces:

```tsx
// Good - focused component
export function HuntCard({ hunt }: { hunt: Hunt }) {
  return (
    <div>
      <h3>{hunt.title}</h3>
      <p>{hunt.description}</p>
    </div>
  )
}

// Bad - doing too much
export function HuntCard({ hunt }: { hunt: Hunt }) {
  // 500 lines of code doing everything
}
```

### Comments

Write comments that explain **why**, not **what**. The code should be self-explanatory:

```tsx
// Good
// We hash answers client-side before sending to prevent
// the contract from seeing plain text answers
const hashedAnswer = hashAnswer(userInput)

// Bad
// Hash the answer
const hashedAnswer = hashAnswer(userInput)
```

### React Best Practices

- Use functional components (we're using React 19)
- Use hooks for state management (`useState`, `useEffect`, etc.)
- Keep side effects in `useEffect`
- Don't forget dependency arrays in `useEffect`
- Use `useCallback` and `useMemo` when needed (but don't overuse)

## Deploying the App

When you're ready to share your work with the world, here's how to deploy:

### Building for Production

First, create an optimized production build:

```bash
pnpm run build
```

This creates a `.next` folder with all the optimized code. If the build succeeds, you're good to go!

### Deployment Options

**Vercel** (Recommended - it's made by the Next.js team)
1. Push your code to GitHub
2. Connect your repo to Vercel
3. It automatically deploys on every push
4. Free for personal projects!

**Netlify**
- Similar to Vercel
- Also has automatic deployments
- Good alternative if you prefer it

**Self-hosting**
- Build the app: `pnpm run build`
- Start the server: `pnpm start`
- Point your domain to the server
- Use a process manager like PM2 to keep it running

### Environment Variables

Before deploying, make sure to set up environment variables for:
- Contract addresses (when we add them)
- API endpoints
- Wallet adapter configuration
- Any API keys

Create a `.env.local` file (don't commit this!) with your production values, or set them in your hosting platform's dashboard.

### Before You Deploy

Checklist:
- [ ] Code is linted and formatted
- [ ] Build succeeds without errors
- [ ] All environment variables are set
- [ ] Test the production build locally (`pnpm run build && pnpm start`)
- [ ] No console errors in the browser
- [ ] All features work as expected

## Helpful Resources

When you're stuck or want to learn more, these resources are gold:

### Next.js & React

- [Next.js Docs](https://nextjs.org/docs) - The official Next.js documentation
- [React Docs](https://react.dev) - Learn React the modern way
- [TypeScript Handbook](https://www.typescriptlang.org/docs/) - TypeScript basics and advanced topics

### Styling

- [Tailwind CSS Docs](https://tailwindcss.com/docs) - Everything about Tailwind
- [Radix UI](https://www.radix-ui.com/) - The component library we're using

### Stellar & Blockchain

- [Stellar Documentation](https://developers.stellar.org/docs) - Stellar blockchain basics
- [Soroban Documentation](https://soroban.stellar.org/docs) - Smart contracts on Stellar
- [Stellar SDK for JavaScript](https://stellar.github.io/js-stellar-sdk/) - When we add wallet integration

### General Development

- [MDN Web Docs](https://developer.mozilla.org/) - The best reference for web technologies
- [Stack Overflow](https://stackoverflow.com/) - When you're really stuck
- [GitHub Discussions](https://github.com/Samuel1-ona/hunty/discussions) - Ask questions about this project

## Getting Help

We're all here to help each other! If you run into issues:

1. **Check the existing issues** on GitHub - someone might have had the same problem
2. **Search the codebase** - the answer might already be in the code
3. **Ask in GitHub Discussions** - we're friendly, I promise!
4. **Open an issue** - if you found a bug or have a feature request

## What's Next?

Right now, the frontend is mostly UI. The big next steps are:

1. **Add Stellar wallet integration** - Connect real wallets (Freighter, etc.)
2. **Connect to smart contracts** - Make the UI actually interact with the blockchain
3. **Add data persistence** - Store and fetch hunt data from contracts
4. **Implement real game flow** - Make playing hunts actually work end-to-end

If you want to tackle any of these, check out the issues on GitHub or reach out in discussions. We'd love your help!

---

Happy coding! 🚀

*Remember: There are no stupid questions, only questions we haven't answered yet.*


