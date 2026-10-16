# Plan: New homepage, English/French only, full translation, language management

## 1. New homepage at /
- The /home-preview design becomes the homepage at `/`; the old homepage is retired.
- Keep what the old homepage did: signed-in visitors go straight to their dashboard, live platform numbers, footer with Privacy/Terms and developer credit, install banner, SEO tags.
- `/home-preview` redirects to `/`.

## 2. Remove Bota
- Drop Bota from every language picker, the family setup wizard, and the translation files.
- Anyone who had Bota selected is moved to English automatically.
- Starting languages: English and French (both official in Cameroon). More can be added later without code changes (see 4).

## 3. Translate the whole app
About 95 pages; only ~28 are translated today. Every visible label, button, heading, message, empty state and notification toast moves into the English and French translation files. Done in batches so each is checked:
1. Homepage, sign-in, sign-up, password reset, onboarding, install
2. Dashboard, profile, navigation (desktop and phone menus), notifications
3. Family pages: members, meetings, attendance, contributions, payments and payment proofs, savings, njangi, loans, shares, assistance
4. Reports, analytics, settings, calendar, chat
5. Super admin panel
Dates and money follow the chosen language. A check flags any English text left untranslated.

## 4. Super admin: add languages
- New "Languages" page in the super admin panel: add a language (name, code, e.g. Duala, Ewondo, Fulfulde, Pidgin), turn it on or off, and fill in its translations.
- Translations are stored online; any text not yet translated shows in English, so a half-done language never breaks a page.
- An "export / import" option lets translators work in a spreadsheet file.
- English and French cannot be deleted.

## 5. Family default language
- Family head and family admin choose the family's default language in family settings (from the languages the super admin has turned on).
- Members of that family see it by default; each person can still pick their own language, which takes priority.

## Technical details
- New table `languages` (code, name, native_name, is_active, is_builtin) and `translations` (language_code, key, value), readable by signed-in users and public for the homepage; writes limited to super admins via `is_super_admin`.
- i18next keeps bundled en/fr JSON; custom languages loaded at runtime via `addResourceBundle`, fallback `en`.
- `families.primary_language` reused for the family default; update restricted to family head/admin.
- Language priority: personal choice (profile `preferred_language`) > family default > browser > English.
- Unit tests for language priority and fallback.

## Note
Section 3 is large and will run over several rounds of work; sections 1, 2, 4, 5 come first.
