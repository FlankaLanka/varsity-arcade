# System Patterns

## Architectural Overview
- **Monorepo Structure**: `/web` for frontend, `/functions` for backend (Firebase Functions)
- **Frontend**: React + TypeScript + Vite, Tailwind CSS for styling
- **Backend**: Firebase (Auth, Firestore, Realtime DB, Functions, Storage)
- **Game Rendering**: Canvas API with `requestAnimationFrame` game loops
- **Routing**: React Router for navigation between hub, games, results, leaderboards

## Component Architecture

### Layout Components
- **`Layout.tsx`**: Main app shell with header, navigation, online player count
- **`GameFrame.tsx`**: Reusable game HUD wrapper (score, lives, wave, timer)
- **`StarfieldBackground.tsx`**: Parallax starfield background with mouse reactivity

### Page Components
- **`ArcadeHub.tsx`**: Game selection hub with game cards
- **`LeaderboardPage.tsx`**: Leaderboard with filtering and stats
- **`ResultsPage.tsx`**: Game completion screen with viral loops

### Game Components
- **`AsteroidsGame.tsx`**: Asteroids: Synonym Shooter implementation
- **`PacManMathGame.tsx`**: Pac-Man: Math Blitz implementation
- **`PHInvadersGame.tsx`**: pH Invaders: Chemistry Challenge implementation

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

### AI Patterns
- **Pac-Man Ghosts**: Intersection-based movement, individual targeting strategies, no-reverse rule
- **Asteroids Enemies**: Simple chase/flee logic
- **pH Invaders Enemies**: Formation-based movement, periodic shooting, side-to-side descent

## Design Principles
- **Modular Games**: Each game is a self-contained component
- **Reusable UI**: `GameFrame` provides consistent HUD across games
- **Canvas Rendering**: All game graphics use Canvas API for performance
- **State Isolation**: Game state in refs, UI state in React state
- **Responsive Design**: Games scale to container size

## Integration Points
- **Firebase Auth**: User authentication (pending implementation)
- **Firestore**: Leaderboard data, user progress (pending implementation)
- **Realtime DB**: Online player count (pending implementation)
- **Storage**: Game assets, user avatars (pending implementation)

## Key Flows

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

## Action Items
- Document additional games as they're implemented
- Add sequence diagrams for complex flows (ghost AI, collision detection)
- Document Firebase integration patterns once implemented
