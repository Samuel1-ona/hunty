#!/usr/bin/env bash
# Creates 100 GitHub issues for the Hunty repo (issues 2-100 of the batch)
REPO="Samuel1-ona/hunty"

gh issue create --repo $REPO \
  --title "[FEAT] Add hunt difficulty rating system" \
  --body "## Description
Players currently have no way to gauge how hard a hunt is before joining. A difficulty rating (Easy / Medium / Hard / Expert) set by the creator would improve player experience.

## Proposed Solution
- Add a \`difficulty\` field to \`StoredHunt\` type in \`lib/types.ts\`
- Include a difficulty selector in \`HuntForm.tsx\`
- Display a difficulty badge on \`HuntCards.tsx\`
- Allow filtering by difficulty on the Game Arcade page

## Acceptance Criteria
- [ ] Creator can set difficulty when creating/editing a hunt
- [ ] Difficulty badge is visible on hunt cards
- [ ] Arcade supports filtering by difficulty level
- [ ] Difficulty stored in contract metadata" \
  --label "enhancement"

gh issue create --repo $REPO \
  --title "[FEAT] Generate Open Graph preview images for hunt sharing" \
  --body "## Description
When sharing a hunt link on social media (Twitter, Discord, Telegram), the link preview is blank. Dynamic OG images would dramatically increase click-through rates.

## Proposed Solution
- Use Next.js \`ImageResponse\` in \`/app/hunt/[id]/opengraph-image.tsx\`
- Include hunt title, cover image, reward type, and creator name
- Fall back to a branded Hunty card when no cover image exists

## Acceptance Criteria
- [ ] Each hunt page has a unique OG image URL
- [ ] OG image shows hunt title, reward, and cover art
- [ ] Twitter card meta tags are correctly set
- [ ] Falls back gracefully when cover image is missing" \
  --label "enhancement"

gh issue create --repo $REPO \
  --title "[FEAT] Implement hunt categories and tagging system" \
  --body "## Description
As the number of hunts grows, discovery becomes harder. Categories (e.g. Nature, History, Crypto, Art) and custom tags would help players find relevant hunts.

## Proposed Solution
- Add \`category\` and \`tags\` fields to \`StoredHunt\`
- Allow creators to assign a category and up to 5 custom tags in \`HuntForm.tsx\`
- Render category chip and tag pills on hunt cards
- Add category filter to Game Arcade sidebar

## Acceptance Criteria
- [ ] Creators can assign a category and tags during hunt creation
- [ ] Hunt cards show category badge
- [ ] Game Arcade has category filter dropdown
- [ ] Tags are searchable via the search bar" \
  --label "enhancement"

gh issue create --repo $REPO \
  --title "[FEAT] Build a hunter statistics / profile page" \
  --body "## Description
Players have no dedicated page showing their hunt history, total points, badges, and rank. A rich hunter profile would increase engagement and retention.

## Proposed Solution
- Expand \`/app/profile/page.tsx\` with a stats dashboard
- Show: total hunts completed, points earned, rank, NFTs won, favourite category
- Display a timeline of completed hunts
- Link to each completed hunt's leaderboard entry

## Acceptance Criteria
- [ ] Profile page shows aggregated statistics
- [ ] Hunt completion history timeline is rendered
- [ ] Stats are fetched from on-chain leaderboard data
- [ ] Page is accessible without wallet (public profile view)" \
  --label "enhancement"

gh issue create --repo $REPO \
  --title "[FEAT] Add hunt cloning / duplication feature for creators" \
  --body "## Description
Creators who want to run a recurring hunt or create slight variations of an existing hunt must start from scratch. A \"Duplicate Hunt\" button would save significant time.

## Proposed Solution
- Add a \"Duplicate\" action in \`HuntControls.tsx\` for hunt cards in the dashboard
- Pre-fill \`HuntForm.tsx\` with the original hunt's data (title prefixed with \"Copy of ...\")
- Clear status (set to Draft), reward amounts, and timing fields
- Clues are copied but hashes regenerated on activation

## Acceptance Criteria
- [ ] \"Duplicate Hunt\" button appears in creator dashboard
- [ ] New draft pre-fills all text fields from the original
- [ ] Status resets to Draft; dates and rewards are cleared
- [ ] Duplicate appears immediately in the dashboard" \
  --label "enhancement"

gh issue create --repo $REPO \
  --title "[FEAT] Add max-participants cap per hunt" \
  --body "## Description
Creators may want to limit their hunt to a specific number of players (e.g. a corporate team event for 20 people). Without a cap, any number of wallets can register.

## Proposed Solution
- Add optional \`maxParticipants\` field to \`StoredHunt\` and to the Soroban contract
- Show a participant cap badge on hunt cards and the hunt play page
- Block new registrations once the cap is reached with a clear error message
- Show remaining spots countdown (\"3 of 20 spots left\")

## Acceptance Criteria
- [ ] Creator can set an optional participant cap in HuntForm
- [ ] Registration is blocked when cap is reached
- [ ] Hunt card shows remaining spots
- [ ] Contract enforces the cap on-chain" \
  --label "enhancement"

gh issue create --repo $REPO \
  --title "[FEAT] Implement hunt invitation / private access links" \
  --body "## Description
Private hunts need a way for creators to share access with specific players. A unique invite link containing a signed token would allow whitelist-free private access.

## Proposed Solution
- Generate a UUID-based invite token stored in \`huntStore\`
- Invite URL format: \`/hunt/[id]?invite=<token>\`
- Token gates the registration button for private hunts
- Creator can share/revoke invite links from their dashboard

## Acceptance Criteria
- [ ] Creator can generate and copy an invite link
- [ ] Invite link allows registration on private hunts
- [ ] Invalid or expired tokens show an access-denied message
- [ ] Creator can revoke an invite link" \
  --label "enhancement"

gh issue create --repo $REPO \
  --title "[FEAT] Add push notifications (Web Push API) for hunt events" \
  --body "## Description
Currently players have no real-time alerts when a hunt starts, when they're overtaken on the leaderboard, or when a hunt they registered for is cancelled.

## Proposed Solution
- Implement Web Push API with a service worker
- Notify players on: hunt start, new leaderboard rank, hunt cancellation
- Notify creators on: player registration, first completion
- Store push subscription in localStorage / server DB
- Use the existing Resend setup for fallback email

## Acceptance Criteria
- [ ] Users can opt-in to push notifications
- [ ] Hunt start triggers notification for registered players
- [ ] Leaderboard overtake sends a push notification
- [ ] Notification preference is stored and respected" \
  --label "enhancement"

gh issue create --repo $REPO \
  --title "[FEAT] Add hunt review and rating system for players" \
  --body "## Description
After completing a hunt, players should be able to leave a star rating (1–5) and a short review. This helps creators improve and helps other players discover quality hunts.

## Proposed Solution
- Add a post-completion review form in \`GameCompleteModal.tsx\`
- Store reviews off-chain (Supabase or IPFS) linked by hunt ID
- Show aggregate rating on hunt cards (star display + count)
- Creator dashboard shows average rating per hunt

## Acceptance Criteria
- [ ] Review form appears after hunt completion
- [ ] Rating (1-5 stars) and optional text are submittable
- [ ] Hunt cards display aggregate star rating
- [ ] Creator dashboard shows reviews per hunt" \
  --label "enhancement"

gh issue create --repo $REPO \
  --title "[FEAT] Add hunt embed code generator" \
  --body "## Description
Hunt creators who run blogs, Discord servers, or websites want to embed a live hunt widget directly in their content. An embed code generator would let creators share hunts in rich contexts.

## Proposed Solution
- Create an \`/api/embed/[id]\` endpoint returning an iframe-friendly hunt card
- Add a \"Get Embed Code\" button in \`HuntControls.tsx\`
- Show a modal with a copyable \`<iframe>\` snippet
- The embedded widget shows title, reward, clue count, and a \"Play\" CTA

## Acceptance Criteria
- [ ] Creator can copy embed code from their dashboard
- [ ] Embedded iframe shows live hunt info
- [ ] Embed respects the hunt's privacy setting
- [ ] Iframe is responsive and theme-aware" \
  --label "enhancement"

gh issue create --repo $REPO \
  --title "[FEAT] Implement team / co-op hunt mode" \
  --body "## Description
All hunts are currently solo. A team mode where 2–5 players share a progress state and split the reward would open up new use cases (friends, hackathon teams, corporate events).

## Proposed Solution
- Add optional \`teamMode\` and \`maxTeamSize\` fields to \`StoredHunt\`
- Players create or join a team before registering for a hunt
- Team progress is tracked collectively on-chain
- Reward is split equally among team members on completion

## Acceptance Criteria
- [ ] Creator can enable team mode and set max team size
- [ ] Players can create/join a team code before registering
- [ ] Clue completion by any team member advances shared progress
- [ ] Reward is split on-chain upon team completion" \
  --label "enhancement"

gh issue create --repo $REPO \
  --title "[FEAT] Add Soroban Passkey / social wallet support" \
  --body "## Description
Freighter wallet is a barrier for new users unfamiliar with Stellar. Soroban Passkeys allow sign-in with biometrics (FaceID, TouchID, WebAuthn) with no browser extension required.

## Proposed Solution
- Integrate Stellar Passkey Kit (\`@stellar/passkey-kit\`)
- Add a \"Continue with Passkey\" option in \`WalletModal.tsx\`
- Passkey-derived wallet interacts with all existing Soroban contracts
- Store passkey credential ID in localStorage for reconnect

## Acceptance Criteria
- [ ] Users can create/sign-in with a passkey
- [ ] Passkey wallet can register, submit answers, claim rewards
- [ ] Existing Freighter flow is unaffected
- [ ] Passkey option is clearly distinguished in wallet modal" \
  --label "enhancement"

gh issue create --repo $REPO \
  --title "[FEAT] Add animated clue reveal transitions" \
  --body "## Description
When a player correctly answers a clue and the next one appears, the transition is abrupt. Adding a smooth reveal animation would make the gameplay feel polished and rewarding.

## Proposed Solution
- Use Framer Motion's \`AnimatePresence\` in \`PlayGame.tsx\` for clue cards
- Correct answer: green flash + slide-out of answered clue + slide-in of next
- Incorrect answer: red shake animation on the input field
- Confetti burst for the final clue

## Acceptance Criteria
- [ ] Correct answer triggers a slide transition to the next clue
- [ ] Incorrect answer shakes the input field
- [ ] Final clue completion triggers confetti
- [ ] Animations respect \`prefers-reduced-motion\`" \
  --label "enhancement"

gh issue create --repo $REPO \
  --title "[FEAT] Creator analytics dashboard with chart visualizations" \
  --body "## Description
The current creator dashboard shows a list of hunts with minimal stats. A dedicated analytics view with charts would give creators actionable insights.

## Proposed Solution
- Add an \"Analytics\" tab in \`HuntDashboard.tsx\`
- Show: completions over time (line chart), clue drop-off rate (bar chart), player retention funnel
- Use \`recharts\` or \`chart.js\` for visualizations
- Date range picker for filtering analytics period

## Acceptance Criteria
- [ ] Analytics tab is accessible from creator dashboard
- [ ] Line chart shows daily completions
- [ ] Bar chart shows per-clue drop-off rate
- [ ] Charts update with date range filter" \
  --label "enhancement"

gh issue create --repo $REPO \
  --title "[FEAT] Add XLM reward sponsorship / top-up by third parties" \
  --body "## Description
Allow external sponsors to add XLM to an existing hunt's reward pool, increasing the prize without the creator needing to modify the contract. Useful for sponsored tournaments.

## Proposed Solution
- Add a \`sponsorHunt(huntId, amount)\` function to the RewardManager contract
- Add a \"Sponsor This Hunt\" button on the hunt details page
- Show total reward pool with a breakdown of creator vs sponsor contributions
- Emit a \`HuntSponsored\` event visible in the activity feed

## Acceptance Criteria
- [ ] Anyone can add XLM to a hunt reward pool
- [ ] Hunt card shows updated total reward amount
- [ ] Sponsor contribution is shown separately in UI
- [ ] Activity feed shows sponsorship events" \
  --label "enhancement"

gh issue create --repo $REPO \
  --title "[FEAT] Add keyboard shortcuts for hunt navigation" \
  --body "## Description
Power users and accessibility users benefit from keyboard shortcuts. Adding shortcuts for common hunt actions would improve the experience for keyboard-centric users.

## Proposed Solution
- \`Enter\` to submit answer (already partially works)
- \`?\` to open keyboard shortcut help overlay
- \`Esc\` to close modals
- \`Tab\` / \`Shift+Tab\` to cycle through clues in preview mode
- \`Ctrl+K\` to open hunt search (command palette style)

## Acceptance Criteria
- [ ] All shortcuts are documented in a help overlay (\`?\` key)
- [ ] Answer submission works via Enter key
- [ ] Modals close with Escape
- [ ] Shortcuts are disabled when an input is focused" \
  --label "enhancement"

gh issue create --repo $REPO \
  --title "[FEAT] Add Storybook for UI component documentation" \
  --body "## Description
The \`/components/ui/\` and other components have no isolated documentation. Storybook would let contributors develop, test, and document components in isolation.

## Proposed Solution
- Install Storybook with \`@storybook/nextjs\` preset
- Add stories for all \`/components/ui/\` components
- Add stories for: \`HuntCards\`, \`Header\`, \`GameCompleteModal\`, \`WalletModal\`
- Deploy Storybook via GitHub Pages or Chromatic

## Acceptance Criteria
- [ ] \`pnpm storybook\` starts Storybook locally
- [ ] All UI primitives have stories with all variants
- [ ] At least 3 feature components have stories
- [ ] Storybook is deployed and linked from README" \
  --label "enhancement"

gh issue create --repo $REPO \
  --title "[FEAT] Add a referral / invite system for players" \
  --body "## Description
Word-of-mouth growth is important for an early-stage Web3 game. A referral system where existing players earn bonus points for inviting new players would accelerate organic growth.

## Proposed Solution
- Generate a unique referral code per wallet address
- Track referrals when a new player registers via a referral link (\`?ref=<code>\`)
- Award bonus points to the referrer upon the new player completing their first hunt
- Show referral stats on the player profile page

## Acceptance Criteria
- [ ] Each player has a shareable referral link
- [ ] New player registration via referral link is tracked
- [ ] Referrer receives bonus points on first referral completion
- [ ] Referral count and bonus shown on profile page" \
  --label "enhancement"

gh issue create --repo $REPO \
  --title "[FEAT] Add image/media clues support (not just text)" \
  --body "## Description
All clues are currently text-based questions. Allowing creators to attach an image, audio clip, or video to a clue would dramatically expand the types of hunts possible.

## Proposed Solution
- Add optional \`mediaCid\` field to \`Clue\` type
- Add file upload UI in the clue editor within \`HuntForm.tsx\`
- Upload media to IPFS via the existing \`/api/ipfs/route.ts\`
- Render image/audio/video within the clue card in \`PlayGame.tsx\`

## Acceptance Criteria
- [ ] Creator can attach an image to any clue
- [ ] Image is uploaded to IPFS and CID stored on-chain
- [ ] Players see the image above the clue question
- [ ] Audio and video attachments are supported (stretch)" \
  --label "enhancement"

gh issue create --repo $REPO \
  --title "[FEAT] Add hunt spotlight / promoted placement" \
  --body "## Description
Allow creators to pay a small XLM fee to have their hunt featured in a \"Spotlight\" carousel at the top of the Game Arcade for 24 hours.

## Proposed Solution
- Add a \`promotedUntil\` timestamp field to \`StoredHunt\`
- Add a \`promoteHunt(huntId)\` call that charges a fee and sets the timestamp
- Render a horizontal \"Spotlight\" carousel above the main grid on the Arcade
- Show a \"Promoted\" badge on spotlight hunt cards

## Acceptance Criteria
- [ ] Creator can promote a hunt for a fixed XLM fee
- [ ] Promoted hunts appear in the Spotlight carousel
- [ ] Promotion expires automatically after 24 hours
- [ ] Non-promoted hunt grid is unaffected" \
  --label "enhancement"

gh issue create --repo $REPO \
  --title "[BUG] Wallet address lost on page refresh — no persistence" \
  --body "## Description
After connecting a Freighter wallet, refreshing the page disconnects the user and they must reconnect manually. The wallet state should be automatically restored.

## Steps to Reproduce
1. Connect Freighter wallet successfully
2. Hard-refresh the page (Cmd+Shift+R)
3. Wallet shows as disconnected

## Expected Behaviour
The wallet should auto-reconnect on page load if Freighter is already authorized.

## Proposed Fix
- On mount in \`useFreighterWallet.ts\`, call \`isConnected()\` and auto-restore state
- Cache public key in \`sessionStorage\` as a fallback

## Environment
- Browser: Chrome 125
- Freighter: 5.x" \
  --label "bug"

gh issue create --repo $REPO \
  --title "[BUG] Hunt list has no pagination — all hunts loaded at once" \
  --body "## Description
The Game Arcade fetches all hunts from \`getAllHunts()\` and renders them all at once. With hundreds of hunts this will cause severe performance degradation and a very long page.

## Steps to Reproduce
1. Have 50+ hunts in the store
2. Navigate to Game Arcade
3. All hunts render simultaneously; page becomes sluggish

## Expected Behaviour
Hunts should be paginated (12–24 per page) with a \"Load More\" button or infinite scroll.

## Proposed Fix
- Add pagination state to the Arcade page
- Slice the \`filteredHunts\` array based on current page
- Add \"Load More\" / \"Show Previous\" buttons below the grid" \
  --label "bug"

gh issue create --repo $REPO \
  --title "[BUG] Search query not reflected in URL — not shareable/bookmarkable" \
  --body "## Description
When a user types in the search bar or applies filters on the Arcade page, the URL does not update. Sharing or bookmarking a filtered view is impossible.

## Steps to Reproduce
1. Go to the Game Arcade
2. Type a search query
3. Copy the URL and open in a new tab — the search is gone

## Expected Behaviour
Search query and active filters should be reflected as URL query params (e.g. \`?q=treasure&filter=XLM\`).

## Proposed Fix
- Use \`useRouter\` and \`useSearchParams\` to sync filter state with URL
- Parse params on mount to restore state from URL" \
  --label "bug"

gh issue create --repo $REPO \
  --title "[BUG] Missing error boundary for failed IPFS image loads" \
  --body "## Description
When a hunt's cover image CID is invalid or the IPFS gateway is unavailable, \`HuntCoverImage.tsx\` throws an uncaught error that crashes the surrounding component tree.

## Steps to Reproduce
1. Create a hunt with an invalid CID
2. Navigate to the Game Arcade
3. The entire hunt card (or page section) disappears / throws

## Expected Behaviour
A fallback placeholder image should be shown when the IPFS image fails to load.

## Proposed Fix
- Add \`onError\` handler to the \`<Image>\` tag in \`HuntCoverImage.tsx\`
- Show a branded placeholder image (e.g. Hunty logo) on load failure
- Optionally wrap in a React Error Boundary" \
  --label "bug"

gh issue create --repo $REPO \
  --title "[BUG] Countdown timer memory leak — interval not cleared on unmount" \
  --body "## Description
The countdown timer in \`useCountdown.ts\` sets up a \`setInterval\` but may not clear it when the component unmounts (e.g. navigating away from a hunt page). This causes state updates on unmounted components and memory leaks in long sessions.

## Steps to Reproduce
1. Navigate to an active hunt page with a countdown
2. Navigate away immediately
3. Check browser console for \"Can't perform a React state update on an unmounted component\" warnings

## Proposed Fix
- Ensure the \`useEffect\` cleanup in \`useCountdown.ts\` calls \`clearInterval\`
- Add a test in the hooks test suite to verify cleanup" \
  --label "bug"

gh issue create --repo $REPO \
  --title "[BUG] Duplicate player registration not prevented client-side" \
  --body "## Description
A player who has already registered for a hunt can click the \"Join Hunt\" button again. The contract will reject the second call, but the error message shown is a raw contract error rather than a friendly \"You're already registered\" message.

## Steps to Reproduce
1. Register for a hunt
2. Refresh the page
3. Click \"Join Hunt\" again
4. Raw contract error is displayed

## Proposed Fix
- Check if the wallet address is already in the hunt's player list before calling \`registerPlayer\`
- Show a \"You're already registered\" badge instead of the Join button
- Add this check to \`RegistrationButton.tsx\`" \
  --label "bug"

gh issue create --repo $REPO \
  --title "[BUG] Missing 404 page for invalid hunt IDs" \
  --body "## Description
Navigating to \`/hunt/99999\` (a non-existent hunt ID) results in a blank page or a JavaScript error instead of a friendly 404 message.

## Steps to Reproduce
1. Go to \`/hunt/99999\` in the browser
2. Page either crashes or shows a blank white screen

## Expected Behaviour
A styled 404 page should be shown with a \"Return to Game Arcade\" button.

## Proposed Fix
- Add a check in \`/app/hunt/[id]/page.tsx\` after fetching hunt data
- If hunt is null/undefined, render \`notFound()\` from Next.js
- Create a custom \`/app/not-found.tsx\` with Hunty branding" \
  --label "bug"

gh issue create --repo $REPO \
  --title "[BUG] Profile page crashes with unhandled error when wallet is not connected" \
  --body "## Description
Navigating to \`/profile\` without a connected wallet causes a JavaScript error because the page attempts to read wallet properties from an undefined context.

## Steps to Reproduce
1. Ensure no wallet is connected
2. Navigate to \`/profile\`
3. Console error: \"Cannot read properties of undefined\"

## Expected Behaviour
Profile page should show a \"Connect your wallet to view your profile\" prompt instead of crashing.

## Proposed Fix
- Guard wallet-dependent reads with a null check in \`/app/profile/page.tsx\`
- Render a connect-wallet CTA when wallet context is undefined" \
  --label "bug"

gh issue create --repo $REPO \
  --title "[BUG] Creator stats page (/creator/stats/[id]) missing back navigation" \
  --body "## Description
The creator stats page at \`/creator/stats/[id]\` has no back button or breadcrumb. Users must use the browser's back button to return to their dashboard.

## Steps to Reproduce
1. Go to Creator Dashboard
2. Click into stats for a hunt
3. There is no visible way to navigate back to the dashboard

## Proposed Fix
- Add a \`<Link href='/dashboard'>\` back button at the top of the stats page
- Add a breadcrumb: \"Dashboard > Hunt Stats\"" \
  --label "bug"

gh issue create --repo $REPO \
  --title "[BUG] IPFS upload fails silently — no user feedback on error" \
  --body "## Description
When the IPFS upload endpoint (\`/api/ipfs/route.ts\`) fails (e.g. due to a missing API key or network error), the HuntForm silently proceeds without a cover image and no error is shown to the user.

## Steps to Reproduce
1. Set an invalid Pinata API key in environment
2. Create a hunt with a cover image
3. Submit the form — no error is displayed, cover image is missing

## Expected Behaviour
A toast notification should appear: \"Failed to upload cover image. Please try again.\"

## Proposed Fix
- Check the response from the IPFS upload call in \`HuntForm.tsx\`
- Show an error toast via \`sonner\` if the upload fails
- Block form submission until the upload either succeeds or is skipped" \
  --label "bug"

gh issue create --repo $REPO \
  --title "[BUG] NFT reward type not displayed in hunt card badge" \
  --body "## Description
Hunt cards show an XLM reward badge, but when the reward type is \"NFT\" or \"Both\", the badge still says \"XLM\" or is missing entirely. Players cannot tell at a glance what they'll win.

## Steps to Reproduce
1. Create a hunt with reward type = \"NFT\"
2. View the hunt card in the Arcade
3. Badge shows XLM or nothing instead of \"NFT\"

## Proposed Fix
- Update the reward badge logic in \`HuntCards.tsx\` to map \`rewardType\` to the correct label and colour
- XLM → blue, NFT → purple, Both → gradient" \
  --label "bug"

gh issue create --repo $REPO \
  --title "[BUG] Footer links point to placeholder / dead pages" \
  --body "## Description
Several links in \`Footer.tsx\` (e.g. \"About\", \"Blog\", \"Terms\", \"Privacy\") either link to \`#\` or to pages that don't exist yet, resulting in a broken user experience.

## Steps to Reproduce
1. Scroll to the footer on any page
2. Click \"Terms of Service\" or \"Privacy Policy\"
3. 404 or anchor stays on same page

## Proposed Fix
- Either implement the target pages or remove the links until content is ready
- Replace \`href=\"#\"\` placeholders with actual routes or \`target=\"_blank\"\` external links
- Add a \"Coming Soon\" notice if pages are planned but not yet built" \
  --label "bug"

gh issue create --repo $REPO \
  --title "[BUG] ThemeToggle causes flash of unstyled content on page load" \
  --body "## Description
On first load, the page briefly flashes with the wrong theme (light mode appearing before dark mode applies) because the theme is read from localStorage after hydration.

## Steps to Reproduce
1. Set theme to dark mode
2. Hard-refresh the page
3. Observe a brief flash of light mode before dark mode loads

## Proposed Fix
- Add an inline script in \`app/layout.tsx\` to read and apply the theme before hydration
- This is the standard FOUC fix for \`next-themes\` — see their documentation" \
  --label "bug"

gh issue create --repo $REPO \
  --title "[BUG] Race condition in answer submission — double-click submits twice" \
  --body "## Description
If a player double-clicks the \"Submit Answer\" button, two identical contract calls are made simultaneously. The second call fails with a contract error but the error is shown to the user confusingly.

## Steps to Reproduce
1. Be on a clue in an active hunt
2. Type the correct answer
3. Double-click \"Submit Answer\"
4. See a contract error flash after the success state

## Proposed Fix
- Disable the submit button immediately after the first click
- Use a ref-based guard to prevent concurrent submissions in \`PlayGame.tsx\`" \
  --label "bug"

gh issue create --repo $REPO \
  --title "[BUG] Mobile keyboard pushes hunt play UI off-screen" \
  --body "## Description
On iOS Safari and some Android browsers, when the virtual keyboard opens to type an answer, it pushes the clue card and submit button outside the visible viewport, requiring the user to scroll awkwardly.

## Steps to Reproduce
1. Open the hunt play page on a mobile device
2. Tap the answer input field
3. Virtual keyboard opens and overlaps the submit button

## Proposed Fix
- Add \`env(keyboard-inset-height)\` or \`visualViewport\` resize listener to shift the layout
- Consider using \`position: sticky\` for the submit button so it stays above the keyboard" \
  --label "bug"

gh issue create --repo $REPO \
  --title "[PERF] Hunt list re-fetches on every client navigation" \
  --body "## Description
\`getAllHunts()\` is called via TanStack Query on the Arcade page, but the \`staleTime\` is not set, causing a re-fetch every time the user navigates back to the page. With many hunts and slow RPC, this creates a noticeable loading flash.

## Proposed Fix
- Set \`staleTime: 60_000\` (1 minute) in the \`useQuery\` call on the Arcade page
- Optionally add \`gcTime: 300_000\` to keep the data warm between visits" \
  --label "performance"

gh issue create --repo $REPO \
  --title "[PERF] Hunt card images not lazy-loaded — all load on page mount" \
  --body "## Description
All hunt card cover images on the Arcade page are loaded immediately on mount regardless of whether they are in the viewport. On a page with 30+ hunts this causes excessive network requests and slow initial load.

## Proposed Fix
- Ensure all \`<Image>\` components in \`HuntCards.tsx\` use \`loading=\"lazy\"\` (Next.js default for non-priority images)
- Verify no image is incorrectly marked as \`priority\`
- Add explicit \`sizes\` prop to enable responsive image selection" \
  --label "performance"

gh issue create --repo $REPO \
  --title "[PERF] Soroban SDK not code-split — imported in initial bundle" \
  --body "## Description
\`@stellar/stellar-sdk\` and related Soroban packages are imported at the top level in multiple files, meaning they are included in the initial JS bundle even on pages that don't need blockchain interaction.

## Proposed Fix
- Use dynamic \`import()\` for Soroban/Stellar SDK in wallet and contract files
- Wrap blockchain-dependent components in \`next/dynamic\` with \`ssr: false\`
- Verify bundle split with \`next build --analyze\` (add \`@next/bundle-analyzer\`)" \
  --label "performance"

gh issue create --repo $REPO \
  --title "[PERF] LeaderboardTable rerenders on every parent state change" \
  --body "## Description
\`LeaderBoardTable\` is a child of the Arcade page which has many state variables (search, filters, tabs). Every state update re-renders the leaderboard even when leaderboard data hasn't changed.

## Proposed Fix
- Wrap \`LeaderBoardTable\` in \`React.memo\`
- Memoize the data prop passed to it with \`useMemo\`
- Add a Vitest snapshot test to confirm no unnecessary renders" \
  --label "performance"

gh issue create --repo $REPO \
  --title "[PERF] No virtual scrolling for large hunt lists" \
  --body "## Description
Rendering 100+ hunt cards in the Arcade DOM causes jank during scroll and high memory usage. Virtual scrolling would render only visible items.

## Proposed Fix
- Integrate \`@tanstack/react-virtual\` or \`react-window\` for the hunt card grid
- Ensure the existing search, filter, and sort logic still works with the virtual list
- Maintain correct grid layout (responsive columns)" \
  --label "performance"

gh issue create --repo $REPO \
  --title "[PERF] Font loading causes Cumulative Layout Shift (CLS)" \
  --body "## Description
The Hanken Grotesk custom font loaded via \`lib/font.ts\` causes layout shift because text renders first in the fallback font before the custom font loads.

## Proposed Fix
- Add \`display: 'swap'\` to the font config in \`lib/font.ts\` (likely already set, verify)
- Add \`size-adjust\` to the fallback font descriptor to minimise CLS
- Measure CLS with Lighthouse before and after" \
  --label "performance"

gh issue create --repo $REPO \
  --title "[PERF] Soroban RPC calls not debounced — excessive on rapid UI interactions" \
  --body "## Description
Some contract read calls are triggered by user interactions (e.g. checking registration status) that can fire in rapid succession. Without debouncing, this results in N parallel RPC calls.

## Proposed Fix
- Wrap non-critical RPC read calls in a \`useCallback\` with a debounce utility (lodash or custom)
- Add \`staleTime\` to TanStack Query hooks for contract data to prevent redundant fetches" \
  --label "performance"

gh issue create --repo $REPO \
  --title "[PERF] Cover images missing explicit width/height — causes layout reflow" \
  --body "## Description
Several uses of Next.js \`<Image>\` for hunt cover images are missing explicit \`width\` and \`height\` props (or use \`fill\` without a sized container). This causes Cumulative Layout Shift as images load.

## Proposed Fix
- Audit all \`<Image>\` usages across the codebase
- Add explicit dimensions or ensure \`fill\` images have a positioned container with explicit height
- Measure CLS improvement with Chrome DevTools" \
  --label "performance"

gh issue create --repo $REPO \
  --title "[A11Y] Missing focus trap in WalletModal — focus escapes the dialog" \
  --body "## Description
When \`WalletModal.tsx\` is open, pressing Tab cycles through the underlying page elements instead of being trapped within the modal. This is a critical accessibility failure for keyboard users.

## Proposed Fix
- Ensure the Dialog component from Radix UI is used (it handles focus trap automatically)
- If using a custom modal, add \`focus-trap-react\` or implement \`aria-modal=\"true\"\` correctly
- Add a Playwright a11y test to verify focus stays within the modal" \
  --label "accessibility"

gh issue create --repo $REPO \
  --title "[A11Y] Add skip-to-content link for keyboard and screen reader users" \
  --body "## Description
There is no skip navigation link, meaning keyboard users must Tab through the entire header navigation on every page before reaching main content. This is a WCAG 2.1 Level A failure.

## Proposed Fix
- Add a visually-hidden \`<a href=\"#main-content\">Skip to content</a>\` as the very first element in \`app/layout.tsx\`
- Make it visible on focus with a CSS transition
- Add \`id=\"main-content\"\` to the main content area" \
  --label "accessibility"

gh issue create --repo $REPO \
  --title "[A11Y] Hunt cards are not keyboard navigable — missing tabIndex and Enter handler" \
  --body "## Description
Hunt cards in the Arcade grid are rendered as \`<div>\` elements with click handlers but no keyboard interactivity. Keyboard users cannot navigate to or activate hunt cards.

## Proposed Fix
- Wrap hunt card click targets in \`<Link>\` components (preferred) or add \`tabIndex={0}\` + \`onKeyDown\` handlers
- Ensure focus ring is visible on hunt cards (check Tailwind \`focus-visible:ring\` classes)" \
  --label "accessibility"

gh issue create --repo $REPO \
  --title "[A11Y] Form error messages not announced to screen readers" \
  --body "## Description
Validation errors in \`HuntForm.tsx\` are displayed visually but not announced to screen reader users because they lack \`role=\"alert\"\` or \`aria-live=\"polite\"\` attributes.

## Proposed Fix
- Add \`role=\"alert\"\` or \`aria-live=\"assertive\"\` to error message elements
- Alternatively, use \`react-hook-form\` error handling with accessible \`aria-describedby\` on inputs
- Test with VoiceOver or NVDA" \
  --label "accessibility"

gh issue create --repo $REPO \
  --title "[A11Y] Missing ARIA live region for transaction status updates" \
  --body "## Description
Transaction status updates (pending, success, error) shown via \`TxToaster.tsx\` are visual-only. Screen reader users receive no notification of transaction state changes.

## Proposed Fix
- Add a visually-hidden \`<div aria-live=\"polite\" aria-atomic=\"true\">\` that mirrors toast content
- Or configure the Sonner toast library's accessibility props
- Test with a screen reader during a wallet transaction" \
  --label "accessibility"

gh issue create --repo $REPO \
  --title "[A11Y] ThemeToggle button missing accessible label" \
  --body "## Description
The \`ThemeToggle\` component renders an icon button with no visible label and no \`aria-label\`. Screen reader users cannot determine its purpose.

## Proposed Fix
- Add \`aria-label=\"Toggle dark mode\"\` to the button element in \`ThemeToggle.tsx\`
- Update \`aria-label\` dynamically based on current theme: \"Switch to light mode\" / \"Switch to dark mode\"" \
  --label "accessibility"

gh issue create --repo $REPO \
  --title "[A11Y] Icon-only buttons across the app missing aria-label" \
  --body "## Description
Multiple icon-only buttons (copy, share, QR code, cancel) throughout the app lack \`aria-label\` attributes. Screen reader users hear \"button\" with no context.

## Proposed Fix
- Audit all \`<Button>\` and \`<button>\` elements that contain only icons
- Add descriptive \`aria-label\` to each (e.g. \`aria-label=\"Copy hunt ID\"\`, \`aria-label=\"Share hunt\"\`)
- Add a lint rule (\`jsx-a11y/interactive-supports-focus\`) to catch future regressions" \
  --label "accessibility"

gh issue create --repo $REPO \
  --title "[A11Y] Add prefers-reduced-motion support for all animations" \
  --body "## Description
The app uses Framer Motion animations (transitions, confetti, etc.) that play regardless of the user's \`prefers-reduced-motion\` OS setting. This can cause discomfort for users with vestibular disorders.

## Proposed Fix
- Use the \`useReducedMotion()\` hook from Framer Motion
- Pass \`animate={prefersReducedMotion ? {} : animation}\` for all animated components
- Disable canvas-confetti when reduced motion is preferred
- Add a CSS \`@media (prefers-reduced-motion: reduce)\` rule in \`globals.css\` as a fallback" \
  --label "accessibility"

gh issue create --repo $REPO \
  --title "[A11Y] Colour contrast insufficient for secondary text in dark mode" \
  --body "## Description
Several secondary text colours in dark mode (e.g. hunt description text, timestamp labels) fail WCAG AA contrast requirements (minimum 4.5:1 for normal text).

## Steps to Reproduce
1. Enable dark mode
2. Run a contrast check on grey text over dark backgrounds (e.g. using Chrome DevTools accessibility panel)
3. Multiple elements fail at contrast ratios around 2.5:1–3:1

## Proposed Fix
- Audit dark mode text colours in \`globals.css\` and Tailwind config
- Increase contrast of secondary text to at least 4.5:1
- Use a tool like Colour Contrast Analyser to verify" \
  --label "accessibility"

gh issue create --repo $REPO \
  --title "[SECURITY] No rate limiting on IPFS upload API endpoint" \
  --body "## Description
The \`/api/ipfs/route.ts\` endpoint accepts file uploads with no rate limiting. A malicious actor could spam this endpoint to exhaust the Pinata storage quota and incur costs.

## Proposed Fix
- Implement rate limiting using \`@vercel/kv\` or middleware IP tracking
- Limit to e.g. 10 uploads per wallet address per hour
- Return \`429 Too Many Requests\` when the limit is exceeded
- Add wallet address validation before accepting the upload" \
  --label "security"

gh issue create --repo $REPO \
  --title "[SECURITY] Hunt answer hashing should use a server-side salt to prevent rainbow table attacks" \
  --body "## Description
Hunt answers are hashed client-side using SHA-256 before being stored on-chain. A determined attacker could precompute rainbow tables of common answers to reveal clue solutions without playing.

## Proposed Fix
- Include a hunt-specific salt (e.g. \`huntId + clueId\`) in the hash input: \`SHA256(answer + salt)\`
- Ensure the salt is consistent between creation and verification
- Document the hashing scheme in the contract README" \
  --label "security"

gh issue create --repo $REPO \
  --title "[SECURITY] Hunt description renders unsanitized HTML — potential XSS vector" \
  --body "## Description
If hunt descriptions or clue questions contain HTML entities or script tags and are rendered via \`dangerouslySetInnerHTML\` or via a markdown renderer without sanitization, XSS is possible.

## Proposed Fix
- Audit all places where user-provided content is rendered
- Replace any \`dangerouslySetInnerHTML\` usage with a sanitized renderer (e.g. \`DOMPurify\`)
- If markdown is supported, use \`rehype-sanitize\` to strip unsafe HTML" \
  --label "security"

gh issue create --repo $REPO \
  --title "[SECURITY] Add Content Security Policy headers to Next.js config" \
  --body "## Description
The application has no Content Security Policy (CSP) headers configured. This leaves it open to script injection attacks and data exfiltration via malicious scripts.

## Proposed Fix
- Add CSP headers in \`next.config.ts\` via the \`headers()\` API
- Allow only trusted sources: self, Stellar/Soroban RPC endpoints, IPFS gateways, Resend
- Start with a report-only policy in staging before enforcing in production
- Also add: \`X-Frame-Options: DENY\`, \`X-Content-Type-Options: nosniff\`" \
  --label "security"

gh issue create --repo $REPO \
  --title "[SECURITY] Wallet private key / mnemonic patterns should be scrubbed from console logs" \
  --body "## Description
During development and in error paths, wallet-related data may be logged to the browser console. If any sensitive data (e.g. derived keypair components) is inadvertently logged, it could be exposed in screenshots shared by users.

## Proposed Fix
- Audit all \`console.log/error/warn\` calls in \`lib/walletAdapter.ts\` and \`hooks/useFreighterWallet.ts\`
- Remove any logging of wallet objects, keys, or transaction signatures
- Add ESLint rule \`no-console\` in strict mode for production builds" \
  --label "security"

gh issue create --repo $REPO \
  --title "[TEST] Add Vitest unit tests for lib/walletAdapter.ts" \
  --body "## Description
\`lib/walletAdapter.ts\` is a critical integration point between the UI and the Freighter wallet. It currently has no unit test coverage. Bugs here silently break all wallet interactions.

## Test Cases to Cover
- \`getPublicKey()\` returns the correct address format
- \`signTransaction()\` rejects when wallet is locked
- \`isConnected()\` returns false when Freighter is not installed
- Error cases mapped to user-friendly messages

## Implementation Notes
- Mock the \`@stellar/freighter-api\` module in Vitest
- Use \`vi.mock\` for Freighter API calls" \
  --label "testing"

gh issue create --repo $REPO \
  --title "[TEST] Add Vitest unit tests for lib/huntStore.ts" \
  --body "## Description
\`lib/huntStore.ts\` handles all hunt data persistence logic but has zero test coverage. Bugs in this file corrupt the hunt list display for all users.

## Test Cases to Cover
- \`getAllHunts()\` returns the correct list from localStorage
- \`saveHunt()\` correctly serialises and stores a hunt
- \`updateHunt()\` merges fields without losing existing data
- \`deleteHunt()\` removes only the specified hunt

## Implementation Notes
- Use \`vi.stubGlobal('localStorage', ...)\` to mock localStorage in JSDOM" \
  --label "testing"

gh issue create --repo $REPO \
  --title "[TEST] Add Vitest unit tests for lib/dateUtils.ts" \
  --body "## Description
\`lib/dateUtils.ts\` is used throughout the app for formatting hunt start/end dates. Incorrect formatting causes confusing timestamps for users in different timezones.

## Test Cases to Cover
- Formatting a Unix timestamp to a human-readable date
- Handling null/undefined timestamps gracefully
- Timezone-aware formatting
- Relative time labels (\"Starts in 2 hours\", \"Ended 3 days ago\")

## Implementation Notes
- Cover edge cases: epoch 0, far-future dates, DST boundaries" \
  --label "testing"

gh issue create --repo $REPO \
  --title "[TEST] Add Vitest unit tests for hooks/useCountdown.ts" \
  --body "## Description
\`hooks/useCountdown.ts\` drives the live countdown timer shown to players. Untested timer logic can lead to incorrect time displays or the countdown not stopping at zero.

## Test Cases to Cover
- Countdown decrements correctly each second
- Stops at zero without going negative
- Returns correct formatted string (HH:MM:SS)
- Cleans up the interval on unmount (no memory leak)

## Implementation Notes
- Use \`vi.useFakeTimers()\` to control \`setInterval\` in tests" \
  --label "testing"

gh issue create --repo $REPO \
  --title "[TEST] Add Vitest unit tests for store/useStore.ts (Zustand)" \
  --body "## Description
The Zustand store in \`store/useStore.ts\` manages global hunt and player state. Without tests, regressions in state mutations affect the entire application silently.

## Test Cases to Cover
- Initial state matches expected defaults
- \`setHunts()\` replaces the hunt list
- \`addHunt()\` appends a single hunt
- \`setLeaderboard()\` updates leaderboard entries for a specific hunt

## Implementation Notes
- Reset the Zustand store between tests using \`store.setState(initialState)\`" \
  --label "testing"

gh issue create --repo $REPO \
  --title "[TEST] Add Playwright E2E test for search and filter functionality" \
  --body "## Description
The search and filter UI on the Game Arcade page is a critical discovery feature but has no E2E test coverage. Regressions go undetected.

## Test Cases to Cover
- Typing in the search bar filters hunt cards by title
- Selecting \"XLM\" reward filter hides NFT-only hunts
- Selecting \"Completed\" status filter shows only completed hunts
- Clearing the search shows all hunts again
- Filter state persists within the session

## Implementation Notes
- Add to \`e2e/\` directory
- Seed the hunt store with test data using a fixture before the test" \
  --label "testing"

gh issue create --repo $REPO \
  --title "[TEST] Add Playwright E2E test for dark mode toggle" \
  --body "## Description
The dark mode toggle is used by many users but has no automated test. A regression could leave all users stuck in one theme.

## Test Cases to Cover
- Clicking ThemeToggle switches from light to dark mode (checks CSS class on \`<html>\`)
- Preference is persisted after page reload
- System dark mode preference is respected on first load

## Implementation Notes
- Use \`page.emulateMedia({ colorScheme: 'dark' })\` to test system preference
- Check for \`class=\"dark\"\` on the \`<html>\` element" \
  --label "testing"

gh issue create --repo $REPO \
  --title "[TEST] Add visual regression tests with Playwright screenshots" \
  --body "## Description
The app has no visual regression testing. CSS changes can silently break the layout of key pages. Playwright screenshot diffing would catch regressions automatically.

## Pages to Cover
- Game Arcade (light + dark mode)
- Hunt play page
- Creator dashboard
- GameCompleteModal

## Implementation Notes
- Use \`expect(page).toHaveScreenshot()\` in Playwright
- Store baseline screenshots in \`e2e/screenshots/\`
- Configure threshold for minor anti-aliasing differences" \
  --label "testing"

gh issue create --repo $REPO \
  --title "[TEST] Add Playwright E2E test for the full hunt creation → activation → play flow" \
  --body "## Description
The most critical user journey — creating a hunt, activating it, and playing through all clues — has no single end-to-end test that covers the full flow from creator to player.

## Test Scenarios
1. Creator connects wallet, creates a hunt with 3 clues
2. Creator activates the hunt
3. Player wallet connects and registers
4. Player submits correct answers for all 3 clues
5. GameCompleteModal appears with reward info

## Implementation Notes
- Use two mock wallet fixtures (creator + player)
- May require mocking Soroban contract calls" \
  --label "testing"

gh issue create --repo $REPO \
  --title "[TEST] Add component tests for HuntForm validation" \
  --body "## Description
\`HuntForm.tsx\` has complex Zod validation logic that is entirely untested. Invalid form states or missing fields can silently submit incomplete hunts to the blockchain.

## Test Cases to Cover
- Title required — shows error when empty
- End date must be in the future
- At least one clue is required before submission
- XLM reward amount must be > 0
- Form submits only when all validations pass

## Implementation Notes
- Use \`@testing-library/react\` + \`userEvent\` to fill and submit the form
- Mock the Soroban contract calls" \
  --label "testing"

gh issue create --repo $REPO \
  --title "[TEST] Add Vitest unit tests for hooks/useLocalStorage.ts" \
  --body "## Description
\`hooks/useLocalStorage.ts\` is used for persisting user preferences and draft hunts. Untested, a bug here could silently corrupt saved data or fail to restore it.

## Test Cases to Cover
- Reads initial value from localStorage correctly
- Falls back to the default value when key is absent
- Updates localStorage when state changes
- Handles JSON parse errors without throwing

## Implementation Notes
- Use \`vi.stubGlobal('localStorage', ...))\` or a custom mock in JSDOM" \
  --label "testing"

gh issue create --repo $REPO \
  --title "[DOCS] Add architecture diagram to README" \
  --body "## Description
The README describes the three-contract system and tech stack but has no visual diagram showing how the frontend, contracts, wallet, IPFS, and email service relate to each other. New contributors struggle to understand the system quickly.

## Proposed Solution
- Create a \`docs/architecture.png\` diagram (or Mermaid diagram inline in README)
- Show: Browser ↔ Next.js ↔ Soroban RPC ↔ Contracts ↔ Freighter
- Include IPFS and Resend as supporting services
- Link from the README \"Architecture\" section" \
  --label "documentation"

gh issue create --repo $REPO \
  --title "[DOCS] Add JSDoc to all custom hooks" \
  --body "## Description
The four custom hooks in \`/hooks/\` are used throughout the app but have no JSDoc comments. New contributors must read the implementation to understand the API.

## Hooks to Document
- \`useFreighterWallet.ts\` — parameters, return shape, side effects
- \`useCountdown.ts\` — input format, return format, behaviour at zero
- \`useLocalStorage.ts\` — generic type param, default value behaviour
- \`useIsMounted.ts\` — why it exists, where to use it

## Format
Use TSDoc / JSDoc \`/** */\` style comments above each exported function/hook." \
  --label "documentation"

gh issue create --repo $REPO \
  --title "[DOCS] Document all environment variables in a .env.example file" \
  --body "## Description
New contributors must read the full \`DEVELOPMENT.md\` to discover all required environment variables. There is no \`.env.example\` file to guide setup.

## Proposed Solution
- Create a \`.env.example\` file at the repo root
- Include all required and optional variables with placeholder values and comments
- Variables to document: Pinata API key, Resend API key, RPC URLs, contract addresses, Next.js public vars
- Reference the file from \`DEVELOPMENT.md\`

## Acceptance Criteria
- [ ] \`.env.example\` exists with all variables documented
- [ ] README/DEVELOPMENT.md updated to mention it
- [ ] \`.env.example\` is committed; \`.env.local\` is in \`.gitignore\`" \
  --label "documentation"

gh issue create --repo $REPO \
  --title "[DOCS] Create a contributing guide specifically for smart contract changes" \
  --body "## Description
\`CONTRIBUTING.md\` covers frontend changes well but says nothing about how to modify, test, or deploy changes to the Soroban smart contracts. Contract contributors have no guidance.

## Proposed Content
- How to set up a local Soroban sandbox
- How to run contract unit tests
- How to deploy contracts to testnet
- How to update contract addresses in the app after redeployment
- PR checklist for contract changes (audit considerations, gas cost review)" \
  --label "documentation"

gh issue create --repo $REPO \
  --title "[DOCS] Add a deployment guide for hosting Hunty in production" \
  --body "## Description
There is no guide for deploying the Next.js app to production (Vercel, Railway, etc.). Contributors who want to run their own instance have no reference.

## Proposed Content
- Deploying to Vercel (recommended path)
- Required environment variables for production
- Setting up a Pinata account for IPFS
- Setting up Resend for email notifications
- Connecting to Stellar Mainnet vs Testnet
- Custom domain setup

## Acceptance Criteria
- [ ] Deployment guide added to \`docs/deployment.md\`
- [ ] Linked from README under \"Deployment\" section" \
  --label "documentation"

gh issue create --repo $REPO \
  --title "[INFRA] Set up GitHub Actions CI pipeline for tests" \
  --body "## Description
There is no CI pipeline. PRs can merge with broken tests, TypeScript errors, or failing lints. A GitHub Actions workflow would enforce quality gates automatically.

## Proposed Workflow
\`\`\`yaml
# .github/workflows/ci.yml
on: [push, pull_request]
jobs:
  ci:
    steps:
      - Install deps (pnpm install)
      - TypeScript type check (tsc --noEmit)
      - Lint (pnpm lint)
      - Unit tests (pnpm test)
      - E2E tests (pnpm e2e) — on PRs to main only
\`\`\`

## Acceptance Criteria
- [ ] CI workflow runs on every push and PR
- [ ] PRs cannot merge if CI fails (branch protection rule)
- [ ] Workflow badges added to README" \
  --label "infrastructure"

gh issue create --repo $REPO \
  --title "[INFRA] Configure Dependabot for automated dependency updates" \
  --body "## Description
The project has no automated dependency update tooling. Outdated dependencies accumulate security vulnerabilities and technical debt silently.

## Proposed Solution
- Add \`.github/dependabot.yml\` for both the web app (\`/\`) and mobile app (\`/mobile\`)
- Configure weekly updates for \`npm\` packages
- Group minor/patch updates to reduce PR noise
- Assign updates to a specific reviewer

## Acceptance Criteria
- [ ] \`.github/dependabot.yml\` is committed
- [ ] Dependabot opens weekly update PRs
- [ ] Grouped minor updates reduce PR count" \
  --label "infrastructure"

gh issue create --repo $REPO \
  --title "[INFRA] Add bundle size analysis to CI with size limits" \
  --body "## Description
There is no automated check on bundle size. Large dependencies can be accidentally added (e.g. an unneeded polyfill) and only noticed after deploy.

## Proposed Solution
- Add \`@next/bundle-analyzer\` for local analysis
- Use \`bundlesize\` or \`size-limit\` in CI to enforce limits
- Set an initial limit based on current build output
- CI fails if any bundle exceeds the limit

## Acceptance Criteria
- [ ] \`pnpm analyze\` generates a bundle report
- [ ] CI checks bundle sizes on PRs
- [ ] Size limits are documented in \`package.json\`" \
  --label "infrastructure"

gh issue create --repo $REPO \
  --title "[INFRA] Add error monitoring with Sentry" \
  --body "## Description
Production errors are currently invisible unless a user reports them. Integrating Sentry would give automatic error tracking, stack traces, and user impact data.

## Proposed Solution
- Install \`@sentry/nextjs\`
- Configure source map upload in \`next.config.ts\`
- Wrap the root layout with Sentry error boundary
- Instrument Soroban contract call errors as custom Sentry events
- Add \`SENTRY_DSN\` to \`.env.example\`

## Acceptance Criteria
- [ ] Unhandled errors are captured in Sentry
- [ ] Contract call failures are reported as custom events
- [ ] Source maps are uploaded so stack traces are readable
- [ ] Sentry is configured to not capture wallet addresses as PII" \
  --label "infrastructure"

gh issue create --repo $REPO \
  --title "[INFRA] Add a Docker Compose development environment" \
  --body "## Description
New contributors must manually install Node, pnpm, and configure environment variables. A Docker Compose setup would let anyone start developing with a single command.

## Proposed Solution
- Create a \`Dockerfile.dev\` using Node 18 Alpine
- Create \`docker-compose.yml\` with the web app service
- Mount source directory as a volume for hot reload
- Document Docker setup in \`DEVELOPMENT.md\`

## Acceptance Criteria
- [ ] \`docker compose up\` starts the dev server
- [ ] Hot reload works with source volume mount
- [ ] \`DEVELOPMENT.md\` documents the Docker option" \
  --label "infrastructure"

gh issue create --repo $REPO \
  --title "[FEAT] Add a \"My Registrations\" section to the player profile page" \
  --body "## Description
Players who have registered for upcoming hunts have no way to see their pending registrations in one place. They must remember hunt IDs or navigate back through their history.

## Proposed Solution
- Add a \"Registered Hunts\" section in \`/app/profile/page.tsx\`
- Fetch registrations from the PlayerRegistration contract for the connected wallet
- Show: hunt title, start time, status (Registered / In Progress / Completed)
- Link each entry to the hunt play page

## Acceptance Criteria
- [ ] Profile page shows list of registered hunts
- [ ] Status badge updates correctly based on hunt state
- [ ] Completed hunts link to the leaderboard result
- [ ] Empty state shown when no registrations exist" \
  --label "enhancement"

gh issue create --repo $REPO \
  --title "[FEAT] Add a clue difficulty indicator for creators" \
  --body "## Description
Hunt creators have no way to signal that certain clues are harder than others. A per-clue difficulty tag (Easy / Medium / Hard) would help creators balance their hunt and give players a difficulty curve.

## Proposed Solution
- Add optional \`difficulty\` field to the \`Clue\` interface in \`lib/types.ts\`
- Add a difficulty selector per clue row in \`HuntForm.tsx\`
- Display the difficulty badge next to each clue in the play interface
- No on-chain storage required — store in metadata

## Acceptance Criteria
- [ ] Creator can tag each clue with a difficulty
- [ ] Difficulty badge is shown in the clue card during play
- [ ] Easy/Medium/Hard maps to green/yellow/red colours" \
  --label "enhancement"

gh issue create --repo $REPO \
  --title "[FEAT] Add a public API for third-party hunt integrations" \
  --body "## Description
Developers building Discord bots, Telegram bots, or other Stellar apps should be able to query Hunty hunt data via a simple REST or GraphQL API without reading the contract directly.

## Proposed Solution
- Implement \`/api/v1/hunts\` — list all public active hunts
- Implement \`/api/v1/hunts/[id]\` — get hunt details
- Implement \`/api/v1/hunts/[id]/leaderboard\` — get hunt leaderboard
- Return JSON; authenticate write endpoints with API keys
- Document the API in \`docs/api.md\`

## Acceptance Criteria
- [ ] GET endpoints are public and return correct data
- [ ] API includes pagination support
- [ ] API is documented with example responses
- [ ] Rate limiting is applied" \
  --label "enhancement"

gh issue create --repo $REPO \
  --title "[FEAT] Show a live player count on hunt cards" \
  --body "## Description
Hunt cards currently show the number of clues but not the number of registered players. A live player count would create social proof and FOMO, increasing registrations.

## Proposed Solution
- Fetch the registered player count from the PlayerRegistration contract
- Display it on \`HuntCards.tsx\` (e.g. \"12 players registered\")
- Add a \"Trending\" badge for hunts with >50 players
- Cache the count to avoid excessive RPC calls

## Acceptance Criteria
- [ ] Hunt cards show registered player count
- [ ] Count updates on each arcade page load
- [ ] \"Trending\" badge appears when threshold is met" \
  --label "enhancement"

gh issue create --repo $REPO \
  --title "[FEAT] Add a \"Recently Completed\" hunts section to the Arcade" \
  --body "## Description
The Arcade only surfaces active hunts by default. Showing recently completed hunts with winner highlights would keep the page interesting even when no active hunts are running.

## Proposed Solution
- Add a \"Recently Completed\" horizontal scroll section above the main grid
- Show the top 5 most recently completed hunts
- Each card shows: title, winner address (truncated), reward claimed
- Filter these out of the main \"Active\" grid to avoid confusion

## Acceptance Criteria
- [ ] \"Recently Completed\" section is visible on the Arcade
- [ ] Shows up to 5 most recent completions
- [ ] Winner and reward are displayed on each card
- [ ] Section is hidden if no completed hunts exist" \
  --label "enhancement"

gh issue create --repo $REPO \
  --title "[FEAT] Add a native mobile app notification system via Expo" \
  --body "## Description
The mobile app in \`/mobile/\` has no push notification support. Mobile players miss hunt start events and leaderboard updates unless they actively open the app.

## Proposed Solution
- Integrate \`expo-notifications\` for push notification support
- Register device token on wallet connect
- Trigger push notifications for: hunt start, answer correct, outranked on leaderboard, hunt ending soon
- Handle notification tap to deep-link into the relevant hunt

## Acceptance Criteria
- [ ] Users can opt-in to push notifications on mobile
- [ ] Hunt start sends a notification to registered players
- [ ] Tapping a notification navigates to the relevant screen" \
  --label "enhancement"

gh issue create --repo $REPO \
  --title "[FEAT] Add a social feed / timeline of player activity" \
  --body "## Description
The Global Activity Feed shows on-chain events but they are anonymous (wallet addresses). A social feed where players can optionally set a display name and avatar would make the activity stream more engaging.

## Proposed Solution
- Allow players to set a display name and avatar in their profile
- Store display name on-chain or in a lightweight off-chain mapping
- Update \`GlobalActivityFeed.tsx\` to show display names instead of truncated addresses
- Link each activity item to the player's public profile

## Acceptance Criteria
- [ ] Players can set a display name in profile settings
- [ ] Activity feed shows display names when available
- [ ] Falls back to truncated wallet address when no name is set" \
  --label "enhancement"

gh issue create --repo $REPO \
  --title "[FEAT] Add a \"Hunt of the Week\" featured banner" \
  --body "## Description
The Arcade has no editorial curation. A \"Hunt of the Week\" banner at the top, selected by the Hunty team or by community vote, would give high-quality hunts extra visibility.

## Proposed Solution
- Add a \`isFeaturedOfWeek\` flag to \`StoredHunt\` controlled via an admin endpoint
- Render a full-width hero banner at the top of the Arcade for the featured hunt
- Banner shows: title, cover image, reward, creator name, CTA button
- Rotate weekly via a scheduled job or manual update

## Acceptance Criteria
- [ ] Featured hunt banner renders at the top of the Arcade
- [ ] Banner links directly to the hunt play page
- [ ] Admin can set/update the featured hunt
- [ ] Gracefully hidden when no featured hunt is set" \
  --label "enhancement"

gh issue create --repo $REPO \
  --title "[FEAT] Add hunt end time extension capability for creators" \
  --body "## Description
Creators cannot extend the end time of an already-active hunt. If a hunt is popular or started late, there is no way to give players more time without cancelling and recreating it.

## Proposed Solution
- Add an \`extendHuntEndTime(huntId, newEndTime)\` function to the HuntyCore contract
- Add an \"Extend Deadline\" button in the creator dashboard for active hunts
- Show a date/time picker for the new end time (must be in the future)
- Emit an \`HuntExtended\` event visible in the activity feed

## Acceptance Criteria
- [ ] Creator can extend an active hunt's end time
- [ ] New end time must be later than the current end time
- [ ] Countdown timer on the hunt page updates in real-time
- [ ] Activity feed shows the extension event" \
  --label "enhancement"

gh issue create --repo $REPO \
  --title "[FEAT] Add wallet-less spectator mode to watch hunt leaderboards live" \
  --body "## Description
Non-wallet users (e.g. someone on a friend's computer) cannot view hunt leaderboards without connecting a wallet first. A spectator mode would allow anyone to watch live progress.

## Proposed Solution
- Allow the hunt leaderboard page and \`/hunt/[id]\` page to be viewed without wallet connection
- Gate only registration and answer submission behind wallet connect
- Add a \"Watch Live\" button on hunt cards that opens the leaderboard in spectator mode
- Auto-refresh leaderboard every 30 seconds in spectator mode

## Acceptance Criteria
- [ ] Hunt details and leaderboard viewable without wallet
- [ ] Registration and answer buttons prompt wallet connect
- [ ] Spectator leaderboard auto-refreshes every 30s" \
  --label "enhancement"

gh issue create --repo $REPO \
  --title "[REFACTOR] Replace hardcoded Stellar RPC URLs with environment variables" \
  --body "## Description
Soroban RPC URLs (testnet/mainnet) may be hardcoded in \`lib/soroban/client.ts\`. These should be configurable via environment variables to support different environments without code changes.

## Proposed Changes
- Move all RPC URLs to \`.env.local\` vars: \`NEXT_PUBLIC_SOROBAN_RPC_URL\`, \`NEXT_PUBLIC_NETWORK_PASSPHRASE\`
- Default to testnet values in \`.env.example\`
- Update \`lib/soroban/client.ts\` to read from \`process.env\`
- Document in \`DEVELOPMENT.md\`

## Acceptance Criteria
- [ ] No hardcoded RPC URLs remain in source code
- [ ] \`.env.example\` documents the new variables
- [ ] App starts correctly using only env vars for network config" \
  --label "refactor"

gh issue create --repo $REPO \
  --title "[REFACTOR] Extract wallet connection logic into a dedicated WalletProvider context" \
  --body "## Description
Wallet connection logic is spread across \`WalletModal.tsx\`, \`hooks/useFreighterWallet.ts\`, and parts of \`app/page.tsx\`. This makes the wallet state inconsistent and hard to test.

## Proposed Changes
- Create \`lib/contexts/WalletContext.tsx\` as the single source of truth for wallet state
- Expose: \`{ address, balance, isConnected, connect, disconnect }\`
- Wrap app in \`WalletProvider\` in \`app/providers.tsx\`
- Update all components to consume \`useWallet()\` instead of prop drilling

## Acceptance Criteria
- [ ] Single \`WalletContext\` is the source of truth for wallet state
- [ ] No wallet logic remains in page-level components
- [ ] All existing wallet functionality still works" \
  --label "refactor"

gh issue create --repo $REPO \
  --title "[REFACTOR] Replace manual className concatenation with cn() utility consistently" \
  --body "## Description
Some components use raw template literals for conditional class names (\`\`\`className={\`class \${condition ? 'a' : 'b'}\`}\`\`\`) while others use the \`cn()\` helper. The codebase should be consistent.

## Proposed Changes
- Search for all manual string-concatenated classNames in \`/components/\`
- Replace each with \`cn()\` from \`lib/utils.ts\`
- This makes class names readable, tree-shakeable, and consistent with \`tailwind-merge\`

## Acceptance Criteria
- [ ] No raw template literals for className outside of \`cn()\`
- [ ] All components import \`cn\` from \`@/lib/utils\`" \
  --label "refactor"

gh issue create --repo $REPO \
  --title "[REFACTOR] Consolidate all contract address constants into a single config file" \
  --body "## Description
Contract addresses appear to be scattered across \`lib/contracts/config.ts\` and possibly inline in individual contract files. A single authoritative config is easier to update when contracts are redeployed.

## Proposed Changes
- Ensure all contract addresses are only in \`lib/contracts/config.ts\`
- Export a \`CONTRACTS\` object with named keys (\`HUNTY_CORE\`, \`REWARD_MANAGER\`, \`NFT_REWARD\`)
- All contract interaction files import from this single source
- Values fall back to environment variables

## Acceptance Criteria
- [ ] Zero hardcoded contract addresses outside \`config.ts\`
- [ ] Config is driven by env vars with sensible testnet defaults" \
  --label "refactor"

gh issue create --repo $REPO \
  --title "[REFACTOR] Improve TypeScript strict null checks across the codebase" \
  --body "## Description
\`tsconfig.json\` has \`strict: true\` but several components use optional chaining inconsistently and some functions return \`undefined\` when callers expect a value. This creates runtime errors that TypeScript should catch.

## Proposed Changes
- Run \`tsc --noEmit\` and fix all type errors
- Eliminate all \`as any\` casts and replace with proper types
- Ensure all async functions have explicit return types
- Add \`exactOptionalPropertyTypes: true\` to tsconfig (stretch goal)

## Acceptance Criteria
- [ ] \`pnpm tsc --noEmit\` passes with zero errors
- [ ] No \`as any\` casts remain in production code
- [ ] All explicit return types are added to exported functions" \
  --label "refactor"

echo "All issues created successfully!"
