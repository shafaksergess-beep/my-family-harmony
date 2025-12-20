# Kinsroot Feature Documentation

**Generated:** December 20, 2025  
**Version:** 1.0

---

## Platform Overview

Kinsroot is a comprehensive family management platform designed for African family associations (particularly Cameroonian "meetings"). It enables families to manage finances, meetings, assistance programs, and member activities.

---

## 1. Module Categories (7 Total)

| Category | Modules | Description |
|----------|---------|-------------|
| Meetings | 8 | Meeting management, templates, analytics |
| Empowerment | 8 | Loans, savings, contributions, njangi |
| Analytics | 3 | Dashboards and forecasting |
| Reports | 5 | PDF, email, scheduled reports |
| Plans | 3 | Payment plans and budgeting |
| Assistance | 2 | Member assistance programs |
| Members | - | Member management (built-in) |

---

## 2. Core Modules (29 Total)

### 2.1 Meeting Management

| Module | Route | Access | Description |
|--------|-------|--------|-------------|
| Meetings | /meetings | All | View/manage family meetings |
| Meeting Analytics | /meeting-analytics | All | Meeting statistics & trends |
| Meeting Templates | /meeting-templates | All | Reusable meeting templates |
| Meeting Settings | /meeting-settings | All | Configure meeting defaults |
| Meeting Reminders | /meeting-reminders | All | Set up reminder notifications |
| Attendance Analytics | /attendance-analytics | All | Attendance patterns |
| Balloting System | /balloting | All | Host rotation balloting |
| Shares & Dividends | /shares | All | Share management |

### 2.2 Financial Empowerment

| Module | Route | Access | Description |
|--------|-------|--------|-------------|
| Savings | /savings | All | Personal savings tracking |
| Njangi | /njangi | All | Rotating savings (tontine) |
| Loans | /loans | All | Loan applications & status |
| Contributions | /contributions | All | Monthly contribution tracking |
| Loan Analytics | /loan-analytics | All | Loan performance metrics |
| Loan Committee | /loan-committee | All | Loan approval dashboard |
| Loan History | /loan-history | All | Historical loan records |
| Contribution Analytics | /contribution-analytics | All | Contribution trends |

### 2.3 Analytics & Reporting

| Module | Route | Access | Description |
|--------|-------|--------|-------------|
| Analytics Dashboard | /analytics | All | Family overview dashboard |
| Financial Analytics | /financial-analytics | Head, Treasurer | Financial health metrics |
| Financial Forecasting | /forecasting | Head, Treasurer | AI-powered predictions |

### 2.4 Reports & Exports

| Module | Route | Access | Description |
|--------|-------|--------|-------------|
| Email Reports | /email-reports | Head, Treasurer | Email report scheduling |
| Financial Reports | /reports | Head, Treasurer | Comprehensive reports |
| PDF Reports | /pdf-reports | Head, Treasurer | Downloadable PDFs |
| Export Scheduler | /export-scheduler | Head, Treasurer | Automated data exports |
| Assistance Reports | /assistance-reports | Head, Treasurer | Assistance program reports |

### 2.5 Payment Management

| Module | Route | Access | Description |
|--------|-------|--------|-------------|
| Payment Management | /payments | Head, Treasurer | Process payments |
| Payment Plans | /payment-plans | Head, Treasurer | Installment plans |
| Budget Planning | /budget | Head, Treasurer | Annual budgeting |

### 2.6 Assistance Programs

| Module | Route | Access | Description |
|--------|-------|--------|-------------|
| Assistance | /assistance | All | Request/view assistance |
| Assistance Analytics | /assistance-analytics | All | Program effectiveness |

---

## 3. Admin Features (18 Pages)

### 3.1 User Management
- **Users**: List all platform users
- **User Detail**: Individual user management
- **User Activity**: Track user actions

### 3.2 Family Management
- **Families**: Create/manage families
- **Family Members**: Member assignments
- **Member Detail**: Individual profiles
- **Member Leaderboard**: Engagement rankings

