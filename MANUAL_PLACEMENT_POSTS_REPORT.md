# Manual Placement Posts Report

Date: 2026-08-09

## Purpose

This report documents the manual placement posting workflow used by college admins, how placements are created and published, and how that path differs from the AI placement review scraper.

## Scope

The manual placement post flow covers:

- Admin creation of a placement post
- Editing and updating a placement post
- Changing placement status between draft, published, archived, and expired
- Bulk publish, archive, and delete operations
- Student visibility rules for published placements only

## Current Flow

1. A college admin opens the manual placement screen at `/admin/placement`.
2. The admin can create a new placement at `/admin/placement/create`.
3. The placement form submits directly to the backend placement API.
4. The backend validates the payload, stores the placement, and writes an audit log.
5. The admin can later edit the same placement, update its status, or bulk-manage multiple placements.
6. Students only see placements whose workflow status is `published`.

## Backend Components

### Placement Routes

`backend/src/routes/placementRoutes.ts`

- Protects all placement routes with authentication.
- Allows mutation routes only for `SUPER_ADMIN` and `COLLEGE_ADMIN`.
- Exposes:
  - `POST /api/placements`
  - `PATCH /api/placements/:id`
  - `PATCH /api/placements/:id/status`
  - `POST /api/placements/bulk/:action`

### Placement Controller

`backend/src/controllers/placementController.ts`

- Validates incoming create and update payloads.
- Creates a placement through `PlacementService`.
- Updates placement records and status changes.
- Restricts student access to published records only.
- Writes audit logs for create, update, preview, publish, archive, restore, and bulk actions.

### Placement Service

`backend/src/services/placementService.ts`

- Generates fingerprints for duplicate detection.
- Creates new placements with college scoping.
- Updates versions and history records.
- Prevents invalid status transitions such as publishing expired placements.
- Handles bulk delete, archive, and publish operations.

## Frontend Surface

`apps/web-shell/src/app/admin/placement/page.tsx`

- Lists placements for the admin.
- Provides navigation to create a new placement.
- Supports filtering and opening individual placement records.

`apps/web-shell/src/app/admin/placement/create/page.tsx`

- Renders the placement form for new posts.

`apps/web-shell/src/app/admin/placement/[id]/page.tsx`

- Loads an existing placement into the same form for editing.

`apps/web-shell/src/app/admin/placement/components/PlacementForm.tsx`

- Handles the manual placement form UI.
- Submits placement data to the admin API.
- Supports cancel/back navigation.

## Key Behavior

- Manual placements are created directly by admins, not scraped from external websites.
- New posts can start as draft or another allowed workflow state.
- Published placements become visible to students.
- Bulk actions allow admins to manage multiple posts at once.
- Every important action is audited.

## Issues and Risks

### 1. Manual and AI flows are separate

The manual placement post flow is distinct from the AI scraper flow. Manual posts do not depend on `TrustedSource` or `ScrapeJob` records.

### 2. Status rules matter

The backend blocks invalid workflow changes, including publishing expired placements.

### 3. College scope applies to admin mutations

Mutation routes are protected so only college admins or super admins can create and change placements.

## Validation

The placement backend and frontend paths are already part of the verified build set. No additional code changes were required for this report.

## Recommended Next Step

If you want this workflow documented in the main project docs, add a short “Manual Placement Posts” section to the README or admin guide and link to the admin route list.