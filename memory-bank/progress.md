# Progress Log

## 2025-01-29 (Session 7)
- **WhiteboardBattle Single-Player Defeat Screen Fix**:
  - Fixed "Your team fell" screen not rendering when only 1 player is in the game
  - Issue: `gameInitialized` React state captured in stale closure inside game loop
  - Solution: Added `gameInitializedRef` ref alongside the state variable
  - Fixed race condition: Previously set `gameInitializedRef.current = false` for cohortId cases, relying on Firebase listener to set it back to `true`, but player could die before Firebase synced
  - Now always set `gameInitializedRef.current = true` right before starting game loop
  - Defeat/victory detection now works immediately for all player configurations

- **pH Invaders Environment Gap Fix**:
  - Fixed compounds giving 0 points between environment transitions
  - Issue: Separate `environmentTimer` caused delays between environments
  - Solution: Removed separate timer; when environment ends, new one triggers immediately
  - Added fallback: if no environment active, trigger one immediately
  - All compound collections now scored based on active environment

## 2025-01-27 (Session 6)
- **Leaderboard Page - Real Data**:
  - Replaced synthetic data with real Firestore queries
  - Created `getLeaderboard()` function to fetch users sorted by game high scores
  - Added loading and empty states
  - Shows real user rankings with avatars and current user highlighting
  - Updated stats cards with real user rank, best score, and percentile

- **Profile Page Improvements**:
  - Fixed Firestore Timestamp handling in `ProfileDropdown` and `AchievementBadge` (handles Date, toMillis, toDate, seconds)
  - Fixed React hooks order violation (moved hooks before conditional returns)
  - Added `overflow-visible` to achievement containers to allow tooltips to escape
  - Implemented collapsible activity timeline (3 items default, expandable with "Show More" button)

- **Pac-Man Game Enhancements**:
  - Fixed ghost AI: proper tile-based movement, no getting stuck, instant tunnel teleportation
  - Fixed UI layout: extended game window with separate UI bars (top: score/problem/lives, bottom: timer)
  - Added penalty mode: wrong power pellet → ghosts turn red and move 1.5x faster for 3 seconds
  - Reduced movement speed by 0.5x (50% slower) for both player and ghosts

- **Firestore Data Handling**:
  - Fixed `addFriend()`: filters out undefined avatar values using conditional spread
  - Fixed `addActivityEntry()`: only includes optional fields (icon, meta) if they exist
  - Fixed `formatLastSeen()`: handles Firestore Timestamps with multiple conversion methods

## 2025-01-27 (Session 5)
- **Authentication Fix**:
  - Fixed login bug where password parameter wasn't being passed from `AuthPage` to `AuthContext.login()`.
  - Updated `AuthPage.tsx` to correctly pass both `email` and `password` to login function.

- **Whiteboard Nametag Improvements**:
  - Fixed vertical alignment of username text within nametag label bar (adjusted y-coordinate in `drawCursor`).
  - Added `getUserColor()` utility function in `formatters.ts` to generate consistent random colors based on user ID hash.
  - Updated `Whiteboard.tsx` to use generated colors for remote cursors (with fallback if color not present).
  - Updated `CohortRoomPage.tsx` to pass generated color to `currentUser` prop.

- **Voice Chat Implementation (Disabled)**:
  - Created `useVoiceChat.ts` hook with full WebRTC implementation:
    - Microphone access and audio context setup (now disabled)
    - Speaking detection with AnalyserNode and hysteresis thresholds
    - Peer connection management with RTCPeerConnection
    - Firebase signaling for WebRTC (offers, answers, ICE candidates)
    - Remote audio playback with volume control via GainNode
    - Mute/deafen controls synced to Firebase
  - Updated `VoiceChatControls.tsx`:
    - Removed visualizer/waves for mic input
    - Reorganized layout to have mic toggle and volume slider side-by-side
  - Updated `CohortMemberAvatars.tsx`:
    - Added green outline with glow effect around speaking members' avatars
  - **Feature Disabled**: Microphone access completely disabled per user request:
    - No `getUserMedia()` calls
    - `toggleMute()` is a no-op
    - Mic buttons visible but non-functional
    - No microphone permission requests

