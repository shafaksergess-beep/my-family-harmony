# Family Together - Domain Logic Documentation

This document explains the core business rules and domain logic implemented in the Family Together application.

## Table of Contents
1. [Overview](#overview)
2. [Njangi (Rotating Savings)](#njangi-rotating-savings)
3. [Loan Management](#loan-management)
4. [Contributions](#contributions)
5. [Individual Savings](#individual-savings)
6. [Shares & Dividends](#shares--dividends)
7. [Assistance Events](#assistance-events)
8. [Attendance & Fines](#attendance--fines)
9. [Roles & Permissions](#roles--permissions)

---

## Overview

Family Together is a multi-language family reunion management system designed to digitize and automate operations for extended family organizations. The system handles financial tracking, meeting management, and member coordination.

### Supported Languages
- English (en)
- French (fr)
- Bota Land dialect (bota)

---

## Njangi (Rotating Savings)

### What is Njangi?
Njangi is a traditional rotating savings scheme common in Cameroonian culture. Members contribute a fixed amount regularly, and one member receives the pooled funds each period.

### Rules

| Parameter | Value | Configurable |
|-----------|-------|--------------|
| Minimum contribution | 25,000 FCFA per person | Yes (annual decision) |
| Participants | All working family members | - |
| Order determination | Open balloting | - |
| Frequency | Typically monthly | Yes |

### Data Model
```
njangi_cycles
├── id (UUID)
├── family_id (FK)
├── name (string)
├── amount_per_person (number) - Default: 25,000 FCFA
├── start_date (date)
├── end_date (date, nullable)
├── status (enum: 'active', 'completed', 'cancelled')
└── notes (text)

njangi_participants
├── id (UUID)
├── cycle_id (FK → njangi_cycles)
├── member_id (FK → family_members)
├── payout_order (integer) - Determined by balloting
├── payout_date (date, nullable)
├── amount_received (number, nullable)
├── is_paid (boolean) - Has this member received their payout?
└── notes (text)
```

### Process Flow
1. **Cycle Creation**: Admin creates a new Njangi cycle with amount and participants
2. **Balloting**: Random order assignment determines payout sequence
3. **Monthly Contributions**: All members contribute the fixed amount
4. **Payout**: One member receives total pool (amount × participant count)
5. **Rotation**: Next member in order receives payout following month
6. **Completion**: Cycle ends when all members have received their payout

### Calculation Example
```
Participants: 10 members
Amount per person: 25,000 FCFA
Monthly pool: 10 × 25,000 = 250,000 FCFA
Total cycle: 10 months (each member receives 250,000 FCFA once)
```

---

## Loan Management

### Interest Calculation

Loans use **simple interest** calculated as follows:

```typescript
// From src/lib/creditScoring.ts
Total Interest = Principal × (Annual Rate / 100) × (Term in Months / 12)
Total Repayment = Principal + Total Interest
Monthly Payment = Total Repayment / Term in Months
```

### Default Parameters

| Parameter | Default Value | Stored In |
|-----------|---------------|-----------|
| Interest Rate | 10% per annum | `families.loan_interest_rate` |
| Minimum Loan Amount | 50,000 FCFA | `families.min_loan_amount` |
| Default Term | 12 months | Per loan |

### Loan Statuses
- `pending` - Application submitted, awaiting review
- `approved` - Approved by loan committee, awaiting disbursement
- `disbursed` - Funds have been released to member
- `active` - Loan is being repaid
- `paid` - Fully repaid
- `defaulted` - Member has failed to repay

### Loan Process
1. Member submits loan application with amount, purpose, and term
2. Loan committee reviews application
3. If approved, loan is marked for disbursement
4. Treasurer disburses funds, records `disbursed_at` date
5. Member makes regular payments tracked in `loan_payments`
6. System tracks `amount_paid` and `interest_paid`
7. Loan marked `paid` when `amount_paid >= amount + calculated_interest`

### Credit Scoring
Members have credit scores based on:
- Payment history (on-time vs late payments)
- Existing debt ratio
- Membership tenure
- Contribution compliance

---

## Contributions

### Types of Contributions

| Type | Description | Amount Source |
|------|-------------|---------------|
| `mandatory` | Monthly required contribution | `families.mandatory_contribution` |
| `savings` | Optional individual savings | Member choice (min: `families.min_savings_amount`) |
| `njangi` | Rotating savings contribution | `families.njangi_amount` |
| `share_purchase` | Buying family shares | `families.share_value` × quantity |
| `assistance` | Special assistance contributions | Event-specific calculation |
| `fine` | Late payment/attendance fines | Rule-based |

### Contribution Statuses
- `pending` - Contribution expected but not yet paid
- `paid` - Contribution received
- `late` - Paid after due date (may include fine)
- `waived` - Excused by admin

### Late Payment Fines
If a contribution is late, the system can apply:
```typescript
late_fine = contribution.amount × late_fine_percentage
```

---

## Individual Savings

### Rules
- **Optional** participation
- **Minimum**: 5,000 FCFA monthly per member
- Tracked per member, per month
- Annual totals calculated for year-end reports

### Data Flow
```
Member deposits savings → contributions table (type='savings')
→ Aggregated in member_wallets.balance
→ Visible in member profile and family analytics
```

---

## Shares & Dividends

### Share System
- Each family has a configurable share value (`families.share_value`)
- Members can purchase shares
- Shares determine voting weight and dividend eligibility

### Dividend Calculation
```typescript
// When distributing profits:
amount_per_share = total_dividend_pool / total_shares_outstanding

// Per member:
member_dividend = member_shares × amount_per_share
```

### Dividend Distribution Process
1. Family declares total dividend amount and period
2. System calculates `amount_per_share`
3. Creates `dividend_payments` record for each shareholder
4. Treasurer marks payments as distributed

---

## Assistance Events

### Event Types & Default Amounts

| Event Type | Default Amount | Config Field |
|------------|---------------|--------------|
| Birth | 50,000 FCFA | `families.birth_assistance_amount` |
| Member Death | 500,000 FCFA | `families.member_death_amount` |
| Spouse Death | 300,000 FCFA | `families.spouse_death_amount` |
| Child Death | 200,000 FCFA | `families.child_death_amount` |
| Wedding | 100,000 FCFA | `families.wedding_assistance_amount` |
| Sickness/Hospitalization | 50,000 FCFA | `families.sickness_assistance_amount` |
| Ceremony Invitation | Configurable | `families.ceremony_invitation_amount` |

### Contribution Per Member Calculation
```typescript
contribution_per_member = assistance_amount / active_member_count
```

### Process
1. Event reported (birth, death, sickness, etc.)
2. System calculates total assistance amount based on event type
3. Calculates per-member contribution
4. Creates contribution records for each member
5. Tracks visit completion (for births/hospitalizations)
6. Marks event as paid when assistance delivered

---

## Attendance & Fines

### Meeting Attendance Statuses
- `present` - Attended on time
- `late` - Arrived after grace period
- `absent` - Did not attend
- `excused` - Absence approved in advance

### Lateness Fines

| Condition | Fine Amount | Config Field |
|-----------|-------------|--------------|
| Late (within 30 min) | Configurable | `families.fine_after_30min` |
| Late (30-60 min) | Configurable | `families.fine_after_60min` |
| Grace period | Configurable | `families.lateness_tolerance_minutes` |

### Calculation
```typescript
if (minutes_late > lateness_tolerance_minutes) {
  if (minutes_late <= 30) {
    fine = fine_after_30min;
  } else if (minutes_late <= 60) {
    fine = fine_after_60min;
  } else {
    // Marked as absent
    fine = absence_fine; // if configured
  }
}
```

---

## Roles & Permissions

### Role Hierarchy

| Role | Level | Capabilities |
|------|-------|--------------|
| `super_admin` | Platform | Manage all families, users, system settings |
| `family_head` | Family | Full family management, approve loans, manage members |
| `treasurer` | Family | Financial operations, record payments, manage contributions |
| `loan_committee` | Family | Review and approve/reject loan applications |
| `member` | Family | View own data, make contributions, apply for loans |
| `guest` | Family | Read-only access to limited family information |

### Permission Scopes
- **View**: Can see the data
- **Edit**: Can modify existing records
- **Create**: Can add new records
- **Delete**: Can remove records
- **Approve**: Can approve pending items (loans, join requests)

---

## Financial Ledger

All money flows are tracked in the following tables:

| Table | Purpose |
|-------|---------|
| `contributions` | Mandatory, savings, Njangi, shares |
| `loans` | Loan records with status tracking |
| `loan_payments` | Individual loan payment records |
| `assistance_events` | Birth, death, sickness assistance |
| `dividends` | Dividend declarations |
| `dividend_payments` | Per-member dividend payouts |
| `expenses` | Family operational expenses |
| `member_wallets` | Running balance per member |

### Dashboard Metrics
- Total cash at bank/on hand
- Total loans outstanding
- Expected interest income
- Individual savings totals
- Assistance expenditure YTD
- Shares/dividends overview
- Family net position

---

## Data Export

All financial data supports export in:
- CSV format
- Excel format
- PDF reports (via `src/lib/pdfGenerator.ts`)

Export schedules can be configured for automated delivery.

---

## Technical Implementation Notes

### Key Files
- `src/lib/creditScoring.ts` - Loan calculations and credit scoring
- `src/lib/pdfGenerator.ts` - Report generation
- `src/lib/export.ts` - Data export utilities
- `src/pages/family/Loans.tsx` - Loan management UI
- `src/pages/family/Njangi.tsx` - Njangi management UI
- `src/pages/family/Contributions.tsx` - Contribution tracking

### Database Schema
Full schema available in `src/integrations/supabase/types.ts` (auto-generated).
