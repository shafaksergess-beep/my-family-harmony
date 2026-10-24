# Signup recovery validation

## Verified
- Restored the session for the reported Google account. It has zero family memberships and is not a superadmin.
- Reproduced the OAuth-return state with `/dashboard` stored as the intended destination. The homepage now sends this account to `/onboarding/join-family`.
- Found and removed a competing homepage redirect that overrode setup navigation.
- Opened the existing creation wizard from setup and the empty dashboard on desktop and at 390px. The mobile sheet rendered without horizontal page overflow or runtime errors.
- Signed in as a superadmin, searched the reported email, found its profile and opened its direct family-assignment dialog.
- 40 regression tests passed across OAuth onboarding, member management, wizard submit guards and mobile experience.
- Latest preview validation: build OK, including automated type validation.

## Not exercised
- A fresh Google consent-and-return flow with a newly created Google account. The post-return state was exercised with a real authenticated account, not a mocked session.
- Creating an additional real family or assigning the reported account to a family. Existing creation and membership operations were reused; verification did not change its memberships.
- Physical Natively devices and Google Play builds.
- No publishing or backend/configuration changes.

## Changed files
- `src/lib/membershipSync.ts`
- `src/components/AuthBootstrap.tsx`
- `src/pages/Auth.tsx`
- `src/pages/Index.tsx`
- `src/components/dashboard/CreateGroupButton.tsx`
- `src/pages/Dashboard.tsx`
- `src/components/mobile/MobileDashboard.tsx`
- `src/components/onboarding/FamilySetupWizard.tsx`
- `src/pages/admin/Users.tsx`
- `src/pages/admin/FamilyMembers.tsx`
- `src/i18n/locales/en.json`
- `src/i18n/locales/fr.json`
- `src/test/oauthOnboarding.test.ts`
- `AGENTS.md`
- `roadmap.md`
- `docs/SIGNUP_RECOVERY_VALIDATION.md`