# pH Invaders – Educational Arcade Game PRD

**Date**: 2025-01-XX  
**Game Type**: Space Invaders-style shooter with chemistry pH management  
**Session Duration**: 60 seconds (or until all enemies defeated)  
**Target Audience**: Students learning chemistry (middle school to high school)

---

## 1. Core Concept

**pH Invaders** combines classic Space Invaders gameplay with chemistry education by requiring players to manage a pH bar while fighting enemies. Players must keep the pH bar as neutral as possible (pH 7) to maximize scoring, while environmental factors and enemy drops constantly shift the pH towards acidic (lower) or basic (higher) values.

---

## 2. Game Mechanics

### 2.1 Core Gameplay Loop

1. **Player controls a ship** at the bottom of the screen (left/right movement, spacebar to shoot)
2. **Enemies spawn in rows** at the top and move downward, shooting at player
3. **Player shoots enemies** → earns points for kills
4. **Enemies drop chemicals** when destroyed → player collects them → pH bar shifts
5. **Every 5 seconds**, environmental factor triggers → pH bar slowly drifts towards acid/base
6. **Player earns points every second** based on how close pH is to neutral (pH 7)
7. **Game ends** when:
   - All enemies are killed (victory), OR
   - Timer reaches 60 seconds (survival), OR
   - Player loses all lives (game over)

### 2.2 pH Bar System

**pH Scale**:
- Range: **0 to 14** (0 = most acidic, 7 = neutral, 14 = most basic)
- Visual bar displayed prominently in HUD
- Color-coded:
  - **Red** (pH 0-3): Strongly acidic
  - **Orange** (pH 4-6): Weakly acidic
  - **Yellow/Green** (pH 7): Neutral (optimal)
  - **Light Blue** (pH 8-10): Weakly basic
  - **Blue** (pH 11-14): Strongly basic

**pH Bar Behavior**:
- Starts at **pH 7** (neutral)
- Shifts when:
  - Player collects acidic/basic chemicals from enemies
  - Environmental factor is active (continuous drift)
- **Goal**: Keep pH as close to 7 as possible

**Scoring from pH**:
- Every second, player earns points based on pH proximity to neutral:
  - **pH 7.0**: 100 points/second (maximum)
  - **pH 6-8**: 75 points/second
  - **pH 5-9**: 50 points/second
  - **pH 4-10**: 25 points/second
  - **pH 0-3 or 11-14**: 10 points/second (minimum)
- Formula: `pointsPerSecond = 100 - (|pH - 7| * 10)` (capped at 10 minimum)

### 2.3 Enemy System

**Enemy Types**:
- **Basic Invaders** (standard enemies):
  - Move in formation, shoot periodically
  - Drop chemicals when destroyed
  - Worth 50-100 points per kill

**Enemy Movement**:
- Spawn in 5-6 rows at top of screen
- Move left/right, gradually descending
- Speed increases as rows are eliminated
- Shoot projectiles at player

**Enemy Drops** (Chemicals):
- When enemy is destroyed, has **50% chance** to drop a chemical
- Chemical type is randomized:
  - **Acidic chemicals** (e.g., HCl, H₂SO₄): Shift pH **down** (towards 0)
  - **Basic chemicals** (e.g., NaOH, KOH): Shift pH **up** (towards 14)
- **Chemical strength** varies:
  - **Weak**: Shifts pH by **0.5** units
  - **Medium**: Shifts pH by **1.0** units
  - **Strong**: Shifts pH by **2.0** units
- Visual indicators:
  - Acidic: Red/orange particles
  - Basic: Blue particles
  - Strength shown by particle size/glow intensity

**Chemical Collection**:
- Chemicals fall downward (slower than enemy bullets)
- Player collects by touching them (no shooting required)
- Immediate pH shift on collection
- Visual feedback: pH bar animates, color changes

### 2.4 Environmental Factors

**Trigger Timing**:
- Every **5 seconds**, an environmental event occurs
- Event type and strength are **randomized**

**Event Types**:
1. **Acidic Environment**:
   - Background shifts to **red/orange tint**
   - Alert message: **"ACIDIC ENVIRONMENT"** appears on screen
   - pH bar **slowly drifts towards 0** (acidic)
   - Drift rate: **0.1 to 0.5 pH units/second** (randomized per event)
   - Duration: **5-10 seconds** (randomized)

