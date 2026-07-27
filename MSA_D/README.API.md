# MSA TUNE STUDIO API Reference

## Overview

MSA TUNE STUDIO exposes a modular REST surface for authentication, releases, analytics, withdrawals, and support workflows.

## Authentication

### POST /api/auth/register
- Description: Create a new artist or admin account.
- Authentication: None
- Request example:
  ```json
  {
    "name": "Ava Lane",
    "email": "artist@example.com",
    "password": "StrongPassword123!",
    "role": "artist"
  }
  ```
- Response example:
  ```json
  {
    "ok": true,
    "message": "Registration endpoint ready for secure hashing."
  }
  ```

### POST /api/auth/login
- Description: Authenticate a user and issue a JWT session.
- Authentication: None
- Response example:
  ```json
  {
    "ok": true,
    "message": "Login endpoint ready for JWT integration."
  }
  ```

## Dashboard

### GET /api/dashboard
- Description: Return core dashboard metrics and branding settings.
- Authentication: Bearer token
- Response example:
  ```json
  {
    "metrics": {
      "balance": 21340,
      "revenue": 3800,
      "streams": 94000
    },
    "branding": "MSA TUNE STUDIO"
  }
  ```

## Releases

### POST /api/releases
- Description: Create or update a release draft and submit it for review.
- Authentication: Bearer token
- Request example:
  ```json
  {
    "title": "Midnight Echo",
    "genre": "Afrobeats",
    "status": "Submitted"
  }
  ```

## Withdrawals

### POST /api/withdrawals
- Description: Submit an artist withdrawal request.
- Authentication: Bearer token
- Response example:
  ```json
  {
    "ok": true,
    "message": "Withdrawal workflow ready for admin approval."
  }
  ```

## Support

### GET /api/support
- Description: Retrieve support tickets and statuses.
- Authentication: Bearer token

## Health

### GET /api/health
- Description: Returns platform health and environment placeholders.
- Authentication: None
