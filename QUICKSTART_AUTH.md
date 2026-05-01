# Quick Start: Authentication System

## 🎯 TL;DR - What You Need to Do

1. **Execute Database Migration** (1 minute)
   ```
   Supabase Dashboard → SQL Editor
   → Paste supabase-schema.sql
   → Click "Run"
   ```

2. **Test Locally** (2 minutes)
   ```bash
   npm run dev
   # Visit http://localhost:3000/auth
   # Register and log in
   ```

3. **Deploy** (1 click)
   ```bash
   git push origin main
   # Vercel auto-deploys with auth system
   ```

---

## What Changed

✅ **Users must now log in to play**
✅ **Wallets are connected to user accounts**
✅ **Starting balance: 10,000 chips per user**
✅ **Session-based access is gone** (now user-based)

---

## Step-by-Step Setup

### Step 1: Run Database Migration (REQUIRED)

1. Go to https://app.supabase.com
2. Select your project `onbwmddfqpccxsrpoode`
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**
5. Open `supabase-schema.sql` from project root
6. Copy entire contents
7. Paste into Supabase SQL Editor
8. Click **Run** (blue button, top right)
9. Wait for success message

**Why?** This creates the user-wallet relationship in the database.

### Step 2: Verify Email is Enabled

1. Go to **Authentication** (left sidebar)
2. Click **Providers**
3. Confirm **Email** shows "Enabled"
4. If not enabled, click **Enable**

**Why?** Email is needed for registration.

### Step 3: Test Locally

```bash
# Terminal
npm run dev

# Browser
# 1. Visit http://localhost:3000
# 2. Click "Sign in to play"
# 3. Click "Register"
# 4. Enter:
#    - Display Name: "TestPlayer"
#    - Email: "test@example.com"
#    - Password: "Test123!@"
# 5. Click "Register"
# 6. Click "Login"
# 7. Enter email & password
# 8. See wallet with 10,000 chips ✅
```

### Step 4: Deploy to Vercel

```bash
# Terminal
git push origin main

# That's it! 
# Vercel auto-deploys to your production URL
```

---

## User Flow

### New User
```
http://localhost:3000
  ↓
"Sign in to play" → /auth
  ↓
Click "Register"
  ↓
Enter: Display Name, Email, Password
  ↓
Wallet created (10,000 chips)
  ↓
Login
  ↓
Home page with wallet + play buttons
```

### Returning User
```
http://localhost:3000
  ↓
Redirects to /auth (not logged in)
  ↓
Enter email & password
  ↓
Login → Home page
  ↓
Play games!
```

---

## Testing Checklist

Run through each to verify everything works:

- [ ] Can visit /auth page
- [ ] Can register new account
- [ ] Wallet appears with 10,000 chips
- [ ] Can log out
- [ ] Can log back in
- [ ] Wallet balance persists
- [ ] Can join poker game
- [ ] Can join blackjack game

---

## Common Issues

### "Wallet not found" Error
**Solution:** Execute the database migration from Step 1

### "Missing authorization" on home page
**Solution:** 
- Clear browser cache (Ctrl+Shift+Delete)
- Log out and log back in

### Registration fails silently
**Solution:**
- Check browser console for errors (F12)
- Verify email isn't already registered
- Try different email

### Email verification emails not arriving
**Solution:** 
- Check spam folder
- Or disable email verification:
  - Supabase → Authentication → Providers → Email
  - Toggle "Confirm email" OFF

---

## What's Different From Before?

| Before | After |
|--------|-------|
| Session ID generated locally | User account created in Supabase |
| Wallet was temporary | Wallet persists permanently |
| No login required | Login required |
| Each game = new chips | Wallet shared across all games |
| No user identity | Email identity |

---

## Files You Should Know About

```
src/app/auth/page.tsx              ← Login/Register page
src/lib/client/auth-context.tsx    ← Auth system (not shown to user)
src/app/api/wallet/route.ts        ← Wallet API (requires Bearer token)
supabase-schema.sql                ← Database setup
AUTH_SETUP.md                       ← Detailed troubleshooting
AUTHENTICATION.md                   ← Technical deep-dive
```

---

## Next Steps (Optional)

1. **Buy-in System** - Deduct chips when joining games
2. **Cash-out** - Add winnings back when leaving
3. **Profile Page** - Show account settings
4. **Transaction History** - Show wallet activity
5. **Social Login** - Google/GitHub buttons

---

## Support

- **Setup issues?** See `AUTH_SETUP.md`
- **Technical details?** See `AUTHENTICATION.md`
- **Still stuck?** Check browser console (F12) for error messages

---

## Production Checklist

Before deploying to production:

- [ ] Database migration executed
- [ ] Email provider enabled
- [ ] `npm run build` passes
- [ ] Tested registration/login locally
- [ ] Tested joining both poker & blackjack
- [ ] Environment variables set in Vercel
- [ ] Git pushed to main

---

**Status:** ✅ Ready to use!

**Next action:** Execute database migration (Step 1)
