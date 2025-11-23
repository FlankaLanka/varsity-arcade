# Varsity Arcade – Viral Learning Arcade Platform
Date: 2025-11-22  
Owner: [You]  
Stack: React (web) + Firebase (Auth, Firestore, Realtime DB, Functions, Storage)

---

## 1. Overview

### 1.1 Vision

Varsity Arcade is a **gamified learning arcade** that turns academic practice into fast, fun, and social mini-games (Pac-Man-style, Asteroids-style, etc.), each tied to **real learning objectives** (vocabulary, math, concepts) and instrumented with **viral loops**.

It is directly inspired by the Varsity Tutors growth brief: we want to **10× K-factor** by making *every game session, result screen, and achievement* a shareable, referable, trackable moment.

Core pillars:

- 🎮 **Mini-games as First Value Moment (FVM)**: A student can get value in **30–90 seconds** via a game tied to a skill (e.g., synonyms, SAT vocab, algebra).
- 🌐 **Alive & Social**: Presence, cohorts, subject clubs, and live leaderboards.
- 🔁 **Closed-loop Viral Mechanics**: At least 4 viral loops that lead to **K ≥ 1.20** for at least one loop.
- 🤖 **Agentic Growth Brain**: Firebase Cloud Functions acting as MCP-style agents (Orchestrator, Personalization, Incentives, Experimentation, etc.) that decide when and how to trigger invites and rewards.

---

## 2. Goals & Non-Goals

### 2.1 Primary Goals

1. **Build a functional arcade website (web) with at least 2–3 playable learning mini-games**, including:
   - Asteroids Synonym Shooter
   - Pac-Man Vocabulary Maze
   - (Optional) Typing Racer or Math Invaders

2. **Ship ≥ 4 closed-loop viral mechanics** that connect:
   - game completion → invite → friend joins → friend reaches FVM

3. **Implement an “alive” layer**:
   - online presence (friends & subject peers)
   - mini-leaderboards
   - cohort / subject rooms

4. **Instrument analytics & experimentation**:
   - K-factor measurement
   - invites → opens → signups → FVM
   - referred vs non-referred cohorts

5. **Implement a minimal agent framework** using Firebase Functions:
   - Loop Orchestrator Agent (required)
   - Personalization Agent (required)
   - Incentives & Economy Agent
   - Social Presence Agent
   - Tutor Advocacy Agent (stubbed but structurally present)
   - Trust & Safety Agent
   - Experimentation Agent (required)

6. **Use Firebase as the backend**:
   - Auth for users (students / parents / tutors)
   - Firestore for game sessions, invites, rewards, experiments
   - Realtime DB for presence and live rooms
   - Functions for agents and event handling
   - Storage for share cards, optional reels

### 2.2 Non-Goals (for initial implementation)

- Full integration with real Varsity Tutors 1:1 sessions platform.
- Fully production-grade COPPA/FERPA legal implementation (we’ll enforce best practices but this is a prototype).
- Native mobile apps (web mobile-responsive is sufficient).
- Highly polished art assets; however, we will enforce a strict **pixelated outer space theme** (retro fonts, dark cosmos backgrounds, neon accents).

---

## 3. Personas & Use Cases

### 3.1 Personas

1. **Student (Primary)**
   - Age: middle school → high school.
   - Wants: quick games, leveling up, beating friends, improving skills.
   - Devices: Chromebook, laptop, phone.

2. **Parent**
   - Wants: reassurance, progress, fun & safe environment; ability to invite other parents for learning benefits.
   - May receive: progress recaps, reels, share cards.

3. **Tutor**
   - Wants: to showcase student wins, share their “class sampler” or game prep, earn XP/credits for referral.
   - More advanced but in initial version: we can stub flows.

---

### 3.2 Key User Journeys

#### 3.2.1 Student: First-Time Visit → FVM

1. Lands on `/arcade` from:
   - direct link, or
   - invite link from friend.
2. Sees games with presence:
   - “12 players online in Vocab Arena”
3. Picks a game (e.g., Asteroids Synonym Shooter).
4. Plays a 60-second round tied to a skill (e.g., “SAT Vocab – Synonyms”).
5. Gets:
   - score
   - badges
   - progress (words mastered)
