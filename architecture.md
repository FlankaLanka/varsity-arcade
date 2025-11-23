# Varsity Arcade – System & Data Architecture

## 1. High-Level Architecture

```mermaid
flowchart LR
  UserBrowser((User Browser))
  subgraph Frontend[React Arcade Web App]
    ArcadeUI[Arcade Hub & UI]
    GameFrame[Mini-Games (Canvas/Phaser)]
    ResultsUI[Results & Share UI]
  end

  subgraph Firebase[Firebase Backend]
    Auth[Firebase Auth]
    Firestore[(Firestore)]
    RTDB[(Realtime DB)]
    Storage[(Storage)]
    subgraph Functions[Cloud Functions (Agents)]
      Orchestrator[Loop Orchestrator Agent]
      Personalization[Personalization Agent]
      Incentives[Incentives Agent]
      PresenceAgent[Social Presence Agent]
      TutorAgent[Tutor Advocacy Agent]
      Trust[Trust & Safety Agent]
      Experiments[Experimentation Agent]
    end
  end

  UserBrowser --> ArcadeUI
  ArcadeUI --> Auth
  ArcadeUI --> Firestore
  ArcadeUI --> RTDB
  ArcadeUI --> GameFrame
  GameFrame --> Firestore
  ResultsUI --> Firestore

  Firestore --> Orchestrator
  Orchestrator --> Personalization
  Orchestrator --> Incentives
  Orchestrator --> Experiments
  Orchestrator --> Firestore

  RTDB <-- PresenceAgent
  Storage <-- TutorAgent
Frontend: React SPA or Next.js app.

Backend: Firebase (Auth, Firestore, Realtime DB, Functions).

Agents: Implemented as Cloud Functions using HTTP / callable + Firestore triggers.

2. Frontend Architecture
2.1 Modules
/src/components

ArcadeHome.tsx

GameCard.tsx

PresenceIndicator.tsx

Leaderboard.tsx

CohortRoom.tsx

ResultsPage.tsx

ShareModal.tsx

NavBar.tsx

/src/games

AsteroidsGame.tsx

PacmanGame.tsx

GameFrame.tsx (common)

/src/theme
  fonts/ (Pixelify Sans, Press Start 2P)
  assets/ (stars-bg.png, planet-sprites/)
  colors.ts (Deep Space Black, Neon Cyan, Plasma Pink)

/src/context

AuthContext.tsx

PresenceContext.tsx

/src/lib/firebase.ts

/src/hooks

useGameSession

usePresence

useInvite

2.2 Game Integration
Each game:

Runs within <GameFrame> component.

Emits events on:

start, update, end.

On end, we:

compute FVM.

write gameSessions doc to Firestore.

call orchestrator via callable function if necessary.

3. Backend – Data Model
3.1 Firestore Collections
users
ts
Copy code
type UserDoc = {
  displayName: string
  role: "student" | "parent" | "tutor"
  ageBand?: "u13" | "13-17" | "18+"
  createdAt: Timestamp
  lastActiveAt: Timestamp
  experimentAssignments?: Record<string, string> // experimentId → variant
}
gameSessions
ts
Copy code
type GameSessionDoc = {
  userId: string
  gameType: "asteroids" | "pacman" | "typing" | string
  skillDeckId: string
  score: number
  accuracy: number
  durationSeconds: number
  fvmReached: boolean
  createdAt: Timestamp
  inviteId?: string // if this session is from an invite
  cohortId?: string
}
invites
ts
Copy code
type InviteDoc = {
  inviterId: string
  inviteeId?: string
  gameType: string
  skillDeckId: string
  sessionId: string // inviter's session
  status: "created" | "opened" | "signed_up" | "fvm_converted" | "expired"
  createdAt: Timestamp
  openedAt?: Timestamp
  signedUpAt?: Timestamp
  fvmAt?: Timestamp
  signedCode: string // used for short URL
  experimentId?: string
  loopType: "buddy_challenge" | "results_rally" | "streak_rescue" | "achievement_spotlight"
}
rewards
ts
Copy code
type RewardDoc = {
  userId: string
  type: "xp" | "gems" | "streak_shield" | "ai_minutes" | string
  amount: number
  source: "buddy_challenge" | "streak_rescue" | "achievement" | string
  createdAt: Timestamp
  metadata?: Record<string, any>
}
cohorts
ts
Copy code
type CohortDoc = {
  name: string
  subject: string
  ownerId: string
  code?: string // join code
  createdAt: Timestamp
  settings?: {
    maxMembers?: number
    leaderboardType?: "weekly" | "all_time"
  }
}
leaderboards
Aggregated collection to avoid heavy aggregation client-side.

ts
Copy code
type LeaderboardDoc = {
  id: string // e.g., `${gameType}_${cohortId || 'global'}_${period}`
  gameType: string
  cohortId?: string
  period: "daily" | "weekly" | "all_time"
  entries: {
    userId: string
    displayName: string
    score: number
  }[]
  updatedAt: Timestamp
}
agentLogs
ts
Copy code
type AgentLogDoc = {
  agent: string
  userId?: string
  eventType: string
  decision: string
  rationale: string
  featuresUsed: string[]
  createdAt: Timestamp
}
3.2 Realtime Database Structure
json
Copy code
{
  "presence": {
    "global": {
      "{userId}": {
        "status": "online",
        "lastPing": 1234567890,
        "subject": "sat_vocab"
      }
    },
    "game": {
      "{gameType}": {
        "{userId}": {
          "status": "playing",
          "lastPing": 1234567890
        }
      }
    }
  },
  "cohortPresence": {
    "{cohortId}": {
      "{userId}": {
        "status": "online",
        "lastPing": 1234567890
      }
    }
  }
}
4. Agents – Functional Architecture
4.1 Loop Orchestrator Agent
Trigger Sources:

Firestore trigger on gameSessions create.

HTTP/callable from frontend for results_viewed.

Scheduled jobs (streak rescue).

Decision Logic (simplified):

ts
Copy code
function decideLoop(event: Event, user: UserDoc, recentSessions: GameSessionDoc[]): LoopDecision {
  // Example heuristic
  if (event.type === "GAME_SESSION_COMPLETED" && event.fvmReached) {
    // Check if recently triggered a loop
    if (!recentlyTriggeredLoop(user.id, "buddy_challenge")) {
      return { loopType: "buddy_challenge" }
    }
  }

  if (event.type === "RESULTS_VIEWED") {
    return { loopType: "results_rally" }
  }

  if (event.type === "MILESTONE_REACHED") {
    return { loopType: "achievement_spotlight" }
  }

  if (event.type === "STREAK_AT_RISK") {
    return { loopType: "streak_rescue" }
  }

  return { loopType: "none" }
}
4.2 Experimentation Agent
Assigns users into variants:

e.g., different reward mixes, different copy styles.

Stores assignments in users.experimentAssignments.

5. Sequence Flows
5.1 Flow: Game Completed → Buddy Challenge Invite
mermaid
Copy code
sequenceDiagram
  participant U as User
  participant FE as Frontend
  participant FS as Firestore
  participant OR as Orchestrator Fn
  participant PZ as Personalization Fn
  participant IN as Incentives Fn

  U->>FE: Finishes game
  FE->>FS: Create gameSessions doc
  FS-->>OR: Trigger on gameSessions create
  OR->>FS: Load user, past sessions, experiments
  OR->>OR: Decide loop = buddy_challenge
  OR->>PZ: Request copy (persona, subject, gameType)
  PZ-->>OR: Copy/CTA templates
  OR->>IN: Request reward config
  IN-->>OR: Reward type & amount
  OR->>FS: Create invites doc + log agent decision
  OR-->>FE: (optional callable) response with loop decision
  FE->>U: Show "Challenge a friend" modal with link & reward preview
5.2 Flow: Invite → Signup → FVM → Rewards
mermaid
Copy code
sequenceDiagram
  participant Friend as Friend
  participant FE as Frontend
  participant FS as Firestore
  participant EXP as Experiments Fn
  participant IN as Incentives Fn

  Friend->>FE: Open /invite/:inviteId link
  FE->>FS: Load invite doc
  alt Not logged in
    FE->>Friend: Show signup/login
    Friend->>FE: Complete signup
    FE->>FS: Create user doc
  end
  FE->>EXP: Assign experiment variant (if needed)
  FE->>Friend: Start challenge game with preloaded skill deck
  Friend->>FE: Complete game
  FE->>FS: Create gameSessions doc (with inviteId)
  FS-->>IN: Trigger on gameSessions create where fvmReached && inviteId
  IN->>FS: Update invite status to fvm_converted, grant rewards to inviter & invitee
  FE->>Friend: Show "You and [inviter] earned rewards!"
6. Failure Modes & Graceful Degradation
If agents are down:

Frontend uses default copy & rewards.

orchestrator fallback: no sophisticated logic; just no/low-risk invites.

If Realtime DB is down:

Hide presence; degrade to static UI.

If Firestore fails:

Show local summary; temporarily disable share/loop actions.

7. Security & Access Control
Firebase Security Rules:

Users can only read/write their own:

gameSessions (except aggregated leaderboards).

rewards.

limited invites fields.

Cohort membership read restricted by cohortId.

Agent-only collections (e.g., agentLogs) locked to service accounts.

8. Future Extensions
Live multiplayer modes (shared game instances via Realtime DB / WebSockets).

Deeper tutor integration with real Varsity Tutors scheduling.

Integration with AI tutor minutes and actual session transcripts.

Advanced personalization via LLMs (copy & game config generation).

yaml
Copy code

---

If you want, next step I can:

- Trim this into **Cursor-ready repo scaffolding** (folder structure + placeholder code), or  
- Flesh out **one end-to-end loop** in code: e.g., `gameSessionCompleted → orchestrator → invite → invite route → reward`.