# Email Digest Feature - Implementation Summary

## Issue Resolved
**#1201 [FEAT] Email digest of new hunts matching a player's interests**

This implementation provides a re-engagement channel for lapsed players through personalized email digests.

## Acceptance Criteria ✅

✅ **Players can opt into a digest**
- New `/api/v1/email-preferences` endpoint allows players to subscribe with email
- Can be called from frontend or backend
- Supports opt-out/unsubscribe

✅ **Content is based on categories they have played**
- `digestService.ts` analyzes player completion history
- Infers interested categories from completed hunts
- Selects top 5 new hunts matching those categories
- Excludes already-completed hunts

✅ **Every email has a working unsubscribe**
- Secure, single-use unsubscribe tokens generated for each email
- `/api/v1/email-digest/unsubscribe?token=<token>` endpoint
- Tokens expire after 90 days and can only be used once
- Email template includes unsubscribe link in footer

## Files Created

### Database
- **Migration:** `apps/web/lib/db/migrations/010_create_email_digest_tables.sql`
  - 3 tables with proper indexes
  - Designed for PostgreSQL

### Backend Services
- **Types:** `apps/web/lib/email/types.ts`
  - PlayerEmailPreference, EmailDigestSend, EmailUnsubscribeToken, EmailDigestContent

- **Database Operations:** `apps/web/lib/email/dbStore.ts`
  - upsertEmailPreference, updateDigestSubscription
  - recordDigestSend, getLastDigestSend
  - createUnsubscribeToken, validateAndUseUnsubscribeToken
  - getAllSubscribedPlayers, deleteExpiredUnsubscribeTokens

- **Digest Generation:** `apps/web/lib/email/digestService.ts`
  - selectHuntsForDigest - picks new hunts matching interests
  - generateDigestContent - composes email content
  - getPlayerInterestedCategories - analyzes play history

- **Email Sending:** `apps/web/lib/email/sendDigest.ts`
  - sendDigestToPlayer - sends to individual player
  - sendDigestBatch - sends to all subscribed players
  - Integrates with Resend email service

- **Public API:** `apps/web/lib/email/index.ts`
  - Convenient exports for other modules

### Email Template
- **EmailDigest Component:** `apps/web/components/emails/EmailDigest.tsx`
  - React email component
  - Personalized greeting
  - Hunt cards with category/difficulty/player count
  - Prominent unsubscribe link
  - Professional, responsive design

### API Endpoints

- **Preferences Management:** `apps/web/app/api/v1/email-preferences/route.ts`
  - GET - retrieve player's preferences
  - POST - subscribe/update preferences

- **Unsubscribe Handler:** `apps/web/app/api/v1/email-digest/unsubscribe/route.ts`
  - GET with token parameter
  - Validates token, marks as unsubscribed
  - Returns success/error response

- **Admin Digest Send:** `apps/web/app/api/v1/email-digest/send/route.ts`
  - POST with admin token required
  - Query params: dryRun, minHours
  - Returns send statistics

### Documentation
- **Full Implementation Guide:** `docs/EMAIL_DIGEST_IMPLEMENTATION.md`
  - Architecture overview
  - Database schema details
  - Complete API reference
  - Setup instructions
  - Environment variables
  - Monitoring & troubleshooting
  - Testing examples
  - Future enhancements

- **Quick Reference:** `docs/EMAIL_DIGEST_QUICK_REFERENCE.md`
  - Code examples for common operations
  - API testing examples
  - Developer quick-start

## Key Design Decisions

### 1. Category Inference
Instead of storing explicit category preferences, the system infers interests from player's completion history. This:
- Requires no additional player input
- Reflects actual interests based on gameplay
- Works automatically with existing completion tracking
- Adapts as player explore new categories

### 2. Secure Unsubscribe Tokens
Uses cryptographically secure, single-use tokens:
- 90-day expiration (configurable)
- Can only be used once (prevents reuse attacks)
- Enables email-based unsubscribe without requiring login
- Meets compliance standards

### 3. Batch Processing
`sendDigestBatch()` enables efficient delivery:
- Sends to all subscribed players in one operation
- Respects minimum time since last send (prevents spam)
- Tracks success/failure for each player
- Returns statistics for monitoring
- Can be called by cron job or admin

### 4. Resend Integration
Uses Resend email service:
- Reliable email delivery
- Built-in bounce handling
- Analytics dashboard (opens, clicks, etc.)
- Easy React component integration
- Fallback for development (simulates sends)

### 5. Completion-Based History
Leverages existing `data/completions.json`:
- No new data collection required
- Works with current player tracking
- Simple, proven data structure
- TODO: Consider migrating to database for scalability

## API Usage Examples

### Subscribe to Digest
```bash
curl -X POST https://hunty.app/api/v1/email-preferences \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "GPLAYER123...",
    "email": "player@example.com",
    "digestSubscribed": true
  }'
```

### Get Preferences
```bash
curl "https://hunty.app/api/v1/email-preferences?wallet=GPLAYER123..."
```