## 2025-01-27 (Session 4)
- **Leaderboard Page Updates**:
  - Added all four games as filter options: Asteroids, Pac-Man, pH Invaders, Pong Arithmetic
  - Removed "All Games" aggregate leaderboard option
  - Updated game type display names to match game names (ASTEROIDS, PAC-MAN, PH INVADERS, PONG ARITHMETIC)
- **Pong Arithmetic Rename**: Renamed "Pong Math" to "Pong Arithmetic" throughout codebase
  - Updated component name from `PongMathGame` to `PongArithmeticGame`
  - Updated route from `/game/pong-math` to `/game/pong-arithmetic`
  - Updated all references in UI and code

## 2025-11-24 (Session 3)
- **Pong Math Game Implementation** (later renamed to Pong Arithmetic): Created new educational Pong game with order of operations mechanics
  - Player paddle on left (W/S keys), AI paddle on right (perfect tracking)
  - Ball splits into 3 numbered balls when hitting AI paddle
  - Easy order of operations problems (e.g., "2 + 3 × 4", "(5 + 2) × 3")
  - Scoring: +1000 points for correct return, -50 points for wrong return or missing correct ball
  - Visual feedback: Green flash (0.5s) for correct, red flash (0.5s) for wrong/missed
  - Wrong balls dissolve when returned, correct ball destroys all wrong balls and bounces back
  - Minimalistic pixel UI with center dividing line
  - Game state reset on mount/unmount to prevent stale state
  - Added route `/game/pong-math` (later changed to `/game/pong-arithmetic`) and game card to Arcade Hub

## 2025-11-24 (Session 2)
- **Projectile Sync Fix**: Fixed bug where clicking to shoot would make all characters fire. Now only the local player's character shoots; each client writes their own projectiles to Firebase.
- **Firebase-Safe Projectile IDs**: Changed from `proj-{time}-{userId}` (time had decimals) to `proj-{Date.now()}-{random}-{userId}` to avoid invalid Firebase path characters.
- **Stale Projectiles Fix**: Host now clears `battle/projectiles` from RTDB when a new battle starts, preventing ghost bullets from previous sessions.
- **Exit Battle Button**: Added "X" button (bottom-right, same position as whiteboard checkmark) to manually end the battle for all users.
- **Auto-Reset on Empty Cohort**: When all users leave a cohort room, the presence listener resets `gameState` to whiteboard mode automatically.
- **Victory Detection Improvements**: Added `victoryAnnouncedRef` to prevent duplicate victory broadcasts; fallback `useEffect` watches `enemiesCount` and posts victory if host misses it.
- **Enemy Sync Throttling**: Host syncs enemy positions at ~8 FPS (120ms interval) using `set()` for full replacement to ensure consistency.

## 2025-11-24 (Session 1)
- Reverted Colyseus migration and restored Firebase Realtime Database for all battle gameplay.
- Battle system now uses host-based architecture: one client runs authoritative simulation, all clients sync via Firebase RTDB.
- Removed all Colyseus dependencies and server code.

## 2025-11-23
- Initialized the Memory Bank directory and core context files.
- Recorded current unknowns and next steps for defining the AI tutor product.

## 2025-01-XX (Recent Development)

### Project Setup
- ✅ Initialized monorepo structure with `/web` for frontend
- ✅ Set up Vite + React + TypeScript project
- ✅ Configured Tailwind CSS v3.4 (downgraded from v4 for compatibility)
- ✅ Installed dependencies: `react-router-dom`, `lucide-react`, `clsx`, `tailwind-merge`
- ✅ Configured routing for `/`, `/game/asteroids`, `/game/pacman-math`, `/game/ph-invaders`, `/results`, `/leaderboard`

### UI/UX Foundation
- ✅ Implemented pixelated outer space theme across all UI elements
- ✅ Created `StarfieldBackground` component with mouse-reactive parallax effect
- ✅ Built `Layout` component with header, navigation, and online player count
- ✅ Created `GameFrame` component for reusable game HUD (score, lives, wave, timer)
- ✅ Implemented `ArcadeHub` page with game selection cards
- ✅ Built `LeaderboardPage` with real Firestore data, filtering, loading states, and user stats
- ✅ Created `ResultsPage` for game completion and viral loops

### Authentication System
- ✅ Created `AuthContext` managing user state (login/logout)
- ✅ Built `AuthPage` with Login and Sign-Up forms
- ✅ Implemented protected route wrapper in `App.tsx`
- ✅ Connected Profile UI to real auth state

