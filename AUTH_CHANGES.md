# Authentication System - Summary of Changes

## What's New

Your poker app now has a complete **user authentication system** powered by **Supabase Auth**. Here's what changed:

### New Features

✅ **User Registration & Login**

- Sign up page at `/auth` with email/password
- Display name field during registration
- Auto-creates wallet when user registers
- Session persistence via Supabase Auth tokens

✅ **User-Based Wallets**

- Each user gets one wallet connected to their Supabase Auth account
- Starting balance: **10,000 chips**
- Wallet persists across all games (poker, blackjack, future games)
- Secure Bearer token authentication on all wallet API calls

✅ **Protected Games**

- Users must be logged in to join poker/blackjack games
- Auto-redirects unauthenticated users to `/auth`
- Home page shows logged-in user email

✅ **Logout Functionality**

- "Logout" button in top right of home page
- Clears session and returns to auth page

## Files Changed/Created

### New Files

- `src/lib/client/auth-context.tsx` - Authentication context provider
- `src/app/auth/page.tsx` - Login/register UI
- `AUTH_SETUP.md` - Authentication setup guide

### Modified Files

- `src/app/layout.tsx` - Added AuthProvider wrapper
- `src/app/api/wallet/route.ts` - Added user ID support and Bearer token auth
- `src/components/home-lobby.tsx` - Added auth checks and user display
- `src/lib/client/use-wallet.ts` - Updated for Bearer token auth
- `supabase-schema.sql` - Added `user_id` foreign keys to wallet tables

## Database Changes

### Updated Tables

- `user_wallets`: Added `user_id` foreign key, made `session_id` optional
- `wallet_transactions`: Added `user_id` foreign key, made `session_id` optional

### Migration Required

Run the updated `supabase-schema.sql` in your Supabase SQL Editor to add the foreign key relationships.

## How to Get Started

### 1. Execute Database Migration

1. Go to Supabase dashboard → SQL Editor
2. Copy entire `supabase-schema.sql` from project root
3. Paste and execute

### 2. Verify Supabase Auth is Enabled

1. Go to Supabase dashboard → Authentication → Providers
2. Ensure **Email** provider is enabled

### 3. Test Locally

```bash
npm run dev
# Visit http://localhost:3000/auth
# Register a new account
# Log in and join a game
```

### 4. Deploy to Vercel (when ready)

```bash
git push origin main
# Vercel will auto-deploy
```

## API Endpoints Updated

### `GET /api/wallet`

**Now requires:** Bearer token in Authorization header

```
GET /api/wallet
Authorization: Bearer <session_token>
```

### `POST /api/wallet`

**New endpoint** for creating wallets during registration:

```
POST /api/wallet
{
  "userId": "uuid",
  "displayName": "Player Name"
}
```

## Next Steps (Optional Features)

1. **Buy-in System** - Deduct chips from wallet when joining games
2. **Cash-out** - Add winnings back to wallet when leaving
3. **Profile Page** - Let users update display name
4. **Transaction History** - Show wallet activity log
5. **Password Reset** - Allow users to reset forgotten passwords
6. **Social Auth** - Add Google/GitHub login options

## Important Notes

- Wallets are **user-specific** (not session-based anymore)
- Each user can only have **one account per email**
- Users don't need email verification by default (can be enabled in Supabase)
- Display names are optional, default to user's email

## Support

See `AUTH_SETUP.md` for detailed setup instructions and troubleshooting.
