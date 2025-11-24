# Active Context

_Last updated: 2025-01-XX_

## Current Focus
- All three games are complete and playable:
  - **Asteroids: Synonym Shooter** - Vocabulary-based space shooter
  - **Pac-Man: Math Blitz** - Math problem-solving with classic Pac-Man mechanics
  - **pH Invaders** - Chemistry education with Space Invaders gameplay
- **User Profile & Social System** - Complete profile page, XP progression, achievements, friends list with modals
- Ready for backend integration and additional features

## Recently Completed
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

## Next Steps
1. Continue refining game mechanics based on user feedback
2. Implement additional mini-games as specified in PRD
3. Connect to Firebase backend for real leaderboards and user data
4. Add sound effects and music
5. Implement user authentication and progress tracking
6. Wire profile settings to actual persistence
7. Implement friend request/accept system
8. Add real-time presence detection for friends

## Decisions & Conventions
- **Visual Style**: Pixelated outer space theme (retro fonts, deep cosmos backgrounds) for the entire UI.
- **Interactivity**: Use parallax effects (moving starfield) to create depth and "aliveness" in the UI.
- **Assets**: Source game assets from OpenGameArt (Kenney's packs) and use Google Fonts (Press Start 2P).
- **Game Development**: Canvas API for rendering, requestAnimationFrame for game loops, grid-based collision for Pac-Man
- **Ghost AI**: Implemented authentic Pac-Man ghost behavior with intersection-based movement, no-reverse rule, and individual targeting strategies
- **pH Invaders**: Chemistry education through gameplay - players learn compound acidity/basicity while managing pH balance
- **Chemical Notation**: Proper subscript rendering for chemical formulas using canvas text manipulation
- **Score Display**: All scores display as integers (no leading zeros), pH values with 1 decimal place
- **Profile & Social**: Profile page consolidates profile and settings. Friends modal persists when dropdown closes. Modal centered on screen. Friend profile pages omit settings and daily quests.
- **XP System**: Exponential leveling curve (100 * (level - 1)^1.5), XP from scores, completions, achievements, and quests. Streak multipliers up to 2x.
- Always read every Memory Bank file at the start of a task.
- Update Memory Bank immediately after making meaningful code or process changes.
- Use `.cursorrules` to store recurring patterns, preferences, or insights that improve future work.

## Blockers
- None currently. Game is playable and functional.
