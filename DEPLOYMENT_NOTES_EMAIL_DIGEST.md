# Email Digest Implementation - Deployment Notes

## Quick Summary

This PR implements feature #1201: Email digest of new hunts matching a player's interests.

**All acceptance criteria met:**

- ✅ Players can opt into a digest
- ✅ Content is based on categories they have played
- ✅ Every email has a working unsubscribe

## What Changed

### New Database Tables

Run migration: `apps/web/lib/db/migrations/010_create_email_digest_tables.sql`

Creates 3 PostgreSQL tables:

- `player_email_preferences` - Email and subscription status
- `email_digest_sends` - Audit trail of sent digests
- `email_unsubscribe_tokens` - Secure unsubscribe tokens

### New Backend Services

- `apps/web/lib/email/` - Complete email digest service module
  - Types, database operations, digest generation, email sending
- `apps/web/components/emails/EmailDigest.tsx` - Email template

### New API Endpoints

- `POST/GET /api/v1/email-preferences` - Manage subscriptions
- `GET /api/v1/email-digest/unsubscribe?token=<>` - Handle unsubscribes
- `POST /api/v1/email-digest/send` - Admin: trigger sends

### Documentation

- `docs/EMAIL_DIGEST_IMPLEMENTATION.md` - Complete implementation guide
- `docs/EMAIL_DIGEST_QUICK_REFERENCE.md` - Code examples
- `verify-email-digest.sh` - Deployment verification script

## Environment Setup

Add to `.env.local`:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
ADMIN_API_TOKEN=your-secret-admin-token
NEXT_PUBLIC_APP_URL=https://hunty.app
```

## Deployment Steps

1. **Run migration:**

   ```bash
   psql $DATABASE_URL < apps/web/lib/db/migrations/010_create_email_digest_tables.sql
   ```

2. **Deploy code** - same as any Next.js deployment

3. **Set environment variables** (Vercel/deployment platform)

4. **Test locally:**

   ```bash
   chmod +x verify-email-digest.sh
   ADMIN_TOKEN=your-token ./verify-email-digest.sh
   ```

5. **Set up cron job** (Vercel example in `vercel.json`):
   ```json
   {
     "crons": [
       {
         "path": "/api/v1/email-digest/send",
         "schedule": "0 9 * * *"
       }
     ]
   }
   ```

## Key Features

### Player Opt-in

```bash
curl -X POST /api/v1/email-preferences \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "GPLAYER123...",
    "email": "player@example.com",
    "digestSubscribed": true
  }'
```

### Personalized Content

- Analyzes player completion history
- Infers interested categories
- Recommends new hunts in those categories
- Excludes already-completed hunts

### Secure Unsubscribe

- Random 32-char tokens (90-day expiry)
- Single-use tokens
- Email includes unsubscribe link
- Compliant with anti-spam regulations

### Admin Control

- Trigger digests on-demand
- Dry-run mode for testing
- Configurable send frequency
- Audit trail in database

## Testing

Local testing:

```bash
# Subscribe
curl -X POST http://localhost:3000/api/v1/email-preferences \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"GTEST...","email":"test@example.com","digestSubscribed":true}'

# Get preferences
curl http://localhost:3000/api/v1/email-preferences?wallet=GTEST...

# Dry run digest send
curl -X POST http://localhost:3000/api/v1/email-digest/send?dryRun=true \
  -H "X-Admin-Token: test-token"
```

See `verify-email-digest.sh` for automated testing.

## Monitoring

### Database Queries

```sql
-- Recent sends
SELECT * FROM email_digest_sends ORDER BY sent_at DESC LIMIT 10;

-- Subscription stats
SELECT COUNT(*) as subscribed FROM player_email_preferences
WHERE digest_subscribed = true;

-- Unsubscribe tracking
SELECT COUNT(*) as unsubscribed FROM email_unsubscribe_tokens
WHERE used_at IS NOT NULL;
```

### Logs

- Search for "digest" in application logs
- Resend dashboard shows delivery metrics

## Rollback

If issues arise:

1. **Disable digest sends:**

   - Remove/delay cron job
   - Don't call `/api/v1/email-digest/send`

2. **Database (optional):**

   - Delete `player_email_preferences` table (doesn't affect core app)
   - Keep other tables for audit trail

3. **Code:**
   - Revert to previous commit
   - API endpoints will 404 but won't break anything

## Files Modified/Created

**Created:**

```
apps/web/
├── app/api/v1/email-digest/
│   ├── send/route.ts
│   └── unsubscribe/route.ts
├── app/api/v1/email-preferences/route.ts
├── components/emails/EmailDigest.tsx
└── lib/
    ├── db/migrations/010_create_email_digest_tables.sql
    └── email/
        ├── index.ts
        ├── types.ts
        ├── dbStore.ts
        ├── digestService.ts
        └── sendDigest.ts

docs/
├── EMAIL_DIGEST_IMPLEMENTATION.md
└── EMAIL_DIGEST_QUICK_REFERENCE.md

Root:
├── FEATURE_EMAIL_DIGEST_SUMMARY.md
└── verify-email-digest.sh
```

**No changes to:**

- Existing API endpoints
- Database schema (new tables only)
- Frontend components
- Authentication/authorization

## Future Enhancements

See `EMAIL_DIGEST_IMPLEMENTATION.md` for:

- Subscription frequency control
- Content personalization
- A/B testing
- Admin dashboard
- Database optimization

## Support

**Questions?**

- Full guide: `docs/EMAIL_DIGEST_IMPLEMENTATION.md`
- Quick examples: `docs/EMAIL_DIGEST_QUICK_REFERENCE.md`
- API comments in `apps/web/app/api/v1/`

**Issues?**

- Check logs for errors
- Run `verify-email-digest.sh` to diagnose
- See Troubleshooting in implementation guide

## Verification Checklist

After deployment:

- [ ] Database migration applied successfully
- [ ] Environment variables set (RESEND_API_KEY, ADMIN_API_TOKEN)
- [ ] API endpoints responding (test with curl)
- [ ] Email template renders (test in Resend dashboard)
- [ ] Digests can be triggered (test dry-run)
- [ ] Test email received (production test)
- [ ] Unsubscribe link works from email
- [ ] Cron job configured
- [ ] Team notified & trained

---

**Ready to deploy!** 🚀

The implementation is production-ready with comprehensive documentation and error handling.
