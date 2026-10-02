## Summary

<!-- Describe what changed and why it was needed. -->

## Changes

<!-- List the main implementation changes. -->

-

## Related issue

<!-- Link the issue this PR addresses, for example: Closes #123. -->

## Testing

<!-- Explain what you tested and give reviewers steps to verify the change. -->

## Screenshots

<!-- For visual changes, include before/after screenshots. Otherwise write "Not applicable". -->

## Contributor checklist

- [ ] My branch follows the naming convention (`feature/<description>` or `fix/<description>`).
- [ ] My PR title and description clearly explain the change and its purpose.
- [ ] I ran the typecheck (`npx tsc --noEmit`).
- [ ] I ran lint (`pnpm lint`).
- [ ] I ran the relevant tests (`pnpm test`).
- [ ] I added or updated tests for this change, or explained why tests are not needed.
- [ ] If this PR adds or changes an API route, it follows the [API route auth model](CONTRIBUTING.md#api-route-auth-model): wrapped in `withValidation` (or `withErrorHandling` when there is nothing to validate) and authenticated unless it is intentionally public, in which case I explained why below.
- [ ] I updated relevant documentation, or no documentation changes are needed.

<!-- If you ticked the API route box, or the route is intentionally public, explain here: which wrapper, which auth guard, and why public is safe. -->