2. **Basic Environment**:
   - Background shifts to **blue tint**
   - Alert message: **"BASIC ENVIRONMENT"** appears on screen
   - pH bar **slowly drifts towards 14** (basic)
   - Drift rate: **0.1 to 0.5 pH units/second** (randomized per event)
   - Duration: **5-10 seconds** (randomized)

**Visual Feedback**:
- Background color overlay (red for acid, blue for base)
- Alert text: Large, pixelated font, pulsing animation
- pH bar shows continuous drift during event
- Alert disappears when event ends

**Event Strength**:
- **Weak**: 0.1 pH/second drift, 5-second duration
- **Medium**: 0.3 pH/second drift, 7-second duration
- **Strong**: 0.5 pH/second drift, 10-second duration
- Randomized per event to keep gameplay unpredictable

### 2.5 Player Controls & Movement

**Ship Movement**:
- **A/D or Left/Right arrows**: Move ship left/right
- Ship stays at bottom of screen (fixed Y position)
- Smooth horizontal movement with boundaries (can't go off-screen)

**Shooting**:
- **Spacebar**: Shoot bullets upward
- Bullet rate: **1 bullet per 0.3 seconds** (can be upgraded in future)
- Bullets travel straight up, destroy enemies on contact

**Lives System**:
- Start with **3 lives**
- Lose a life when:
  - Hit by enemy bullet, OR
  - Collide with enemy (if they reach bottom)
- Game over when lives reach 0

### 2.6 Scoring System

**Point Sources**:
1. **Enemy Kills**: 
   - Standard enemy: 50-100 points
   - Bonus for killing entire row: +50 points
   - Combo bonus: +10 points per consecutive kill (resets on miss)

2. **pH Maintenance** (every second):
   - Based on proximity to pH 7 (see pH Bar System section)
   - Maximum: 100 points/second at pH 7.0
   - Minimum: 10 points/second at extreme pH

3. **Time Bonus** (if all enemies killed):
   - Remaining seconds × 50 points

**Total Score Calculation**:
- Sum of all enemy kills + pH maintenance points + time bonus
- Displayed in real-time in HUD

---

## 3. Visual Design

### 3.1 Retro Space Theme

**Background**:
- Dark space background (#050510) with stars
- **Dynamic color overlay** during environmental events:
  - Acidic: Red/orange tint (rgba(255, 100, 100, 0.3))
  - Basic: Blue tint (rgba(100, 100, 255, 0.3))
- Overlay intensity matches event strength

**Player Ship**:
- Pixel art space ship at bottom
- Glowing cyan/neon color
- Thruster particles when moving

**Enemies**:
- Pixel art alien invaders (space-themed)
- Different colors per row (red, green, blue, yellow)
- Shooting animation when firing

**Chemicals**:
- **Acidic**: Red/orange glowing particles with trail
- **Basic**: Blue glowing particles with trail
- Size indicates strength (small = weak, large = strong)
- Fall slowly with slight drift

**Bullets**:
- Player bullets: Yellow/cyan, fast-moving
- Enemy bullets: Red, slower-moving
- Pixelated, glowing

### 3.2 HUD Elements

**Top Bar** (always visible):
- **Score**: Current total points (top left)
- **Lives**: Heart icons or ship icons (top center)
- **Timer**: Countdown from 60 seconds (top right)

**pH Bar** (prominent, center-top or side):
- Large, color-coded bar (0-14 scale)
- Current pH value displayed numerically (e.g., "pH 7.2")
- Visual indicator showing optimal zone (pH 7 highlighted)
- Animated when pH shifts

**Environmental Alert** (when active):
- Large text overlay: **"ACIDIC ENVIRONMENT"** or **"BASIC ENVIRONMENT"**
- Pulsing animation, pixelated font
- Positioned center-top or center of screen
- Disappears when event ends

**pH Points Indicator** (optional):
- Small text showing points earned from pH this second
- Example: "+100 pH points" (green if good, red if low)

---

## 4. Technical Implementation

### 4.1 Game State

```typescript
interface PHInvadersState {
  player: {
    x: number;              // Horizontal position (0 to canvas.width)
    y: number;              // Fixed at bottom
    lives: number;          // 3 lives
    lastShot: number;       // Timestamp for rate limiting
  };
  enemies: Enemy[];         // Array of enemy objects
  bullets: Bullet[];      // Player and enemy bullets
  chemicals: Chemical[];    // Dropped chemicals
  pH: number;              // Current pH (0-14, starts at 7)
  score: number;
  timeRemaining: number;    // 60 seconds
  active: boolean;
  
  // Environmental event
  environmentEvent: {
    active: boolean;
    type: 'acidic' | 'basic' | null;
    strength: number;       // pH drift rate per second
    duration: number;        // Remaining duration in seconds
    startTime: number;
  };
  
  // pH scoring
  lastPHScoreTime: number;  // Timestamp for per-second scoring
}
```

### 4.2 Enemy Structure

```typescript
interface Enemy {
  x: number;
  y: number;
  row: number;             // Which row (0-5)
  column: number;          // Position in row
  alive: boolean;
  lastShot: number;        // Timestamp for shooting
  color: string;           // Visual distinction
}

interface Chemical {
  x: number;
  y: number;
  type: 'acidic' | 'basic';
  strength: 'weak' | 'medium' | 'strong';  // pH shift amount
  pHShift: number;         // Actual pH change (0.5, 1.0, or 2.0)
  vx: number;              // Horizontal drift
  vy: number;              // Fall speed
}
```

### 4.3 Controls

- **A / Left Arrow**: Move left
- **D / Right Arrow**: Move right
- **Spacebar**: Shoot
- **Focus system**: Click canvas to focus (cursor hides, same as other games)

### 4.4 Collision Detection

- **Bullet vs Enemy**: Destroy enemy, spawn chemical (50% chance)
- **Player vs Chemical**: Collect chemical, shift pH, remove chemical
- **Enemy Bullet vs Player**: Lose a life
- **Enemy vs Player**: Lose a life (if enemy reaches bottom)
- **Player Bullet vs Enemy Bullet**: Both destroyed (optional, for visual effect)

### 4.5 pH Calculation

**pH Shifts**:
- On chemical collection: `pH += chemical.pHShift` (if basic) or `pH -= chemical.pHShift` (if acidic)
- During environmental event: `pH += environmentEvent.strength * deltaTime` (if basic) or `pH -= environmentEvent.strength * deltaTime` (if acidic)
- Clamp pH to range [0, 14]

**pH Scoring** (every second):
```typescript
const distanceFromNeutral = Math.abs(pH - 7);
const pointsPerSecond = Math.max(10, 100 - (distanceFromNeutral * 10));
score += pointsPerSecond;
```

---

## 5. Environmental Event System

### 5.1 Event Timing

- Timer starts at game start
- Every **5 seconds**, check if new event should trigger
- If no event is active, trigger new event
- If event is active, wait for it to finish before triggering next

### 5.2 Event Generation

```typescript
function triggerEnvironmentalEvent() {
  const type = Math.random() > 0.5 ? 'acidic' : 'basic';
  const strengthTier = ['weak', 'medium', 'strong'][Math.floor(Math.random() * 3)];
  
  const strength = {
    weak: 0.1,
    medium: 0.3,
    strong: 0.5
  }[strengthTier];
  
  const duration = {
    weak: 5,
    medium: 7,
    strong: 10
  }[strengthTier];
  
  return {
    active: true,
    type,
    strength,
    duration,
    startTime: Date.now()
  };
}
```

### 5.3 Event Update Loop

```typescript
// In game update loop
if (environmentEvent.active) {
  const elapsed = (Date.now() - environmentEvent.startTime) / 1000;
  
  if (elapsed >= environmentEvent.duration) {
    // Event ends
    environmentEvent.active = false;
    environmentEvent.type = null;
  } else {
    // Apply pH drift
    const deltaTime = dt / 60; // Convert frames to seconds
    if (environmentEvent.type === 'acidic') {
      pH = Math.max(0, pH - environmentEvent.strength * deltaTime);
    } else {
      pH = Math.min(14, pH + environmentEvent.strength * deltaTime);
    }
  }
}
```

---

## 6. First Value Moment (FVM)

**FVM Triggers**:
- ✅ **Kill first enemy** (proves understanding of shooting mechanic)
- ✅ **Collect first chemical** (proves understanding of pH system)
- ✅ **Experience first environmental event** (proves understanding of dynamic pH management)
- ✅ **Maintain pH near neutral for 5+ seconds** (proves mastery of core mechanic)
- ✅ **Complete 60 seconds** or kill all enemies (proves game completion)

**Success Metrics**:
- Player understands: "I need to balance pH while fighting enemies"
- Player successfully manages pH during environmental events
- Player collects chemicals strategically (not just randomly)

---

## 7. Scoring & Rewards

**Point Values**:
- Enemy kill: 50-100 points (varies by row/type)
- Row cleared: +50 bonus
- Combo kill: +10 per consecutive kill
- pH maintenance: 10-100 points/second (based on pH proximity to 7)
- Time bonus: Remaining seconds × 50 (if all enemies killed)

**Leaderboard Integration**:
- Score tracked per session
- Ranked by total points
- Separate leaderboards for different difficulty levels (future)

---

## 8. Educational Value

**Learning Objectives**:
- **pH scale understanding**: 0-14 scale, neutral at 7
- **Acid/base identification**: Recognize acidic vs basic substances
- **Chemical properties**: Understand that different chemicals have different strengths
- **Environmental factors**: Learn how external conditions affect pH
- **Balance and management**: Practice maintaining equilibrium under pressure

**Chemistry Concepts**:
- pH scale and logarithmic nature
- Acids (low pH) vs bases (high pH)
- Neutral solutions (pH 7)
- Strong vs weak acids/bases
- Environmental pH factors (pollution, natural processes)

**Adaptive Learning** (future):
- Track which concepts player struggles with
- Adjust chemical types and environmental events based on learning needs
- Provide hints or explanations after game

---

## 9. Integration with Varsity Arcade

**Game Type**: `"ph-invaders"`  
**Session Data**: Same `GameSessionDoc` structure as other games  
**Results Page**: Reusable `ResultsPage` component  
**Viral Loops**: Same Buddy Challenge, Results Rally mechanics

**Firestore Integration**:
- Store game sessions with `gameType: "ph-invaders"`
- Track: score, pH management accuracy (time spent near pH 7), chemicals collected
- Analytics: Which environmental events are most challenging, average pH deviation

---

## 10. Future Enhancements

**Phase 2**:
- Multiple difficulty levels (more enemies, faster environmental events)
- Different enemy types with unique behaviors
- Power-ups (pH stabilizer, rapid fire, shield)
- Multi-row formations with different enemy types

**Phase 3**:
- Specific chemical names displayed (HCl, NaOH, etc.) with educational tooltips
- pH calculation mini-games (calculate pH from concentration)
- Multiplayer races (who maintains pH best)
- Custom chemical sets (teacher-created)

---

## 11. Success Criteria

**MVP Must Have**:
- ✅ Classic Space Invaders enemy movement and shooting
- ✅ Player ship with left/right movement and shooting
- ✅ pH bar (0-14) with visual color coding
- ✅ Chemical drops from enemies (acidic/basic)
- ✅ Environmental events every 5 seconds (acidic/basic)
- ✅ pH drift during environmental events
- ✅ Per-second scoring based on pH proximity to neutral
- ✅ 60-second timer
- ✅ Game ends when all enemies killed or timer expires
- ✅ Visual alerts for environmental events
- ✅ Background color changes during events

**Nice to Have**:
- Smooth animations and particle effects
- Sound effects (shooting, chemical collection, environmental alerts)
- Multiple enemy formations
- Combo system for consecutive kills
- pH history graph (showing pH over time)

---

## 12. Game Balance Considerations

**pH Management Difficulty**:
- Environmental events should be challenging but not overwhelming
- Chemical drops should provide both risk (shifting pH) and reward (points)
- Player should feel agency in managing pH (not just random drift)

**Scoring Balance**:
- Enemy kills should be rewarding but not overshadow pH management
- pH maintenance points should be significant (encourage neutral pH)
- Time bonus should reward efficiency (killing all enemies quickly)

**Progression**:
- Early game: Fewer enemies, weaker environmental events
- Mid game: More enemies, medium-strength events
- Late game: Many enemies, strong environmental events

---

**End of PRD**

