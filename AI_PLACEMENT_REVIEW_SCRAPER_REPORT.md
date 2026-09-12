# AI Placement Review Scraper Report

Date: 2026-08-09

## Purpose

This report documents the AI placement review scraper used by the admin portal, how the queue is built and processed, what was missing, and the changes made to make the workflow visible and reliable.

## Scope

The scraper flow covers:

- Admin-triggered scraping of trusted placement sources
- Job creation and processing in the backend queue
- AI extraction into placement import records
- Admin review, approval, and rejection of extracted imports
- Visibility of live scrape jobs in the admin UI

## Current Flow

1. The admin opens the AI Imports page at `/admin/ai-imports`.
2. The page loads two datasets:
   - `PlacementImport` records for review
   - `ScrapeJob` records for queue visibility
3. When the scraper runs, the backend:
   - reads active `TrustedSource` records
   - enqueues pending `ScrapeJob` entries for those sources
   - scrapes the target pages with Playwright
   - extracts placement details with the AI provider
   - writes normalized records to `PlacementImport`
4. The admin can then approve or reject an import.
5. Approved imports are converted into real `Placement` records.

## Backend Components

### Queue Orchestrator

`backend/src/services/queue/JobOrchestrator.ts`

- Initializes the scraper cron schedule.
- Enqueues jobs from enabled, active trusted sources.
- Processes pending jobs in order.
- Marks jobs as completed or failed.
- Writes system logs for success and failure.

### Import Controller

`backend/src/controllers/importController.ts`

- Returns review imports.
- Returns the scraper job queue summary and records.
- Triggers the scraper manually.
- Approves and rejects imports.

### Import Routes

`backend/src/routes/importRoutes.ts`

- Protects the routes with authenticated admin access.
- Exposes:
  - `GET /api/imports`
  - `GET /api/imports/jobs`
  - `POST /api/imports/trigger-scraper`
  - `PATCH /api/imports/:id/approve`
  - `PATCH /api/imports/:id/reject`

## Frontend Surface

`apps/web-shell/src/app/admin/ai-imports/page.tsx`

- Shows the import review table.
- Shows a live scraper jobs panel.
- Shows queue counts for:
  - active sources
  - pending jobs
  - processing jobs
  - completed jobs
  - failed jobs
- Uses the shared API client so requests reach the Express backend.

## Issues Found

### 1. The page initially hit the wrong API origin

The page used a relative `/api/imports` call through plain Axios, which sent requests to the Next.js app instead of the Express backend. That caused 404 errors.

### 2. The route authorization was too strict

The import routes originally allowed only `SUPER_ADMIN`, which caused 403 errors for `COLLEGE_ADMIN` users in the admin portal.

### 3. The jobs queue was not visible in the UI

The admin screen only displayed processed imports, not the actual scrape jobs that were being queued and executed.

### 4. The scraper cron was defined but never started

`JobOrchestrator.initCron()` existed, but it was not called during backend startup.

### 5. No trusted sources means no jobs

The scraper depends on active `TrustedSource` records. If none exist, the queue stays empty even when the scraper is triggered manually.

## Fixes Applied

- Switched the AI imports page to use the shared backend API client.
- Allowed both `SUPER_ADMIN` and `COLLEGE_ADMIN` on import routes.
- Added a scraper jobs endpoint.
- Added a jobs panel in the AI imports page.
- Started the scraper cron during backend startup.
- Changed the scraper trigger endpoint to return a real run summary.

## Validation

Verified successfully with production builds:

- Backend TypeScript build passed
- Frontend Next.js build passed

## Operational Notes

- If the jobs panel shows no entries, check whether any active `TrustedSource` records exist.
- If `activeSources` is `0`, the scraper has nothing to enqueue.
- The scraper can be triggered manually from the admin page, but it still needs configured sources to generate jobs.

## Recommended Next Step

Add a simple trusted-source management screen or seed a default source list so the queue can populate immediately in a fresh environment.