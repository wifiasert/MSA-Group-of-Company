# Render Deployment Guide

## Overview

This repository contains two primary Node.js services:

- `backend/`: Express API server for authentication, dashboard, releases, withdrawals, support, and profile workflows.
- `MSA_D/`: Static dashboard application with a Node HTTP proxy (`server.js`) for backend API calls.

The public website also includes a legacy distribution landing page at `music/distribution/index.html` that now redirects to `/MSA_D/`.

## Recommended Render services

### 1. Backend service

- Type: Web Service
- Environment: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Root directory: `backend`
- Instance type: `Free` or `Starter` depending on traffic

#### Required environment variables

- `PORT` = `4000`
- `JWT_SECRET` = a strong random secret
- `MONGO_URI` = MongoDB connection string
- `CORS_ORIGIN` = the public frontend origin, e.g. `https://<your-app>.onrender.com`
- `NODE_ENV` = `production`

Optional:
- `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`, `DB_PORT` if using separate connection logic in `MSA_D/config.js`

### 2. Frontend / dashboard service

- Type: Web Service
- Environment: `MSA_D`
- Build command: `npm install`
- Start command: `npm start`
- Root directory: `MSA_D`
- Instance type: `Free` or `Starter`

#### Required environment variables

- `PORT` = `3000`
- `BACKEND_URL` = the backend service URL, e.g. `https://<your-backend>.onrender.com`
- `JWT_SECRET` = same value used by backend for cookie verification
- `NODE_ENV` = `production`

### 3. Optional metadata and static site updates

The main site for `music/distribution/` now redirects to the app at `/MSA_D/`.

## Notes

- `MSA_D/server.js` parses the browser cookie named `msa_auth` and injects it as a `Authorization: Bearer <token>` header to proxied API calls.
- The dashboard gate redirects unauthenticated requests to `/auth.html`.
- Login/register responses from the backend now set the `msa_auth` cookie.
- `JWT_SECRET` must be consistent across frontend and backend for server-side token verification.

## Local testing

1. Start backend from `backend/`:
   ```bash
   cd backend
   npm install
   BACKEND_URL=https://<your-backend>.onrender.com CORS_ORIGIN=https://<your-frontend>.onrender.com npm start
   ```

2. Start frontend from `MSA_D/`:
   ```bash
   cd MSA_D
   npm install
   BACKEND_URL=https://<your-backend>.onrender.com npm start
   ```

3. Visit the configured frontend URL to access the dashboard app.

## Useful links

- Backend health check: `GET /api/health`
- Login: `POST /api/auth/login`
- Register: `POST /api/auth/register`
- Dashboard API: `GET /api/dashboard`
