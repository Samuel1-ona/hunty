# Email Digest Feature - Implementation Guide

## Overview

The email digest feature enables re-engagement with lapsed players by sending personalized emails featuring new hunts that match their historical interests. This implementation satisfies the acceptance criteria from issue #1201:

- ✅ Players can opt into a digest
- ✅ Content is based on categories they have played
- ✅ Every email has a working unsubscribe

## Architecture

### Components

1. **Database Schema** (`lib/db/migrations/010_create_email_digest_tables.sql`)
   - `player_email_preferences` - Stores email and subscription status
   - `email_digest_sends` - Tracks sent digests for analytics
   - `email_unsubscribe_tokens` - Secure tokens for unsubscribe links

2. **Backend Services** (`lib/email/`)
   - `types.ts` - Type definitions
   - `dbStore.ts` - Database operations (queries, mutations)
   - `digestService.ts` - Digest content generation logic
   - `sendDigest.ts` - Email sending via Resend

3. **API Endpoints** (`app/api/v1/`)
   - `email-preferences/` - Manage subscriptions
   - `email-digest/unsubscribe/` - Handle unsubscribe clicks
   - `email-digest/send/` - Admin endpoint for digest sends

4. **Email Template** (`components/emails/EmailDigest.tsx`)
   - React email component for personalized digest layout

## Database Schema

### player_email_preferences

Stores player email preferences and subscription status.

```sql
CREATE TABLE player_email_preferences (
  id TEXT PRIMARY KEY,                          -- UUID
  wallet_address TEXT NOT NULL UNIQUE,          -- Stellar address
  email TEXT NOT NULL,                          -- Email address
  digest_subscribed BOOLEAN NOT NULL DEFAULT FALSE,
  subscription_date TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Indexes:**
- `wallet_address` - Fast lookup by wallet
- `(digest_subscribed, last_updated)` - Query all subscribed players efficiently

### email_digest_sends

Audit trail of sent digests for analytics and deduplication.

```sql
CREATE TABLE email_digest_sends (
  id TEXT PRIMARY KEY,                          -- UUID
  player_id TEXT NOT NULL REFERENCES player_email_preferences(id),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recipient_email TEXT NOT NULL,
  hunt_ids INTEGER[] NOT NULL DEFAULT '{}',     -- Array of hunt IDs
  categories TEXT[] NOT NULL DEFAULT '{}',      -- Array of categories
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT                            -- Failure details
);
```

**Indexes:**
- `(player_id, sent_at DESC)` - Find recent sends for a player

### email_unsubscribe_tokens

Secure, single-use tokens for unsubscribe links.

```sql
CREATE TABLE email_unsubscribe_tokens (
  id TEXT PRIMARY KEY,                          -- UUID
  player_id TEXT NOT NULL REFERENCES player_email_preferences(id),
  token TEXT NOT NULL UNIQUE,                   -- Random 32-char token
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,              -- (default: 90 days)
  used_at TIMESTAMPTZ                           -- NULL until used
);
```

**Indexes:**
- `token` - Fast lookup during unsubscribe
- `expires_at` - Clean up expired tokens

## API Reference

### Subscribe/Unsubscribe

**Endpoint:** `POST /api/v1/email-preferences`

Subscribe a player to email digests or update their preferences.

**Request:**
```json
{
  "walletAddress": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "email": "player@example.com",
  "digestSubscribed": true
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "walletAddress": "GXXXX...",
  "email": "player@example.com",
  "digestSubscribed": true,
  "subscriptionDate": 1692921600000,
  "lastUpdated": 1692921600000,
  "createdAt": 1692921600000,
  "message": "Successfully subscribed to email digest"
}
```

### Get Preferences

**Endpoint:** `GET /api/v1/email-preferences?wallet=<address>`

Retrieve a player's current email preferences.

**Response (200):**
```json
{
  "id": "uuid",
  "walletAddress": "GXXXX...",
  "email": "player@example.com",
  "digestSubscribed": true,
  "subscriptionDate": 1692921600000,
  "lastUpdated": 1692921600000,
  "createdAt": 1692921600000
}
```

**Response (404):**
```json
{
  "walletAddress": "GXXXX...",
  "email": null,
  "digestSubscribed": false
}
```

### Unsubscribe via Email Link

**Endpoint:** `GET /api/v1/email-digest/unsubscribe?token=<token>`

Handle unsubscribe requests from email links. Validates token and marks player as unsubscribed.

**Response (200 - Success):**
```json
{
  "success": true,
  "message": "You have been unsubscribed from Hunty email digests.",
  "email": "player@example.com"
}
```

**Response (400 - Invalid Token):**
```json
{
  "success": false,
  "message": "Invalid or expired unsubscribe link. The token may have already been used."
}
```

### Send Digests (Admin)

**Endpoint:** `POST /api/v1/email-digest/send`

**Headers:**
```
X-Admin-Token: <ADMIN_API_TOKEN>
```

**Query Parameters:**
- `dryRun` (boolean, default: false) - Simulate without sending
- `minHours` (number, default: 24) - Min hours since last digest

**Response (200):**
```json
{
  "success": true,
  "dryRun": false,
  "minHoursSinceLast": 24,
  "sent": 42,
  "skipped": 18,
  "failed": 3,
  "message": "Digest batch sent to 42 players"
}
```

## Digest Logic

### Category Inference

The digest service infers a player's interested categories by:
1. Reading their completion history from `data/completions.json`
2. Looking up the categories of completed hunts
3. Building a set of interested categories

### Hunt Selection

For digest generation:
1. Find all Active, public hunts
2. Filter by interested categories
3. Exclude already-completed hunts
4. Sort by newest first (by hunt ID, descending)
5. Return top 5 (configurable)

### Email Content

Each digest includes:
- Player greeting ("Welcome back to Hunty!")
- List of new hunts with:
  - Title and description
  - Category badge
  - Difficulty level (if set)
  - Player count
  - "Start Hunt" button
- Call-to-action to browse Arcade
- **Unsubscribe link** (required by acceptance criteria)

## Environment Variables

Required for production deployment:

```bash
# Email sending
RESEND_API_KEY=<your-resend-api-key>

