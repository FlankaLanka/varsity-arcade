# Active Context

_Last updated: 2025-11-24 (Session 3)_

## Current Focus
- **Firebase-Only Architecture**: All multiplayer state (whiteboard drawings, cursors, battle gameplay) uses Firebase Realtime Database. Battle uses a host-based model where one client runs the authoritative simulation.
- **Whiteboard Battle Multiplayer Fixes**: Projectile sync, victory detection, and session cleanup all working correctly.
- **User Authentication**: Implemented basic login/sign-up flow with mock persistence.
- **User Profile**: Integrated authentication with profile system.
- All five games/experiences are complete and playable:
  - **Asteroids: Synonym Shooter** - Vocabulary-based space shooter
  - **Pac-Man: Math Blitz** - Math problem-solving with classic Pac-Man mechanics
  - **pH Invaders** - Chemistry education with Space Invaders gameplay
  - **Whiteboard Battle** - Collaborative drawing turned into a cooperative defense shooter
  - **Pong Math** - Order of operations math game with classic Pong mechanics
- **Cohort System** - Complete implementation of cohort creation, joining, room layout, and whiteboard-to-battle workflow.
- **User Profile & Social System** - Complete profile page, XP progression, achievements, friends list with modals.

## Recently Completed
- **Authentication System**:
  - Created `AuthContext` to manage user state (login/logout/signup).
  - Implemented `AuthPage` with toggleable Login/Sign-up forms.
  - Integrated `AuthProvider` into `App.tsx` with protected route logic.
  - Updated `ProfilePage` and `ProfileDropdown` to use real user data from context and handle logout.
  - Added simple local storage persistence for "stay signed in" behavior (mock).

- **Whiteboard Enhancements**:
  - Added **Primitive Shape Tools**: Square/Rectangle, Circle, and Triangle.
  - Implemented "drag-to-draw" preview logic for shapes.
  - Shapes are generated as paths (polygons), ensuring full compatibility with the Whiteboard Battle minigame (they become enemies).

- **Firebase Battle System (Whiteboard Battle)**:
  - Reverted to Firebase Realtime Database for all battle gameplay state.
  - Host-based architecture: first member (by sorted user ID) acts as authoritative host, running game simulation and syncing to Firebase.
  - All clients read battle state from Firebase RTDB (`cohorts/{cohortId}/battle/`) and render accordingly.
  - Host handles enemy AI, collisions, and win/loss conditions; non-host clients update their own player positions and projectiles.
  - **Projectile Sync**: Each player only fires their own bullets; projectile IDs use Firebase-safe format (no dots). Projectile positions synced at 10Hz, with cleanup when out of range.
  - **Victory Detection**: Host broadcasts win/loss to RTDB; fallback `useEffect` ensures all clients see victory if host disconnects mid-match.
  - **Session Cleanup**: Host clears stale projectiles from RTDB on battle init; cohort auto-resets to whiteboard mode when all users leave.
  - **Exit Button**: Manual "X" button in bottom-right allows any user to end the battle for everyone (with confirmation).

- **Minigame Rework (Whiteboard Battle)**:
  - Transitioned from `matter.js` physics to a custom **Cooperative Defense** mode.
  - **Stroke Enemies**: Drawings now become the enemies themselves, maintaining their exact shape (lines, curves) instead of being converted to circles or generic objects.
  - **Movement**: Enemies chase the player's center of mass.
  - **Combat**: Players shoot projectiles aimed at the mouse cursor. Projectiles destroy enemies on contact using precise line-segment collision detection.
  - **Win/Loss**: Destroy all enemies to win; team health reaches 0 to lose.
  - **Visibility**: Enforced minimum line width and 100% initial scale to ensure enemies are clearly visible.
  - **Controls**: Shooting now triggered by **Left Mouse Click (or Hold)** instead of Spacebar.
  - **Mechanics**: Enemy growth (scaling) disabled per user request.

- **Cohort System Implementation**:
  - **Cohorts List**: Searchable list of Public and Friends cohorts, with creation modal (Public/Friends/Private).
  - **Cohort Room**: Integrated layout with Member Sidebar, AI Chat, and Voice Controls.
  - **Whiteboard**: Full drawing capabilities (pen, eraser, colors, undo/redo) with "Verify Solution" workflow.
  - **AI Chat**: Simulated AI tutor providing hints and encouragement.
  - **Voice Controls**: Retro UI for audio management.
  
- **Pac-Man: Math Blitz Game Mechanics**:
  - Implemented complete game with grid-based maze, WASD movement
  - Math equation solving system (4 power pellets with answer choices)
  - Original Pac-Man ghost AI (Blinky, Pinky, Inky, Clyde) with individual targeting
  - Power-up system: 8-second duration, new problems after expiration
  - Wrong answer penalty: ghosts turn red, move 1.25x faster for 3 seconds
  - Correct answer cancels penalty before making ghosts vulnerable
  - Ghost flashing: 2 seconds before vulnerable ends, 1 second before penalty ends
  - Updated ghost colors: Pink, Orange, Cyan, Green
  - Fixed player spawn position (was on wall, now on valid path)
  - All power pellets same color (removed visual hint for correct answer)
  - Improved font clarity for numbers on pellets (bold, larger, white stroke)
  