### 3.3 System Configuration
- **Module Management**: Enable/disable modules
- **Role Permissions**: Configure role access
- **Permissions**: Granular permission control
- **Role Management**: Create custom roles

### 3.4 Monitoring & Reports
- **Activity Logs**: System-wide audit trail
- **Global Analytics**: Platform metrics
- **Email Reports**: Admin email reports
- **Export Scheduler**: Platform exports
- **Digest Settings**: Configure digests

### 3.5 Customization
- **Customize Dashboard**: Personalize admin views

---

## 4. Family Features (48 Pages)

### 4.1 Core Pages
| Page | Purpose |
|------|---------|
| Detail | Family dashboard/overview |
| Members | Member directory |
| Member Profile | Individual member view |
| Member Detail | Detailed member management |

### 4.2 Meeting Features
| Page | Purpose |
|------|---------|
| Meetings | Meeting list & creation |
| Meeting Detail | Single meeting view |
| Meeting Check-In | QR-based attendance |
| Meeting Templates | Template management |
| Meeting Settings | Meeting configuration |
| Meeting Reminders | Reminder settings |
| Meeting Analytics Dashboard | Meeting insights |
| Attendance | Track attendance |
| Attendance Analytics | Attendance patterns |
| Balloting | Host rotation system |

### 4.3 Financial Features
| Page | Purpose |
|------|---------|
| Contributions | Contribution tracking |
| Contribution Settings | Contribution rules |
| Contribution Analytics | Contribution insights |
| Loans | Loan management |
| Loan Committee Dashboard | Approval workflow |
| Loan Analytics | Loan metrics |
| Loan History | Past loans |
| Savings | Savings accounts |
| Njangi | Rotating savings |
| Shares | Share certificates |
| Payments | Payment processing |
| Payment Plans | Installment plans |
| Payment Integration | Mobile money |
| Financial Settings | Financial config |
| Financial Analytics | Financial health |
| Financial Forecasting | AI predictions |
| Budget Planning | Annual budgets |

### 4.4 Assistance Features
| Page | Purpose |
|------|---------|
| Assistance | Assistance requests |
| Assistance Analytics | Program metrics |
| Assistance Reports | Program reports |

### 4.5 Settings & Configuration
| Page | Purpose |
|------|---------|
| Invitations | Member invitations |
| Email Settings | Email preferences |
| Notification Settings | Alert preferences |
| Reminder Settings | Reminder config |
| Backup Restore | Data backup |
| More | Additional options |

### 4.6 Reports & Analytics
| Page | Purpose |
|------|---------|
| Analytics | Family analytics |
| Reports | Financial reports |
| PDF Reports | Downloadable reports |
| Email Reports | Scheduled emails |
| Export Scheduler | Auto exports |
| Audit Trail | Activity history |
| Audit Trail Enhanced | Detailed audit |
| Notifications | Alert center |

---

## 5. Edge Functions (16 Total)

### 5.1 User Management
| Function | Trigger | Purpose |
|----------|---------|---------|
| create-test-users | Manual | Create test accounts |

### 5.2 Email Notifications
| Function | Trigger | Purpose |
|----------|---------|---------|
| send-invitation | User action | Email invitations |
| send-meeting-reminder | Scheduled | Meeting alerts |
| send-loan-notification | Loan status | Loan updates |
| send-loan-payment-reminder | Scheduled | Payment reminders |
| send-notification | Various | General notifications |
| send-digest | Scheduled | Periodic summaries |
| send-birth-visit-reminders | Scheduled | Special events |
| send-attendance-predictions | Scheduled | AI predictions |

### 5.3 SMS Notifications
| Function | Trigger | Purpose |
|----------|---------|---------|
| send-sms | Various | SMS messages via Twilio |

### 5.4 Scheduled Tasks
| Function | Trigger | Purpose |
|----------|---------|---------|
| check-late-payments | Cron | Payment monitoring |
| schedule-meeting-reminders | Cron | Reminder scheduling |
| scheduled-export | Cron | Data exports |

