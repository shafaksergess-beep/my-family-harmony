# Phase 3b mobile management

## Changes
- Migrate the requested family management screens in the supplied order, then administration and profile/settings.
- Reuse desktop records, authorization and handlers. Remove divergent mobile branches where they bypass desktop management actions.
- Use shared mobile headers, card lists, overflow actions and bottom-sheet forms, retaining desktop presentation.
- Keep branding, languages, routes, database, authentication, native settings and dependencies unchanged. Do not publish.

## Verification
- Check each migrated screen at 320, 360, 390, 430 pixels and a landscape size using authenticated test access where available.
- Run existing tests. Use harness build/typecheck results; manual builds and typechecks are prohibited by the environment.
- Record migrated screens, exact checks, changed files and remaining gaps in `docs/MOBILE_PHASE3B_VALIDATION.md`.

## Technical details
- Prefer shared presentation adapters for existing table markup and headers so mutations and permission guards stay parent-owned.
- Update `AGENTS.md` only if introducing a shared structural adapter needs an enduring architecture rule; update the existing roadmap only to track this multi-screen request.
- Populated, destructive and physical-device flows will be reported unverified unless safely exercised with designated test records.
