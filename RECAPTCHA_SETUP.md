# reCAPTCHA v3 Setup Instructions

## 🔐 Critical Security Configuration Required

Your application has reCAPTCHA v3 integration prepared but **NOT YET CONFIGURED**. Complete these steps before deploying to production.

---

## Step 1: Get Your reCAPTCHA Keys

1. Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Click **"+"** to create a new site
3. Fill in the registration form:
   - **Label**: Family Together (or your app name)
   - **reCAPTCHA type**: Select **reCAPTCHA v3**
   - **Domains**: Add your domains:
     - `localhost` (for development)
     - Your preview URL (e.g., `your-app.lovableproject.com`)
     - Your production domain (if applicable)
   - Accept the terms and click **Submit**

4. You'll receive two keys:
   - **Site Key** (public) - Used in frontend
   - **Secret Key** (private) - Already configured in backend

---

## Step 2: Configure the Site Key

Open `src/lib/recaptcha.ts` and replace the placeholder:

```typescript
// BEFORE (line 8):
export const RECAPTCHA_SITE_KEY = "YOUR_RECAPTCHA_SITE_KEY_HERE";

// AFTER (replace with your actual site key):
export const RECAPTCHA_SITE_KEY = "6LcXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
```

⚠️ **The Secret Key is already configured** in your Lovable Cloud secrets as `RECAPTCHA_SECRET_KEY`. You don't need to do anything with it.

---

## Step 3: Verify Integration

After configuring the site key, test reCAPTCHA on these forms:

### ✅ Protected Forms:
1. **Login Form** (`/auth`)
   - Action: `login`
   - Threshold: 0.5
   
2. **Signup Form** (`/auth`)
   - Action: `signup`
   - Threshold: 0.5
   
3. **Invitation Form** (`/family/{slug}/invitations`)
   - Action: `invite`
   - Threshold: 0.5

### Testing Checklist:
- [ ] Open browser DevTools → Console
- [ ] Navigate to each protected form
- [ ] Verify no reCAPTCHA errors in console
- [ ] Submit a form and check it works
- [ ] Look for reCAPTCHA badge in bottom-right corner

---

## Step 4: Configure reCAPTCHA Settings (Optional)

In the [reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin), you can:

1. **View Analytics**: See bot detection rates and score distribution
2. **Adjust Security**: Change detection sensitivity
3. **Manage Domains**: Add/remove allowed domains
4. **View Alerts**: Get notified of suspicious activity

---

## 🎯 How reCAPTCHA v3 Works

- **Invisible**: No CAPTCHAs or challenges shown to users
- **Score-based**: Returns a score (0.0 = bot, 1.0 = human)
- **Action-based**: Different actions can have different thresholds
- **Server-validated**: Score verification happens server-side (secure)

### Current Thresholds:
- **Login**: Score ≥ 0.5 required
- **Signup**: Score ≥ 0.5 required  
- **Invitation**: Score ≥ 0.5 required

You can adjust these thresholds in:
- `supabase/functions/send-invitation/index.ts` (line 50)
- Edge functions for other forms if needed

---

## 🚨 Security Notes

### ✅ DO:
- Keep your Secret Key private (already in Lovable Cloud secrets)
- Monitor reCAPTCHA analytics for suspicious patterns
- Adjust score thresholds based on your needs
- Test in incognito/private browsing mode

### ❌ DON'T:
- Commit the Secret Key to version control (it's not in code)
- Share the Site Key with untrusted parties (though it's public)
- Set thresholds too high (0.9+) - may block legitimate users
- Set thresholds too low (< 0.3) - may allow bots

---

## 📊 Score Interpretation

| Score Range | Meaning | Action |
|-------------|---------|--------|
| 0.9 - 1.0 | Very likely human | ✅ Allow |
| 0.7 - 0.9 | Likely human | ✅ Allow |
| 0.5 - 0.7 | Uncertain | ⚠️ Allow with monitoring |
| 0.3 - 0.5 | Suspicious | ⚠️ Challenge or block |
| 0.0 - 0.3 | Very likely bot | ❌ Block |

**Current threshold: 0.5** (reasonable balance)

---

## 🔧 Troubleshooting

### "reCAPTCHA not loaded" error
- Verify site key is correct in `src/lib/recaptcha.ts`
- Check browser console for loading errors
- Ensure domain is whitelisted in reCAPTCHA console

### "Security verification failed" error
- Check secret key is set in Lovable Cloud secrets
- Verify edge functions are deployed
- Check edge function logs for errors

### Score always 0.0 or verification fails
- Ensure domains are correctly configured
- Check site key/secret key match the same reCAPTCHA site
- Verify you're using v3 keys (not v2)

---

## 📚 Additional Resources

- [reCAPTCHA v3 Documentation](https://developers.google.com/recaptcha/docs/v3)
- [Best Practices Guide](https://developers.google.com/recaptcha/docs/v3#best_practices)
- [FAQ](https://developers.google.com/recaptcha/docs/faq)

---

## ✅ Post-Configuration Checklist

After completing setup:

- [ ] Site key configured in `src/lib/recaptcha.ts`
- [ ] Secret key already in Lovable Cloud secrets ✅
- [ ] Login form tested and working
- [ ] Signup form tested and working
- [ ] Invitation form tested and working
- [ ] No console errors
- [ ] reCAPTCHA badge visible
- [ ] Domains configured in reCAPTCHA console
- [ ] Analytics enabled in reCAPTCHA console

**Once all checkboxes are complete, your app is protected!** 🎉
