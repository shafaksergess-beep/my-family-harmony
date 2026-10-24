# Invitation repair validation

## Implemented
- Minimal code/token preview available to outsiders, without returning invitation emails, tokens, inviter profiles or member lists.
- Existing code and token URLs share a signup/sign-in return and explicit join confirmation.
- Acceptance is authenticated and atomic: validates expiry, active family, pending status and addressed email, assigns only the server-stored role, and updates the invitation in the same transaction.
- Link invitations remain single-use, consistent with existing pending/accepted status semantics. Existing members can retry acceptance without duplicate membership.
- No anonymous accounts or relaxed raw invitation reads; no publishing.

## Verified on October 24, 2026
- Reported code LL7EEUA2 anonymously previews Tsafack family, Treasurer role and October 27 expiry. Original invitation left pending and untouched.
- Code-to-signup navigation opens Sign Up and preserves the invitation return URL.
- Temporary token link previews anonymously.
- Real designated test-account session returns from Auth to code acceptance, joins temporary family as Treasurer, reads that role back through the client, and opens the family page without runtime errors.
- Repeat acceptance reports already-member; no duplicate membership.
- Anonymous raw invitation query returned zero records; anonymous acceptance denied.
- Expired acceptance and wrong-email acceptance denied; used invitation hidden from preview. These checks used temporary fixtures before cleanup.
- Phone widths 320, 360, 390 and 430: no horizontal page overflow. French dark-mode invitation screenshot checked.
- 36 tests passed across invitations, OAuth onboarding, setup wizard and member management. Latest automated preview validation: build OK; standalone typecheck not run.
- Temporary family, memberships and invitations removed.

## Not verified
- Fresh signup-to-confirmation-email-to-join: reserved example.com address was correctly denied, then a test.com signup hit the existing email sending rate limit (HTTP 429). No new test user was returned. No auth settings were changed to bypass confirmation. Accessible inbox and cleared rate limit required.
- Fresh Google consent round-trip and physical Natively devices were not exercised.
- The published frontend is not updated until separately published; the additive Cloud migration applies to the shared live backend immediately.

## Files changed
- drizzle/migrations/0009_secure_invitation_preview_and_acceptance.sql and migration journal (tool-managed)
- src/integrations/supabase/types.ts (tool-regenerated)
- src/lib/invitations.ts
- src/pages/JoinFamily.tsx
- src/pages/AcceptInvitation.tsx
- src/pages/Auth.tsx
- src/components/dashboard/JoinFamilyCard.tsx
- src/components/invitations/JoinFamilyOptions.tsx
- src/i18n/locales/en.json and fr.json
- src/test/invitations.test.ts
- AGENTS.md, roadmap.md and this report