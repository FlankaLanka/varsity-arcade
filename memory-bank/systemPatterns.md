# System Patterns

## Architectural Overview
- **Monorepo Structure**: `/web` for frontend, `/functions` for backend (Firebase Functions), `/server` (planned) for Colyseus battle server
- **Frontend**: React + TypeScript + Vite, Tailwind CSS for styling
- **Backend**: Firebase (Auth, Firestore, Realtime DB, Functions, Storage) + Colyseus server for Whiteboard Battle (in progress)
- **Game Rendering**: Canvas API with `requestAnimationFrame` game loops
- **Routing**: React Router for navigation between hub, games, results, leaderboards, profile, and friend profiles

## Component Architecture

### Layout Components
- **`Layout.tsx`**: Main app shell with header, navigation, online player count, profile and friends dropdowns
- **`GameFrame.tsx`**: Reusable game HUD wrapper (score, lives, wave, timer)
- **`StarfieldBackground.tsx`**: Parallax starfield background with mouse reactivity
- **`ProfileDropdown.tsx`**: Profile dropdown from header with XP, stats, achievements preview, daily quests
- **`FriendsList.tsx`**: Friends list dropdown with online status and friend cards
- **`FriendDetailModal.tsx`**: Modal for friend actions (view profile, remove, block)
- **`XPProgressBar.tsx`**: XP progress bar component with level display
- **`AchievementBadge.tsx`**: Achievement badge with tooltip
- **`FriendCard.tsx`**: Friend card component with avatar, status, and activity

### Page Components
- **`AuthPage.tsx`**: Login and Sign-up page with toggleable forms
- **`ArcadeHub.tsx`**: Game selection hub with game cards
- **`LeaderboardPage.tsx`**: Leaderboard with filtering and stats
- **`ResultsPage.tsx`**: Game completion screen with viral loops
- **`ProfilePage.tsx`**: Full user profile page with XP, achievements, quests, stats, activity, and settings
- **`FriendProfilePage.tsx`**: Friend profile page (similar to user profile, without settings/quests)
- **`CohortsPage.tsx`**: Main cohorts listing with Public/Friends tabs and search
- **`CohortRoomPage.tsx`**: Collaborative room with Whiteboard, Battle Mode, Members, Voice, and AI Chat

### Game Components
- **`AsteroidsGame.tsx`**: Asteroids: Synonym Shooter implementation
- **`PacManMathGame.tsx`**: Pac-Man: Math Blitz implementation
- **`PHInvadersGame.tsx`**: pH Invaders: Chemistry Challenge implementation
- **`Whiteboard.tsx`**: Interactive drawing canvas with verify workflow
- **`WhiteboardBattle.tsx`**: Minigame transforming drawings into enemies (Cooperative Defense)

## Game Architecture Patterns

### Game Loop Pattern
```typescript
const loop = (currentTime: number) => {
  // Update game state
  // Handle input
  // Check collisions
  // Update AI
  // Draw frame
  requestAnimationFrame(loop);
};
```

