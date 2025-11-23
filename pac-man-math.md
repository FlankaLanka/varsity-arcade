# Pac-Man Math – Educational Arcade Game PRD

**Date**: 2025-11-23  
**Game Type**: Grid-based maze collection game with math problem-solving  
**Session Duration**: 60 seconds  
**Target Audience**: Students learning arithmetic (elementary to middle school)

---

## 1. Core Concept

**Pac-Man Math** transforms classic Pac-Man gameplay into an educational experience by requiring players to solve math equations to activate the "supercharged" state (ability to eat ghosts). Players navigate a maze, collect regular pellets for points, and solve math problems to gain temporary power.

---

## 2. Game Mechanics

### 2.1 Core Gameplay Loop

1. **Player navigates maze** using WASD controls (grid-based movement)
2. **Collects regular pellets** (small dots) → earns points
3. **Encounters large power pellets** → must solve math equation to activate
4. **Solves equation** → collects correct number pellet → enters supercharged state
5. **Supercharged state** → can eat ghosts for bonus points
6. **Timer counts down** from 60 seconds
7. **Game ends** when timer reaches 0 or lives are lost

### 2.2 Math Problem System

**Equation Display**:
- Shown prominently at top of screen (HUD area)
- Format: `[Number] [Operator] _ = [Result]`
- Examples:
  - `5 + _ = 10` (Answer: 5)
  - `12 - _ = 7` (Answer: 5)
  - `3 × _ = 15` (Answer: 5)
  - `20 ÷ _ = 4` (Answer: 5)

**Number Pellets**:
- Large pellets scattered in maze are labeled with **numbers** (e.g., "3", "5", "7", "9")
- Only **one pellet** has the correct answer
- Other pellets are **wrong answers** (decoy numbers)
- Player must navigate to and collect the **correct number pellet**

**Activation**:
- When player collects the **correct number pellet**:
  - ✅ Enters supercharged state (visual effect: player glows, ghosts turn blue/vulnerable)
  - ✅ Can eat ghosts for bonus points (500+ points per ghost)
  - ✅ State lasts for 10-15 seconds
  - ✅ New equation appears for next power pellet

- When player collects a **wrong number pellet**:
  - ❌ No supercharged state
  - ❌ Ghosts may speed up slightly (penalty)
  - ❌ Equation remains active (can try again with another pellet)

### 2.3 Maze & Movement

**Grid-Based System**:
- Classic Pac-Man style maze (28x31 tile grid)
- Walls, corridors, corners
- Wrap-around at edges (left/right sides connect)

**Player Movement**:
- **WASD controls**: Up, Left, Down, Right
- Grid-aligned movement (snaps to tiles)
- Smooth animation between tiles
- Can queue next direction (classic Pac-Man behavior)

**Pellets**:
- **Regular pellets** (small dots): Worth 10 points each
- **Power pellets** (large dots with numbers): Require math solution
- **Number pellets**: Labeled with answer choices (e.g., "3", "5", "7")

### 2.4 Ghosts

**4 Ghosts** with different behaviors:
1. **Blinky (Red)**: Aggressive chaser
2. **Pinky (Pink)**: Ambushes ahead of player
3. **Inky (Cyan)**: Unpredictable movement
4. **Clyde (Orange)**: Patrols specific areas

**Ghost States**:
- **Normal**: Chase player, cause game over on contact (lose a life)
- **Vulnerable** (when player is supercharged): Turn blue, can be eaten
- **Eaten**: Return to center, respawn after delay

**Ghost AI**:
- Simple pathfinding toward player
- Different personalities (some chase directly, others use patterns)
- Speed increases slightly as player collects more pellets

### 2.5 Lives & Game Over

**Lives System**:
- Start with **3 lives**
- Lose a life when touched by a ghost (in normal state)
- Game over when:
  - Lives reach 0, OR
  - Timer reaches 0 (survive = win)

**Scoring**:
- Regular pellet: 10 points
- Power pellet (correct answer): 50 points + supercharged state
- Ghost (when vulnerable): 500 points (first), 1000 (second), 2000 (third), 4000 (fourth)
- Combo bonus: Consecutive ghost eats multiply score

---

## 3. Math Problem Generation

### 3.1 Difficulty Levels

**Easy** (Elementary):
- Addition: `5 + _ = 10`
- Subtraction: `12 - _ = 7`
- Numbers: 1-20

**Medium** (Upper Elementary):
- Addition/Subtraction: `25 + _ = 40`
- Multiplication: `3 × _ = 15`
- Numbers: 1-50

**Hard** (Middle School):
- All operations: `45 ÷ _ = 9`
- Multi-step: `(10 + 5) × _ = 30`
- Numbers: 1-100

### 3.2 Problem Pool

**Pre-generated problems** stored in arrays:
```typescript
const MATH_PROBLEMS = {
  easy: [
    { equation: "5 + _ = 10", answer: 5, wrongAnswers: [3, 7, 9] },
    { equation: "12 - _ = 7", answer: 5, wrongAnswers: [3, 6, 8] },
    // ... more problems
  ],
  medium: [ /* ... */ ],
  hard: [ /* ... */ ]
};
```

**Randomization**:
- Select random problem from current difficulty level
- Generate 3-4 wrong answer options (close to correct answer to increase difficulty)
- Distribute number pellets throughout maze