6. Hits results page with:
   - share card
   - “Challenge a friend” button
   - “Join a subject club” CTA
7. Invites a friend → their invite is tracked.
8. Friend joins and also reaches FVM → both get streak shields / XP booster.

#### 3.2.2 Student: Ongoing Use – Cohorts & Streaks

1. Logs in again; sees:
   - “You’ve kept a 3-day streak!”
   - “2 friends playing Math Invaders”
2. Joins a cohort (e.g., “Algebra Club”) – sees mini-leaderboard.
3. Plays game(s) as part of the cohort challenge.
4. Shares their progress to maintain streak or to rescue streak (Streak Rescue loop).

#### 3.2.3 Parent: Proud Parent Loop

1. Parent receives:
   - weekly progress recap (stubbed or manually triggered)
2. Progress recap includes:
   - games played
   - skills improved
   - share card “Your child mastered 20 new words”
3. Parent can:
   - share progress with other parents; they get a free “class sampler” or bonus AI minutes for their child.

#### 3.2.4 Tutor: Tutor Spotlight Loop (Later Phase)

1. Tutor logs into a tutor dashboard or receives email summary.
2. Tutor gets auto-generated share pack:
   - highlight card of student success
   - invite links to arcade or class sampler
3. Tutor shares with parents, gets XP when referrals convert.

---

## 4. Feature Scope

### 4.1 Arcade Hub

- Game listing with:
  - difficulty / subject tags
  - player counts (“X online”)
  - quick-launch buttons
- Personalized suggestions (“Continue SAT Vocab”, “Join your friend in Math Invaders”).
- Persistent navigation: Profile, Cohorts, Leaderboards.

### 4.2 Mini-Games (Learning-Integrated)

#### 4.2.1 Asteroids – Synonym Shooter

- Player controls a ship with WASD + spacebar.
- Asteroids contain words.
- HUD shows “target word” or concept.
- The player must shoot **synonyms** of the target word.
- Shooting wrong asteroids:
  - lose HP or score.
- Correct hits:
  - +score, +combo, possibly faster fire rate.
- End of round:
  - word mastery summary
  - accuracy stats
  - FVM event if thresholds met (e.g., 10+ correct, >70% accuracy).

#### 4.2.2 Pac-Man – Vocabulary Maze

- Maze where pellets are vocabulary items.
- Some pellets = correct definitions; others wrong or decoys.
- Ghosts can be “difficulty” or “distraction”.
- The player collects correct definitions to progress.
- FVM when:
  - level completed OR
  - X correct matches.

#### 4.2.3 (Optional) Typing Racer / Math Invaders

- Timed challenges.
- Good for quick FVM and head-to-head modes.

---

### 4.3 Viral Loops (≥ 4)

We will explicitly implement:

1. **Buddy Challenge (Student → Student)**  
   - Trigger: gameSession.completed with good performance.
   - CTA: “Send this challenge to a friend to beat your score.”
   - Mechanics:
     - create invite document with:
       - `inviterId`, `gameType`, `scoreToBeat`, `skillDeckId`
       - signed short link
     - friend must:
       - click link → open app → play same game/skill deck → reach FVM.
     - rewards:
       - streak shields
       - XP booster
       - gems

2. **Results Rally (Async → Social)**  
   - Results pages show:
     - percentile vs peers or local leaderboard.
   - CTA: “Share your rank / Challenge your cohort”.
   - Cohort leaderboards update in (near) real-time.

3. **Achievement Spotlight (Any Persona)**  
   - Trigger: badge / milestone (e.g., 100 words mastered, 7-day streak).
   - Auto-generate:
     - shareable card.
   - Deep link brings new users to:
     - micro-version of same challenge (e.g., 5-question test).

4. **Streak Rescue (Student → Student)**  
   - When a streak is at risk:
     - detect upcoming missed day or drop in play.
   - Prompt:
     - “Phone-a-friend to rescue your streak.”
   - Friend joins a co-practice game (synchronized or asynchronous) → both get streak shields.

(Optionally later: Proud Parent, Tutor Spotlight, Subject Clubs.)

---

### 4.4 “Alive” Layer

- **Presence**:
  - show counts like:
    - “27 players online”
    - “5 in SAT Vocab”
  - friend list presence.
