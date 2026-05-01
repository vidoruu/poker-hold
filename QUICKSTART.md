# Quick Start Guide - Blackjack & Chip System

## For Players

### How to Play Blackjack

1. Go to homepage: `http://localhost:3000/`
2. Enter your name
3. Click "Blackjack" button
4. Enter a room code (or leave blank to create new)
5. Click "Create & Join" or "Join Room"
6. Wait for other players to join (up to 6 players)
7. Place your bet using the slider ($10-$500)
8. Click "Place Bet" when ready
9. Use "Hit" to take a card or "Stand" to pass
10. Dealer plays automatically
11. Win/lose based on hand value

### Chip System

- **Starting**: 1000 chips
- **Betting**: $10-$500 per hand
- **Winning Payouts**:
  - Regular win: 2x bet
  - Blackjack (natural 21): 2.5x bet
  - Push (tie): Return bet
- **Losing**: Lose your bet amount

## For Developers

### Key Files to Understand

1. **Chip System Logic** → `src/lib/chip-system.ts`
   - Universal functions for managing chips
   - Independent from game type

2. **Blackjack Engine** → `src/lib/blackjack-engine.ts`
   - Game mechanics: dealing, hitting, standing
   - Hand evaluation and payouts
   - 4-deck shoe management

3. **API Endpoints** → `src/app/api/blackjack/room/[roomCode]/`
   - `GET route.ts` - Fetch game state
   - `POST join/route.ts` - Join table
   - `POST action/route.ts` - Game actions

4. **UI Component** → `src/components/blackjack-table-client.tsx`
   - React component for blackjack UI
   - Polling for game state updates
   - Action handlers

### Running Locally

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open browser
open http://localhost:3000
```

### Database Setup (Supabase)

1. Add credentials to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

2. Run SQL from `supabase-schema.sql` in Supabase SQL Editor

### Adding Features

#### Add Split Hand Support

1. Update `BlackjackHand` type in `blackjack-types.ts`
2. Add `splitHand()` function in `blackjack-engine.ts`
3. Update `BlackjackPlayer.hands` array handling
4. Add UI buttons in `blackjack-table-client.tsx`

#### Add Double Down

1. Add `doubleDown` case in action route
2. Implement in `blackjack-engine.ts`
3. Add UI button when hand is 2 cards
4. Double bet and deal one card

#### Add Explicit Buy-In Button

1. Add button in `blackjack-table-client.tsx`
2. Create `POST /api/blackjack/room/[roomCode]/buy-in` endpoint
3. Call `buyInChips()` from `chip-system.ts`
4. Update player's chipStack

## Important Constants

```typescript
// Chips
STARTING_CHIPS: 1000
BUY_IN_AMOUNT: 1000

// Blackjack Table
MIN_BET: 10
MAX_BET: 500
NUM_DECKS: 4
MAX_PLAYERS: 6

// Card Values
A: 11 (soft), becomes 1 if bust
J, Q, K: 10
2-9: Face value
```

## Common Tasks

### Debug Game State

In `blackjack-table-client.tsx`, add console.log:

```typescript
console.log("Current state:", state);
console.log("Current player:", currentPlayer);
```

### Check Payouts

Logic in `calculatePayouts()` in `blackjack-engine.ts`:

- Dealer bust & player not bust = Win (2x)
- Player > Dealer = Win (2x)
- Natural blackjack = Win (2.5x)
- Player == Dealer = Push (1x)
- Player bust = Lose (0x)

### View Database

```sql
-- Check player chips
SELECT * FROM player_chips WHERE game_type = 'blackjack';

-- Check game state
SELECT room_code, updated_at FROM blackjack_tables;
```

## Troubleshooting

### Game state not updating

- Check polling interval (1 second in component)
- Verify `/api/blackjack/room/[roomCode]` is accessible
- Check browser console for errors

### Cards not dealing

- Verify `dealCards()` function in engine
- Check deck isn't empty (should auto-shuffle)
- Log hand values in console

### Chips not persisting

- Without Supabase: Uses in-memory store (resets on redeploy)
- With Supabase: Check credentials in env vars
- Verify `player_chips` table exists in database

### Player stuck in betting phase

- Check all players have placed bets (currentBet > 0)
- Verify `allReady` condition in `placeBet()`
- Phase should auto-transition to "dealing"

## Performance Tips

1. **Reduce polling**: Change 1000ms to 2000ms if server busy
2. **Optimize state**: Don't store entire deck in state (keep only needed cards)
3. **Batch updates**: Combine multiple actions before state save
4. **Connection pool**: Use Supabase connection pooling for production

## Security Notes

- Session IDs stored in localStorage (not persistent across browsers)
- Chip amounts stored server-side (client cannot modify)
- API routes validate all requests
- RLS policies protect database access

---

Need help? Check the implementation files or see IMPLEMENTATION_SUMMARY.md for full details.