### 5.5 AI Features
| Function | Trigger | Purpose |
|----------|---------|---------|
| generate-meeting-summary | User action | AI meeting summaries |

### 5.6 Payments
| Function | Trigger | Purpose |
|----------|---------|---------|
| mobile-money-webhook | External | MTN/Orange webhooks |

---

## 6. Database Schema (42 Tables)

### 6.1 Core Tables
- `profiles` - User profiles
- `families` - Family organizations
- `family_members` - User-family relationships
- `super_admins` - Platform administrators

### 6.2 Meeting Tables
- `meetings` - Meeting records
- `attendance` - Attendance tracking
- `meeting_agenda_items` - Agenda management
- `meeting_minutes` - Meeting notes
- `meeting_reminders` - Reminder scheduling
- `meeting_templates` - Template storage

### 6.3 Financial Tables
- `contributions` - Member contributions
- `loans` - Loan applications
- `loan_payments` - Loan repayments
- `loan_surety_deductions` - Guarantor deductions
- `savings` - Savings records
- `shares` - Share ownership
- `dividends` - Dividend distributions
- `dividend_payments` - Dividend payouts
- `transactions` - Transaction ledger
- `member_wallets` - Wallet balances
- `wallet_transactions` - Wallet movements

### 6.4 Njangi Tables
- `njangi_cycles` - Njangi rounds
- `njangi_participants` - Participant tracking

### 6.5 Assistance Tables
- `assistance_events` - Assistance records

### 6.6 Payment Tables
- `payment_transactions` - Payment records
- `payment_reminders` - Payment alerts
- `payment_plans` - Installment plans

### 6.7 System Tables
- `modules` - Feature modules
- `module_categories` - Module groupings
- `family_module_settings` - Module config per family
- `permissions` - Permission definitions
- `role_permissions` - Role-permission mapping
- `invitations` - Pending invitations
- `notification_preferences` - User preferences
- `export_schedules` - Export jobs
- `budget_categories` - Budget categories
- `expenses` - Expense tracking
- `balloting_assignments` - Ballot results

### 6.8 Audit Tables
- `activity_logs` - User activity
- `admin_logs` - Admin actions
- `agenda_item_votes` - Voting records

---

## 7. User Roles (8 Types)

| Role | Access Level | Permissions |
|------|-------------|-------------|
| super_admin | Platform-wide | All administrative functions |
| family_head | Family-wide | Full family management |
| family_admin | Family-wide | Family administration |
| treasurer | Family-wide | Financial management |
| loan_committee | Financial | Loan approval/management |
| secretary | Documentation | Meeting minutes, reports |
| member | Personal | View data, apply for loans |
| guest | Read-only | Limited viewing access |

---

## 8. Integration Points

### 8.1 Email (Resend)
- Invitation emails
- Meeting reminders
- Payment notifications
- Digest emails

### 8.2 SMS (Twilio)
- Meeting reminders
- Payment alerts
- Urgent notifications

### 8.3 Mobile Money
- MTN Mobile Money
- Orange Money
- Webhook integration

### 8.4 AI (Lovable AI)
- Meeting summaries
- Financial forecasting
- Attendance predictions

### 8.5 Security
- reCAPTCHA v3
- Rate limiting
- RLS policies

---

## 9. Mobile Features

### 9.1 Progressive Web App
- Installable on mobile
- Offline capabilities
- Push notifications

### 9.2 Mobile-Specific Components
- MobileLayout
- MobileHeader
- MobileBottomNav
- PullToRefresh
- OfflineIndicator
- SyncStatusIndicator

### 9.3 Mobile Money Integration
- Receipt scanning
- QR code attendance
- Mobile payments

---

## 10. Internationalization

### Supported Languages
1. **English** (en) - Default
2. **French** (fr) - Full translation
3. **Bota** (bota) - Local dialect

### Language Files
- `src/i18n/locales/en.json`
- `src/i18n/locales/fr.json`
- `src/i18n/locales/bota.json`

---

**Documentation Status:** ✅ Complete
