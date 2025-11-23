
---

## `tasks.md`

```md
# Varsity Arcade – Tasks Breakdown

## 0. Project Setup

- [ ] Initialize monorepo or single repo:
  - `/web` – React frontend
  - `/functions` – Firebase Cloud Functions
- [ ] Setup Firebase project:
  - Auth
  - Firestore
  - Realtime Database
  - Storage
  - Hosting
- [ ] Configure `.env` or Firebase config for:
  - API keys
  - Project IDs
- [ ] Setup tooling:
  - TypeScript (recommended)
  - ESLint / Prettier
  - Vite or Next.js
  - Tailwind CSS

---

## 1. Frontend – Core Shell & Navigation

- [ ] **Theme & Design System**:
  - [ ] Import pixel-art fonts (e.g., 'Press Start 2P', 'Pixelify Sans').
  - [ ] Define CSS variables for "Outer Space" palette (deep blues, purples, neon greens).
  - [ ] **Implement `StarfieldBackground` component**:
    - [ ] Multi-layer parallax effect responding to mouse movement.
    - [ ] Fetch/generate star sprites.
  - [ ] **Asset Sourcing**:
    - [ ] Fetch retro space assets (ships, asteroids) from OpenGameArt (e.g., Kenney's Space Shooter Redux).
  - [ ] Style buttons as 8-bit retro UI elements.
- [ ] Create layout:
  - App shell with header and sidebar/bottom nav
  - Routes:
    - `/login`
    - `/arcade`
    - `/game/:gameId`
    - `/results/:sessionId`
    - `/invite/:inviteId`
    - `/cohorts/:subjectId`
    - `/leaderboards`
    - `/profile`
- [ ] Implement Firebase auth integration:
  - [ ] Sign up / login
  - [ ] Role assignment: `student`, `parent`, `tutor`
  - [ ] Age gate / UX prompt
- [ ] Implement protected routes:
  - redirect to `/login` if not authenticated.

---

## 2. Frontend – Arcade Hub & “Alive” Layer

- [ ] **Arcade Hub UI**:
  - [ ] Game cards with:
    - title, subject, difficulty
    - “players online” info
  - [ ] “Continue where you left off” section.
- [ ] **Presence display**:
  - [ ] Show global presence: `X players online`
  - [ ] Show per-game presence: `Y in Vocab Arena`
- [ ] **Cohorts UI**:
  - [ ] Cohort list per subject
  - [ ] Enter cohort view showing:
    - list of members
    - active challenge
    - mini-leaderboard.

---

## 3. Frontend – Mini-Games

### 3.1 Common Game Framework

- [ ] Decide on game engine: Phaser or pure Canvas.
- [ ] Implement `<GameFrame>` component:
  - [ ] Canvas container
  - [ ] Game HUD (score, timer, lives)
  - [ ] Pause/quit buttons
- [ ] Define `GameSession` interface:
  - `id`, `gameType`, `skillDeckId`, `score`, `duration`, `accuracy`, etc.

### 3.2 Asteroids – Synonym Shooter

- [ ] Implement controls (WASD + spacebar).
- [ ] Implement asteroid spawning logic.
- [ ] Integrate vocabulary data:
  - [ ] mock or static `wordDecks`.
  - [ ] map each asteroid to a word.
- [ ] Implement scoring logic:
  - [ ] correct synonyms → score, combo.
  - [ ] incorrect shots → penalty.
- [ ] Implement game end conditions:
  - [ ] time-based or HP-based.
- [ ] Emit `gameSessionCompleted` event and store in Firestore via SDK.

### 3.3 Pac-Man – Vocabulary Maze

- [ ] Implement grid-based maze.
- [ ] Implement Pac-Man movement.
- [ ] Spawn pellets mapped to definitions/words.
- [ ] Implement ghost AI (simple).
- [ ] Scoring rules:
  - [ ] correct matches → points.
  - [ ] wrong → speed increase or lives lost.
- [ ] Emit `gameSessionCompleted`.

### 3.4 Optional – Typing Racer / Math Invaders

- [ ] Implement simple text input game or SHOOT-the-right-equation.

---

## 4. Frontend – Results & Viral Surfaces

- [ ] Create generic `ResultsPage` component:
  - [ ] Display:
    - score
    - skills practiced
    - personal best
    - cohort rank (if available)
  - [ ] “Challenge a Friend” button.
  - [ ] “Share Achievement” button.
- [ ] Implement share card generation UX:
  - [ ] Call backend endpoint to create share metadata.
  - [ ] Show preview of card (image or styled UI).
- [ ] Implement deep link logic:
  - [ ] Accept `inviteId` route.
  - [ ] Preload:
    - game type
    - skill deck
    - challenge context.

---

## 5. Backend – Data Model (Firestore & Realtime DB)

- [ ] Define Firestore collections:

  - `users`
    - `role`, `displayName`, `ageBand`, `createdAt`, etc.
  - `gameSessions`
    - `userId`, `gameType`, `skillDeckId`, `score`, `accuracy`, `duration`, `fvmReached`, `createdAt`.
  - `invites`
    - `inviterId`, `inviteeId?`, `gameType`, `skillDeckId`, `sessionId`, `status`, `signedCode`, `experimentId`.
  - `rewards`
    - `userId`, `type`, `amount`, `source`, `createdAt`.
  - `cohorts`
    - `subject`, `name`, `ownerId`, `codes`, `settings`.
  - `leaderboards`
    - aggregated stats per `gameType` / `cohortId`.
  - `experiments`
    - definitions for AB tests.
  - `experimentAssignments`
    - user-to-variant mapping.
  - `attribution`
    - `inviteId`, `newUserId`, `events`.

- [ ] Define Realtime DB structure:

  - `/presence/global/{userId}`: `status`, `lastPing`, `subject`.
  - `/presence/game/{gameType}/{userId}`: same as above.
  - `/cohortPresence/{cohortId}/{userId}`: for rooms.

---

## 6. Backend – Agents (Cloud Functions)

### 6.1 Loop Orchestrator Agent

- [ ] Implement function `orchestrator.handleEvent` (HTTP/callable or Firestore trigger):
  - Inputs:
    - `eventType` (e.g., `GAME_SESSION_COMPLETED`)
    - `userId`, `sessionId`.
  - Behavior:
    - Fetch user profile, recent sessions, experiment assignment.
    - Decide which loop (if any) to trigger:
      - Buddy Challenge
      - Results Rally
      - Achievement Spotlight
      - Streak Rescue
    - Call downstream agents (Personalization, Incentives).

- [ ] Store decision log in `agentLogs`.

### 6.2 Personalization Agent

- [ ] Function `personalization.getInviteCopy`:
  - Inputs:
    - persona, subject, gameType, loopType.
  - Outputs:
    - title, subtitle, CTA text.
- [ ] Use template-based system (no LLM initially):
  - e.g., `"Beat my score in ${gameName} and unlock a streak shield!"`.

### 6.3 Incentives & Economy Agent

- [ ] Function `incentives.computeReward`:
  - Inputs:
    - loopType, user stats, invite stats.
  - Outputs:
    - reward type & amount.
- [ ] Enforce:
  - daily cap per user.
  - loop-specific rules.

### 6.4 Social Presence Agent

- [ ] Function `presence.updateSubjectPresence`:
  - triggered by user actions / periodic pings.
- [ ] Function `presence.suggestCohorts`:
  - returns recommended cohorts to join for given subject.

### 6.5 Tutor Advocacy Agent (Phase 1 stub)

- [ ] Function `tutor.generateSharePack`:
  - creates shareable card info for tutors.
  - returns short URL.

### 6.6 Trust & Safety Agent

- [ ] Function `trust.checkInvite`:
  - before creating an invite:
    - check if user has exceeded invites/day limit.
    - check for self-invite patterns (same device, same IP).
- [ ] Record flagged events in `abuseReports`.

### 6.7 Experimentation Agent

- [ ] Function `experiments.assignUserVariant`:
  - assign users to AB test buckets.
- [ ] Function `experiments.logExposure`:
  - called when user sees a prompt/loop.
- [ ] Function `experiments.computeKpi` (offline / scheduled):
  - compute K-factor, lift, etc.

---

## 7. Backend – Viral Loop Implementation

### 7.1 Buddy Challenge Loop

- [ ] Trigger:
  - Firestore trigger on `gameSessions` `fvmReached == true`.
- [ ] Orchestrator:
  - decides to create `invites` doc.
- [ ] Backend:
  - create `invites` entry with signed short code.
- [ ] Frontend:
  - show “Challenge a friend” modal with:
    - link to copy or share via OS share API.
- [ ] Invite route:
  - `/invite/:inviteId`
    - loads `invites` doc.
    - if unauthenticated:
      - route to sign-up, then back to game.
    - start challenge game with same `skillDeckId`.
- [ ] Conversion:
  - on FVM for invited user:
    - mark invite as `converted`.
    - trigger `incentives` to grant rewards to both.

### 7.2 Results Rally Loop

- [ ] On `ResultsPage` load:
  - call orchestrator with `RESULTS_VIEWED` event.
- [ ] Display:
  - rank vs peers from `leaderboards`.
- [ ] CTA:
  - “Share your rank / challenge cohort”.
- [ ] Create invites for cohort or specific friends.

### 7.3 Achievement Spotlight Loop

- [ ] Trigger:
  - new badge / milestone.
- [ ] Backend:
  - create `achievement` entry and link to share card.
- [ ] Frontend:
  - show modal with shareable image + deep link.

### 7.4 Streak Rescue Loop

- [ ] Cron or scheduled function:
  - scan for streak likely to break.
- [ ] Orchestrator:
  - for these users, propose `streak_rescue`.
- [ ] Frontend:
  - show banner: “Invite a friend to rescue your streak.”
- [ ] Flow:
  - same as Buddy Challenge but targeted.

---

## 8. Analytics & Dashboards

- [ ] Implement event logging to Firestore or BigQuery.
- [ ] Create `analytics` Cloud Function to aggregate:
  - invites per user
  - invite conversion rates
  - K-factor per loop
  - D1/D7 retention for referred vs non-referred.
- [ ] Build simple dashboard (could be React page reading aggregated documents).

---

## 9. Testing & QA

- [ ] Unit tests for:
  - agents logic
  - reward calculations
- [ ] Manual playtesting:
  - multi-user flows (two browsers).
  - presence updates.
  - invite flows.
- [ ] Edge cases:
  - expired invites.
  - rate-limit enforcement.
  - user with no friends.
