# Hunty API Documentation

This document describes the public REST API for Hunty.

## Base URL

`/api/v1`

## Authentication

- **GET Endpoints**: Public, no authentication required.
- **Write Endpoints (POST/PUT/DELETE)**: Require an API key passed in the `X-API-Key` header.
  _(Note: Current implementation only includes public GET endpoints)_
- **Write Endpoints**: Hunt version writes require the creator's `actorAddress` in the
  validated request body. The server compares it with the snapshot creator address.

## Rate Limiting

All API endpoints are subject to rate limiting.

- **Limit**: 100 requests per minute per IP address.
- **Headers**:
  - `X-RateLimit-Reset`: Unix timestamp when the limit resets.
  - `Retry-After`: Seconds to wait before retrying.

---

## Endpoints

### 1. List Public Active Hunts

`GET /hunts`

Returns a paginated list of all active public hunts.

**Query Parameters:**

- `page` (optional): Page number (default: 1).
- `limit` (optional): Items per page (default: 10, max: 100).

**Example Request:**
`GET /api/v1/hunts?page=1&limit=2`

**Example Response:**

```json
{
  "data": [
    {
      "id": 1,
      "title": "City Secrets",
      "description": "Race across town to uncover hidden murals and landmarks.",
      "cluesCount": 5,
      "status": "Active",
      "rewardType": "XLM",
      "rewardPool": 150,
      "playerCount": 32,
      "startTime": 1717156800,
      "endTime": 1717848000
    },
    {
      "id": 2,
      "title": "Campus Quest",
      "description": "Solve riddles scattered around campus before the timer ends.",
      "cluesCount": 7,
      "status": "Active",
      "rewardType": "NFT",
      "rewardPool": 40,
      "playerCount": 21,
      "startTime": 1717070400,
      "endTime": 1717502400
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 2,
    "totalPages": 3
  }
}
```

### 2. Get Hunt Details

`GET /hunts/[id]`

Returns detailed information about a specific hunt.

**Example Request:**
`GET /api/v1/hunts/1`

**Example Response:**

```json
{
  "data": {
    "id": 1,
    "title": "City Secrets",
    "description": "Race across town to uncover hidden murals and landmarks.",
    "cluesCount": 5,
    "status": "Active",
    "rewardType": "XLM",
    "rewardPool": 150,
    "playerCount": 32,
    "createdAt": 1716984000,
    "startTime": 1717156800,
    "endTime": 1717848000
  }
}
```

**Errors:**

- `404 Not Found`: If the hunt ID does not exist.
- `403 Forbidden`: If the hunt is private.

### 3. Get Hunt Leaderboard

### 3. Version a Hunt Edit
`PATCH /hunts/[id]`

Stores the submitted hunt snapshot as the next immutable version. The request must
include the creator wallet address and a snapshot whose `id` matches the URL.

```json
{
  "actorAddress": "G...creator",
  "snapshot": {
    "id": 1,
    "title": "Updated title",
    "description": "Updated description",
    "creator": "G...creator"
  }
}
```

The response contains the assigned `version`, the stored snapshot, and its creation
timestamp. On-chain creation records remain immutable; this history versions the
mutable application snapshot.

### 4. List Hunt Versions
`GET /hunts/[id]/versions?actorAddress=G...creator`

Returns version metadata, newest first. History is retained for **90 days** from
creation, after which it is excluded and removed during subsequent version writes.

### 5. Restore a Hunt Version
`POST /hunts/[id]/versions/[version]/restore`

Restores a prior snapshot by creating a new version containing that snapshot. The
creator must provide `actorAddress`; clients should apply the returned `data.snapshot`
to their current hunt projection.

```json
{ "actorAddress": "G...creator" }
```

### 6. Get Hunt Leaderboard
`GET /hunts/[id]/leaderboard`

Returns the paginated leaderboard for a specific hunt.

**Query Parameters:**

- `page` (optional): Page number (default: 1).
- `limit` (optional): Items per page (default: 10, max: 100).

**Example Request:**
`GET /api/v1/hunts/1/leaderboard?page=1&limit=5`

**Example Response:**

```json
{
  "data": [
    {
      "address": "GCT...Z9Y",
      "name": "AliceCrypto",
      "points": 58
    },
    {
      "address": "GDD...9X2",
      "name": "StellarQuest",
      "points": 45
    },
    {
      "address": "GFA...789",
      "name": "BobHunts",
      "points": 41
    },
    {
      "address": "GBX...A1B",
      "points": 30
    },
    {
      "address": "GCA...HB2",
      "points": 28
    }
  ],
  "pagination": {
    "total": 6,
    "page": 1,
    "limit": 5,
    "totalPages": 2
  }
}
```

**Errors:**

- `404 Not Found`: If the hunt ID does not exist.

### 4. Notification Preferences

Notification preferences are scoped to a connected player's wallet, so they
follow the player between web and mobile devices.

- `GET /api/v1/notifications/preferences?walletAddress=<wallet>` — read the
  complete preference document.
- `PUT /api/v1/notifications/preferences` — merge a preference patch.

```json
{
  "walletAddress": "G...",
  "preferences": {
    "enabled": false,
    "huntEvents": true,
    "rewards": false,
    "social": true,
    "achievements": true
  }
}
```

`enabled` is the global mute. It overrides every category and notification
channel. The category flags (`huntEvents`, `rewards`, `social`, and
`achievements`) are independent of one another.