### Asteroids: Synonym Shooter
- ✅ Implemented WASD axis-based movement
- ✅ Mouse left-click to shoot (removed spacebar)
- ✅ Player faces mouse direction based on input axis
- ✅ Cursor hides when game is focused
- ✅ 60-second timer per session
- ✅ Reduced asteroid spawn frequency
- ✅ Death visual feedback (red flash)
- ✅ 3-second invincibility with flashing sprite on respawn
- ✅ Fixed player movement to be intersection-based

### Pac-Man: Math Blitz
- ✅ Complete game implementation with grid-based maze
- ✅ WASD movement with instant wrap-around teleportation
- ✅ Math problem system: 4 power pellets in corners with answer choices
- ✅ Power-up mechanics: 8-second duration, solve equation to activate
- ✅ Original Pac-Man ghost AI implementation:
  - Blinky (pink): Direct chase targeting
  - Pinky (orange): Ambush targeting (4 tiles ahead)
  - Inky (cyan): Complex targeting (uses Blinky's position)
  - Clyde (green): Scatter/chase hybrid
  - Intersection-based movement with no-reverse rule
  - Priority system for direction selection
- ✅ Wrong answer penalty system:
  - Ghosts turn red with white outline
  - Ghosts move 1.25x faster for 3 seconds
  - Flashing at 1 second remaining
  - Only applies when ghosts are not vulnerable
- ✅ Correct answer mechanics:
  - Cancels active penalty before making ghosts vulnerable
  - Makes ghosts vulnerable (blue) for 8 seconds
  - Flashing at 2 seconds remaining
- ✅ Visual improvements:
  - All power pellets same color (yellow) to remove visual hints
  - Improved font clarity (bold 16px with white stroke)
  - Ghost colors: Pink, Orange, Cyan, Green
  - Death flash effect
  - Invincibility flashing on respawn
- ✅ Fixed player spawn position (was on wall, now on valid path tile)
- ✅ Fixed UI layout (top panel for HUD, game canvas below)
- ✅ New math problems generate after power-up expires
- ✅ Power pellets regenerate in corners when new problem appears
- ✅ Classic Pac-Man ghost shapes with wavy bottoms and eyes

### pH Invaders: Chemistry Challenge
- ✅ Complete Space Invaders-style game with chemistry education
- ✅ pH bar management system (0-14 scale, color-coded)
- ✅ Color-coded pH bar (red=acidic, green=neutral, blue=basic)
- ✅ Dual scoring system:
  - Points from enemy kills (50-100 per enemy)
  - Continuous points based on pH proximity to neutral (10-100 points/second)
- ✅ Environmental events every 5 seconds:
  - Random acidic or basic environment
  - Random strength (weak/medium/strong) affecting pH drift rate
  - Background color overlay (red for acid, blue for base)
  - Alert messages: "ACIDIC ENVIRONMENT" or "BASIC ENVIRONMENT"
- ✅ Chemical compound drops:
  - Enemies drop 2 chemicals side by side (diverge in opposite directions)
  - White orbs with compound names (HCl, NaOH, NH3, etc.)
  - Proper subscript rendering for chemical formulas (Na₂CO₃, H₂SO₄, etc.)
  - Player must choose which compound to collect based on chemistry knowledge
  - Compounds shift pH based on acidity/basicity and strength
- ✅ Game mechanics:
  - 60-second timer or defeat all enemies to win
  - 3 lives system
  - A/D movement, Spacebar shooting
  - Enemy formation (5 rows × 10 columns)
  - Enemy movement and shooting
- ✅ UI improvements:
  - Extended game window (600px height) to accommodate UI
  - pH meter positioned at bottom-left, aligned with timer
  - Environmental alerts positioned at top-center
  - All scores display as integers (no leading zeros)
  - pH values display with 1 decimal place
- ✅ Game-specific thumbnails on homepage
- ✅ Proper scientific notation: "pH" (lowercase p, uppercase H) throughout UI

### Technical Achievements
- ✅ Canvas API game rendering with crisp pixel art
- ✅ Game loop using `requestAnimationFrame`
- ✅ State management with `useRef` and `useState`
- ✅ Input handling (keyboard and mouse events)
- ✅ Collision detection (grid-based for Pac-Man, geometric for Asteroids, line-segment for Battle)
- ✅ AI pathfinding and movement algorithms
- ✅ Responsive UI layouts
- ✅ Game state persistence during gameplay
- ✅ Integrated `matter.js` (later removed in favor of custom logic for Battle mode)

### User Profile & Social System
- ✅ Profile page (`/profile`) with comprehensive user information:
  - Header with avatar, username, level, and XP progress bar
  - Stats grid (streak, games played, total score, completed games)
  - Achievements section with tabbed filtering (All/Unlocked/Locked)
  - Daily quests with progress bars
  - Game-specific statistics per game (high scores, games played, streaks, XP)
  - Activity timeline (recent games, achievements, XP milestones, level ups)
  - Settings section (account, preferences, privacy, logout)
- ✅ Profile dropdown in header with quick access to profile info
- ✅ XP and leveling system:
  - Exponential progression curve: XP = 100 * (level - 1)^1.5
  - XP from game scores (different rates per game type)
  - Completion bonuses per game
  - Achievement rewards (100-300 XP)
  - Daily quest rewards (50-150 XP)
  - Streak multipliers (1.0x to 2.0x for 30+ day streaks)
- ✅ Achievement system with 17+ achievements:
  - First game achievements
  - Score milestones (1K, 5K, 10K, 25K)
  - Streak milestones (3, 7, 30 days)
  - Game-specific achievements
  - Total score achievements
  - Games played achievements
- ✅ Daily quest system with progress tracking and XP rewards
- ✅ Friends list dropdown in header:
  - Online/offline status indicators
  - Current activity display (which game playing or just online)
  - Friend count badge
  - Add friend button (placeholder)
- ✅ Friend detail modal:
  - Centered on screen with backdrop
  - Friend information display
  - Actions: View Profile, Remove Friend, Block User
  - Modal persists when dropdown closes
- ✅ Friend profile pages (`/friend/:friendId`):
  - Similar to user profile but without settings and daily quests
  - Shows friend's stats, achievements, game stats, and activity
  - Mock friend profile data
- ✅ TypeScript types for user profiles, achievements, quests, friends, game stats, and activity history
- ✅ Mock data system for development and testing

### Cohort System & Whiteboard Battle
- ✅ **Cohorts List Page**:
  - Filtering between Friends Cohorts and Public Cohorts
  - Search functionality
  - Cohort cards with privacy badges (Public/Friends/Private) and member counts
  - Create Cohort modal (Title, Privacy, Description)
  - Mock data system for cohorts and memberships
- ✅ **Cohort Room Page**:
  - Dedicated layout with Member Sidebar, Main Stage, AI Chat, and Voice Controls
  - Member sidebar showing online status
  - AI Chat interface with simulated tutor responses
  - Retro-styled voice chat controls (mute/unmute, volume)
- ✅ **Collaborative Whiteboard**:
  - Single-user drawing tools (Pen, Eraser, Colors, Brush Size)
  - Undo/Redo functionality
  - "Verify Solution" button simulating AI verification
- ✅ **Cooperative Defense (Whiteboard Battle)**:
  - **Stroke Enemies**: Drawings become growing, moving stroke-based enemies (custom rendering).
  - **Mechanics**: Players shoot projectiles at mouse cursor to destroy strokes.
  - **Physics**: Precise line-segment collision detection.
  - **Visibility**: Improved scaling (100% start) and line width to prevent "dot" artifacting.
  - **Control Update**: Shooting now triggered by **Left Mouse Click (or Hold)** instead of Spacebar.
  - **Multiplayer Ready**: Logic decoupled from physics engine for easier Firebase sync.

## Pending Work
- Implement time-based leaderboard filtering (daily/weekly periods)
- Add sound effects and background music
- Additional mini-games as specified in PRD
- Wire profile settings to actual persistence
- Implement friend request/accept system
- Add real-time presence detection for friends
- Testing and bug fixes as needed

## Completed Games
1. ✅ **Asteroids: Synonym Shooter** - Vocabulary-based space shooter
2. ✅ **Pac-Man: Math Blitz** - Math problem-solving maze game
3. ✅ **pH Invaders** - Chemistry pH management with Space Invaders gameplay
4. ✅ **Whiteboard Battle** - Collaborative defense shooter using user drawings
5. ✅ **Pong Arithmetic** (formerly "Pong Math") - Order of operations math game with classic Pong mechanics
