Issue #375 — [INFRA] Set up GitHub Actions CI Pipeline
markdown## Steps to Resolve

1. **Create the workflow file**
   - Create `.github/workflows/ci.yml` in the repo root

2. **Configure workflow triggers**
```yaml
   on:
     push:
       branches: ["*"]
     pull_request:
       branches: ["*"]
```

3. **Define the CI job steps**
```yaml
   jobs:
     ci:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4

         - name: Setup pnpm
           uses: pnpm/action-setup@v3
           with:
             version: 8

         - name: Setup Node.js
           uses: actions/setup-node@v4
           with:
             node-version: 20
             cache: "pnpm"

         - name: Install dependencies
           run: pnpm install --frozen-lockfile

         - name: TypeScript type check
           run: pnpm tsc --noEmit

         - name: Lint
           run: pnpm lint

         - name: Unit tests
           run: pnpm test

         - name: E2E tests (PRs to main only)
           if: github.base_ref == 'main'
           run: pnpm test:e2e
```

4. **Enable branch protection**
   - Go to **Settings → Branches → Add rule** for `main`
   - Check **Require status checks to pass before merging**
   - Select the `ci` job as a required check

5. **Add CI badge to README**
```markdown
   ![CI](https://github.com/Samuel1-ona/hunty/actions/workflows/ci.yml/badge.svg)
```

## Acceptance Checklist
- [ ] CI runs on every push and PR
- [ ] PRs cannot merge if CI fails (branch protection rule)
- [ ] Status badge added to README

Issue #376 — [INFRA] Configure Dependabot
markdown## Steps to Resolve

1. **Create the Dependabot config file**
   - Create `.github/dependabot.yml` in the repo root

2. **Configure updates for both apps**
```yaml
   version: 2
   updates:
     # Web app (root)
     - package-ecosystem: "npm"
       directory: "/"
       schedule:
         interval: "weekly"
         day: "monday"
       groups:
         minor-and-patch:
           update-types:
             - "minor"
             - "patch"
       reviewers:
         - "Samuel1-ona"
       open-pull-requests-limit: 10

     # Mobile app
     - package-ecosystem: "npm"
       directory: "/mobile"
       schedule:
         interval: "weekly"
         day: "monday"
       groups:
         minor-and-patch:
           update-types:
             - "minor"
             - "patch"
       reviewers:
         - "Samuel1-ona"
       open-pull-requests-limit: 5
```

3. **Verify it's working**
   - Commit and push the file
   - Check **Insights → Dependency graph → Dependabot** to confirm it's active
   - Dependabot PRs should start appearing the following Monday

## Acceptance Checklist
- [ ] `dependabot.yml` covers both `/` and `/mobile`
- [ ] Weekly schedule configured
- [ ] Minor/patch updates grouped to reduce PR noise
- [ ] Reviewer assigned to Dependabot PRs

Issue #377 — [INFRA] Automated Bundle Size Analysis
markdown## Steps to Resolve

1. **Install bundle analyzer for local dev**
```bash
   pnpm add -D @next/bundle-analyzer
```

2. **Update `next.config.js` to support `pnpm analyze`**
```js
   const withBundleAnalyzer = require("@next/bundle-analyzer")({
     enabled: process.env.ANALYZE === "true",
   });
   module.exports = withBundleAnalyzer({});
```

3. **Add the analyze script to `package.json`**
```json
   "scripts": {
     "analyze": "ANALYZE=true next build"
   }
```

4. **Install `size-limit` for CI enforcement**
```bash
   pnpm add -D @size-limit/preset-app size-limit
```

5. **Configure size limits in `package.json`**
```json
   "size-limit": [
     {
       "path": ".next/static/chunks/main-*.js",
       "limit": "150 kB"
     },
     {
       "path": ".next/static/chunks/pages/**/*.js",
       "limit": "100 kB"
     }
   ]
```
   > Run `pnpm build && pnpm size-limit` locally first to get baseline numbers before setting limits.

6. **Add a `bundle-size` step to the CI workflow** (`.github/workflows/ci.yml`)
```yaml
   - name: Check bundle size
     run: pnpm build && pnpm size-limit
```

## Acceptance Checklist
- [ ] `pnpm analyze` works locally and opens the bundle visualizer
- [ ] `size-limit` limits are set based on current build output
- [ ] CI fails if any bundle exceeds the configured limit

Issue #385 — [FEAT] Video Walkthrough Clue
markdown## Steps to Resolve

### 1. Update the `Clue` type
Add the optional `videoCid` field to the clue type definition:
```ts
// types/hunt.ts (or wherever Clue is defined)
export type Clue = {
  // ...existing fields
  videoCid?: string; // IPFS CID for the video file
};
```

### 2. Update the HuntForm clue editor (creator side)
- Add a video file input in the clue editor component
- On file select, upload to IPFS and store the returned CID
```tsx
// Validate format and size before upload
const ALLOWED_TYPES = ["video/mp4", "video/webm"];
const MAX_SIZE_MB = 50;

const handleVideoUpload = async (file: File) => {
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error("MP4 or WebM only");
  if (file.size > MAX_SIZE_MB * 1024 * 1024) throw new Error("Max 50MB");
  const cid = await uploadToIPFS(file); // your existing IPFS util
  setClue((prev) => ({ ...prev, videoCid: cid }));
};
```

### 3. Render the video player in `PlayGame.tsx`
```tsx
{clue.videoCid && (
  
    
    
    Your browser does not support the video tag.
  
)}
```

### 4. Respect user preferences
```css
@media (prefers-reduced-motion: reduce) {
  video {
    /* Prevent autoplay; ensure controls are visible */
    animation: none;
  }
}
```
Also ensure `autoplay` is **not** set on the `<video>` element.

### 5. Test non-video clues are unaffected
- Verify clues without `videoCid` render identically to before

## Acceptance Checklist
- [ ] Creator can upload a video (MP4/WebM, max 50MB) to a clue
- [ ] Video plays inline on the hunt play page
- [ ] Video respects `prefers-reduced-motion` / reduced-data preferences
- [ ] Non-video clues are completely unaffected
