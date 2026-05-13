## Implementation Plan — 4 Bundles

I'll deliver this in 4 sequential passes, each shippable on its own. To keep scope realistic I'm picking the highest-impact items per bundle and skipping nice-to-haves that overlap with what already exists (e.g. you already have `NewUserOnboarding`, `FamilyJoinOnboarding`, `PendingActionsWidget`, `NotificationsFeed`, `FamilyHealthScore`, dashboard widgets, i18n, theme toggle, PWA manifest, etc.).

---

### Pass 1 — Onboarding + Empty-State CTAs

1. **Reusable `<EmptyState />` component** — icon, headline, subline, primary CTA, secondary CTA. Themed via design tokens.
2. **Wire empty-states into the 5 modules with zero data**:
   - Contributions → "Record first contribution" + "Set monthly amount"
   - Loans → "Request a loan" + "Read loan rules"
   - Savings → "Add savings entry"
   - Njangi → "Start a cycle"
   - Meetings → "Schedule first meeting"
3. **Dashboard empty-state coach card** — shown when user has 0 contributions/0 meetings: 3 numbered next steps with deep-links.
4. **Onboarding completion nudge** — if `useOnboarding.isFirstTime` and the user is on Dashboard, surface a dismissible banner pointing at the existing tutorial.

### Pass 2 — Landing Page + SEO Revamp

1. **Rewrite `/` hero** with stronger value prop, real screenshot/illustration, dual CTA (Get started / See how it works).
2. **Add Trust/Testimonials section** (placeholder quotes wired to a constants file so you can edit later).
3. **Add "How it works" 3-step section** with icons.
4. **PWA install banner** — small dismissible bottom-right card using `beforeinstallprompt`.
5. **OG/Twitter polish** + JSON-LD `Organization` + `SoftwareApplication` schema in `index.html`.
6. **Multi-language landing**: hook the existing 3 buttons (EN/FR/Bota) to actually switch i18n.

### Pass 3 — Owner Retention

1. **Family Health widget on family Dashboard** — surface the existing `family-health-score` edge function (web side currently lacks it; mobile has `FamilyHealthScore.tsx`).
2. **Consolidated "Pending Approvals" page** — single list combining join-requests, savings approvals, loan approvals, with one-click action.
3. **"Remind everyone" button** on Contributions page — calls existing `send-loan-payment-reminder`/`check-late-payments` style edge to nudge unpaid members.
4. **Bulk invite** — multi-email textarea on Invitations page (single submit, fans out to existing `send-invitation`).

### Pass 4 — Admin Observability

1. **Fix empty activity logs** — `useActivityTracking` is only mounted in one place. Mount it in `App.tsx` so every route logs a `page_view`, and add explicit `logActivity` calls at signup/login.
2. **Admin KPI refresh** — top of `/admin/Dashboard` shows: DAU (7d), new signups (7d), pending approvals, edge-function errors (24h).
3. **In-app announcement banner** — admin can post a string in `system_settings` table; renders globally as a dismissible banner.
4. **CSV export buttons** on Admin Users + Families lists.

---

### Technical notes

- New DB objects (Pass 4): `system_announcements` (id, message, level, active, created_at) with admin-only RLS write, public read; reuse existing activity_logs table.
- All new UI uses semantic tokens (no raw colors).
- Empty-state component lives at `src/components/EmptyState.tsx`.
- All copy goes through i18n where modules already use `useTranslation`; otherwise inline EN strings.
- I'll batch DB migrations into a single migration call before Pass 4.

I'll start with **Pass 1** now and post progress between passes so you can stop me anywhere.
