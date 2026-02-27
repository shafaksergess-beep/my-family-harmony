# Family Together Mobile

React Native mobile app for Family Together family reunion management system.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file with your Supabase credentials:
```
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

3. Start the development server:
```bash
npx expo start
```

## Running the App

- **iOS Simulator**: Press `i` in the terminal
- **Android Emulator**: Press `a` in the terminal  
- **Physical Device**: Scan the QR code with Expo Go app

## Test Accounts

- **Super Admin**: superadmin@test.com / TestPass123!
- **Family Head**: familyhead@test.com / TestPass123!
- **Treasurer**: treasurer@test.com / TestPass123!
- **Member**: member@test.com / TestPass123!

## Tech Stack

- **Framework**: Expo + React Native
- **UI Library**: React Native Paper
- **Backend**: Supabase (shared with web app)
- **State Management**: TanStack React Query
- **Forms**: React Hook Form + Zod
- **Navigation**: React Navigation (coming in Phase 2)

## Project Structure

```
src/
├── components/     # Reusable UI components
│   ├── auth/      # Authentication screens
│   ├── common/    # Shared components
│   ├── family/    # Family management
│   ├── financial/ # Financial modules
│   └── meetings/  # Meeting components
├── hooks/         # Custom React hooks
├── lib/           # Utilities and config
├── services/      # Business logic
├── types/         # TypeScript types
└── i18n/          # Internationalization
```

## Development Status

✅ Phase 1: Setup & Foundation (COMPLETE)
- [x] Expo project initialized
- [x] Supabase client configured
- [x] Authentication working
- [x] Database types copied
- [x] React Native Paper UI setup

🚧 Next: Phase 2 - Navigation & Core UI