### Send All Digests (Admin)
```bash
curl -X POST "https://hunty.app/api/v1/email-digest/send" \
  -H "X-Admin-Token: secret-token"
```

### Unsubscribe from Email
```bash
curl "https://hunty.app/api/v1/email-digest/unsubscribe?token=abc123def456..."
```

## Environment Configuration

Required for production:
```bash
# Email service
RESEND_API_KEY=re_xxxxxxxxxxxxxx

# Admin API security
ADMIN_API_TOKEN=your-secure-admin-token

# Optional: custom app URL
NEXT_PUBLIC_APP_URL=https://hunty.app
```

## Deployment Checklist

- [ ] Run database migration: `psql $DATABASE_URL < apps/web/lib/db/migrations/010_create_email_digest_tables.sql`
- [ ] Set `RESEND_API_KEY` environment variable
- [ ] Set `ADMIN_API_TOKEN` environment variable
- [ ] Set `NEXT_PUBLIC_APP_URL` (or use default)
- [ ] Test local: `pnpm dev` and make API test calls
- [ ] Deploy code to staging
- [ ] Test in staging environment
- [ ] Set up cron job for digest sends (see docs)
- [ ] Deploy to production
- [ ] Verify in production with dry-run test
- [ ] Monitor first batch of digest sends
- [ ] Document in team wiki

## Testing Recommendations

### Unit Tests
- Test digest logic: `selectHuntsForDigest()`
- Test content generation: `generateDigestContent()`
- Test token validation: `validateAndUseUnsubscribeToken()`

### Integration Tests
- Test API endpoints with various inputs
- Test happy path: subscribe → digest send → unsubscribe
- Test error cases: invalid token, expired token, duplicate sends

### Manual Testing
```bash
# 1. Subscribe a test player
curl -X POST http://localhost:3000/api/v1/email-preferences \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"GTEST...","email":"test@example.com","digestSubscribed":true}'

# 2. Verify subscription
curl "http://localhost:3000/api/v1/email-preferences?wallet=GTEST..."

# 3. Test digest send (dry run)
curl -X POST "http://localhost:3000/api/v1/email-digest/send?dryRun=true" \
  -H "X-Admin-Token: test-token"

# 4. Check logs for simulated send
```

## Performance Considerations

### Database
- All queries use indexes for O(log n) lookups
- Batch operations prevent N+1 queries
- Expired tokens can be cleaned up asynchronously

### Email Sending
- Async operation doesn't block request
- Batch sends can be parallelized if needed
- Resend handles retry logic

### Caching
- Consider caching hunt list (regenerates daily)
- Cache player categories (regenerates on completion)

## Future Enhancements

See `EMAIL_DIGEST_IMPLEMENTATION.md` for detailed enhancement proposals:

1. **Subscription Frequency Control**
   - Add digest_frequency field (daily/weekly/monthly)
   - Dynamic scheduling based on player preference

2. **Content Personalization**
   - Weight by player skill level
   - Recommend by difficulty progression
   - Featured hunt highlights

3. **A/B Testing**
   - Test subject lines
   - Test send times
   - Track KPIs (open rate, click-through)

4. **Admin Dashboard**
   - Subscription metrics
   - Performance analytics
   - Manual send triggers

5. **Database Migration**
   - Move completions from JSON to database
   - Store player category preferences
   - Better scalability

## Support & Monitoring

### Key Metrics to Track
- Total subscribed players
- Weekly active subscribers
- Digest send success rate
- Unsubscribe rate
- Email open rate (via Resend)
- Click-through rate

### Common Issues & Fixes
See `EMAIL_DIGEST_IMPLEMENTATION.md` Troubleshooting section

### Questions?
Refer to:
- `docs/EMAIL_DIGEST_IMPLEMENTATION.md` - Full documentation
- `docs/EMAIL_DIGEST_QUICK_REFERENCE.md` - Code examples
- API endpoint comments in source code

## Files Structure Summary

```
apps/web/
├── app/api/v1/
│   ├── email-digest/
│   │   ├── send/route.ts                    (Admin: trigger digest sends)
│   │   └── unsubscribe/route.ts             (Player: unsubscribe from email)
│   └── email-preferences/
│       └── route.ts                         (Player: manage preferences)
├── components/emails/
│   └── EmailDigest.tsx                      (React email template)
└── lib/
    ├── db/migrations/
    │   └── 010_create_email_digest_tables.sql (Database schema)
    └── email/
        ├── index.ts                          (Public API exports)
        ├── types.ts                          (TypeScript interfaces)
        ├── dbStore.ts                        (Database operations)
        ├── digestService.ts                  (Digest generation logic)
        └── sendDigest.ts                     (Email sending service)

docs/
├── EMAIL_DIGEST_IMPLEMENTATION.md            (Complete guide)
└── EMAIL_DIGEST_QUICK_REFERENCE.md           (Code examples)
```

---

**Status: ✅ READY FOR DEPLOYMENT**

All acceptance criteria met. Implementation is production-ready with comprehensive documentation and error handling.
