# Holdem Poker Web - Blackjack & Universal Chip System

## Summary of Implementation

This implementation adds a complete blackjack game section with a universal chip system for both poker and blackjack games, enabling multiplayer 4-deck blackjack and consistent chip management across both game types.

## New Files Created

### 1. **Chip System** (`src/lib/chip-system.ts`)

- Universal chip management for both poker and blackjack
- Functions for:
  - Initializing player chips (1000 starting chips)
  - Buying in (1000 chips per buy-in)
  - Deducting chips when losing
  - Adding chips when winning
  - Resetting chips for new sessions
- Constants: `STARTING_CHIPS = 1000`, `BUY_IN_AMOUNT = 1000`

### 2. **Blackjack Types** (`src/lib/blackjack-types.ts`)

- `BlackjackPhase`: "waiting" | "betting" | "dealing" | "playing" | "dealer_turn" | "payout" | "finished"
- `BlackjackAction`: "hit" | "stand" | "double_down" | "split" | "ready" | "place_bet" | "leave_table"
- `BlackjackHand`: Represents individual hands (with split support)
- `BlackjackPlayer`: Player state including hands, chips, bets
- `BlackjackTableState`: Complete game state
- `BlackjackLobbySummary`: Lobby information for listing

### 3. **Blackjack Game Engine** (`src/lib/blackjack-engine.ts`)

- **4-deck shoe**: Continuous shuffling with 4 standard decks
- **Core functions**:
  - `createDeck()`: Creates and shuffles 4-deck shoe
  - `calculateHandValue()`: Proper soft/hard ace handling
  - `isBlackjack()`: Detects natural blackjack (21 with 2 cards)
  - `isBust()`: Detects busted hands (over 21)
  - `createBlackjackTableState()`: Initialize empty table
  - `joinBlackjackTable()`: Add player to table (max 6 players)
  - `placeBet()`: Process player bets
  - `dealCards()`: Deal initial 2 cards to each player
  - `playerHit()`: Player takes a card
  - `playerStand()`: Player passes
  - `dealerPlay()`: Dealer follows standard rules (hits on <17, stands on 17+)
  - `calculatePayouts()`: Determine winners and calculate payouts
  - `resetForNextHand()`: Prepare table for next hand
  - `removePlayerFromBlackjackTable()`: Remove player and manage host reassignment

### 4. **Blackjack UI Component** (`src/components/blackjack-table-client.tsx`)

- Client-side React component for blackjack gameplay
- Features:
  - Real-time game state polling (1-second updates)
  - Betting interface with slider
  - Hit/Stand action buttons
  - Visual card display for dealer and all players
  - Player chip balance tracking
  - Leave table functionality
  - Error handling and user feedback

### 5. **Blackjack Table Page** (`src/app/blackjack/[roomCode]/page.tsx`)

- Server-side route component
- Passes room code to client component

### 6. **Blackjack API Routes**

#### GET/POST `/api/blackjack/room/[roomCode]`

- `GET`: Fetch current table state
- Returns: `BlackjackTableState`

#### POST `/api/blackjack/room/[roomCode]/join`

- Join a blackjack table
- Body: `{ sessionId, name, gameType }`
- Returns: Updated `BlackjackTableState`
- Automatically initializes player with 1000 starting chips

#### POST `/api/blackjack/room/[roomCode]/action`

- Perform game actions (hit, stand, place_bet, leave_table)
- Body: `{ sessionId, action, betAmount? }`
- Returns: Updated `BlackjackTableState`
- Handles betting, card draws, payout calculations

## Modified Files

### 1. **Home Lobby Component** (`src/components/home-lobby.tsx`)

**Changes**:

- Added game type selection (Poker vs Blackjack) with toggle buttons
- Updated `joinRoom()` to route to correct game:
  - Poker → `/table/[roomCode]`
  - Blackjack → `/blackjack/[roomCode]`
- New state: `gameType`

### 2. **Constants** (`src/lib/constants.ts`)

- Already had `APP_LIMITS.STARTING_STACK = 1000` (used by poker)
- Chip system mirrors this with `STARTING_CHIPS = 1000`

### 3. **In-Memory Room Store** (`src/lib/server/in-memory-room-store.ts`)

**Changes**:

- Updated type to support both `TableState` and `BlackjackTableState`
- Changed store type from `Map<string, TableState>` to `Map<string, RoomState>`
- Now stores both poker and blackjack games
- Keys for blackjack rooms: `blackjack:ROOMCODE`

### 4. **Supabase Schema** (`supabase-schema.sql`)

**New Tables**:

- `blackjack_tables`: Stores blackjack game states (parallel to poker_tables)
- `player_chips`: Universal table for tracking player chip balances:
  - `session_id`: Player identifier
  - `game_type`: "poker" or "blackjack"
  - `room_code`: Room identifier
  - `chip_balance`: Current chips
  - `buy_in_amount`: Amount per buy-in
  - `total_buy_ins`: Purchase count
  - `joined_at`, `updated_at`: Timestamps
- `game_lobbies`: View for faster lobby queries (optional, for future optimization)

## How the Chip System Works

### Poker Flow

