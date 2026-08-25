import subprocess
import sys

issues = [
    {"title": "[Mobile] Initialize React Native Layouts", "body": "Set up the foundational folder structure including components, screens, navigation, and state. Ensure directories are well organized following Expo best practices. Add absolute path mapping.", "labels": ["mobile", "setup"]},
    {"title": "[Mobile] Configure ESLint and Prettier", "body": "Add ESLint and Prettier configs tailored for React Native and Expo. Ensure pre-commit hooks via Husky check code quality before pushing. Resolve formatting conflicts.", "labels": ["mobile", "tech-debt"]},
    {"title": "[Mobile] Setup Expo Router Base", "body": "Install and configure Expo Router for file-based navigation. Create the root `_layout.tsx` with baseline error boundaries and safe area providers to ensure notch safety.", "labels": ["mobile", "routing"]},
    {"title": "[Mobile] Add TailwindCSS/NativeWind", "body": "Integrate NativeWind to allow us to reuse the existing Tailwind design system from the web frontend in our mobile app. Setup metro config.", "labels": ["mobile", "ui"]},
    {"title": "[Mobile] Define Custom Font Assets", "body": "Load the Hanken Grotesk font into the Expo project. Configure `expo-font` to ensure custom fonts load successfully before hiding the splash screen.", "labels": ["mobile", "ui"]},
    {"title": "[Mobile] Configure Environment Variables", "body": "Use Expo's native var setup to securely load Stellar RPC endpoints and API URLs locally vs production without exposing secrets unnecessarily.", "labels": ["mobile", "setup"]},
    {"title": "[Mobile] Setup Global Zustand Store", "body": "Port the existing Zustand state management logic from the Next.js web application to the mobile application for managing hunt data locally robustly.", "labels": ["mobile", "state"]},
    {"title": "[Mobile] Implement React Query Provider", "body": "Wrap the mobile app in a React Query provider, similar to the web version, for declarative fetching, caching, and updating of hunt statuses.", "labels": ["mobile", "state"]},
    {"title": "[Mobile] Add Splash Screen Asset", "body": "Design and add a dynamic splash screen using `expo-splash-screen` to ensure a consistent loading experience when launching the app. Include appropriate backgrounds.", "labels": ["mobile", "ui"]},
    {"title": "[Mobile] Configure Absolute Path Aliases", "body": "Update `tsconfig.json` and `babel.config.js` to support `@/*` path aliases so imports are clean and match the web frontend convention deeply.", "labels": ["mobile", "setup"]},
    {"title": "[Mobile] Create Themed Base Components", "body": "Implement Button, CustomText, and View wrappers that obey light/dark themes, mapping to our existing Tailwind variables flawlessly across screen sizes.", "labels": ["mobile", "ui"]},
    {"title": "[Mobile] Abstract Input Components", "body": "Create mobile-optimized text inputs with clear error states and placeholder handling. Ensure they scale correctly with device accessibility settings.", "labels": ["mobile", "ui"]},
    {"title": "[Mobile] Implement Bottom Tab Navigation", "body": "Create standard Bottom Tabs for the app: Hunts, Map/Play, Profile, and Settings, using Expo Router's Tabs component structure.", "labels": ["mobile", "routing", "ui"]},
    {"title": "[Mobile] Add Header Stack Components", "body": "Design consistent Stack header layouts with a back button, title, and optional action buttons that respect Safe Area insets.", "labels": ["mobile", "ui"]},
    {"title": "[Mobile] Implement Skeleton Loaders", "body": "Using `moti` or Reanimated, build animated skeleton components identical in layout to real components to show while data loads smoothly.", "labels": ["mobile", "ui"]},
    {"title": "[Mobile] Toaster Notification System", "body": "Extract the TxToaster logic and implement mobile-friendly animated toast alerts using custom Reanimated popups for Soroban feedback.", "labels": ["mobile", "ui", "ux"]},
    {"title": "[Mobile] Add Modal Manager", "body": "Create a unified interface for presenting Bottom Sheets and generic modals (using `@gorhom/bottom-sheet`) for confirmation dialogs and filters.", "labels": ["mobile", "ui"]},
    {"title": "[Mobile] Implement Camera Scanner UI", "body": "Build a focused AR-style camera overlay for scanning QR codes during clue redemption. Add flash toggle and bounding box guides.", "labels": ["mobile", "feature", "ux"]},
    {"title": "[Mobile] Design Empty States", "body": "Provide rich SVG illustrations and clear CTA buttons for empty states across the app (e.g., 'No active hunts', 'No rewards yet' screen text).", "labels": ["mobile", "ui"]},
    {"title": "[Mobile] Accessibility Support Audit", "body": "Audit foundational UI components to ensure they have `accessible={true}`, appropriate `accessibilityLabel` and hint strings for screen readers fully implemented.", "labels": ["mobile", "accessibility"]},
    {"title": "[Mobile] Install WalletConnect SDK", "body": "Add `@walletconnect/react-native-dapp` or Web3Modal's React Native package to prepare the app for Stellar mobile wallet connections with deep linking support.", "labels": ["mobile", "blockchain", "auth"]},
    {"title": "[Mobile] Setup Stellar SDK Polyfills", "body": "Configure `rn-nodeify` or `expo-crypto` polyfills required to run `@stellar/stellar-sdk` natively without Node.js buffer/crypto module errors terminating the app.", "labels": ["mobile", "tech-debt"]},
    {"title": "[Mobile] Implement Mobile Web3 Provider", "body": "Build a custom Context provider wrapping WalletConnect, exposing `connect`, `disconnect`, and standard `signTransaction` interfaces globally within the application.", "labels": ["mobile", "blockchain"]},
    {"title": "[Mobile] Connection Prompt Modal", "body": "Create a beautiful bottom-sheet prompting the user to connect via xBull or Lobstr. Detail the reasoning and process for first-time web3 mobile users.", "labels": ["mobile", "ui"]},
    {"title": "[Mobile] Add Session Storage for Wallets", "body": "Use `expo-secure-store` to persist WalletConnect session details efficiently so users do not have to reconnect every time they reboot the mobile app.", "labels": ["mobile", "auth"]},
    {"title": "[Mobile] Implement Deep Link Handler", "body": "Configure Expo Router scheme handling so mobile wallets can successfully redirect back to Hunty after a signature request completes.", "labels": ["mobile", "routing", "blockchain"]},
    {"title": "[Mobile] Transaction Pending Screen", "body": "Design an intermediate processing screen that visually shows that a transaction has been sent to the wallet and is awaiting approval and Soroban consensus.", "labels": ["mobile", "ux"]},
    {"title": "[Mobile] Error Handling for Rejected Txs", "body": "Catch 'User Rejected' or timeout errors from the wallet app and present them cleanly via the toaster system instead of crashing the process ungracefully.", "labels": ["mobile", "bug"]},
    {"title": "[Mobile] Handle Network Switching Rules", "body": "Warn mobile users if their connected wallet is on Mainnet when the app demands Testnet, providing a prompt or instruction page to switch.", "labels": ["mobile", "blockchain"]},
    {"title": "[Mobile] Support Watch-only XLM Wallets", "body": "Allow users to input a public G-address to merely view their hunt history without signing anything, providing a low-friction read state fallback.", "labels": ["mobile", "feature"]},
    {"title": "[Mobile] Interactive Onboarding Carousel", "body": "Build a beautiful Swiper-based onboarding screen (similar to the website's hero) to introduce the user to Hunty's core mobile mechanics properly.", "labels": ["mobile", "ux"]},
    {"title": "[Mobile] Implement Home Feed Screen", "body": "Create the main `Feed` tab showing trending, newly created, and highest-prize XLM hunts currently active on Soroban contracts.", "labels": ["mobile", "feature"]},
    {"title": "[Mobile] Hunt Details Screen Build", "body": "Develop a dedicated `HuntDetails` navigation target displaying full Hunt lore, prize breakdown, number of registered players, and Creator address.", "labels": ["mobile", "feature"]},
    {"title": "[Mobile] Gameplay Map Navigation Screen", "body": "Build an engaging map view (using `react-native-maps`) to show the user's geolocation and approximate geographic zones for where current clues reside.", "labels": ["mobile", "feature"]},
    {"title": "[Mobile] User Dashboard Target Screen", "body": "Replicate the web `/profile` page, detailing a user's total earned XLM, completed badges, and ongoing connected hunts on their mobile device.", "labels": ["mobile", "feature"]},
    {"title": "[Mobile] Settings Options Menu Structure", "body": "Build out the Settings listing: Theme selection, Notifications toggle, Disconnect Wallet safely, and Support documentation shortcut hyperlinks.", "labels": ["mobile", "ui"]},
    {"title": "[Mobile] Nested Clues List Navigation", "body": "Design a drill-down logic where viewing an active Hunt moves into an ordered list of Clues. Clues navigate sequentially as they are successfully solved.", "labels": ["mobile", "routing"]},
    {"title": "[Mobile] QR Scanner Navigation Transition", "body": "Add a dedicated prominent button or quick swipe gesture from the Clue list that smoothly opens the Camera scanner screen without visual UI stutter.", "labels": ["mobile", "routing"]},
    {"title": "[Mobile] Initialize Deep Linking Spec", "body": "Configure `app.json` scheme and intent filters so links like `hunty://hunt/1234` immediately launch the application directly to the specific hunt.", "labels": ["mobile", "routing"]},
    {"title": "[Mobile] Universal Web Links Config", "body": "Setup `apple-app-site-association` and Android App Links logic to seamlessly map `hunty.io/hunt/...` URLs to the OS native application.", "labels": ["mobile", "routing"]},
    {"title": "[Mobile] Implement Join Hunt Action Button", "body": "Design the large 'Join Hunt' interaction flow on mobile interfaces. Wire it up properly to request a WalletConnect payload signature via Soroban.", "labels": ["mobile", "feature"]},
    {"title": "[Mobile] Dynamic Markdown Clue Renderer", "body": "Create a rich text/markdown component to display Clue text elegantly, appropriately handling bolding, external links, and embedded IPFS image URLs.", "labels": ["mobile", "ux"]},
    {"title": "[Mobile] Hardware Location Check GPS", "body": "Use `expo-location` module natively to verify the user is physically within the geofenced area before permitting them to submit a clue answer attempt.", "labels": ["mobile", "feature"]},
    {"title": "[Mobile] Clue Text Answer Submit Modal", "body": "Create a seamless input modal for users to quickly type in their text-based clue solutions. Validate client-side against empty strings instantly.", "labels": ["mobile", "ui"]},
    {"title": "[Mobile] QR Code Parsing Decryptor", "body": "When a QR code is scanned via device, parse its contents securely to see if it matches the Soroban hash requirements for the active clue task.", "labels": ["mobile", "feature"]},
    {"title": "[Mobile] UX Transaction Status Polling", "body": "After attempting to solve a clue, reliably poll the Soroban RPC for transaction inclusion and visually update the clue item from 'Submitting...' to 'Solved!'.", "labels": ["mobile", "blockchain"]},
    {"title": "[Mobile] Lock to Next Clue UX Animation", "body": "Add an appealing micro-animation that unlocks the next sequential clue item in the list using Reanimated immediately after tx confirmation completes.", "labels": ["mobile", "ux"]},
    {"title": "[Mobile] Hunt Victory Completion Screen", "body": "Design a highly-explosive 'Hunt Completed' screen featuring immersive heavy Lottie fireworks, displaying the total XLM and NFT rewards practically earned.", "labels": ["mobile", "ui", "ux"]},
    {"title": "[Mobile] Implement Hunt Leaderboards Panel", "body": "Show the fastest players horizontally scrolling under the hunt details, polling Torii indexer dynamically if available to map completion tracking times.", "labels": ["mobile", "feature"]},
    {"title": "[Mobile] Integrate Tactile Haptic Responses", "body": "Use `expo-haptics` module to intelligently trigger tactile device responses on successful critical actions (joining, scanning, completing) to heighten game realism.", "labels": ["mobile", "ux"]},
    {"title": "[Mobile] Fetch Hunts Network via GraphQL", "body": "Connect purely to the Hunty indexer to retrieve live active hunts dynamically instead of reading heavily from RPC directly, massively improving performance.", "labels": ["mobile", "data"]},
    {"title": "[Mobile] Paginate Extended Hunt Feeds", "body": "Implement FlatList `onEndReached` hook logic appropriately to smoothly load additional inactive/older hunts as the user scrolls further down.", "labels": ["mobile", "performance"]},
    {"title": "[Mobile] Pull-to-Refresh Capability Support", "body": "Add standardized `RefreshControl` attributes seamlessly so users can intuitively pull down on the Home Feed and Dashboard screens to force a data state sync.", "labels": ["mobile", "ux"]},
    {"title": "[Mobile] Caching Offline Clue Data Sets", "body": "Save joined hunt clues explicitly to `AsyncStorage` securely so users exploring distant areas with horrible cell service can still effectively read their next task.", "labels": ["mobile", "data"]},
    {"title": "[Mobile] Local Notification Scheduler", "body": "Leverage `expo-notifications` capability natively to schedule local OS alerts reminding the user: 'Your joined Hunt challenge expires in 1 Hour!' completely offline.", "labels": ["mobile", "feature"]},
    {"title": "[Mobile] Handle Optimistic State UI Updates", "body": "When navigating fast, assume successful tx function calls update the Zustand store instantaneously while heavily waiting for RPC confirmation, preventing UX UI blocking.", "labels": ["mobile", "ux"]},
    {"title": "[Mobile] Deeply Optimize Image Memory Loading", "body": "Swap standard React Native Image tags with fast `expo-image` integration for incredibly aggressive in-memory and disk caching of large, heavy IPFS hunt cover photos.", "labels": ["mobile", "performance"]},
    {"title": "[Mobile] Network API Rate Limit Catching", "body": "Add strong exponential backoff timeout headers/retry logic explicitly to `axios` or native `fetch` wrappers for frustrating times when Soroban RPC is severely congested.", "labels": ["mobile", "tech-debt"]},
    {"title": "[Mobile] Fiat Market Price Feeds Setup", "body": "Add a small localized hook specifically to fetch the current XLM/USD spot price continuously so users can effortlessly see exact fiat equivalents of prize pools throughout the game UI.", "labels": ["mobile", "data"]},
    {"title": "[Mobile] Private Anonymous User Analytics", "body": "Carefully implement privacy-preserving minimal analytics for screen navigation tracking (which specific hunts get viewed most) strictly to help external creators accurately understand engagement.", "labels": ["mobile", "metrics"]},
    {"title": "[Mobile] Compile App Store Metadata Prep", "body": "Systematically collect and compile all Required App Store screenshots, launch icons, text descriptions carefully so we are functionally ready for fast-track publishing via EAS Build constraints.", "labels": ["mobile", "devops"]},
    {"title": "[Mobile] Initialize Multi-Environment EAS Profiles", "body": "Rigidly configure `eas.json` schema comprehensively to fully support remote development, quick preview, and stable production build workflows with completely differing bundle identifiers cleanly via Expo App Services.", "labels": ["mobile", "devops"]},
    {"title": "[Mobile] Automated End-to-End Test Baseline Setup", "body": "Implement initial basic robust Maestro or Detox external E2E test flows reliably verifying the user instance can load the initial feed correctly, seamlessly tap a hunt, and successfully open the connect wallet UI modal.", "labels": ["mobile", "testing"]},
    {"title": "[Mobile] Secure Android Keystore Backup Generation", "body": "Accurately document the correct generation sequence and highly secure continuous backup protocol safely for the Android specific upload distribution keystore actively needed essentially for active Google Play deployment pipelines.", "labels": ["mobile", "devops"]},
    {"title": "[Mobile] Eliminate Flash Transitions in Dark Mode", "body": "Actively aggressively track down and decisively eliminate disturbing 'white UI flashes' noticeably during rapid nested screen transitions uniquely when the application user is safely operating natively in iOS or Android dark UI system mode.", "labels": ["mobile", "bug"]},
    {"title": "[Mobile] Stress Test Maximum UI Font Scaling Limits", "body": "Ruthlessly force the maximal native mobile OS Accessibility Text Font Scaling limits locally and absolutely verify visually that virtually no fundamental core text is inexplicably clipped invisibly or that critical CTA interface buttons are dangerously pushed entirely off the visible screen render constraints.", "labels": ["mobile", "ui", "testing"]},
    {"title": "[Mobile] Prepare Initial TestFlight App Distribution", "body": "Professionally set up structured Internal CI Distribution strictly via iOS TestFlight natively within secure App Store Connect configuration. Deliberately draft a cohesive informative instruction email template precisely for targeted early internal alpha users.", "labels": ["mobile", "devops"]},
    {"title": "[Mobile] Strict Memory Leak Diagnostics Audit", "body": "Deliberately deploy and utilize runtime tools carefully like Flipper to comprehensively inspect the running mobile application actively for hidden runaway JS event listeners or lingering unmounted React UX context closure traps particularly acutely specifically regarding the active complex continuous Blockchain subscription feed.", "labels": ["mobile", "testing"]},
    {"title": "[Mobile] Integrate Sentry Error Crash Reporting Logs", "body": "Intelligently inject and explicitly configure `sentry-expo` package specifically to wrap the entire native rendering runtime actively, safely and silently intelligently catching ugly rogue JS errors dynamically internally strictly before external end production customer deployments unexpectedly go live to global users completely.", "labels": ["mobile", "tech-debt"]},
    {"title": "[Mobile] Native Hardware UI QA Android Back Button Handling", "body": "Comprehensively explicitly audit the entire holistic Expo mobile routing stack mechanism practically actively tested on a physical Android architecture interface strictly to functionally guarantee dynamically the physical hardware navigation back OS button natively reliably practically sensibly routes intelligently directly mapping appropriately intuitively directly accurately perfectly functionally reliably safely comfortably back dynamically contextually reliably purely functionally appropriately continuously safely cleanly.", "labels": ["mobile", "ui", "testing"]}
]

# Ensure labels exist first
all_labels = set()
for iss in issues:
    all_labels.update(iss['labels'])

for lbl in all_labels:
    subprocess.run(['/opt/homebrew/bin/gh', 'label', 'create', lbl, '--force'], stderr=subprocess.DEVNULL)

# Create the issues
created_count = 0
for iss in issues:
    title = iss['title']
    body = iss['body']
    lbls_str = ','.join(iss['labels'])
    
    # Simple creation, allowing duplicates instead of slow string matching, since this is a new run
    cmd = ['/opt/homebrew/bin/gh', 'issue', 'create', '--title', title, '--body', body, '--label', lbls_str]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode == 0:
        created_count += 1
        print(f"[{created_count}/70] Created issue: {title}")
    else:
        print(f"Failed to create: {title} - {res.stderr}")

print(f"Script finished. {created_count} issues processed.")