- **Cohort Rooms**:
  - per subject or teacher code.
  - show current challenges and top players.
- **Mini-Leaderboards**:
  - per game
  - per cohort
  - daily/weekly resets.

---

### 4.5 Rewards & Economy

- Rewards types:
  - XP (level progression)
  - Gems (cosmetics, power-ups)
  - Streak shields (protect a missed day)
  - AI Tutor Minutes or “Hint tokens” (future integration)
- Incentives & Economy Agent:
  - ensures we don’t over-inflate rewards.
  - sets reward caps per day.
  - handles abuse detection (spam invites, self-invites).

---

### 4.6 Agents (MCP-style via Firebase)

1. **Loop Orchestrator Agent (required)**  
   - Input:
     - event type (gameCompletion, resultsViewed, milestoneReached)
     - user persona, history, experiment flags
   - Output:
     - which loop should trigger (if any)
     - parameters for personalization & incentives
   - SLA: <150ms for in-app triggers.

2. **Personalization Agent (required)**  
   - Tailors:
     - copy: “Hey [name], your friend [X] just beat this score.”
     - game suggestions by subject & skill.
   - Takes persona, subject, game type; returns message templates + CTAs.

3. **Incentives & Economy Agent**  
   - Decides:
     - reward type and amount.
   - Ensures:
     - daily caps, anti-abuse.

4. **Social Presence Agent**  
   - Maintains presence metrics.
   - Suggests:
     - cohorts/clubs to join.
     - “invite a friend” nudges.

5. **Tutor Advocacy Agent**  
   - Generates stubbed share packs for tutors.
   - Phase 1: simple share cards + short links.

6. **Trust & Safety Agent**  
   - Checks:
     - duplicate accounts
     - known fraudulent patterns
   - Enforces:
     - limits on invites/day.
     - rate limiting on share endpoints.

7. **Experimentation Agent (required)**  
   - Allocates:
     - AB test buckets (e.g., different loop configurations).
   - Logs:
     - exposures, conversions.
   - Computes:
     - K-factor and uplift metrics.

Each agent logs:

```json
{
  "agent": "LoopOrchestrator",
  "decision": "trigger_buddy_challenge",
  "rationale": "high_score, high_engagement, not_saturated",
  "features_used": ["recentGameScore", "streakDays", "experimentGroup"],
  "timestamp": 1234567890
}
5. Technical Requirements
5.1 Stack
React (or Next.js in SPA mode)

Firebase:

Auth

Firestore

Realtime Database

Cloud Functions (Node)

Storage

Hosting

5.2 Performance & Scale
Target: up to 5k concurrent learners, 50 events/sec.

Use:

Firestore for durable storage.

Realtime DB for presence and game rooms.

5.3 Compliance & Privacy
Assume under-18 students:

limit public PII.

share cards use first name initial or avatar only.

Separate parent vs student accounts via role in profile.

No public feed containing identifiable minors.

6. Analytics & Success Metrics
6.1 Event Tracking
Track events (examples):

user_signed_up

game_session_started

game_session_completed

fvm_reached

invite_created

invite_opened

invite_converted_to_signup

invite_converted_to_fvm

reward_granted

presence_ping

cohort_joined

leaderboard_viewed

6.2 K-factor Definition
For each viral loop:

K = invites_per_user * invite_to_FVM_conversion_rate

Track:

invites sent per seed user

friend sign-up rate

friend FVM rate.

6.3 Target Metrics
Primary: K ≥ 1.20 for at least one loop over a 14-day cohort.

Activation: +20% lift to FVM vs baseline.

Referral Mix: Referrals ≥ 30% of weekly signups (post-seeding).

Retention: +10% D7 for referred users.

Abuse: <0.5% fraudulent joins, <1% opt-out.

7. Phases
Phase 0 – Thin-Slice MVP
1–2 games implemented (Asteroids + Pac-Man).

Basic presence and leaderboards.

Single viral loop (Buddy Challenge) fully wired.

K-factor measurement stub.

Phase 1 – Full Viral System
All 4+ loops wired.

All required agents implemented.

Live dashboards.

Streak rescue + subject clubs.

Phase 2 – Tutors & Parents
Proud Parent loop.

Tutor Spotlight loop.

Parent/tutor dashboards.