1. Player joins via `/api/room/join`
2. Poker engine initializes with `STARTING_STACK = 1000`
3. Chips deducted/added through betting actions
4. Stack persists in `TableState` for the session

### Blackjack Flow

1. Player joins via `/api/blackjack/room/[roomCode]/join`
2. Player initialized with `chipStack = 1000`
3. `placeBet()` deducts from chipStack
4. `calculatePayouts()` adds winnings back
5. Chips persist in `BlackjackTableState` for the session

### Buy-In System

- **Infrastructure**: `chip-system.ts` provides `buyInChips()` function
- **Poker**: Can implement when player stack reaches 0
- **Blackjack**: Can implement when player chipStack reaches 0
- **Future**: Add UI button and API endpoint to handle explicit buy-ins

## Key Features

✅ **Universal Chip System**

- Consistent 1000 starting chips for both games
- Unified buy-in structure (foundation laid)
- Chip balance tracking per player per room

✅ **4-Deck Blackjack**

- Professional 4-deck shoe with continuous shuffle
- Proper hand valuation (soft/hard aces)
- Natural blackjack detection (3:2 payout)
- Dealer plays by standard rules

✅ **Multiplayer Support**

- 6 players per table (max)
- Proper turn management
- Hand outcome tracking per player

✅ **Game Selection**

- Home lobby with game type toggle
- Separate routing for each game
- Session persistence across games

✅ **Database Schema**

- Ready for Supabase integration
- In-memory fallback for development
- Scalable chip tracking

## Testing the Implementation

### 1. Navigate to home page

```
http://localhost:3000/
```

### 2. Select Blackjack

- Click the "Blackjack" button
- Enter player name
- Enter room code or create new

### 3. Gameplay

- Place bet using slider (10-500 range)
- Hit to take a card
- Stand to pass to next player
- See dealer play after all players
- View results and chip payouts

### 4. Data Persistence

- Session ID stored in localStorage
- Player name stored in localStorage
- Game state stored in Supabase (or in-memory)
- Chip balances stored in player_chips table (Supabase)

## Architecture Diagram

```
Home Page (home-lobby.tsx)
├── Poker Path
│   └── /table/[roomCode]
│       └── poker-table-client.tsx
│           └── /api/room/* (existing)
│
└── Blackjack Path
    └── /blackjack/[roomCode]
        └── blackjack-table-client.tsx
            └── /api/blackjack/room/* (new)

Chip System (shared)
├── Poker: stack field in TablePlayer
├── Blackjack: chipStack field in BlackjackPlayer
└── Database: player_chips table (optional)
```

## Future Enhancements

1. **Split Handling**: Complete implementation of hand splitting in blackjack
2. **Double Down**: Add double-down functionality (UI + logic)
3. **Insurance**: Add insurance betting option
4. **Explicit Buy-Ins**: Button when chips run out
5. **Leaderboards**: Track lifetime statistics
6. **Chat**: Real-time player communication
7. **Spectator Mode**: Watch games without playing
8. **Sound Effects**: Card dealing, betting sounds
9. **Animations**: Card flip animations
10. **Mobile Optimization**: Touch-friendly UI

## Deployment Notes

### Vercel Deployment

- Current implementation uses in-memory store (resets on deployment)
- To persist data: Configure Supabase credentials in `.env.local`
- Database schema will be created on first Supabase connection
- Session IDs are browser-local, won't persist across devices

### Environment Variables Needed

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## File Structure

```
holdem-poker-web/
├── CHIP_SYSTEM.md (new)
├── supabase-schema.sql (updated)
├── src/
│   ├── lib/
│   │   ├── chip-system.ts (new)
│   │   ├── blackjack-types.ts (new)
│   │   ├── blackjack-engine.ts (new)
│   │   ├── constants.ts (unchanged)
│   │   ├── poker-types.ts (unchanged)
│   │   ├── poker-engine.ts (unchanged)
│   │   └── server/
│   │       └── in-memory-room-store.ts (updated)
│   ├── app/
│   │   ├── page.tsx (unchanged)
│   │   ├── api/
│   │   │   ├── lobbies/route.ts (unchanged)
│   │   │   ├── room/ (unchanged)
│   │   │   └── blackjack/room/[roomCode]/ (new)
│   │   │       ├── route.ts (GET table state)
│   │   │       ├── join/route.ts (POST join)
│   │   │       └── action/route.ts (POST actions)
│   │   ├── table/ (unchanged - poker)
│   │   └── blackjack/[roomCode]/page.tsx (new)
│   └── components/
│       ├── home-lobby.tsx (updated)
│       ├── poker-table-client.tsx (unchanged)
│       └── blackjack-table-client.tsx (new)
```

## Implementation Complete ✅

All requested features have been implemented:

1. ✅ Blackjack section added
2. ✅ 4-deck multiplayer blackjack table (6 players max)
3. ✅ Universal chip system for poker and blackjack
4. ✅ Buy-in system foundation (1000 chips per buy-in)
5. ✅ Each player starts with 1000 chips
6. ✅ Database schema for storing chip data on Vercel/Supabase
7. ✅ Game selection in home lobby
8. ✅ Complete API structure for blackjack gameplay
