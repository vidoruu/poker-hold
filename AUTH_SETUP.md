# Authentication Setup Guide

## Overview

The poker app now includes a complete authentication system powered by Supabase Auth. Users must create an account and log in before playing, and their wallet is connected to their user account.

## Initial Setup (One-time)

### 1. Enable Supabase Auth

Go to your Supabase project dashboard:

1. Navigate to **Authentication** → **Providers** in the left sidebar
2. Make sure **Email** provider is **enabled** (it should be by default)
3. Click **Enable** if needed

### 2. Configure Email Settings (Optional)

For production, you may want to configure custom SMTP:

1. Go to **Authentication** → **Email** (or **Providers** → **Email**)
2. You can keep the default Supabase email service or configure your own SMTP server
3. Default setup allows unlimited emails for development

### 3. Run Database Migration

Execute the updated `supabase-schema.sql` in your Supabase SQL Editor:

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy the entire contents of `supabase-schema.sql` from the project root
3. Paste it into the SQL Editor
4. Click **Run**

This creates/updates the `user_wallets` and `wallet_transactions` tables with proper foreign key relationships to the `auth.users` table.

## User Flow

### Registration

1. User visits `/auth` page
2. Clicks "Register" tab
3. Enters display name, email, and password
4. System creates:
   - Supabase Auth user account
   - Associated wallet entry with 10,000 starting chips
5. User receives confirmation email (if email verification enabled)

### Login

1. User visits `/auth` page
2. Enters email and password
3. Upon successful authentication, redirected to home page
4. Wallet balance loads automatically

### Logout

1. Click "Logout" button in top right of home page
2. User session is cleared
3. Redirected to auth page

## Environment Variables

Your `.env.local` already contains the necessary Supabase configuration:

```
NEXT_PUBLIC_SUPABASE_URL=https://onbwmddfqpccxsrpoode.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ZCciKZWEh_hDVQqPoEhLJg_zhCFR7Ib
SUPABASE_SERVICE_ROLE_KEY=keysb_publishable_ZCciKZWEh_hDVQqPoEhLJg_zhCFR7Ib
```

No additional setup needed for environment variables.

## How It Works

### Authentication Flow

1. **Sign Up**: Supabase Auth creates a user in the `auth.users` table
2. **Wallet Creation**: API endpoint creates a corresponding entry in `user_wallets`
3. **Sign In**: Bearer token stored in browser session
4. **API Requests**: All wallet requests include the Bearer token for authentication
5. **User Verification**: Backend verifies token and retrieves user ID from Supabase Auth

### Wallet Integration

- Each user has **one wallet** connected to their Supabase Auth user ID
- Wallet balance persists across all games (poker, blackjack, future games)
- Wallet transactions are logged for audit purposes
- Starting balance: **10,000 chips**

### Bearer Token Authentication

All wallet API endpoints require Bearer token:

```
GET /api/wallet
Authorization: Bearer <session_access_token>

Response:
{
  "wallet": {
    "id": "uuid",
    "user_id": "uuid",
    "display_name": "Player Name",
    "wallet_balance": 10000,
    "total_deposited": 10000,
    "total_withdrawn": 0,
    "created_at": "2024-05-01T10:00:00Z",
    "updated_at": "2024-05-01T10:00:00Z"
  }
}
```

## Testing Authentication

1. Start dev server: `npm run dev`
2. Visit `http://localhost:3000/auth`
3. **Register** a new account:
   - Display Name: "TestPlayer"
   - Email: "test@example.com"
   - Password: "SecurePassword123"
4. Check email for confirmation (or skip if verification disabled)
5. **Login** with email/password
6. You should see your wallet with 10,000 chips
7. Try joining a poker or blackjack game
8. Click "Logout" to test logout flow

## Troubleshooting

### "Wallet not found" Error

- Ensure SQL migration was run to create `user_wallets` table
- Verify foreign key constraint exists: `user_id uuid references auth.users(id)`

### Login Not Working

- Check browser console for error messages
- Verify SUPABASE_ANON_KEY is correct in `.env.local`
- Ensure Email provider is enabled in Supabase dashboard

### Bearer Token Errors

- Verify session is active (check browser localStorage: `supabase.auth.token`)
- Clear browser cache and reload
- Try logging out and logging back in

### Wallet Not Displaying

- Ensure Bearer token is being sent with request
- Check Network tab in DevTools to see auth headers
- Verify user_id matches between `auth.users` and `user_wallets`

## Production Deployment

When deploying to Vercel:

1. Set environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (for server-side operations only)

2. Email Verification (optional):
   - Go to Supabase: **Authentication** → **Email**
   - Enable "Confirm email" to require email verification
   - Users will receive a confirmation link before account activation

3. Custom Domain (optional):
   - Configure custom SMTP sender address in Supabase email settings
   - Users will see your domain in email receipts

## Next Steps

- Integrate authentication into poker/blackjack game endpoints
- Add buy-in deduction from user wallet when joining games
- Add cash-out addition to user wallet when leaving games
- Create transaction history/dashboard UI
- Implement password reset functionality
- Add profile settings page (change display name, etc.)
