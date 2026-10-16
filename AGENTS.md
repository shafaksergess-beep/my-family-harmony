- i18n: all UI text goes through `t()` with keys in src/i18n/locales/en.json (source of truth) + fr.json; extra languages live in the `languages`/`translations` tables and load at runtime via src/i18n/languages.ts — why: super admins add languages without code changes, missing keys fall back to English.

- Native wrapper features use the official Natively SDK through src/lib/natively.ts and NativelyContext; browser fallbacks never enqueue native calls. Why: keep wrapper-specific APIs isolated and avoid OneSignal identifiers being used as Firebase tokens.
- Self-account deletion uses an authenticated edge endpoint and auth lifecycle cleanup; anonymized ledger identities survive removal of sign-in credentials. Why: preserve family accounting without retaining personal profile data.