---

## 4. Visual Design

### 4.1 Retro Space Theme

**Maze**:
- Dark space background (#050510)
- Neon grid lines (cyan/pink) for walls
- Glowing pellets (cyan for regular, yellow for power pellets)

**Player**:
- Pixel art Pac-Man character (can be space-themed: circular ship with "mouth")
- Supercharged state: Glowing aura, color shift to neon yellow

**Ghosts**:
- Pixel art space creatures (not traditional ghosts, but similar behavior)
- Colors: Red, Pink, Cyan, Orange
- Vulnerable state: Turn blue/transparent with pulsing effect

**Number Pellets**:
- Large, glowing pellets
- Display number prominently (pixel font: "Press Start 2P")
- Correct answer: Green glow
- Wrong answers: Red glow (subtle, so player must think)

### 4.2 HUD Elements

**Top Bar**:
- **Equation Display**: Large, clear math problem (e.g., `5 + _ = 10`)
- **Timer**: Countdown from 60 seconds (bottom right)
- **Score**: Current points (top left)
- **Lives**: Heart icons (top right)

**In-Game**:
- Grid-based maze fills center
- Pellets, ghosts, player visible
- Smooth animations

---

## 5. Technical Implementation

### 5.1 Game State

```typescript
interface PacManMathState {
  maze: Tile[][];              // 2D grid
  player: {
    x: number;                  // Grid position
    y: number;
    direction: 'up' | 'down' | 'left' | 'right';
    nextDirection?: Direction;  // Queued direction
    supercharged: boolean;      // Can eat ghosts
    superchargedTimer: number;  // Time remaining
  };
  ghosts: Ghost[];              // 4 ghosts with positions/behaviors
  pellets: Pellet[];           // Regular pellets
  powerPellets: PowerPellet[]; // Number-labeled pellets
  currentProblem: {
    equation: string;           // "5 + _ = 10"
    answer: number;             // 5
    wrongAnswers: number[];     // [3, 7, 9]
  };
  score: number;
  lives: number;
  timeRemaining: number;       // 60 seconds
  active: boolean;
}
```

### 5.2 Controls

- **W**: Move up
- **A**: Move left
- **S**: Move down
- **D**: Move right
- **Focus system**: Click canvas to focus (cursor hides, same as Asteroids)

### 5.3 Collision Detection

- **Grid-based**: Check tile positions (not pixel-perfect)
- **Player vs Wall**: Prevent movement into walls
- **Player vs Pellet**: Collect pellet, remove from maze
- **Player vs Ghost**: 
  - If supercharged → eat ghost, bonus points
  - If normal → lose a life
- **Player vs Power Pellet**: Check if number matches answer

---

## 6. First Value Moment (FVM)

**FVM Triggers**:
- ✅ **Solve first math problem** and enter supercharged state
- ✅ **Eat first ghost** (proves understanding of mechanic)
- ✅ **Complete 60 seconds** without losing all lives

**Success Metrics**:
- Player understands: "I need to solve math to get power"
- Player successfully collects correct number pellet
- Player uses supercharged state effectively

---

## 7. Scoring & Rewards

**Point Values**:
- Regular pellet: 10 pts
- Power pellet (correct): 50 pts
- Ghost (vulnerable): 500/1000/2000/4000 pts (escalating)
- Time bonus: Remaining seconds × 10 pts

**Leaderboard Integration**:
- Score tracked per session
- Ranked by total points
- Separate leaderboards for Easy/Medium/Hard difficulty

---

## 8. Educational Value

**Learning Objectives**:
- **Arithmetic practice**: Addition, subtraction, multiplication, division
- **Problem-solving**: Identify correct answer among distractors
- **Speed/accuracy**: Solve quickly under time pressure
- **Pattern recognition**: Recognize number relationships

**Adaptive Difficulty**:
- Start with Easy problems
- Increase difficulty as player succeeds
- Decrease if player struggles (future enhancement)

---

## 9. Integration with Varsity Arcade

**Game Type**: `"pacman-math"`  
**Session Data**: Same `GameSessionDoc` structure as Asteroids  
**Results Page**: Reusable `ResultsPage` component  
**Viral Loops**: Same Buddy Challenge, Results Rally mechanics

**Firestore Integration**:
- Store game sessions with `gameType: "pacman-math"`
- Track: score, accuracy (correct vs wrong pellets), problems solved
- Analytics: Which problems are hardest, average solve time

---

## 10. Future Enhancements

**Phase 2**:
- Multiple difficulty levels selectable
- Fraction problems
- Negative numbers
- Multi-step equations

**Phase 3**:
- Multiplayer races (who solves fastest)
- Custom problem sets (teacher-created)
- Progress tracking per operation type

---

## 11. Success Criteria

**MVP Must Have**:
- ✅ Classic Pac-Man maze navigation
- ✅ Math equation display
- ✅ Number-labeled power pellets
- ✅ Supercharged state activation
- ✅ Ghost eating mechanics
- ✅ 60-second timer
- ✅ Scoring system

**Nice to Have**:
- Multiple difficulty levels
- Smooth animations
- Sound effects
- Particle effects on ghost eats

---

**End of PRD**

