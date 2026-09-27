# Hunty API Documentation

This document describes the public REST API for Hunty.

## Base URL
`/api/v1`

## Authentication
- **GET Endpoints**: Public, no authentication required.
- **Write Endpoints (POST/PUT/DELETE)**: Require an API key passed in the `X-API-Key` header.
  *(Note: Current implementation only includes public GET endpoints)*

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
