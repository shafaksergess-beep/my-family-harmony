# Family Together - Architecture Documentation

This document describes the technical architecture, code organization, and development patterns used in the Family Together application.

## Table of Contents
1. [Technology Stack](#technology-stack)
2. [Project Structure](#project-structure)
3. [Error Handling](#error-handling)
4. [State Management](#state-management)
5. [Routing Architecture](#routing-architecture)
6. [Database Layer](#database-layer)
7. [Authentication](#authentication)
8. [Internationalization](#internationalization)

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend Framework | React 18 |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui (Radix primitives) |
| Language | TypeScript |
| Backend | Supabase (PostgreSQL + Edge Functions) |
| State Management | TanStack Query (React Query) |
| Routing | React Router v6 |
| Forms | React Hook Form + Zod validation |
| i18n | i18next + react-i18next |

---

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # shadcn/ui base components
│   ├── mobile/          # Mobile-specific components
│   ├── invitations/     # Invitation/join flow components
│   ├── onboarding/      # Onboarding wizards
│   ├── settings/        # Settings-related components
│   ├── admin/           # Admin-specific components
│   ├── dashboard/       # Dashboard widgets
│   └── ErrorBoundary.tsx       # Global error boundary
│   └── ModuleErrorBoundary.tsx # Module-specific error boundaries
│
├── contexts/            # React contexts
│   └── MedianContext.tsx
│
├── hooks/               # Custom React hooks
│   ├── use-mobile.tsx   # Mobile detection
│   ├── use-toast.ts     # Toast notifications
│   ├── useFamilyAuth.tsx # Family membership auth
│   └── ...
│
├── i18n/                # Internationalization
│   ├── config.ts        # i18next setup
│   └── locales/         # Translation files
│       ├── en.json
│       ├── fr.json
│       └── bota.json
│
├── integrations/        # External integrations
│   └── supabase/
│       ├── client.ts    # Supabase client (auto-generated)
│       └── types.ts     # Database types (auto-generated)
│
├── lib/                 # Utility libraries
│   ├── utils.ts         # General utilities
│   ├── creditScoring.ts # Loan/credit calculations
│   ├── pdfGenerator.ts  # PDF report generation
│   ├── errorLogger.ts   # Error logging service
│   ├── validation.ts    # Input validation
│   └── ...
│
├── pages/               # Route components
│   ├── Index.tsx        # Landing page
│   ├── Auth.tsx         # Authentication
│   ├── Dashboard.tsx    # User dashboard
│   ├── admin/           # Admin module pages
│   │   ├── Dashboard.tsx
│   │   ├── Families.tsx
│   │   └── ...
│   └── family/          # Family module pages
│       ├── Detail.tsx
│       ├── Loans.tsx
│       ├── Contributions.tsx
│       └── ...
│
├── App.tsx              # Main app with routing
├── main.tsx             # Entry point
└── index.css            # Global styles + Tailwind
```

---

## Error Handling

### Error Boundary Hierarchy

```
<ErrorBoundary>              ← Global (catches everything)
  <App>
    <ModuleErrorBoundary moduleName="admin">  ← Admin module
      <AdminRoutes />
    </ModuleErrorBoundary>
    
    <ModuleErrorBoundary moduleName="family"> ← Family module  
      <FamilyRoutes />
    </ModuleErrorBoundary>
  </App>
</ErrorBoundary>
```

### Error Logging

All errors are logged via `src/lib/errorLogger.ts`:

```typescript
import { errorLogger } from '@/lib/errorLogger';

// Log an error
errorLogger.error(error, { context: 'payment-processing' });

// Log a warning
errorLogger.warning('Rate limit approaching', { requests: 95 });
```

### Error Recovery Strategies

| Error Type | Strategy |
|------------|----------|
| Component crash | Module boundary catches, shows retry UI |
| Network failure | React Query retry with exponential backoff |
| Auth error | Redirect to login with return URL |
| Validation error | Display inline form errors |

---

## State Management

### TanStack Query Patterns

```typescript
// Fetching data
const { data, isLoading, error } = useQuery({
  queryKey: ['family', familySlug, 'members'],
  queryFn: () => fetchFamilyMembers(familySlug),
});

// Mutations
const mutation = useMutation({
  mutationFn: createLoan,
  onSuccess: () => {
    queryClient.invalidateQueries(['family', familySlug, 'loans']);
    toast({ title: 'Loan created successfully' });
  },
});
```

### Query Key Conventions
- `['family', familySlug]` - Family base data
- `['family', familySlug, 'members']` - Family members
- `['family', familySlug, 'loans']` - Family loans
- `['admin', 'users']` - Admin user list

---

## Routing Architecture

### Route Structure

```typescript
// Public routes
/                    → Landing page
/auth                → Login/Register
/install             → PWA install prompt

// Authenticated routes  
/dashboard           → User dashboard
/profile             → User profile

// Admin routes (super_admin only)
/admin/*             → Admin module

// Family routes (family members)
/family/:familySlug/* → Family module
```

### Lazy Loading

All admin and family pages are lazy-loaded:

```typescript
const FamilyLoans = lazy(() => import('./pages/family/Loans'));
```

### Route Protection

```typescript
// In route component
const { user, isLoading } = useAuth();

if (isLoading) return <LoadingFallback />;
if (!user) return <Navigate to="/auth" />;
```

---

## Database Layer

### Supabase Integration

**Auto-generated files (DO NOT EDIT):**
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`

### Query Patterns

```typescript
import { supabase } from '@/integrations/supabase/client';

// Basic query
const { data, error } = await supabase
  .from('loans')
  .select('*, family_members(*)')
  .eq('family_id', familyId);

// With RLS (automatically applies based on auth)
const { data } = await supabase
  .from('contributions')
  .select('*')
  .eq('status', 'pending');
```

### Row Level Security (RLS)

All tables have RLS policies. Common patterns:

```sql
-- Members can view their family's data
CREATE POLICY "View family data" ON loans
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM family_members 
      WHERE user_id = auth.uid()
    )
  );
```

---

## Authentication

### Auth Flow

1. User signs up/logs in via `/auth`
2. Supabase creates session
3. `profiles` table entry created (if new user)
4. User can join families via invitations
5. `family_members` entry created with role

### Auth Hooks

```typescript
import { supabase } from '@/integrations/supabase/client';

// Get current user
const { data: { user } } = await supabase.auth.getUser();

// Listen for auth changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    // Handle sign in
  }
});
```

---

## Internationalization

### Setup

```typescript
// src/i18n/config.ts
import i18n from 'i18next';

i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: ['en', 'fr', 'bota'],
});
```

### Usage

```typescript
import { useTranslation } from 'react-i18next';

function Component() {
  const { t } = useTranslation();
  return <h1>{t('welcome.title')}</h1>;
}
```

### Translation Files Structure

```json
// en.json
{
  "welcome": {
    "title": "Welcome to Family Together"
  },
  "loans": {
    "apply": "Apply for Loan",
    "interest_rate": "Interest Rate"
  }
}
```

---

## Mobile Support

### Responsive Design

Components use Tailwind breakpoints:
- `sm:` - 640px+
- `md:` - 768px+
- `lg:` - 1024px+

### Mobile Detection

```typescript
import { useIsMobile } from '@/hooks/use-mobile';

function Component() {
  const isMobile = useIsMobile();
  return isMobile ? <MobileView /> : <DesktopView />;
}
```

### PWA Support

- `public/manifest.webmanifest` - PWA manifest
- `vite-plugin-pwa` - Service worker generation
- Capacitor for native app builds

---

## Development Guidelines

### Component Creation

1. Create in appropriate directory (`components/`, `pages/`)
2. Use TypeScript with proper typing
3. Use shadcn/ui components where possible
4. Follow existing patterns for data fetching

### Adding New Features

1. Update database schema via migrations
2. Types auto-update from schema
3. Create/update components
4. Add translations to all locale files
5. Test with different user roles

### Code Style

- Functional components with hooks
- Named exports for components
- Proper error handling
- Descriptive variable names
- JSDoc comments for complex logic
