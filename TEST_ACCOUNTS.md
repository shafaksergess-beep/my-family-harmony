# 🧪 Test Accounts Setup

## Quick Setup (Automated)

Run this edge function to automatically create all test accounts:

```bash
# Call the edge function
curl -X POST https://nskulyhcaogrfekojyyb.supabase.co/functions/v1/create-test-users \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

Or use the Supabase client:
```javascript
const { data, error } = await supabase.functions.invoke('create-test-users');
console.log(data);
```

---

## Test Accounts Created

All accounts use the same password: **`TestPass123!`**

### 🔴 1. Super Admin
- **Email**: `superadmin@test.com`
- **Password**: `TestPass123!`
- **Capabilities**:
  - View all families and data across the system
  - Manage all families, users, and roles
  - Access admin dashboard
  - View global analytics
  - Create new families

---

### 👑 2. Family Head
- **Email**: `familyhead@test.com`
- **Password**: `TestPass123!`
- **Family**: Test Family
- **Capabilities**:
  - Manage family members and invitations
  - Create and manage meetings
  - Approve loans
  - Manage all family financial operations
  - Configure family settings
  - View all family reports

---

### 💰 3. Treasurer
- **Email**: `treasurer@test.com`
- **Password**: `TestPass123!`
- **Family**: Test Family
- **Capabilities**:
  - Manage contributions and payments
  - Record expenses
  - View financial reports
  - Manage shares and dividends
  - Process payment transactions
  - Generate financial reports

---

### 📋 4. Loan Committee Member
- **Email**: `loancommittee@test.com`
- **Password**: `TestPass123!`
- **Family**: Test Family
- **Capabilities**:
  - Review loan applications
  - Approve/reject loans
  - View all loans in the family
  - Track loan repayments
  - Generate loan reports

---

### 👤 5. Regular Member
- **Email**: `member@test.com`
- **Password**: `TestPass123!`
- **Family**: Test Family
- **Capabilities**:
  - View own contributions and payments
  - Apply for loans
  - View family meetings
  - View own shares and dividends
  - View family announcements
  - Limited access to financial data (own only)

---

### 👁️ 6. Guest User
- **Email**: `guest@test.com`
- **Password**: `TestPass123!`
- **Family**: Test Family
- **Capabilities**:
  - Read-only access to family information
  - View meetings (cannot manage)
  - View basic family statistics
  - Cannot view financial details
  - Cannot make changes

---

## Test Family Details

- **Name**: Test Family
- **Slug**: `test-family`
- **ID**: `00000000-0000-0000-0000-000000000001`
- **URL**: `/family/test-family`

---

## Testing Scenarios

### 1. Authentication & Authorization
- ✅ Login with each account
- ✅ Verify dashboard access
- ✅ Test role-based menu visibility
- ✅ Verify restricted actions are blocked

### 2. Super Admin Testing
- ✅ Login as `superadmin@test.com`
- ✅ Access admin dashboard at `/admin`
- ✅ View all families
- ✅ Create a new family
- ✅ Assign users to families
- ✅ View global analytics

### 3. Family Head Testing
- ✅ Login as `familyhead@test.com`
- ✅ Navigate to `/family/test-family`
- ✅ Create a meeting
- ✅ Invite a new member
- ✅ Approve a loan request
- ✅ Update family settings

### 4. Treasurer Testing
- ✅ Login as `treasurer@test.com`
- ✅ Navigate to `/family/test-family/contributions`
- ✅ Record a contribution
- ✅ Mark payment as received
- ✅ Generate financial report
- ✅ Manage shares

### 5. Loan Committee Testing
- ✅ Login as `loancommittee@test.com`
- ✅ Navigate to `/family/test-family/loans`
- ✅ Review pending loan
- ✅ Approve/reject loan
- ✅ View loan analytics

### 6. Regular Member Testing
- ✅ Login as `member@test.com`
- ✅ Navigate to `/family/test-family`
- ✅ View own contributions
- ✅ Apply for a loan
- ✅ Verify cannot access other members' data
- ✅ Verify cannot manage meetings

### 7. Guest Testing
- ✅ Login as `guest@test.com`
- ✅ Navigate to `/family/test-family`
- ✅ View family info (read-only)
- ✅ Verify cannot edit anything
- ✅ Verify cannot view financial details

### 8. Security Testing
- ✅ Try to access other families' data (should fail)
- ✅ Try privilege escalation (should fail)
- ✅ Verify RLS policies work correctly
- ✅ Test rate limiting on login
- ✅ Test reCAPTCHA (once configured)

---

## Manual User Creation (Alternative)

If you prefer to create users manually:

1. Navigate to `/auth`
2. Click "Sign Up"
3. Use credentials from the table above
4. Users will be auto-confirmed (since auto-confirm is enabled)

Then run this SQL to assign roles:

```sql
-- Get the user IDs after signup
-- Replace USER_ID_HERE with actual IDs from profiles table

-- Super Admin
INSERT INTO super_admins (user_id) 
VALUES ('USER_ID_HERE');

-- Family Members (for non-super-admin users)
INSERT INTO family_members (user_id, family_id, role)
VALUES 
  ('USER_ID_HERE', '00000000-0000-0000-0000-000000000001', 'family_head'),
  ('USER_ID_HERE', '00000000-0000-0000-0000-000000000001', 'treasurer'),
  ('USER_ID_HERE', '00000000-0000-0000-0000-000000000001', 'loan_committee'),
  ('USER_ID_HERE', '00000000-0000-0000-0000-000000000001', 'member'),
  ('USER_ID_HERE', '00000000-0000-0000-0000-000000000001', 'guest');
```

---

## Cleanup

To delete all test accounts and data:

```sql
-- Delete test family and all related data (cascade will handle dependencies)
DELETE FROM families WHERE id = '00000000-0000-0000-0000-000000000001';

-- Delete test users from auth (use Supabase dashboard or admin API)
-- These emails:
-- - superadmin@test.com
-- - familyhead@test.com
-- - treasurer@test.com
-- - loancommittee@test.com
-- - member@test.com
-- - guest@test.com
```

---

## Notes

- ✅ All accounts are pre-confirmed (no email verification needed)
- ✅ Password meets complexity requirements
- ✅ Test family is created automatically
- ✅ RLS policies are enforced
- ⚠️ These are **TEST ACCOUNTS** - delete before production deployment
- ⚠️ Do not use these credentials in production

---

## Troubleshooting

### "User already exists" error
- Users were created in a previous run
- Call the edge function again (it will handle existing users)
- Or delete users from Supabase dashboard and retry

### "Permission denied" error
- Edge function needs service role key to create users
- Check that `SUPABASE_SERVICE_ROLE_KEY` secret is set

### Can't login as super admin
- Verify user exists in `super_admins` table
- Check `profiles` table has correct user_id

### Role not working correctly
- Check `family_members` table for correct role assignment
- Verify RLS policies with `supabase--linter` tool
- Check browser console for errors

---

**Ready to test!** 🚀

After creating the test accounts, you can immediately start testing all user roles and permissions.