# Admin API authentication
ADMIN_API_TOKEN=<secure-token-for-digest-sends>

# Optional: app URL for email links
NEXT_PUBLIC_APP_URL=https://hunty.app
```

## Setup Instructions

### 1. Run Database Migration

Execute the migration to create tables:

```bash
# Using psql directly
psql $DATABASE_URL < apps/web/lib/db/migrations/010_create_email_digest_tables.sql

# Or through your application's migration runner
pnpm migrate
```

### 2. Configure Environment

Add to `.env.local`:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
ADMIN_API_TOKEN=your-secure-secret-token
NEXT_PUBLIC_APP_URL=https://hunty.app
```

### 3. Test Locally

Test the API endpoints:

```bash
# Test subscription
curl -X POST http://localhost:3000/api/v1/email-preferences \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "GXXXXXXXX...",
    "email": "test@example.com",
    "digestSubscribed": true
  }'

# Test getting preferences
curl "http://localhost:3000/api/v1/email-preferences?wallet=GXXXXXXXX..."

# Test digest send (dry run)
curl -X POST "http://localhost:3000/api/v1/email-digest/send?dryRun=true" \
  -H "X-Admin-Token: your-admin-token"
```

### 4. Schedule Digest Sends

Set up a cron job or scheduled task to trigger the digest send endpoint:

```bash
# Example: Daily at 9 AM UTC
0 9 * * * curl -X POST "https://hunty.app/api/v1/email-digest/send" \
  -H "X-Admin-Token: $ADMIN_API_TOKEN"
```

**Using Vercel Crons (preferred):**

Add to `vercel.json`:

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

## Frontend Integration (Optional)

To add subscription UI to your app:

```typescript
import { useState } from 'react'
import { useWallet } from '@/hooks/useWallet' // or your wallet hook

export function EmailPreferencesForm() {
  const { address } = useWallet()
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/email-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          email,
          digestSubscribed: true,
        }),
      })
      
      if (res.ok) {
        setSubscribed(true)
        // Show success toast
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubscribe() }}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
      />
      <button type="submit" disabled={loading}>
        {subscribed ? 'Unsubscribe' : 'Subscribe'}
      </button>
    </form>
  )
}
```

## Monitoring & Analytics

Track the success of digests through:

1. **Database Queries:**
```sql
-- Recent digest sends
SELECT * FROM email_digest_sends 
ORDER BY sent_at DESC LIMIT 20;

-- Subscription metrics
SELECT 
  COUNT(*) as total_subscribed,
  COUNT(CASE WHEN last_updated > NOW() - INTERVAL '7 days' THEN 1 END) as active_this_week
FROM player_email_preferences 
WHERE digest_subscribed = true;

-- Unsubscribe rate
SELECT 
  COUNT(DISTINCT player_id) as unsubscribed_players
FROM email_unsubscribe_tokens 
WHERE used_at IS NOT NULL 
AND used_at > NOW() - INTERVAL '30 days';
```

2. **Resend Dashboard:**
- Track email opens, clicks, and bounces
- Monitor unsubscribe rates

3. **Application Logs:**
- Search for "digest" in logs for sending details
- Track failures and error messages

## Testing

### Unit Tests

Create tests for digest logic:

```typescript
import { selectHuntsForDigest } from '@/lib/email/digestService'

describe('digestService', () => {
  it('should select hunts matching player categories', async () => {
    const hunts = await selectHuntsForDigest('GPLAYER123...')
    expect(hunts).toHaveLength(5) // max 5
  })

  it('should exclude already-completed hunts', async () => {
    const hunts = await selectHuntsForDigest('GPLAYER123...')
    const completedIds = new Set([1, 2, 3])
    expect(hunts.every(h => !completedIds.has(h.id))).toBe(true)
  })
})
```

### Integration Tests

Test the API endpoints:

```typescript
it('POST /api/v1/email-preferences subscribes player', async () => {
  const res = await fetch('/api/v1/email-preferences', {
    method: 'POST',
    body: JSON.stringify({
      walletAddress: 'GTEST...',
      email: 'test@example.com',
      digestSubscribed: true,
    }),
  })
  expect(res.status).toBe(200)
})
```

## Troubleshooting

### Emails not sending

1. Verify `RESEND_API_KEY` is set
2. Check email address format (valid email required)
3. View Resend dashboard for delivery status
4. Check application logs for error details

### Player not receiving digests

1. Verify subscription status: `GET /api/v1/email-preferences?wallet=<address>`
2. Check `email_digest_sends` table for send attempts
3. Verify player has completed hunts (required for category inference)
4. Check `email_unsubscribe_tokens` table for accidental unsubscribes

### Token validation errors

1. Verify token is not expired (default 90 days)
2. Check token hasn't already been used (`used_at IS NOT NULL`)
3. Confirm token matches a valid player

## Future Enhancements

1. **Frequency Control:**
   - Add `digest_frequency` (daily, weekly, monthly) to preferences
   - Adjust `minHoursSinceLast` dynamically

2. **Content Personalization:**
   - Weight hunt recommendations by player's completion speed
   - Recommend hunts by difficulty progression
   - Highlight featured/promoted hunts

3. **A/B Testing:**
   - Test different subject lines, send times
   - Track open rates and click-through rates
   - Optimize based on performance

4. **Unsubscribe Management:**
   - Category-specific subscriptions (e.g., "only adventure hunts")
   - Temporary pause option (reactivate after N days)
   - Subscription preferences UI in player dashboard

5. **Admin Dashboard:**
   - View subscription metrics
   - Monitor digest performance
   - Manually trigger sends for testing
   - Manage unsubscribe tokens