### State Management Pattern
- **`useRef`** for game state (mutable, doesn't trigger re-renders)
- **`useState`** for UI state (score display, lives, timer)
- Game state object contains: player, enemies, projectiles, score, lives, timer

### Input Handling Pattern
- Keyboard events: `keydown`/`keyup` listeners on window
- Mouse events: `mousemove`, `click` listeners on canvas
- Input state stored in game state ref, processed in game loop

### Collision Detection
- **Grid-based** (Pac-Man): Tile-based collision, check valid paths
- **Geometric** (Asteroids, pH Invaders): Distance-based collision detection
- **Line-Segment** (Whiteboard Battle): Precise intersection check between projectiles/player (circles) and enemy paths (line segments)

### AI Patterns
- **Pac-Man Ghosts**: Intersection-based movement, individual targeting strategies, no-reverse rule
- **Asteroids Enemies**: Simple chase/flee logic
- **pH Invaders Enemies**: Formation-based movement, periodic shooting, side-to-side descent
- **Whiteboard Battle Enemies**: Center-of-mass chase logic with scaling growth

## Design Principles
- **Modular Games**: Each game is a self-contained component
- **Reusable UI**: `GameFrame` provides consistent HUD across games
- **Canvas Rendering**: All game graphics use Canvas API for performance
- **State Isolation**: Game state in refs, UI state in React state
- **Responsive Design**: Games scale to container size
- **Cooperative Defense**: Battle minigame emphasizes teamwork and creativity (drawings become content)

### Multiplayer Whiteboard Battle (Firebase RTDB)
- **Host-Based Architecture**: One client acts as the "host" (first member in sorted user ID list) and runs the authoritative game simulation. The host handles enemy AI, collisions, and win/loss conditions, syncing results to Firebase RTDB.
- **Firebase RTDB Structure**: All battle state lives in `cohorts/{cohortId}/battle/`:
  - `players/{userId}`: Player positions, health, alive status (updated by each client for their own player, host syncs damage)
  - `enemies/{enemyId}`: Enemy positions, paths, scale (host writes via `set()` for full replacement at ~8 FPS)
  - `projectiles/{projectileId}`: Projectile positions and velocities (clients write their own at 10Hz, remove their own when out of range)
  - `gameState`: Win/loss flags (host writes, all clients read; fallback useEffect watches for victory)
- **Client Responsibilities**: 
  - **Host**: Runs game loop, updates enemies, handles collisions, determines victory/defeat, syncs to RTDB, clears stale projectiles on init
  - **Non-Host**: Reads state from RTDB, renders canvas, sends own player position/inputs
  - **All Clients**: Send their own projectiles to RTDB (10Hz position updates), update own player position (20Hz sync)
- **Projectile ID Format**: `proj-{Date.now()}-{random7chars}-{userId}` — Firebase-safe (no dots or special chars).
- **Session Lifecycle**:
  - **Battle Init**: Host clears `battle/projectiles` to prevent stale bullets from previous sessions.
  - **Victory Detection**: Host sets `gameState.gameWon = true`; fallback `useEffect` on `enemiesCount === 0` ensures all clients see victory.
  - **Manual Exit**: "X" button calls `onBattleEnd()` with confirmation, resetting `gameState.mode` to `'whiteboard'`.
  - **Auto-Reset**: When presence count hits 0, `CohortRoomPage` resets `gameState` to whiteboard mode.
- **Enemy Generation**: Drawings converted to enemies on battle start. Each enemy stores original path relative to center, then transforms based on center position and scale during gameplay.
- **Collision Detection**: Host performs all collision checks (projectile-enemy, enemy-player) using line-segment intersection for enemies and circle collision for projectiles/players.

## Integration Points
- **Auth Context**: `AuthContext.tsx` manages global user state (user, login, signup, logout).
- **Firebase Auth**: User authentication (pending implementation)
- **Firestore**: Leaderboard data, user progress, achievements, daily quests, friend relationships (pending implementation)
- **Realtime DB**: Online player count, friend presence/activity (pending implementation)
- **Storage**: Game assets, user avatars (pending implementation)

## Profile & Social Patterns

### XP & Leveling System
- Exponential progression: `XP = 100 * (level - 1)^1.5`
- XP sources: game scores, completions, achievements, daily quests
- Streak multipliers: 1.0x (0-2 days), 1.1x (3-6), 1.25x (7-13), 1.5x (14-29), 2.0x (30+)
- Level calculation uses binary search for efficiency

### Modal & Dropdown Patterns
- Modals rendered outside conditional blocks to persist when parent closes
- Dropdowns use click-outside detection hook (`useClickOutside`)
- Friend modal centered on screen with backdrop
- Modal state managed independently from dropdown state

### Friend Management
- Friends list maintains local state for friend removal/blocking
- Friend cards trigger modal on click (doesn't close dropdown)
- Friend profile pages accessible via `/friend/:friendId` route
- Mock friend data with online status and activity tracking

## Key Flows

### Authentication Flow
1. User visits site
2. If not authenticated (`!user`), `App` renders `AuthPage`
3. User logs in or signs up
4. `AuthProvider` updates state, persists user to local storage
5. `App` renders `AuthenticatedApp` (Layout + Routing)

### Game Session Flow
1. User selects game from hub
2. Game component mounts, initializes canvas and game state
3. Game loop starts (`requestAnimationFrame`)
4. User plays for 60 seconds (or until game over)
5. Results screen shows score, achievements
6. User can retry or return to hub

### Educational Challenge Flow (Pac-Man: Math Blitz)
1. Math problem displayed at top of screen
2. 4 power pellets spawn in corners with answer choices
3. Player collects pellet:
   - **Correct**: Cancels penalty, activates power-up (ghosts vulnerable)
   - **Incorrect**: Activates penalty (ghosts red, 1.25x speed for 3 seconds)
4. Power-up expires after 8 seconds, new problem generates
5. Cycle repeats until timer ends

### Educational Challenge Flow (pH Invaders)
1. Player fights Space Invaders-style enemies
2. Every 5 seconds, environmental event triggers (acidic or basic)
3. pH bar drifts toward acid/base based on environment strength
4. Enemies drop 2 chemical compounds side by side when destroyed
5. Player must choose which compound to collect based on chemistry knowledge:
   - Compounds display with proper subscripts (Na₂CO₃, H₂SO₄)
   - Each compound shifts pH based on its acidity/basicity and strength
6. Player earns points from:
   - Enemy kills (50-100 points)
   - pH maintenance (10-100 points/second based on proximity to pH 7)
7. Game ends when all enemies defeated, timer expires, or lives reach 0

### Collaborative Whiteboard Flow
1. Users join a Cohort Room
2. Collaborate on whiteboard (draw/erase)
3. User triggers "Verify Solution"
4. On success, whiteboard transforms into Battle Mode
5. Drawings become enemies (stroke-based physics objects)
6. Players fight enemies using cooperative mechanics
7. Victory/Defeat returns to whiteboard mode

## Action Items
- Document additional games as they're implemented
- Add sequence diagrams for complex flows (ghost AI, collision detection)
- Document Firebase integration patterns once implemented
- Document profile/social data models for Firebase migration
