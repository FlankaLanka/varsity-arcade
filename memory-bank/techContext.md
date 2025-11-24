# Tech Context

## Repository & Environment
- Workspace: `/Users/frankyang/Desktop/ai-tutor-nerdy` on macOS (Darwin 24.5.0).
- Tools: Cursor + AI agent, zsh shell.
- Version control: Git
- Monorepo structure: `/web` (frontend), `/functions` (backend, pending), `/server` (planned Colyseus battle server)

## Current Stack

### Frontend
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v3.4 (downgraded from v4 for PostCSS compatibility)
- **Routing**: React Router DOM
- **Icons**: Lucide React
- **Utilities**: `clsx`, `tailwind-merge` for className management
- **Fonts**: Google Fonts (Press Start 2P for pixelated text)

### Game Rendering
- **Canvas API**: All game graphics rendered on HTML5 Canvas
- **Game Loop**: `requestAnimationFrame` for 60fps updates
- **Rendering**: Pixel-perfect rendering with `imageSmoothingEnabled: false`

### Backend
- **Firebase**: Auth, Firestore, Realtime DB, Functions, Storage
- **Hosting**: Firebase Hosting (pending)

## Development Conventions
- All tasks start by reading every Memory Bank file.
- Prefer absolute paths when referencing files in commands.
- Use `search_replace` for targeted edits when practical.
- Document rationale for architectural choices inside this Memory Bank.
- Games use `useRef` for mutable game state, `useState` for UI state.
- Canvas rendering with crisp pixel art (no image smoothing).

## Dependencies

### Backend (Pending)
- Firebase SDK packages (to be added)

## Development Setup
```bash
cd web
npm install
npm run dev  # Start Vite dev server
```

## Technical Constraints
- **Tailwind CSS v3.4**: Must use v3.4 due to PostCSS plugin changes in v4
- **Canvas Rendering**: Games must use Canvas API for performance
- **60fps Target**: Game loops should maintain 60fps for smooth gameplay
- **Pixel Art**: All game graphics should be crisp and pixelated (no anti-aliasing)

## Open Technical Questions
- Firebase integration details (Auth flow, Firestore schema, Realtime DB structure)
- Testing strategy (unit tests for game logic, integration tests for UI)
- Deployment pipeline (CI/CD for Firebase Hosting)
- Performance optimization (asset loading, code splitting)
- Analytics and monitoring (Firebase Analytics, error tracking)