- **Asteroids: Synonym Shooter** game is playable with WASD movement, mouse shooting, 60-second timer
- **pH Invaders: Chemistry Challenge** game is complete:
  - pH bar management system (0-14 scale, color-coded)
  - Environmental events every 5 seconds (acidic/basic with random strength)
  - Chemical compound drops: 2 side-by-side white orbs with compound names
  - Proper subscript rendering for chemical formulas (Na₂CO₃, H₂SO₄, etc.)
  - Dual scoring: enemy kills (50-100 pts) + pH maintenance (10-100 pts/sec)
  - Classic Space Invaders gameplay (5 rows × 10 columns)
  - Extended game window (600px) with UI positioned to not block gameplay
  - All scores as integers, pH values with 1 decimal place
  - Game-specific thumbnail on homepage
  
- **Arcade Hub** with game-specific thumbnails and game selection cards
- **Leaderboard** page with synthetic data
- **Results** page for game completion
- **Starfield Background** with mouse-reactive parallax effect
- **Profile System**:
  - Full profile page (`/profile`) with XP progress, stats, achievements (tabbed: All/Unlocked/Locked), daily quests, game stats, activity timeline, and settings
  - Profile dropdown in header with quick access to profile info
  - XP and leveling system with exponential progression curve
  - Achievement system with 17+ achievements across multiple categories
  - Daily quest system with progress tracking
  - Game-specific statistics (high scores, games played, streaks, XP per game)
  - Activity timeline showing recent games, achievements, XP milestones, and level ups
  - Settings section (account, preferences, privacy, logout)
- **Friends & Social System**:
  - Friends list dropdown in header with online/offline status
  - Friend detail modal with actions (View Profile, Remove Friend, Block User)
  - Friend profile pages (`/friend/:friendId`) showing friend's stats, achievements, game stats, and activity
  - Friend cards with click handlers to open modals
  - Mock friend data with online status and current activity tracking

- **Pong Math Game**:
  - Classic Pong gameplay with educational twist (order of operations math problems)
  - Player paddle on left (W/S keys only), AI paddle on right (perfect tracking)
  - Ball splits into 3 numbered balls when hitting AI paddle
  - Math problem display at top of screen
  - Scoring: +1000 points for correct return, -50 points for wrong return or missing correct ball
  - Visual feedback: Green flash for correct, red flash for wrong/missed
  - Wrong balls dissolve when returned, correct ball bounces back and destroys all wrong balls
  - Minimalistic pixel UI with center dividing line
  - 60-second timer
  - Game state resets properly on mount/unmount

## Next Steps
1. Connect to Firebase backend for real leaderboards and user data
3. Implement additional mini-games as specified in PRD
4. Add sound effects and music
5. Wire profile settings to actual persistence
6. Implement friend request/accept system
7. Add real-time presence detection for friends

## Decisions & Conventions
- **Visual Style**: Pixelated outer space theme (retro fonts, deep cosmos backgrounds) for the entire UI.
- **Interactivity**: Use parallax effects (moving starfield) to create depth and "aliveness" in the UI.
- **Assets**: Source game assets from OpenGameArt (Kenney's packs) and use Google Fonts (Press Start 2P).
- **Game Development**: Canvas API for rendering, requestAnimationFrame for game loops.
- **Physics**: Custom line-segment collision and movement logic for Whiteboard Battle (replaced `matter.js` for better multiplayer viability).
- **Ghost AI**: Implemented authentic Pac-Man ghost behavior with intersection-based movement, no-reverse rule, and individual targeting strategies
- **pH Invaders**: Chemistry education through gameplay - players learn compound acidity/basicity while managing pH balance
- **Chemical Notation**: Proper subscript rendering for chemical formulas using canvas text manipulation
- **Score Display**: All scores display as integers (no leading zeros), pH values with 1 decimal place
- **Profile & Social**: Profile page consolidates profile and settings. Friends modal persists when dropdown closes. Modal centered on screen. Friend profile pages omit settings and daily quests.
- **XP System**: Exponential leveling curve (100 * (level - 1)^1.5), XP from scores, completions, achievements, and quests. Streak multipliers up to 2x.
- **Cohort System**: Single-user whiteboard transforms to cooperative defense battle on verification. Uses mock data for cohorts/members until backend integration.
- **Authentication**: AuthContext manages user state. Local storage used for mock persistence. Protected routes redirect to AuthPage.
- **Game Reset Pattern**: All games should reset state on component mount/unmount to prevent stale state when navigating between pages. Use `resetGameState()` function and proper cleanup in `useEffect`.
- Always read every Memory Bank file at the start of a task.
- Update Memory Bank immediately after making meaningful code or process changes.
- Use `.cursorrules` to store recurring patterns, preferences, or insights that improve future work.

## Blockers
- None currently. Games and systems are functional.
